let hwIndex=478,hwTimer=null,hwModule='weight';
const HW_NAMES=['初始化缓存','read_weights','matrix_multiply','activate','synchronise','主机读回'];
const HW_FOCUS=[['host','axi','weight','unified'],['fifo','control','weight','mmu'],['fifo','control','unified','setup','mmu','register'],['fifo','control','register','activation','unified'],['control','fifo','axi','host'],['unified','axi','host']];
const HW_NODES={host:{title:'主机',sub:'AXI testbench',x:335,y:-62,w:250,h:55,description:'先写 A 和 W，再提交四条指令；收到同步中断后读回结果。',ports:'AXI4-Lite：32 位数据，20 位地址。',source:'doc/teaching/pdf-dataflow/TB_PDF_DATAFLOW.vhdl'},...MODULES};
const HW_PORTS={weight:'112 位 / 14 个 8 位权重 · 40 位向量地址',unified:'112 位 / 14 个 8 位输入或输出 · 24 位向量地址',mmu:'14×14 MACC · 112 位输入/权重 → 448 位结果',register:'14×32 位结果 · 16 位地址 · 本组 ACCUMULATE=0',activation:'448 位累加结果 → 112 位输出 · 直通 / 有符号 ReLU',setup:'通道 j 延迟 j 个使能拍 · 14 个 8 位通道',fifo:'32 + 32 + 16 位组装成 80 位指令',control:'三套控制流水线；BUSY 允许不同资源的指令重叠',axi:'AW/W/B 写入；AR/R 读回；SYNCHRONIZE 输出中断'};
const HW_EDGES=EDGES.map((e,i)=>({id:'e'+i,from:e[0],to:e[1],path:e[2],x:e[3],y:i===11?389:e[4],label:(i===2?'32+32+16':i===3?'80 bit':e[5]).replace('N×8 bit','112 bit').replace('N×32','448 bit')}));
HW_EDGES.push({id:'host-write',from:'host',to:'axi',path:'M400 -7 V42',x:280,y:20,label:'AW / W / AR'},{id:'host-read',from:'axi',to:'host',path:'M495 42 V-7',x:506,y:20,label:'R / B / IRQ'},{id:'ub-read',from:'unified',to:'axi',path:'M58 175 V102',x:60,y:160,label:'主机读回'});
const HW_STORIES=[
 '主机把 A、W 写到两块缓存；尚未提交计算指令。AW、W、B 的握手各有自己的时刻，数据先被 AXI 锁存，再到达缓存。',
 'read_weights 让权重缓存依次读出 W 的 14 行。经过缓存读流水，112 位权重向量进入 MMU 的预装寄存器；此时还没有产生 C。',
 'matrix_multiply 从统一缓存读 A。SDS 将不同通道错拍后送入阵列；MMU 使用驻留权重产生 14 路 32 位点积，并覆盖写入累加器。',
 'activate 从累加器处理结果，生成 8 位 Y，再写回统一缓存地址 0～13。与输入原地共用缓存，所以读回前必须等待同步。',
 'synchronise 让协调器等待权重、MMU、激活三套资源排空。全部结束后输出 IRQ；这条指令不搬运矩阵数据。',
 '主机收到 IRQ 后发起 AR 请求，在 RVALID 与 RREADY 同时有效时取得结果。每行四个 32 位字，末字含两个输出字节和两个填充字节。'
];
function hwFrames(){return flowCurrent().frames}
function hwFrame(){return hwFrames()[hwIndex]}
function stopHardware(){clearInterval(hwTimer);hwTimer=null;if($('hw-play'))$('hw-play').textContent='▶ 播放'}
function hwHex(value,width=1){return value==null?'X':'0x'+value.toString(16).toUpperCase().padStart(width,'0')}
function hwVector(values){return values?values.map(v=>v==null?'X':v).join(' · '):'本沿没有新的有效向量'}
function hwStageStart(stage){const c=flowCurrent(),t=c.timing;return [t.hostWrite.firstAddressNs,t.weight_instruction_en.firstNs,t.mmu_instruction_en.firstNs,t.activation_instruction_en.firstNs,t.syncWaitingEdges[0],t.hostRead.firstAddressNs][stage]}
function seekHardware(index){stop();hwIndex=Math.max(0,Math.min(hwFrames().length-1,index));renderHardware()}
function hardwareStage(stage){stopHardware();hwModule=['axi','weight','mmu','activation','control','unified'][stage];hwIndex=Math.round((hwStageStart(stage)-5)/10);renderHardware()}
function hwActivities(f){
 const active=new Set(),busy=new Set(),edges=new Set(),messages=[];
 const edge=(id,note)=>{edges.add(id);if(note)messages.push(note)};
 const handshake=name=>f[name+'valid']===1&&f[name+'ready']===1;
 if(handshake('aw'))edge('host-write',`AW：接受写地址 ${hwHex(f.awaddr,5)}`);
 if(handshake('w'))edge('host-write',`W：锁存 ${hwHex(f.wdata,8)}，WSTRB=${hwHex(f.wstrb)}`);
 if(handshake('b'))edge('host-read',`B：主机收到写响应 BRESP=${f.bresp}`);
 if(f.weight_enable===1&&f.weight_write_enable>0)edge('e1',`缓存写入：W 地址 ${f.weight_address}，字节掩码 ${hwHex(f.weight_write_enable,4)}`);
 if(f.buffer_enable===1&&f.buffer_write_enable>0)edge('e0',`缓存写入：A 地址 ${f.buffer_address}，字节掩码 ${hwHex(f.buffer_write_enable,4)}`);
 if(f.instruction_write_en>0)edge('e2',`AXI → FIFO：写入指令分字，WRITE_EN=${f.instruction_write_en}`);
 if(f.instruction_enable===1)edge('e3','FIFO → 核心：消费一条 80 位指令，进入前瞻/协调流水');
 if(f.weight_instruction_en===1)edge('e6','控制器：译码 read_weights，启动权重加载');
 if(f.mmu_instruction_en===1)edge('e7','控制器：译码 matrix_multiply，启动读取 A');
 if(f.activation_instruction_en===1)edge('e9','控制器：译码 activate，选择激活模式');
 if(f.weight_en0===1)edge('e6',`控制器 → 权重缓存：EN=1，ADDR=${f.weight_address0}`);
 if(f.mmu_load_weight===1)edge('e11',`权重缓存 → MMU：装载 W[${f.mmu_weight_address},:]`);
 if(f.mmu_activate_weight===1){active.add('mmu');messages.push('MMU：激活预装权重，切换到本次运算权重')}
 if(f.buffer_en0===1)edge('e5',`控制器 → 统一缓存：读 A[${f.buffer_address0},:]`);
 if(f.inputRow!=null)edge('e10',`统一缓存 → SDS：A[${f.inputRow},:] 经过读流水到达`);
 if(f.sdsRows.some(r=>r!=null))edge('e12','SDS → MMU：各通道带着不同行的数据进入阵列');
 if(f.reg_write_en===1)edge('e13',`MMU → 累加器：写 C[${f.reg_write_address},:]，ACCUMULATE=${f.reg_accumulate}`);
 if(f.buffer_write_en1===1)edge('e15',`激活 → 统一缓存：写 Y[${f.buffer_address1},:]`);
 if(f.synchronize===1){edge('e16','控制器 → AXI：主机在本沿采样到同步 IRQ');edge('host-read','AXI → 主机：收到完成通知')}
 if(handshake('ar')){edge('host-write',`AR：提交读地址 ${hwHex(f.araddr,5)}`);active.add('unified')}
 if(handshake('r')){edge('ub-read',`统一缓存 → AXI → 主机：RDATA=${hwHex(f.rdata,8)}`);edge('host-read')}
 for(const [signal,ids] of [['weight_resource_busy',['weight','mmu']],['mmu_resource_busy',['setup','mmu','register']],['activation_resource_busy',['register','activation']]])if(f[signal]===1)ids.forEach(id=>busy.add(id));
 if(f.activation_resource_busy===1){busy.add('control')}
 if(f.sync_wait===1)messages.push('synchronise：等待三套资源排空，本沿还没有 IRQ');
 HW_EDGES.filter(e=>edges.has(e.id)).forEach(e=>{active.add(e.from);active.add(e.to)});
 return {active,busy,edges,messages};
}
function hardwareStory(f,resources){
 const stage=flowStage;
 if(stage===1){
  if(f.mmu_load_weight===1)return [`第 ${f.mmu_weight_address} 行 W 装入 MMU`,'这才是 112 位权重向量真正被 MMU 消费的采样沿。查看下方 14 个权重值；缓存发出读地址在更早的时刻。'];
  if(f.weight_en0===1)return [`权重缓存读取第 ${f.weight_address0} 行`,'控制器正在发出 EN / ADDR；读取请求经过 RAM 与输出寄存流水，不能把本沿请求当成 MMU 已经收到数据。'];
  if(f.weight_instruction_en===1)return ['控制器启动 read_weights','FIFO 中的指令经过前瞻与协调流水，在本沿被权重控制单元消费；地址从 0 开始，长度为 14。'];
 }
 if(stage===2){
  if(f.reg_write_en===1)return [`C 第 ${f.reg_write_address} 行送入累加器`,'MMU 已形成 14 路 32 位点积，本沿按地址覆盖写入。C 尚未经过激活，不能当作最终 8 位 Y。'];
  if(f.sdsRows.some(row=>row!=null))return ['错拍输入正在进入脉动阵列','SDS 的通道 j 延迟 j 拍。请对照下方每个通道的 A[行,通道]，同时一拍到达的数值来自不同行。'];
  if(f.buffer_en0===1)return [`统一缓存读取 A 第 ${f.buffer_address0} 行`,'这拍发出输入读地址。数据经过缓存读流水才到达 SDS；同时权重通路仍可能在装载。'];
  if(f.mmu_instruction_en===1)return ['控制器启动 matrix_multiply','乘法指令已被消费；不必等整条加载指令串行结束。下方资源状态会显示加载与乘法控制的重叠。'];
 }
 if(stage===3){
  if(f.buffer_write_en1===1)return [`Y 第 ${f.buffer_address1} 行回写统一缓存`,'本沿写回的 14 个输出字节已经有效。对照下方 C → Y 的实际变换；这里会覆盖原来保存 A 的同一行。'];
  if(f.activation_instruction_en===1)return ['控制器启动 activate','激活指令被消费时，MMU 还没有写完 C。资源忙和流水安排保证后续结果对齐；不能把提交指令当作输出已经就绪。'];
  if(f.activation_resource_busy===1)return ['累加器 → 激活：流水处理中',`当前累加器读地址为 ${f.reg_read_address}，激活模式为 ${f.activation_function}。琥珀色表示处理过程；只有 BUFFER_WRITE_EN1 有效才会显示可写回的 Y。`];
 }
 if(stage===4){
  if(f.synchronize===1)return ['同步完成，主机采样到 IRQ','三套计算资源已排空，14 行 Y 已写回。主机在本沿消费同步脉冲，然后才开始读结果。'];
  if(f.sync_wait===1)return ['协调器等待 '+resources.join(' + '),'synchronise 不搬运矩阵，也不启动新的乘法。它等待所有相关资源完成，不能只看到一部分 C 或 Y 就提前读回。'];
 }
 if(stage===5){
  if(f.rvalid===1&&f.rready===1)return ['AXI 响应被主机接收',`本沿实际读取 ${hwHex(f.rdata,8)}。RVALID / RREADY 握手才消费数据；每行末字的高两个字节是填充，不属于 14 个输出通道。`];
  if(f.arvalid===1&&f.arready===1)return ['主机提交结果读地址',`ARADDR=${hwHex(f.araddr,5)}。地址接受与 RDATA 返回是不同的采样沿；此刻还没有收到本次读响应。`];
 }
 if(stage===0){
  if(f.weight_enable===1&&f.weight_write_enable>0)return ['把权重字节写入权重缓存','AXI 已经锁存写数据，并把字节写掩码送到权重缓存。每行 14 字节，末字只写两个字节。'];
  if(f.buffer_enable===1&&f.buffer_write_enable>0)return ['把输入字节写入统一缓存','输入 A 写入统一缓存。运算完成后，激活通路会在相同地址写入 Y。'];
 }
 return [HW_NAMES[stage]+' · 本沿无新的专属交接',HW_STORIES[stage]+' 图中仍保留其他模块当前真实活动。'];
}
function createHardware(){
 $('hw-edges').innerHTML=HW_EDGES.map(e=>`<g id="hw-edge-${e.id}" class="hw-edge"><path d="${e.path}"/><text x="${e.x}" y="${e.y}">${esc(e.label)}</text></g>`).join('');
 $('hw-edges').insertAdjacentHTML('beforeend','<g id="hw-packets"></g>');
 $('hw-modules').innerHTML=Object.entries(HW_NODES).map(([id,n])=>`<g id="hw-node-${id}" class="hw-node" data-hw-module="${id}" tabindex="0" role="button" aria-label="查看${n.title}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"/><text x="${n.x+n.w/2}" y="${n.y+22}">${n.title}</text><text class="hw-sub" x="${n.x+n.w/2}" y="${n.y+39}">${id==='mmu'?'14 × 14 · 权重驻留':id==='setup'?'各通道错拍 0～13 拍':esc(n.sub)}</text>${n.h>65?`<text class="hw-status" x="${n.x+n.w/2}" y="${n.y+n.h-12}"></text>`:''}</g>`).join('');
}
function hwKeyIndices(){
 const frames=hwFrames(),stage=flowStage,t=flowCurrent().timing;
 const windows=[[5,t.hostWrite.lastResponseNs],[t.weight_instruction_en.firstNs,t.mmu_load_weight.lastNs+10],[t.mmu_instruction_en.firstNs,t.reg_write_en.lastNs+10],[t.activation_instruction_en.firstNs,t.buffer_write_en1.lastNs+10],[t.syncWaitingEdges[0],t.synchronize.firstNs],[t.hostRead.firstAddressNs,t.hostRead.lastResponseNs]];
 const [start,end]=windows[stage];
 const fields=[['weight_enable','buffer_enable'],['weight_instruction_en','weight_en0','mmu_load_weight'],['mmu_instruction_en','buffer_en0','reg_write_en','mmu_activate_weight'],['activation_instruction_en','buffer_write_en1'],['synchronize'],['arvalid','rvalid']][stage];
 return frames.flatMap((f,i)=>f.ns>=start&&f.ns<=end&&(f.ns===start||f.ns===end||fields.some(k=>f[k]===1&&(['arvalid','rvalid'].includes(k)?f[k.replace('valid','ready')]===1:true))||stage===3&&i>0&&f.activation_resource_busy===1&&f.reg_read_address!==frames[i-1].reg_read_address||stage===4&&(f.ns===t.buffer_write_en1.lastNs||i>0&&['weight_resource_busy','mmu_resource_busy','activation_resource_busy'].some(k=>f[k]!==frames[i-1][k])))?[i]:[]);
}
function moveHardware(direction,auto=false){
 let target=hwIndex+direction;
 if($('hw-mode').value==='step'){const keys=hwKeyIndices();target=direction>0?keys.find(i=>i>hwIndex):keys.slice().reverse().find(i=>i<hwIndex)}
 if(target==null||target<0||target>=hwFrames().length){stopHardware();return}
 if(!auto)stop();hwIndex=target;renderHardware();
}
function renderHardware(){
 const f=hwFrame(),c=flowCurrent(),a=hwActivities(f),focus=HW_FOCUS[flowStage];
 $('hw-time').textContent=f.ns+' ns';$('hw-cycle').textContent=`K=${hwIndex} · 上升沿前采样`;$('hw-timeline').value=String(hwIndex);$('hw-progress').textContent=`${hwIndex+1} / ${hwFrames().length} 拍`;$('hw-instruction').value=String(flowStage);
 const command=c.commands[flowStage-1];
 $('hw-command').innerHTML=command?`<b>${HW_NAMES[flowStage]} · ${hwHex(command.opcode,2)}</b><code>0x${command.hex}</code><span>${flowStage===1?'权重起始地址=0':flowStage===2?'输入起始地址=0 · 累加器起始地址=0 · 覆盖写入':flowStage===3?'累加器起始地址=0 · 输出起始地址=0 · '+c.title:'等待所有计算资源完成'} · 长度=${command.length}</span>`:'<b>'+HW_NAMES[flowStage]+'</b><span>主机 AXI 读写操作；不是 NPU 计算指令。</span>';
 HW_EDGES.forEach(e=>{const g=$('hw-edge-'+e.id);g.classList.toggle('hw-active',a.edges.has(e.id));g.classList.toggle('hw-processing',e.id==='e14'&&f.activation_resource_busy===1);g.classList.toggle('hw-wait',e.id==='e4'&&f.sync_wait===1)});
 const packets=[];
 if(f.mmu_load_weight===1)packets.push([316,408,`W 行 ${f.mmu_weight_address}`]);
 if(f.inputRow!=null)packets.push([128,336,`A 行 ${f.inputRow}`]);
 if(f.sdsRows.some(r=>r!=null))packets.push([199,489,`${f.sdsRows.filter(r=>r!=null).length} 路有效`]);
 if(f.reg_write_en===1)packets.push([519,489,String(f.mmuVector[0])]);
 if(f.buffer_write_en1===1)packets.push([420,548,`Y 行 ${f.buffer_address1} → 统一缓存`]);
 $('hw-packets').innerHTML=packets.map(([x,y,label])=>`<text x="${x}" y="${y}" class="hw-packet">${esc(label)}</text>`).join('');
 const statuses={unified:f.buffer_write_en1===1?`写 Y[${f.buffer_address1},:]`:f.buffer_en0===1?`读 A[${f.buffer_address0},:]`:'输入 A / 输出 Y 共用',weight:f.mmu_load_weight===1?`W[${f.mmu_weight_address},:] → MMU`:f.weight_en0===1?`读 W[${f.weight_address0},:]`:'保存 W',control:f.sync_wait?'同步等待资源':`BUSY W/M/A=${f.weight_resource_busy}/${f.mmu_resource_busy}/${f.activation_resource_busy}`,fifo:`EMPTY=${f.instruction_empty} · FULL=${f.instruction_full}`,mmu:f.reg_write_en?`送出 C[${f.reg_write_address},:]`:'权重预装 / 脉动乘加',register:f.reg_write_en?`覆盖 C[${f.reg_write_address},:]`:'保存 32 位 C',activation:f.buffer_write_en1?`送出 Y[${f.buffer_address1},:]`:(f.activation_resource_busy?'激活流水处理中':'等待激活'),setup:f.sdsRows.some(r=>r!=null)?'错拍通道正在送入 MMU':'输入按通道延迟'};
 Object.keys(HW_NODES).forEach(id=>{const g=$('hw-node-'+id);g.classList.toggle('hw-active',a.active.has(id));g.classList.toggle('hw-busy',a.busy.has(id));g.classList.toggle('hw-wait',id==='control'&&f.sync_wait===1);g.classList.toggle('hw-focus',focus.includes(id));g.classList.toggle('hw-selected',id===hwModule);const status=g.querySelector('.hw-status');if(status)status.textContent=statuses[id]||''});
 const resources=[['权重',f.weight_resource_busy],['乘法',f.mmu_resource_busy],['激活',f.activation_resource_busy]].filter(x=>x[1]===1).map(x=>x[0]);
 $('hw-overlap').textContent=resources.length>1?'同时忙：'+resources.join(' + '):resources.length?'正在处理：'+resources[0]:'无计算资源忙';
 const [eventTitle,eventNote]=hardwareStory(f,resources);$('hw-event-title').textContent=eventTitle;$('hw-event-note').textContent=eventNote;
 $('hw-transfers').innerHTML=a.messages.length?a.messages.map(m=>`<p>${esc(m)}</p>`).join(''):'<p class="muted">本沿没有上述有效交接；空闲端口的数值不会当作新数据。</p>';
 const n=HW_NODES[hwModule];$('hw-module-title').textContent=n.title;$('hw-module-note').textContent=n.description;$('hw-module-ports').textContent=HW_PORTS[hwModule]||n.ports;
 const cards=[['权重缓存 → MMU',f.mmu_load_weight===1?`W[${f.mmu_weight_address},:] · 112 位`: 'LOAD_WEIGHT=0',f.weightVector&&f.mmu_load_weight===1?f.weightVector:null],['统一缓存 → SDS',f.inputRow!=null?`A[${f.inputRow},:] · 112 位`:'尚无本次有效输入行',f.inputRow!=null?f.inputVector:null],['MMU → 累加器',f.reg_write_en===1?`C[${f.reg_write_address},:] · 448 位`:'REG_WRITE_EN=0',f.mmuVector],['激活 → 统一缓存',f.buffer_write_en1===1?`Y[${f.buffer_address1},:] · 112 位`:'BUFFER_WRITE_EN1=0',f.activationVector]];
 const controls=[['权重缓存读',`EN=${f.weight_en0} · ADDR=${f.weight_address0}`],['统一缓存读',`EN=${f.buffer_en0} · ADDR=${f.buffer_address0}`],['累加器写',`EN=${f.reg_write_en} · ADDR=${f.reg_write_address}`],['累加器 → 激活',`READ_ADDR=${f.reg_read_address} · MODE=${f.activation_function} · SIGNED=${f.activation_signed}`]];
 $('hw-controls').innerHTML=controls.map(([label,value])=>`<div><span>${label}</span><code>${esc(value)}</code></div>`).join('');
 $('hw-payloads').innerHTML=cards.map(([title,note,values])=>`<div class="${values?'valid':''}"><span>${title}</span><code>${esc(note)}</code><p>${esc(hwVector(values))}</p></div>`).join('');
 $('hw-lanes').innerHTML='<span class="eyebrow">SDS → MMU · 按通道看错拍输入（RTL 重建）</span><div class="hw-lane-grid">'+f.sdsVector.map((v,j)=>`<div class="${f.sdsRows[j]!=null?'valid':''}"><span>通道 ${j} · 延迟 ${j} 拍</span><b>${f.sdsRows[j]!=null?v:'—'}</b><small>${f.sdsRows[j]!=null?`A[${f.sdsRows[j]},${j}]`:'无本次有效输入'}</small></div>`).join('')+'</div>';
 let calculation='本沿没有新的点积结果或激活写回；下一次有效交接时在这里展开数据变换。';
 if(f.reg_write_en===1){const row=f.reg_write_address;calculation=`本沿 C[${row},1] = Σ A[${row},k] × W[k,1] = ${f.mmuVector[1]}（k=0…13）。这是实际送入累加器的 32 位结果；激活尚未写回本行。`}
 if(f.buffer_write_en1===1){const row=f.buffer_address1,raw=c.raw[row][1],output=f.activationVector[1];calculation=`本沿 Y[${row},1]：C=${raw} → ${$('flow-case').value==='relu'?'舍入右移 8 位，再截负值 / 饱和':'取 C[31:24] 高字节'} → Y=${output}。14 个 8 位结果一起回写统一缓存第 ${row} 行。`}
 $('hw-calculation').textContent=calculation;
 const past=hwFrames().slice(0,hwIndex+1),count=signal=>past.filter(p=>p[signal]===1).length;
 const stateValues=[['W 已预装到 MMU',count('mmu_load_weight')+' / 14 行'],['C 已送入累加器',count('reg_write_en')+' / 14 行'],['Y 已回写统一缓存',count('buffer_write_en1')+' / 14 行'],['主机已核对输出',f.checked_bytes+' / 196 字节']];
 $('hw-memory').innerHTML=stateValues.map(([title,value])=>`<div><span>${title}</span><b>${value}</b></div>`).join('');
 const keys=hwKeyIndices(),clock=$('hw-mode').value==='clock';$('hw-prev').disabled=clock?hwIndex===0:!keys.some(i=>i<hwIndex);$('hw-next').disabled=clock?hwIndex===882:!keys.some(i=>i>hwIndex);
 $('hw-diagram').dataset.ns=String(f.ns);
}
$('hw-instruction').onchange=()=>seekFlow(Number($('hw-instruction').value));
$('hw-timeline').oninput=()=>seekHardware(Number($('hw-timeline').value));
$('hw-reset').onclick=()=>{stop();hardwareStage(flowStage)};
$('hw-prev').onclick=()=>moveHardware(-1);$('hw-next').onclick=()=>moveHardware(1);
$('hw-mode').onchange=()=>{stopHardware();renderHardware()};$('hw-speed').onchange=()=>stopHardware();
$('hw-play').onclick=()=>{if(hwTimer){stopHardware();return}stop();if($('hw-next').disabled)hardwareStage(flowStage);$('hw-play').textContent='❚❚ 暂停';hwTimer=setInterval(()=>moveHardware(1,true),Number($('hw-speed').value))};
$('hw-source').onclick=()=>openSource(HW_NODES[hwModule].source);
document.addEventListener('click',event=>{const el=event.target.closest('[data-hw-module]');if(el){hwModule=el.dataset.hwModule;renderHardware()}});
window.hardwareReady=true;createHardware();hardwareStage(flowStage);
