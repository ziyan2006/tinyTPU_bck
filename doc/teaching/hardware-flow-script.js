let hwIndex=0,hwStep=0,hwTimer=null,hwModule='control';
const HW_NAMES=['初始化缓存','read_weights','matrix_multiply','activate','synchronise','主机读回'];
const HW_FOCUS=[['host','axi','weight','unified'],['fifo','control','weight','mmu'],['fifo','control','unified','setup','mmu','register'],['fifo','control','register','activation','unified'],['control','fifo','axi','host'],['unified','axi','host']];
const HW_NODES={host:{title:'主机',sub:'AXI testbench',x:335,y:-62,w:250,h:55,description:'先写 A 和 W，再提交四条指令；收到同步中断后读回结果。',ports:'AXI4-Lite：32 位数据，20 位地址。',source:'doc/teaching/pdf-dataflow/TB_PDF_DATAFLOW.vhdl'},...MODULES,mmu:{...MODULES.mmu,description:'本组实例是 14×14 个 MACC 组成的权重驻留脉动阵列。每行共享输入，部分和向下传递，末行产生 14 路 32 位点积。'}};
const HW_PORTS={weight:'112 位 / 14 个 8 位权重 · 40 位向量地址',unified:'112 位 / 14 个 8 位输入或输出 · 24 位向量地址',mmu:'14×14 MACC · 112 位输入/权重 → 448 位结果',register:'14×32 位结果 · 16 位地址 · 本组 ACCUMULATE=0',activation:'448 位累加结果 → 112 位输出 · 直通 / 有符号 ReLU',setup:'通道 j 延迟 j 个使能拍 · 14 个 8 位通道',fifo:'32 + 32 + 16 位组装成 80 位指令',control:'三套控制流水线；BUSY 允许不同资源的指令重叠',axi:'AW/W/B 写入；AR/R 读回；SYNCHRONIZE 输出中断'};
const HW_EDGES=EDGES.map((e,i)=>({id:'e'+i,from:e[0],to:e[1],path:e[2],x:e[3],y:i===11?389:e[4],label:(i===2?'32+32+16':i===3?'80 bit':e[5]).replace('N×8 bit','112 bit').replace('N×32','448 bit')}));
HW_EDGES.push({id:'host-write',from:'host',to:'axi',path:'M400 -7 V42',x:280,y:20,label:'AW / W / AR'},{id:'host-read',from:'axi',to:'host',path:'M495 42 V-7',x:506,y:20,label:'R / B / IRQ'},{id:'ub-read',from:'unified',to:'axi',path:'M58 175 V102',x:60,y:160,label:'主机读回'});
function hwFrames(){return flowCurrent().frames}
function hwFrame(){return hwFrames()[hwIndex]}
function stopHardware(){clearInterval(hwTimer);hwTimer=null;if($('hw-play'))$('hw-play').textContent='▶ 播放'}
function hwHex(value,width=1){return value==null?'X':'0x'+value.toString(16).toUpperCase().padStart(width,'0')}
function hwVector(values){return values?values.map(v=>v==null?'X':v).join(' · '):'本沿没有新的有效向量'}
function hwStageStart(stage){const t=flowCurrent().timing;return [t.hostWrite.firstAddressNs,t.weight_instruction_en.firstNs,t.mmu_instruction_en.firstNs,t.activation_instruction_en.firstNs,t.syncWaitingEdges[0],t.hostRead.firstAddressNs][stage]}
function hwClock(){return $('hw-mode').value==='clock'}
function hardwareStage(){
 stopHardware();$('hw-path-dialog').close();hwStep=0;
 const lesson=hardwareLesson(),s=lesson.steps[0];hwIndex=hwClock()?lesson.start:s.representative;hwModule=s.focus.at(-1);renderHardware();
}
function selectHardwareStep(i){
 stop();const lesson=hardwareLesson();hwStep=Math.max(0,Math.min(lesson.steps.length-1,i));
 const s=lesson.steps[hwStep];hwIndex=s.representative;hwModule=s.focus.at(-1);renderHardware();
}
function seekHardware(value){
 if(!hwClock()){selectHardwareStep(value);return}
 stop();const lesson=hardwareLesson();hwIndex=Math.max(lesson.start,Math.min(lesson.end,value));renderHardware();
}
function hwActivities(f){
 const active=new Set(),busy=new Set(),edges=new Set(),events=[];
 const edge=(id,text,stage)=>{edges.add(id);if(text)events.push({edge:id,text,stage})};
 const note=(stage,text)=>events.push({stage,text});
 const handshake=name=>f[name+'valid']===1&&f[name+'ready']===1;
 if(handshake('aw'))edge('host-write',`AW：接受写地址 ${hwHex(f.awaddr,5)}`);
 if(handshake('w'))edge('host-write',`W：锁存 ${hwHex(f.wdata,8)}，WSTRB=${hwHex(f.wstrb)}`);
 if(handshake('b'))edge('host-read',`B：主机收到写响应 BRESP=${f.bresp}`);
 if(f.weight_enable===1&&f.weight_write_enable>0)edge('e1',`缓存写入：W 地址 ${f.weight_address}，字节掩码 ${hwHex(f.weight_write_enable,4)}`);
 if(f.buffer_enable===1&&f.buffer_write_enable>0)edge('e0',`缓存写入：A 地址 ${f.buffer_address}，字节掩码 ${hwHex(f.buffer_write_enable,4)}`);
 if(f.instruction_write_en>0)edge('e2',`AXI → FIFO：写入指令分字，WRITE_EN=${f.instruction_write_en}`);
 if(f.instruction_enable===1)edge('e3','FIFO → 核心：消费一条 80 位指令，进入前瞻/协调流水');
 if(f.weight_instruction_en===1)note(1,'控制器：译码 read_weights，启动权重加载；尚未发出缓存读请求');
 if(f.mmu_instruction_en===1)note(2,'控制器：译码 matrix_multiply，启动乘法控制流水');
 if(f.activation_instruction_en===1)note(3,'控制器：译码 activate，启动激活控制流水');
 if(f.weight_en0===1)edge('e6',`控制器 → 权重缓存：EN=1，ADDR=${f.weight_address0}`);
 if(f.mmu_load_weight===1){edge('e11',`权重缓存 → MMU：装载 W[${f.mmu_weight_address},:]`);edge('e7','MMU 控制：LOAD_WEIGHT=1',1)}
 if(f.mmu_activate_weight===1)edge('e7','MMU 控制：激活预装权重，切换到本次运算权重',2);
 if(f.buffer_en0===1)edge('e5',`控制器 → 统一缓存：读 A[${f.buffer_address0},:]`);
 if(f.inputRow!=null)edge('e10',`统一缓存 → SDS：A[${f.inputRow},:] 经过读流水到达`);
 if(f.sdsRows.some(r=>r!=null))edge('e12','SDS → MMU：各通道带着不同行的数据进入阵列');
 if(f.reg_write_en===1){edge('e13',`MMU → 累加器：交接 C[${f.reg_write_address},:]`);edge('e8',`累加器写控制：ADDR=${f.reg_write_address}，ACCUMULATE=${f.reg_accumulate}`)}
 if(f.buffer_write_en1===1)edge('e15',`激活 → 统一缓存：写 Y[${f.buffer_address1},:]`);
 if(f.synchronize===1){edge('e16','控制器 → AXI：主机在本沿采样到同步 IRQ');edge('host-read','AXI → 主机：收到完成通知')}
 if(handshake('ar'))edge('host-write',`AR：提交读地址 ${hwHex(f.araddr,5)}`);
 if(handshake('r')){edge('ub-read',`统一缓存 → AXI：RDATA=${hwHex(f.rdata,8)}`);edge('host-read','RVALID / RREADY 握手：主机消费读响应')}
 for(const [signal,ids] of [['weight_resource_busy',['weight','mmu']],['mmu_resource_busy',['setup','mmu','register']],['activation_resource_busy',['register','activation']]])if(f[signal]===1)ids.forEach(id=>busy.add(id));
 if(f.sync_wait===1)note(4,'synchronise：等待三套资源排空，本沿还没有 IRQ');
 HW_EDGES.filter(e=>edges.has(e.id)).forEach(e=>{active.add(e.from);active.add(e.to)});
 return {active,busy,edges,events};
}
function hwPresentation(){
 const f=hwFrame(),raw=hwActivities(f),s=hardwareLesson().steps[hwStep];
 if(hwClock())return {...raw,focus:HW_FOCUS[flowStage],allowed:new Set(HW_EDGES.map(e=>e.id)),processing:new Set(f.activation_resource_busy===1?['e14']:[]),waiting:new Set(f.sync_wait===1?['e4']:[])};
 // Discard unrelated activity rather than dimming a globally highlighted graph.
 const allowed=new Set(s.allowed);
 const events=raw.events.filter(e=>e.edge?allowed.has(e.edge)&&(e.stage===undefined||e.stage===flowStage):e.stage===flowStage);
 const edges=new Set(events.filter(e=>e.edge).map(e=>e.edge));
 const active=new Set();HW_EDGES.filter(e=>edges.has(e.id)).forEach(e=>{active.add(e.from);active.add(e.to)});
 const ownBusy=[null,'weight_resource_busy','mmu_resource_busy','activation_resource_busy'][flowStage];
 const ownNodes=[[],['weight','mmu'],['setup','mmu','register'],['register','activation']][flowStage]||[];
 const busy=new Set(ownBusy&&f[ownBusy]===1?ownNodes.filter(id=>s.focus.includes(id)):[]);
 return {active,busy,edges,events,focus:s.focus,allowed,processing:new Set(s.processing),waiting:new Set(s.waiting)};
}
function createHardware(){
 $('hw-edges').innerHTML=HW_EDGES.map(e=>`<g id="hw-edge-${e.id}" class="hw-edge" data-hw-path="${e.id}" tabindex="0" role="button" aria-label="查看通路：${HW_PATH_INFO[e.id][0]}"><title>${esc(HW_PATH_INFO[e.id][0])} · 点击解释作用</title><path class="hw-hit" d="${e.path}"/><path class="hw-line" d="${e.path}"/><text x="${e.x}" y="${e.y}">${esc(e.label)}</text></g>`).join('');
 $('hw-edges').insertAdjacentHTML('beforeend','<g id="hw-packets" aria-hidden="true"></g>');
 $('hw-modules').innerHTML=Object.entries(HW_NODES).map(([id,n])=>`<g id="hw-node-${id}" class="hw-node" data-hw-module="${id}" tabindex="0" role="button" aria-label="查看${n.title}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"/><text x="${n.x+n.w/2}" y="${n.y+22}">${n.title}</text><text class="hw-sub" x="${n.x+n.w/2}" y="${n.y+39}">${id==='mmu'?'14 × 14 · 权重驻留':id==='setup'?'各通道错拍 0～13 拍':esc(n.sub)}</text>${n.h>65?`<text class="hw-status" x="${n.x+n.w/2}" y="${n.y+n.h-12}"></text>`:''}</g>`).join('');
}
function moveHardware(direction,auto=false){
 const lesson=hardwareLesson(),clock=hwClock(),target=(clock?hwIndex:hwStep)+direction;
 const lower=clock?lesson.start:0,upper=clock?lesson.end:lesson.steps.length-1;
 if(target<lower||target>upper){stopHardware();return}
 if(!auto)stop();
 if(clock)hwIndex=target;else{hwStep=target;const s=lesson.steps[hwStep];hwIndex=s.representative;hwModule=s.focus.at(-1)}
 renderHardware();
 if((clock?hwIndex:hwStep)===upper)stopHardware();
}
function hwExample(){
 const f=hwFrame(),c=flowCurrent(),row=f.reg_write_en===1?f.reg_write_address:f.buffer_write_en1===1?f.buffer_address1:0;
 if(flowStage===1){const r=f.mmu_load_weight===1?f.mmu_weight_address:0;return `W[${r},0]=${c.weights[r][0]}，W[${r},1]=${c.weights[r][1]}；这一向量共有 14 个权重。`}
 if(flowStage===2)return `C[${row},1] = Σ A[${row},k] × W[k,1] = ${c.raw[row][1]}（k=0…13）。A、W 到 C 的运算由 MMU 完成。`;
 if(flowStage===3)return `C[${row},1]=${c.raw[row][1]} → ${c.commands[2].opcode===145?'舍入右移 8 位、截负值 / 饱和':'取 [31:24] 高字节'} → Y[${row},1]=${c.output[row][1]}。`;
 if(flowStage===4)return '加载、乘法、激活三项资源忙标志都为 0，才发出一次完成通知。';
 return flowStage===0?`第 0 行 A[0,0]=${c.input[0][0]}，W[0,0]=${c.weights[0][0]}；输入和权重分别存放。`:`完整读回包含 196 个 Y 字节 + 28 个填充字节；Y[13,0]=${c.output[13][0]}。`;
}
function renderHardwareLesson(lesson,s,clock){
 $('hw-goal').textContent=lesson.goal;$('hw-prerequisite').textContent=lesson.prerequisite;
 $('hw-step-title').textContent=`${hwStep+1} / ${lesson.steps.length} · ${s.title}`;
 $('hw-action').textContent=s.action;$('hw-why').textContent=s.why;$('hw-result').textContent=s.result;
 $('hw-example').textContent=hwExample();
 $('hw-example-note').textContent='本组数值示例，完整仿真已核对；不表示当前采样沿已经交接或保存。';
 $('hw-step-chips').innerHTML=lesson.steps.map((s,i)=>`<button data-hw-step="${i}" aria-current="${i===hwStep?'step':'false'}" class="${i===hwStep?'current':''}">${i+1} · ${s.title}</button>`).join('');
 $('hw-step-progress').style.width=(hwStep+1)/lesson.steps.length*100+'%';
 $('hw-moments').innerHTML=s.moments.map(i=>`<button data-hw-moment="${i}" class="${i===hwIndex?'current':''}" aria-pressed="${i===hwIndex}">${hwFrames()[i].ns} ns</button>`).join('');
 $('hw-moment-range').textContent=`本步 ${hwFrames()[s.start].ns}～${hwFrames()[s.end].ns} ns · 点击查看步内真实关键时刻`;
 $('hw-context').textContent=clock?'逐时钟模式保留全部真实活动；其他指令可能同时工作。时钟范围仍限定在当前课程。':'框图只高亮这条指令在本步骤的相关硬件与通路。讲解概括整步，框图显示所选的一个真实采样沿。';
 $('hw-lesson').classList.toggle('hw-clock-context',clock);
}
function renderHardware(){
 const f=hwFrame(),c=flowCurrent(),lesson=hardwareLesson(),clock=hwClock();
 if(clock){const matched=lesson.steps.findIndex(s=>hwIndex>=s.start&&hwIndex<=s.end);if(matched>=0)hwStep=matched}
 const s=lesson.steps[hwStep],a=hwPresentation();renderHardwareLesson(lesson,s,clock);
 $('hw-time').textContent=f.ns+' ns';$('hw-cycle').textContent=`K=${hwIndex} · 上升沿前采样`;
 const timeline=$('hw-timeline');timeline.min=String(clock?lesson.start:0);timeline.max=String(clock?lesson.end:lesson.steps.length-1);timeline.value=String(clock?hwIndex:hwStep);
 timeline.setAttribute('aria-label',clock?'选择当前指令的实际仿真时钟':'选择当前指令的教学步骤');
 $('hw-range-start').textContent=clock?hwFrames()[lesson.start].ns+' ns':'步骤 1';
 $('hw-range-end').textContent=clock?hwFrames()[lesson.end].ns+' ns':'步骤 '+lesson.steps.length;
 $('hw-progress').textContent=clock?`${hwIndex-lesson.start+1} / ${lesson.end-lesson.start+1} 拍`:`步骤 ${hwStep+1} / ${lesson.steps.length}`;
 $('hw-timeline-note').textContent=clock?'拖动查看本课程范围内的每一拍':'拖动切换教学步骤；步内关键时刻在上方选择';
 $('hw-instruction').value=String(flowStage);
 const command=c.commands[flowStage-1];
 $('hw-command').innerHTML=command?`<b>${HW_NAMES[flowStage]} · ${hwHex(command.opcode,2)}</b><code>0x${command.hex}</code><span>${flowStage===1?'权重起始地址=0':flowStage===2?'输入起始地址=0 · 累加器起始地址=0 · 覆盖写入':flowStage===3?'累加器起始地址=0 · 输出起始地址=0 · '+c.title:'等待所有计算资源完成'} · 长度=${command.length}</span>`:'<b>'+HW_NAMES[flowStage]+'</b><span>主机 AXI 读写操作；不是 NPU 计算指令。</span>';
 HW_EDGES.forEach(e=>{const g=$('hw-edge-'+e.id);g.classList.toggle('hw-active',a.edges.has(e.id));g.classList.toggle('hw-processing',a.processing.has(e.id));g.classList.toggle('hw-wait',a.waiting.has(e.id));g.classList.toggle('hw-related',a.allowed.has(e.id)||a.processing.has(e.id)||a.waiting.has(e.id))});
 const packets=[];
 if(a.edges.has('e11'))packets.push([316,408,`W 行 ${f.mmu_weight_address}`]);
 if(a.edges.has('e10'))packets.push([128,336,`A 行 ${f.inputRow}`]);
 if(a.edges.has('e12'))packets.push([199,489,`${f.sdsRows.filter(r=>r!=null).length} 路有效`]);
 if(a.edges.has('e13'))packets.push([519,489,String(f.mmuVector[0])]);
 if(a.edges.has('e15'))packets.push([420,548,`Y 行 ${f.buffer_address1} → 统一缓存`]);
 $('hw-packets').innerHTML=packets.map(([x,y,label])=>`<text x="${x}" y="${y}" class="hw-packet">${esc(label)}</text>`).join('');
 const defaults={unified:'保存输入 A / 输出 Y',weight:'保存 W',control:'译码 / 安排控制流水',fifo:'保存完整 80 位指令',mmu:'权重预装 / 脉动乘加',register:'保存 32 位 C',activation:'32 位 C → 8 位 Y',setup:'输入按通道错拍'};
 const statuses={...defaults};
 if(a.edges.has('e6'))statuses.weight=`请求 W[${f.weight_address0},:]`;
 if(a.edges.has('e11'))statuses.weight=`W[${f.mmu_weight_address},:] → MMU`;
 if(a.edges.has('e5'))statuses.unified=`请求 A[${f.buffer_address0},:]`;
 if(a.edges.has('e13')){statuses.mmu=`送出 C[${f.reg_write_address},:]`;statuses.register=`接收 C[${f.reg_write_address},:]`}
 if(a.edges.has('e15')){statuses.activation=`送出 Y[${f.buffer_address1},:]`;statuses.unified=`写 Y[${f.buffer_address1},:]`}
 if(a.edges.has('e12'))statuses.setup='错拍通道正在送入 MMU';
 if(a.waiting.has('e4'))statuses.control='等待资源全部结束';
 Object.keys(HW_NODES).forEach(id=>{const g=$('hw-node-'+id);g.classList.toggle('hw-active',a.active.has(id));g.classList.toggle('hw-busy',a.busy.has(id));g.classList.toggle('hw-wait',id==='control'&&a.waiting.has('e4'));g.classList.toggle('hw-focus',a.focus.includes(id));g.classList.toggle('hw-selected',id===hwModule);const status=g.querySelector('.hw-status');if(status)status.textContent=clock||a.focus.includes(id)?statuses[id]||'':'本步骤未使用'});
 const resources=[['权重',f.weight_resource_busy],['乘法',f.mmu_resource_busy],['激活',f.activation_resource_busy]].filter(x=>x[1]===1).map(x=>x[0]);
 $('hw-overlap').textContent=clock?(resources.length?'同时/正在忙：'+resources.join(' + '):'无计算资源忙'):'只关注本步骤 · 点击通路解释作用';
 $('hw-resource-status').hidden=flowStage!==4;
 $('hw-resource-status').innerHTML=[['权重',f.weight_resource_busy],['乘法',f.mmu_resource_busy],['激活',f.activation_resource_busy]].map(([label,busy])=>`<span class="${busy?'busy':'done'}">${label}：${busy?'仍忙':'已结束'}</span>`).join('');
 $('hw-event-title').textContent=clock?'本沿的真实活动':s.title;
 $('hw-event-note').textContent=clock?'此模式显示并行活动，可能出现其他指令的传输。':s.action;
 $('hw-transfers').innerHTML=a.events.length?a.events.map(e=>`<p>${esc(e.text)}</p>`).join(''):'<p class="muted">所选沿没有本步骤的新有效交接。高亮边框表示相关硬件；虚线表示流水处理或等待。</p>';
 const n=HW_NODES[hwModule];$('hw-module-title').textContent=n.title;$('hw-module-note').textContent=n.description;$('hw-module-ports').textContent=HW_PORTS[hwModule]||n.ports;
 const relevant=id=>clock||a.allowed.has(id)||a.processing.has(id);
 const cards=[['e11','权重缓存 → MMU',f.mmu_load_weight===1?`W[${f.mmu_weight_address},:] · 112 位`:'LOAD_WEIGHT=0',f.mmu_load_weight===1?f.weightVector:null],['e10','统一缓存 → SDS',f.inputRow!=null?`A[${f.inputRow},:] · 112 位`:'尚无本次有效输入行',f.inputRow!=null?f.inputVector:null],['e13','MMU → 累加器',f.reg_write_en===1?`C[${f.reg_write_address},:] · 448 位`:'REG_WRITE_EN=0',f.reg_write_en===1?f.mmuVector:null],['e15','激活 → 统一缓存',f.buffer_write_en1===1?`Y[${f.buffer_address1},:] · 112 位`:'BUFFER_WRITE_EN1=0',f.buffer_write_en1===1?f.activationVector:null]].filter(([id])=>relevant(id));
 const controls=[['e6','权重缓存读',`EN=${f.weight_en0} · ADDR=${f.weight_address0}`],['e5','统一缓存读',`EN=${f.buffer_en0} · ADDR=${f.buffer_address0}`],['e8','累加器地址',`WRITE_EN=${f.reg_write_en} · WRITE_ADDR=${f.reg_write_address} · READ_ADDR=${f.reg_read_address}`],['e9','激活模式',`MODE=${f.activation_function} · SIGNED=${f.activation_signed}`]].filter(([id])=>relevant(id));
 $('hw-controls').innerHTML=controls.map(([,label,value])=>`<div><span>${label}</span><code>${esc(value)}</code></div>`).join('');
 $('hw-payloads').innerHTML=cards.map(([,title,note,values])=>`<div class="${values?'valid':''}"><span>${title}</span><code>${esc(note)}</code><p>${esc(hwVector(values))}</p></div>`).join('');
 $('hw-lanes').hidden=!relevant('e12');
 $('hw-lanes').innerHTML=relevant('e12')?'<span class="eyebrow">SDS → MMU · 按通道看错拍输入（RTL 重建）</span><div class="hw-lane-grid">'+f.sdsVector.map((v,j)=>`<div class="${f.sdsRows[j]!=null?'valid':''}"><span>通道 ${j} · 延迟 ${j} 拍</span><b>${f.sdsRows[j]!=null?v:'—'}</b><small>${f.sdsRows[j]!=null?`A[${f.sdsRows[j]},${j}]`:'无本次有效输入'}</small></div>`).join('')+'</div>':'';
 let calculation='所选沿没有新的有效数据交接；先对照本步骤的动作与高亮通路。';
 if(a.edges.has('e11'))calculation=`本沿 MMU 接收 W 第 ${f.mmu_weight_address} 行：${hwVector(f.weightVector)}。这是装权重，还没有点积结果。`;
 if(a.edges.has('e13'))calculation=`本沿 C[${f.reg_write_address},1] = Σ A[${f.reg_write_address},k] × W[k,1] = ${f.mmuVector[1]}（k=0…13）。这是实际交给累加器的 32 位结果。`;
 if(a.edges.has('e15')){const row=f.buffer_address1;calculation=`本沿 Y[${row},1]：C=${c.raw[row][1]} → ${c.commands[2].opcode===145?'舍入右移 8 位，再截负值 / 饱和':'取 C[31:24] 高字节'} → Y=${f.activationVector[1]}。14 个输出字节一起回写统一缓存第 ${row} 行。`}
 if(a.edges.has('ub-read'))calculation=`本沿主机接收 RDATA=${hwHex(f.rdata,8)}；只有 RVALID / RREADY 握手才取得本字。`;
 $('hw-calculation').textContent=calculation;
 const past=hwFrames().slice(0,hwIndex+1),count=signal=>past.filter(p=>p[signal]===1).length;
 const stateValues=[['e11','W 已预装到 MMU',count('mmu_load_weight')+' / 14 行'],['e13','C 已交给累加器',count('reg_write_en')+' / 14 行'],['e15','Y 已回写统一缓存',count('buffer_write_en1')+' / 14 行'],['ub-read','主机已核对输出',f.checked_bytes+' / 196 字节']].filter(([id])=>clock||[['e11',1],['e13',2],['e15',3],['ub-read',5]].some(([e,stage])=>id===e&&flowStage===stage));
 $('hw-memory').innerHTML=stateValues.map(([,title,value])=>`<div><span>${title}</span><b>${value}</b></div>`).join('');
 $('hw-prev').disabled=clock?hwIndex===lesson.start:hwStep===0;$('hw-next').disabled=clock?hwIndex===lesson.end:hwStep===lesson.steps.length-1;
 $('hw-prev').textContent=clock?'← 上一拍':'← 上一步';$('hw-next').textContent=clock?'下一拍 →':'下一步 →';
 $('hw-diagram').dataset.ns=String(f.ns);$('hw-diagram').dataset.step=String(hwStep);$('hw-diagram').dataset.instruction=HW_NAMES[flowStage];
}
$('hw-instruction').onchange=()=>seekFlow(Number($('hw-instruction').value));
$('hw-timeline').oninput=()=>seekHardware(Number($('hw-timeline').value));
$('hw-reset').onclick=()=>{stop();hardwareStage()};
$('hw-prev').onclick=()=>moveHardware(-1);$('hw-next').onclick=()=>moveHardware(1);
$('hw-mode').onchange=()=>{stopHardware();if(!hwClock()){const s=hardwareLesson().steps[hwStep];hwIndex=s.representative}renderHardware()};
$('hw-speed').onchange=()=>stopHardware();
$('hw-play').onclick=()=>{if(hwTimer){stopHardware();return}stop();if($('hw-next').disabled)hardwareStage();$('hw-play').textContent='❚❚ 暂停';hwTimer=setInterval(()=>moveHardware(1,true),Number($('hw-speed').value))};
$('hw-source').onclick=()=>openSource(HW_NODES[hwModule].source);
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-hw-module],[data-hw-path],[data-hw-step],[data-hw-moment]');if(!el)return;
 if(el.dataset.hwModule){hwModule=el.dataset.hwModule;renderHardware()}
 if(el.dataset.hwPath)openHardwarePath(el.dataset.hwPath);
 if(el.dataset.hwStep!==undefined)selectHardwareStep(Number(el.dataset.hwStep));
 if(el.dataset.hwMoment!==undefined){stop();hwIndex=Number(el.dataset.hwMoment);renderHardware()}
});
window.hardwareReady=true;createHardware();hardwareStage();
