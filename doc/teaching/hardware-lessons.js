// Each step explains one action. Its diagram uses an actual representative edge.
// Other instructions still run in the trace; step mode filters their presentation.
function hardwareLesson(){
 const c=flowCurrent(),t=c.timing,frames=hwFrames(),stage=flowStage;
 const index=ns=>Math.round((ns-5)/10),end=signal=>t[signal].lastNs+PDF_FLOW.clockNs;
 const pops=frames.filter(f=>f.instruction_enable===1).map(f=>f.ns);
 const receive=stage>=1&&stage<=4?pops[stage-1]:hwStageStart(stage);
 const step=(title,action,why,result,focus,allowed,start,finish,representative,moments=[],processing=[],waiting=[])=>({title,action,why,result,focus,allowed,start:index(start),end:index(finish),representative:index(representative),moments:[...new Set([representative,...moments])].sort((a,b)=>a-b).map(index),processing,waiting});
 let steps,goal,prerequisite;
 if(stage===1){
  goal='把权重缓存地址 0～13 的 14 个向量装入 MMU，供乘法使用。';
  prerequisite='主机已经把 W 写入权重缓存。这里学习 read_weights；主机写缓存是前置操作。';
  steps=[
   step('接收并启动加载指令','FIFO 把这条 80 位命令交给核心；控制器译码出起始地址 0、长度 14。','控制器先知道读取范围，才能安排缓存和 MMU。','下一步从权重缓存发出实际读取。',['fifo','control'],['e3'],receive,t.weight_en0.firstNs-10,receive,[receive,t.weight_instruction_en.firstNs]),
   step('发出首行权重读取请求','控制器给权重缓存 EN=1、ADDR=0。','地址和使能告诉缓存“这次读哪一行”；它们本身不是权重数据。','首行进入缓存读流水，数据稍后才到达 MMU。',['control','weight'],['e6'],t.weight_en0.firstNs,t.weight_en0.firstNs,t.weight_en0.firstNs),
   step('等待首个向量经过读流水','读取请求已经发出，首行权重还没有到达 MMU。','同步 RAM 和输出寄存器带来延迟；不能把发地址和装入数据当成同一拍。','首行将在 '+t.mmu_load_weight.firstNs+' ns 被 MMU 消费。',['weight','mmu'],[],t.weight_en0.firstNs+10,t.mmu_load_weight.firstNs-10,t.mmu_load_weight.firstNs-10,[],['e11']),
   step('把 14 个权重向量装入 MMU','每个有效 LOAD_WEIGHT 沿，MMU 接收 14 个权重并按地址预装；重复的 14 次交接合成这一步。','阵列需要本次 W 的全部向量，才能供应后面的乘加。','最后一个向量在 '+t.mmu_load_weight.lastNs+' ns 装入，仍未产生 C。',['weight','mmu'],['e11'],t.mmu_load_weight.firstNs,t.mmu_load_weight.lastNs,t.mmu_load_weight.firstNs,[t.mmu_load_weight.firstNs,t.mmu_load_weight.firstNs+70,t.mmu_load_weight.lastNs]),
   step('权重加载过程完成','权重控制资源已结束；14 个向量共 196 个权重已交给 MMU。','装权重与算点积是两项工作。read_weights 的产物是可供使用的权重。','接下来单独学习 matrix_multiply 怎样读取 A 并产生 C。',['control','weight','mmu'],[],end('weight_resource_busy'),end('weight_resource_busy'),end('weight_resource_busy'))
  ];
 }else if(stage===2){
  goal='从统一缓存读取 A，经 SDS 和 MMU 形成 C=A×W，交给累加器。';
  prerequisite='A 已写入统一缓存，read_weights 已提交并供应权重。默认只讲乘法，重叠活动可在逐时钟模式查看。';
  steps=[
   step('接收并启动乘法指令','控制器读到输入地址 0、累加器地址 0、长度 14，以及覆盖写入模式。','输入位置、结果位置和覆盖/累加方式必须明确。','接着读取统一缓存中的 A。',['fifo','control'],['e3'],receive,t.buffer_en0.firstNs-10,receive,[receive,t.mmu_instruction_en.firstNs]),
   step('从统一缓存请求输入','控制器依次发出输入读地址；本图展示第 0 行的实际请求。','A 保存在统一缓存，必须经过缓存读流水才到达计算端。','读取到的向量交给 SDS。',['control','unified'],['e5'],t.buffer_en0.firstNs,t.buffer_en0.firstNs+20,t.buffer_en0.firstNs),
   step('SDS 错拍输入，阵列进行乘加','通道 j 延迟 j 拍后进入 MMU，配合驻留权重和部分和流水完成点积。','同一拍的各通道来自不同输入行；错拍用于对齐阵列中的运算。','MMU 随后产生 14 路 32 位点积。',['control','unified','setup','mmu'],['e10','e12','e7'],t.buffer_en0.firstNs+30,t.reg_write_en.firstNs-10,t.buffer_en0.firstNs+50,[t.buffer_en0.firstNs+30,t.buffer_en0.firstNs+50,t.reg_write_en.firstNs-10]),
   step('把 14 行原始点积交给累加器','REG_WRITE_EN 有效时按地址送入 C。本组 ACCUMULATE=0，覆盖写入。重复的逐行交接合成一步。','32 位 C 需要保存，才能继续激活或后续累加。','14 行共 196 个点积完成交接；C 还不是最终 8 位 Y。',['mmu','register'],['e13','e8'],t.reg_write_en.firstNs,t.reg_write_en.lastNs,t.reg_write_en.firstNs,[t.reg_write_en.firstNs,t.reg_write_en.firstNs+70,t.reg_write_en.lastNs]),
   step('本次点积交接完成','MMU 已送出全部 14 行 C，乘法控制资源结束；寄存文件按自身流水保存结果。','送出 C 与激活写回 Y 分属不同指令。','接下来单独学习 activate。',['mmu','register'],[],end('mmu_resource_busy'),end('mmu_resource_busy'),end('mmu_resource_busy'))
  ];
 }else if(stage===3){
  goal='读取累加器中的 C，按本组激活规则生成 Y，回写统一缓存。';
  prerequisite='矩阵乘法已经提交并产生 C。读取与写回由实际控制流水安排；本课只突出激活过程。';
  const read=frames.find(f=>f.ns>t.activation_instruction_en.firstNs&&f.activation_resource_busy===1&&f.reg_read_address===0).ns;
  steps=[
   step('接收并启动激活指令','控制器解析累加器起点 0、输出起点 0、长度 14，并选择 '+c.title+'。','读取位置、输出位置和激活模式决定怎样把 C 转成 Y。','安排累加器读地址和激活流水。',['fifo','control','activation'],['e3','e9'],receive,read-10,t.activation_instruction_en.firstNs,[receive,t.activation_instruction_en.firstNs]),
   step('从累加器读取原始 C','激活控制给出累加器读地址；图中是起始地址 0。','C 是 32 位结果，读取需要寄存文件的读流水。','C 经过流水到达激活单元。',['control','register'],[],read,read+30,read,[],['e8']),
   step('按规则处理数值，等待输出流水','激活单元处理各通道。本组 '+(c.commands[2].opcode===145?'有符号 ReLU：舍入右移 8 位、截负值并饱和。':'直通：取 C[31:24] 高字节。'),'32 位原始点积需要转换成统一缓存使用的 8 位结果。','等待写回使能；此时不能把端口瞬时值当作已保存的 Y。',['register','activation'],[],read+40,t.buffer_write_en1.firstNs-10,read+80,[],['e14']),
   step('把 14 行 Y 回写统一缓存','BUFFER_WRITE_EN1 有效时，14 个输出字节一起写入对应行；重复的 14 行合成一步。','下一层或主机从统一缓存取得结果，本例写回地址与 A 相同。','最后一行 Y 在 '+t.buffer_write_en1.lastNs+' ns 写回。',['activation','unified'],['e15'],t.buffer_write_en1.firstNs,t.buffer_write_en1.lastNs,t.buffer_write_en1.firstNs+70,[t.buffer_write_en1.firstNs,t.buffer_write_en1.firstNs+70,t.buffer_write_en1.lastNs]),
   step('激活写回完成','14 行 Y 已保存，激活资源结束。','完成激活与通知主机由不同流程负责。','下一课 synchronise 说明何时可以安全读回。',['activation','unified'],[],end('activation_resource_busy'),end('activation_resource_busy'),end('activation_resource_busy'))
  ];
 }else if(stage===4){
  goal='等待三套计算资源结束，再向主机发出一次同步 IRQ。';
  prerequisite='前面的加载、乘法和激活已经提交。synchronise 检查完成状态，不搬运矩阵。';
  steps=[
   step('接收同步指令','FIFO 将 synchronise 交给核心，协调器开始处理等待。','主机需要一个统一的完成通知。','随后检查三套资源是否仍忙。',['fifo','control'],['e3'],receive,t.syncWaitingEdges[0]-10,receive),
   step('等待所有计算资源结束','协调器反复检查权重、乘法和激活的资源忙标志；整个等待区间合成一步。','只有相关资源全部结束，主机才能安全取得最终输出。','三项状态全部完成后才发出同步通知。',['control'],[],t.syncWaitingEdges[0],t.syncWaitingEdges.at(-1),t.syncWaitingEdges[0],[t.syncWaitingEdges[0],end('mmu_resource_busy'),t.syncWaitingEdges.at(-1)],[],['e4']),
   step('发出同步 IRQ，通知主机','本例 IRQ 引脚在 '+t.irqPin.riseNs[0]+' ns 拉高；图中主机在 '+t.synchronize.firstNs+' ns 采样到它。','引脚跳变时刻和主机消费采样沿需要分开。','同步完成；主机读回属于后续主机操作。',['control','axi','host'],['e16','host-read'],t.synchronize.firstNs,t.synchronize.firstNs,t.synchronize.firstNs)
  ];
 }else{
  goal=stage===0?'主机把 A、W 写入缓存，为计算准备数据。':'主机读取已完成的 Y，核对实际输出。';
  prerequisite=stage===0?'这是前置主机操作，不是 NPU 计算指令。':'同步已经完成；这是结果验证主机操作。';
  if(stage===0){
   const firstWeight=frames.find(f=>f.weight_enable===1&&f.weight_write_enable>0).ns;
   const initFrames=frames.filter(f=>f.ns<c.commands[0].submittedNs);
   const lastWrite=initFrames.filter(f=>f.weight_enable===1&&f.weight_write_enable>0||f.buffer_enable===1&&f.buffer_write_enable>0).at(-1).ns;
   const lastResponse=initFrames.filter(f=>f.bvalid===1&&f.bready===1).at(-1).ns;
   steps=[step('主机提交写请求','主机分别提交 AW 地址和 W 数据，AXI 接收后锁存。','地址与数据通道独立握手。','AXI 将数据和字节掩码转换成缓存端口。',['host','axi'],['host-write'],t.hostWrite.firstAddressNs,firstWeight-10,t.hostWrite.firstDataNs),step('把 A 和 W 写入两块缓存','主机按行写入，两块缓存分别保存输入和权重；所有重复写入合成一步。','计算前需要实际填好 RAM。','后续可提交 NPU 指令。',['axi','weight','unified'],['e0','e1'],firstWeight,lastWrite,firstWeight,[firstWeight,firstWeight+40,lastWrite]),step('数据初始化完成','输入、权重已经写好，最后一次写响应已被主机接收。','缓存数据不会由 read_weights 自动创建。','进入四条 NPU 指令的独立课程。',['weight','unified'],[],lastResponse,lastResponse,lastResponse)];
  }else steps=[step('主机提交读地址','主机在 AR 握手时提交统一缓存地址。','先请求，之后才有数据响应。','等待缓存和 AXI 读流水。',['host','axi','unified'],['host-write'],t.hostRead.firstAddressNs,t.hostRead.firstResponseNs-10,t.hostRead.firstAddressNs),step('接收并核对 56 个读响应','只在 RVALID/RREADY 握手时消费 RDATA，重复读回合成一步。','每行 14 个输出字节和 2 个填充字节需要按字核对。','196 个输出和 28 个填充字节全部通过。',['unified','axi','host'],['ub-read','host-read'],t.hostRead.firstResponseNs,t.hostRead.lastResponseNs,t.hostRead.firstResponseNs,[t.hostRead.firstResponseNs,t.hostRead.firstResponseNs+240,t.hostRead.lastResponseNs]),step('全部结果核对通过','testbench 已核对完整输出。','读取最终缓存可以验证真正保存的结果。','本例正常结束，未将超时当作成功。',['host'],[],t.hostRead.lastResponseNs+10,t.hostRead.lastResponseNs+20,t.hostRead.lastResponseNs+20)];
 }
 return {goal,prerequisite,steps,start:steps[0].start,end:steps.at(-1).end};
}
