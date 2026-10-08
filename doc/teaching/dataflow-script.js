let flowStage=1,flowRow=7,flowColumn=1,flowMatrixSelection=null;
const FLOW_LESSONS=[
 {title:'先填缓存：让硬件有输入和权重',path:'主机 AXI → 权重缓存 / 统一缓存',source:'src/vhdl/AXI/tinyTPU_v1_0_S00_AXI.vhd',why:'RAM 复位不代表数据已经填好。每个 14 字节向量按 16 字节地址步长写入，最后一个 32 位字只写低两字节。',next:'数据填好后，主机分三次写入第一条 80 位加载权重指令。',signals:[['AWVALID / AWREADY','握手时接受写地址；0x00000 是权重缓存，0x80000 是统一缓存。'],['WVALID / WREADY / WSTRB','握手时接受数据；WSTRB=0xF 写四字节，0x3 只写本行最后两字节。'],['BVALID / BREADY / BRESP','响应握手才解释 BRESP；本实验全部有效写响应为 OKAY。']]},
 {title:'加载权重：缓存中的 W 进入 MMU',path:'权重缓存 → MMU 预装权重',source:'src/vhdl/Control_Unit/WEIGHT_CONTROL.vhdl',why:'矩阵乘法阵列要使用本次 W。缓存读有流水延迟，不能把发出读地址与权重到达 MMU 当作同一个时刻。',next:'权重加载与输入乘法可以流水重叠；下一步查看输入如何错拍进入阵列。',signals:[['weight_instruction_en','该采样沿才解释加载指令；无符号为 0x08，有符号为 0x09。'],['weight_en0 / weight_address0','有效采样沿读取权重缓存第 0～13 行。'],['mmu_load_weight / mmu_weight_address','在该使能有效时 MMU 消费 14 个权重向量，地址为 0～13。']]},
 {title:'乘法：错拍输入汇成 32 位点积',path:'统一缓存 → SDS → MMU → 累加器',source:'src/vhdl/Control_Unit/MATRIX_MULTIPLY_CONTROL.vhdl',why:'SDS 为不同通道施加错拍，配合阵列的乘加流水线对齐同一向量。写入累加器的是原始 C=A×W，还没有激活。',next:'得到原始 32 位点积后，由激活通路产生 8 位输出并原地写回。',signals:[['buffer_en0 / buffer_address0','统一缓存的输入读使能；本次实际读入地址 0～13。'],['sds_systolic_output[0] / [13]','不同通道的输入错拍到达；不能把同一竖线上的各通道当成同一个未错拍向量。'],['reg_write_en / reg_write_address / reg_accumulate','在使能有效时写入原始点积；本组覆盖写入，ACCUMULATE=0。']]},
 {title:'激活：同一通路，两种输出规则',path:'累加器 → 激活 → 统一缓存第 0～13 行',source:'src/vhdl/Activation/ACTIVATION.vhdl',why:'32 位累加结果不能直接当作 8 位输出。当前直通取高字节，有符号 ReLU 则舍入右移 8 位、截负值并限制上界。',next:'最后一个结果写回后，仍需由 synchronise 统一确认全部资源完成。',signals:[['reg_read_address / reg_read_port','累加器地址与数据经过读流水；需与实际回写有效区间对齐。'],['activation_signed','本次 ReLU 使用有符号解释；控制模式也经过流水延迟。'],['buffer_write_en1 / buffer_address1 / buffer_write_port1','真正写回统一缓存的 8 位字节；只有写使能有效时才是本次结果。']]},
 {title:'同步：资源都完成后才通知主机',path:'各资源 BUSY → 协调器 → IRQ',source:'src/vhdl/Control_Unit/CONTROL_COORDINATOR.vhdl',why:'指令已经入队或某一单元不忙，都不能证明所有结果已经写回。同步等待权重、乘法、激活资源完成后产生一次通知。',next:'主机采样到 IRQ 后，读取统一缓存，逐字节验证全部输出。',signals:[['en_flags_cs / instruction_en_cs / instruction_running','en_flags_cs=0x1 对应同步，结合其余两项判断协调器正在等待。'],['weight_resource_busy / mmu_resource_busy / activation_resource_busy','资源忙包含控制和流水排空；不能只检查一个单元。'],['SYNCHRONIZE / sync_count','IRQ 在 5435 ns 拉高，5445 ns 被主机采样一次，并在该时刻拉低。']]},
 {title:'读回：从 AXI 响应确认计算结果',path:'统一缓存 → AXI RDATA → 主机自检',source:'src/vhdl/AXI/tinyTPU_v1_0_S00_AXI.vhd',why:'要验证缓存里真正保存的输出，不能只看激活端口瞬时值。主机每行读四个 32 位字，最后一个字包含两个输出字节和两个零填充。',next:'切换两组实验，比较原始点积与激活规则；点选下方矩阵展开一条完整点积。',signals:[['ARVALID / ARREADY / ARADDR','有效握手时提交读地址，每行地址增加 16 字节。'],['RVALID / RREADY / RDATA / RRESP','只有响应握手时消费读数据；全部有效 RRESP=0。'],['expected_word / checked_bytes','testbench 参考值与比较计数，不是 DUT 信号；全程核对 196 个输出字节。']]}
];
const FLOW_MARKER_NAMES={UB_WDATA_0:'第 0 行首字：主机输入数据握手',UB_BRESP_0:'第 0 行首字：写响应握手',PARTIAL_WDATA:'第 0 行末字：仅写低两字节',PARTIAL_BRESP:'第 0 行末字：写响应握手',WEIGHT_CMD:'加载权重指令被核心消费',WB_READ_0:'权重缓存第 0 行读取',MMU_LOAD_0:'MMU 加载第 0 行权重',MMU_LOAD_13:'MMU 加载第 13 行权重',MMU_CMD:'乘法指令被核心消费',UB_READ_0:'统一缓存第 0 行读取',ACC_WRITE_0:'累加器接收第 0 行原始点积',ACC_WRITE_13:'累加器接收第 13 行原始点积',ACT_CMD:'激活指令被核心消费',UB_WRITE_0:'激活结果第 0 行回写',UB_WRITE_13:'激活结果第 13 行回写',IRQ:'主机采样到 IRQ（不是拉高沿）',WAIT_START:'同步开始等待资源',LAST_ACT_BUSY:'最后一个激活资源忙采样沿',HOST_AR:'首个主机读地址握手',AR_ROW0_W0:'读第 0 行第 0 字：地址握手',R_ROW0_W0:'读第 0 行第 0 字：响应握手',R_ROW1_W0:'读第 1 行第 0 字：响应握手'};
function flowCurrent(){return PDF_FLOW.cases[$('flow-case').value]}
function seekFlow(stage){stop();flowStage=Math.max(0,Math.min(5,stage));$('flow-wave-viewport').scrollLeft=0;renderFlow()}
function flowBinary(data){return Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0))}
function flowDownload(data){download(data.name,flowBinary(data),data.mime)}
function renderFlow(){
 const key=$('flow-case').value,c=flowCurrent(),lesson=FLOW_LESSONS[flowStage],view=PDF_FLOW.stages[flowStage],t=c.timing;
 $('flow-title').textContent=`${flowStage+1} / 6 · ${lesson.title}`;$('flow-path').textContent=lesson.path;$('flow-why').textContent=lesson.why;$('flow-next-note').textContent='接下来：'+lesson.next;
 const actions=[
  '本组通过 112 次 AXI 写事务填入 14×14 输入和权重，另用 12 次事务提交四条指令。图中展示第 0 行的初始化，写数据通道握手后立即撤掉 WDATA/WSTRB，检验包装器确实锁存数据。',
  `加载指令在 ${t.weight_instruction_en.firstNs} ns 被消费；权重缓存从 ${t.weight_en0.firstNs} ns 开始读，MMU 从 ${t.mmu_load_weight.firstNs} ns 开始加载，每拍一行。`,
  `乘法指令采样于 ${t.mmu_instruction_en.firstNs} ns；从 ${t.reg_write_en.firstNs}～${t.reg_write_en.lastNs} ns 连续向累加器写入 14 行原始点积。MMU 原始值与独立 A×W 数学预期一致。`,
  `本组使用 ${key==='relu'?'0x91 有符号 ReLU':'0x80 直通'}。实际 8 位结果在 ${t.buffer_write_en1.firstNs}～${t.buffer_write_en1.lastNs} ns 写回统一缓存第 0～13 行，覆盖原来的输入。`,
  `协调器在 ${t.syncWaitingEdges[0]}～${t.syncWaitingEdges.at(-1)} ns 的 ${t.syncWaitingEdges.length} 个采样沿等待资源。IRQ 引脚在 ${t.irqPin.riseNs[0]} ns 拉高、${t.irqPin.fallNs[0]} ns 拉低；主机采样到一次脉冲。`,
  `首次 AR 握手 ${t.hostRead.firstAddressNs} ns，首次 R 握手 ${t.hostRead.firstResponseNs} ns，相差 ${(t.hostRead.firstResponseNs-t.hostRead.firstAddressNs)/PDF_FLOW.clockNs} 拍。56 次读到 ${t.hostRead.lastResponseNs} ns，全部 196 个输出字节与 28 个填充字节核对通过。`
 ];
 const checks=['同时观察 AW、W、B 三个独立握手；末字 WSTRB=0x3。响应只在 BVALID/BREADY 有效时解释。','看 weight_en0 与 mmu_load_weight 的有效区间，再看两套地址都依次覆盖 0～13。','看 REG_WRITE_EN 高电平期间的地址和 MMU_RESULT_DATA；本图主光标是第 0 行的写入沿前。',`本图主光标选第 7 行写入沿前。三个示例通道的实际字节是 ${c.output[7][0]}、${c.output[7][1]}、${c.output[7][13]}（j=0、1、13）。`,'先看资源 BUSY 排空，再看 SYNCHRONIZE 脉冲；图中 IRQ 字母标记是 5445 ns 的主机采样沿。','图中展示前两行的 8 次读响应；右下方的矩阵保留全部 14 行真实 RDATA 输出。'];
 const counts=['112 次数据写入','14 个权重向量','196 个原始点积','196 个写回字节','1 次 IRQ','196 个读回字节'];
 $('flow-action').textContent=actions[flowStage];$('flow-check').textContent=checks[flowStage];$('flow-count').textContent=counts[flowStage];$('flow-count-note').textContent=`${c.title} · ${view.windowNs[0]}～${view.windowNs[1]} ns 观察窗口`;
 $('flow-progress').style.width=(flowStage+1)/6*100+'%';$('flow-prev').disabled=flowStage===0;$('flow-next').disabled=flowStage===5;
 $('flow-stages').innerHTML=FLOW_LESSONS.map((l,i)=>`<button data-flow-stage="${i}" aria-pressed="${i===flowStage}">${i+1} · ${['写缓存','加载权重','矩阵乘法','激活回写','同步 IRQ','主机读回'][i]}</button>`).join('');
 const image=PDF_FLOW.images[key+'-'+view.stage];$('flow-wave-image').src='data:'+image.mime+';base64,'+image.base64;$('flow-wave-image').alt=c.title+' · '+lesson.title+' · GTKWave 实测波形';$('flow-wave-title').textContent=c.title+' · '+['AXI 写缓存','权重加载','矩阵乘法','激活与回写','同步与 IRQ','AXI 读回'][flowStage];
 $('flow-markers').innerHTML=view.markers.map(([letter,ns,name])=>`<tr><td><code>${letter}</code></td><td>${ns} ns</td><td>${esc(FLOW_MARKER_NAMES[name]||name)}</td></tr>`).join('');
 $('flow-signals').innerHTML=lesson.signals.map(([name,note])=>`<div class="flow-signal"><code>${esc(name)}</code><p>${esc(note)}</p></div>`).join('');
 $('flow-commands').innerHTML=c.commands.map((command,i)=>`<tr><td><button class="quiet" data-flow-stage="${i+1}">${['read_weights','matrix_multiply','activate','synchronise'][i]}</button></td><td><code>0x${command.opcode.toString(16).toUpperCase().padStart(2,'0')}</code></td><td>${command.length}</td><td>${command.submittedNs} ns</td><td>${command.sampleNs} ns</td><td><code>0x${command.hex}</code></td></tr>`).join('');
 $('flow-formula').textContent=key==='relu'?'A[i,j]=4(i−j)，W=64I → C[i,j]=256(i−j) → Y[i,j]=max(0,i−j)':'A[i,j]=i+2j+1，W 主对角线=2、上邻对角线=1 → C[i,0]=2(i+1)，C[i,j>0]=3i+6j+1 → Y=C[31:24]=0';
 $('flow-activation-note').textContent=key==='relu'?'有符号 ReLU：先用原始低字节的 bit7 舍入右移 8 位，再截负值为 0、截大于 127 的值为 127。本组 C 均为 256 的整数倍，不触发正向饱和。':'直通不是取低字节：当前 NO_ACTIVATION 实际取 32 位点积的 [31:24] 高 8 位。本组 C 为 2～118，输出全部为 0；196 个原始点积也已独立核对。';
 $('flow-results').innerHTML=`<div><span>各行每拍回写一个向量</span><b>${t.buffer_write_en1.firstNs}～${t.buffer_write_en1.lastNs} ns</b><p>14 个连续有效采样沿。首尾相差 13 拍，不是只写了 13 行。</p></div><div><span>IRQ 引脚拉高 / 主机采样</span><b>${t.irqPin.riseNs[0]} / ${t.synchronize.firstNs} ns</b><p>脉冲宽 10 ns；必须区分跳变时刻与被主机消费的采样沿。</p></div><div><span>本组全部读回通过</span><b>196 + 28 字节</b><p>196 个结果字节与 28 个零填充字节，仿真在 8826 ns 自检完成后正常结束。</p></div>`;
 $('flow-log').textContent=c.log;$('flow-provenance').textContent=`本次实验 RTL 基线 ${PDF_FLOW.commit} · N=${PDF_FLOW.N} · GHDL 5.0.1 / GTKWave 3.3.121 · 原始 GHW、VCD 和可编辑会话位于仓库 doc/teaching/pdf-dataflow。`;
 renderFlowMatrix();renderFlowZoom();if(window.hardwareReady)hardwareStage(flowStage);
}
function renderFlowMatrix(){
 const c=flowCurrent(),kind=$('flow-matrix-kind').value,m=c[kind],i=flowRow,j=flowColumn;
 $('flow-row').value=String(i);$('flow-column').value=String(j);
 const selected=kind==='raw'||kind==='output'?[i,j]:flowMatrixSelection;
 $('flow-matrix').innerHTML='<thead><tr><th>i / j</th>'+m[0].map((_,k)=>`<th scope="col">${k}</th>`).join('')+'</tr></thead><tbody>'+m.map((row,r)=>'<tr><th scope="row">'+r+'</th>'+row.map((v,k)=>`<td><button data-flow-cell="${r},${k}" class="${v>0?'positive':v<0?'negative':''} ${selected&&selected[0]===r&&selected[1]===k?'chosen':''} ${(kind==='input'&&r===i)||(kind==='weights'&&k===j)?'dot-term':''}" aria-label="${kind}[${r},${k}]=${v}" aria-pressed="${!!selected&&selected[0]===r&&selected[1]===k}">${v}</button></td>`).join('')+'</tr>').join('')+'</tbody>';
 $('flow-cell-title').textContent=`C[${i},${j}] → Y[${i},${j}]`;
 $('flow-values').innerHTML=`<div><span>GTKWave 原始 C</span><b>${c.raw[i][j]}</b></div><div><span>AXI 读回 Y</span><b>${c.output[i][j]}</b></div>`;
 const mmu=c.checkpoints.mmu.find(p=>p.row===i).ns,act=c.checkpoints.activation.find(p=>p.row===i).ns;
 $('flow-cell-times').textContent=`本行原始结果写入采样沿 ${mmu} ns；激活回写采样沿 ${act} ns。此面板显示完整实测结果，阶段导航不表示重新运行或当前硬件时刻。`;
 $('flow-dot-terms').textContent=c.input[i].map((v,k)=>`k=${String(k).padStart(2,' ')}: ${v} × ${c.weights[k][j]} = ${v*c.weights[k][j]}`).join('\n')+`\nΣ = ${c.raw[i][j]}`;
 $('flow-cell-check').textContent=`原始点积、激活写回、AXI 读回均已核对；实际写回字节 ${c.writeback[i][j]} 与 Y=${c.output[i][j]} 一致。`;
}
function renderFlowZoom(){const zoom=Number($('flow-zoom').value);$('flow-zoom-value').textContent=Math.round(zoom*100)+'%';$('flow-wave-image').style.width=100*zoom+'%';$('flow-wave-image').style.minWidth=1150*zoom+'px'}
for(const name of ['flow-row','flow-column'])$(name).innerHTML=Array.from({length:14},(_,i)=>`<option value="${i}">${i}</option>`).join('');
$('flow-case').onchange=()=>{flowMatrixSelection=null;renderFlow()};$('flow-prev').onclick=()=>seekFlow(flowStage-1);$('flow-next').onclick=()=>seekFlow(flowStage+1);$('flow-source').onclick=()=>openSource(FLOW_LESSONS[flowStage].source);
$('flow-row').onchange=()=>{flowRow=Number($('flow-row').value);flowMatrixSelection=null;renderFlowMatrix()};$('flow-column').onchange=()=>{flowColumn=Number($('flow-column').value);flowMatrixSelection=null;renderFlowMatrix()};$('flow-matrix-kind').onchange=()=>{flowMatrixSelection=null;renderFlowMatrix()};$('flow-zoom').oninput=renderFlowZoom;
$('flow-png').onclick=()=>flowDownload(PDF_FLOW.images[$('flow-case').value+'-'+PDF_FLOW.stages[flowStage].stage]);$('flow-zip').onclick=()=>flowDownload(PDF_FLOW.downloads.zip);$('flow-report').onclick=()=>flowDownload(PDF_FLOW.downloads.report);
$('flow-json').onclick=()=>download('tinyTPU-pdf-'+$('flow-case').value+'.json',JSON.stringify({N:PDF_FLOW.N,clockNs:PDF_FLOW.clockNs,rtlCommit:PDF_FLOW.commit,...flowCurrent()},null,2),'application/json');
document.addEventListener('click',e=>{const el=e.target.closest('[data-flow-stage],[data-flow-cell]');if(!el)return;if(el.dataset.flowStage!==undefined)seekFlow(Number(el.dataset.flowStage));if(el.dataset.flowCell){const [r,c]=el.dataset.flowCell.split(',').map(Number);const kind=$('flow-matrix-kind').value;if(kind==='raw'||kind==='output'){flowRow=r;flowColumn=c}else flowMatrixSelection=[r,c];renderFlowMatrix()}});
renderFlow();
