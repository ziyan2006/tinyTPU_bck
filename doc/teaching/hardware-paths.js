// Descriptions refer to the real ports. Amber paths explain a pipeline;
// they do not claim that a data vector was consumed on the displayed edge.
const HW_PATH_INFO={
 e0:['写入输入缓存','主机初始化时，把 AXI 锁存的输入字节写入统一缓存。','数据 + 地址/使能','32 位主机写数据经字节掩码写入 112 位缓存行。','BUFFER_ENABLE 和 BUFFER_WRITE_ENABLE 有效。','src/vhdl/AXI/tinyTPU_v1_0_S00_AXI.vhd'],
 e1:['写入权重缓存','主机初始化时，把 W 写入权重缓存。read_weights 后续读取这里的数据。','数据 + 地址/使能','32 位主机写数据、缓存地址和字节写掩码。','WEIGHT_ENABLE 和 WEIGHT_WRITE_ENABLE 有效。','src/vhdl/AXI/tinyTPU_v1_0_S00_AXI.vhd'],
 e2:['组装 80 位指令','AXI 将一条命令分三次写入 FIFO；收齐分字才形成完整指令。','指令数据','低 32 位、中 32 位、高 16 位；WRITE_EN 选择分字。','INSTRUCTION_WRITE_EN 非零。当前分字也可能属于后续指令。','src/vhdl/Instruction_FIFO/INSTRUCTION_FIFO.vhdl'],
 e3:['把命令交给核心','从 FIFO 取出一条完整指令，进入核心的前瞻、译码和协调流水。','指令数据','80 位：opcode、长度、起始地址。','INSTRUCTION_ENABLE=1。FIFO 出队与对应控制单元启动在不同采样沿。','src/vhdl/TPU_CORE.vhdl'],
 e4:['协调下一条指令','协调器控制是否允许继续取指；资源忙状态参与调度和同步判断。','控制','取指推进/允许信号与内部资源忙状态。','协调器根据依赖和同步等待决定是否推进。这不是权重 RAM 向 FIFO 返回数据的通路。','src/vhdl/Control_Unit/CONTROL_COORDINATOR.vhdl'],
 e5:['请求读取 A','乘法控制器告诉统一缓存读取哪一行输入。','地址 / 使能控制','BUFFER_EN0 和 24 位 BUFFER_ADDRESS0；不携带 A 的数值。','BUFFER_EN0=1。发出请求后要等待缓存读流水。','src/vhdl/Control_Unit/MATRIX_MULTIPLY_CONTROL.vhdl'],
 e6:['请求读取 W','权重控制器告诉权重缓存读取哪一行。','地址 / 使能控制','WEIGHT_EN0 和 40 位 WEIGHT_ADDRESS0；不携带权重数值。','WEIGHT_EN0=1。首个请求 4825 ns，首个 MMU 装载 4855 ns。','src/vhdl/Control_Unit/WEIGHT_CONTROL.vhdl'],
 e7:['控制 MMU 工作方式','安排阵列的权重预装、权重切换及计算使能。','使能 / 模式控制','LOAD_WEIGHT、ACTIVATE_WEIGHT 等 MMU 控制信号。','对应控制信号有效；控制线本身不搬运输入向量。','src/vhdl/TPU_CORE.vhdl'],
 e8:['安排累加器地址与模式','控制 C 写到哪里、覆盖还是累加，以及激活时从哪里读。','地址 / 模式控制','REG_WRITE_EN、写/读地址、ACCUMULATE。','写入看 REG_WRITE_EN；读地址经寄存文件流水处理，单看地址变化不能证明输出已有效。','src/vhdl/Register_File/REGISTER_FILE.vhdl'],
 e9:['选择激活规则','把 FUNCTION 和 SIGNED 送给激活单元，决定如何将 32 位结果变为 8 位输出。','模式控制','直通或 ReLU，以及有符号选项。','随激活控制流水设置模式。启动 activate 不代表 Y 已写回。','src/vhdl/Control_Unit/ACTIVATION_CONTROL.vhdl'],
 e10:['输入向量交给 SDS','统一缓存的读流水输出 A 的一行，交给数据准备单元。','矩阵数据','112 位 = 14 个 8 位输入；此时各通道仍来自同一行。','本次读取的有效行到达缓存输出。首行在 4865 ns 到达。','src/vhdl/Unified_Buffer/UNIFIED_BUFFER.vhdl'],
 e11:['权重向量预装到 MMU','MMU 把来自权重缓存的向量装入预装寄存器，供后续运算使用。','矩阵数据','112 位 = 14 个 8 位权重；同时使用 MMU 权重地址。','MMU_LOAD_WEIGHT=1；本例 4855～4985 ns 共 14 个有效装载沿。','src/vhdl/MMU/MATRIX_MULTIPLY_UNIT.vhdl'],
 e12:['错拍输入进入阵列','SDS 的通道 j 延迟 j 个使能拍，使输入与阵列中的权重、部分和流水对齐。','矩阵数据','112 位输入，但同一拍各通道可能属于不同的 A 行。','只解释本次读取产生的有效通道。不能把这些值拼成 A 的完整一行。','src/vhdl/SDS/SYSTOLIC_DATA_SETUP.vhdl'],
 e13:['保存原始点积 C','MMU 把形成的点积交给累加器/寄存文件，按地址覆盖或累加。','矩阵数据','448 位 = 14 个 32 位点积；本组 ACCUMULATE=0。','REG_WRITE_EN=1；本例 5025～5155 ns 共 14 行交接。','src/vhdl/Register_File/REGISTER_FILE.vhdl'],
 e14:['C 进入激活流水','累加器读出的 32 位原始结果送入激活单元，进行截取、舍入或 ReLU。','矩阵数据 / 流水处理','448 位 = 14 个 32 位 C；输出另见激活回写通路。','琥珀虚线表示这段流水正在处理；没有独立读有效信号的逐拍实测向量，不将瞬时端口值标成已消费数据。','src/vhdl/Activation/ACTIVATION.vhdl'],
 e15:['把 Y 回写统一缓存','激活将 14 个输出字节写入统一缓存，供主机或下一层读取。','矩阵数据 + 写控制','112 位 = 14 个 8 位 Y，连同写回地址和使能。','BUFFER_WRITE_EN1=1；本例 5305～5435 ns 写回 14 行，覆盖原来的 A。','src/vhdl/TPU_CORE.vhdl'],
 e16:['发送同步完成通知','三套资源全部结束后，协调器经 AXI 包装器输出 IRQ，告诉主机可以读结果。','完成通知','SYNCHRONIZE / IRQ；不携带矩阵数据。','本例 IRQ 在 5435 ns 拉高，主机在 5445 ns 采样到一次脉冲。','src/vhdl/Control_Unit/CONTROL_COORDINATOR.vhdl'],
 'host-write':['主机提交 AXI 请求','写操作分别提交地址 AW 和数据 W；读操作提交地址 AR。','总线请求','20 位地址、32 位写数据及 WSTRB；地址与数据通道独立。','对应 VALID 和 READY 同时为 1；提交请求不等于已经收到响应。','doc/teaching/pdf-dataflow/TB_PDF_DATAFLOW.vhdl'],
 'host-read':['主机接收 AXI 响应或 IRQ','B 返回写响应，R 返回读数据，IRQ 通知整段计算已完成。','响应 / 完成通知','B 响应状态，32 位 RDATA，或 1 位 IRQ。','B/R 只在 VALID 和 READY 同时有效时被消费；IRQ 单独采样。','doc/teaching/pdf-dataflow/TB_PDF_DATAFLOW.vhdl'],
 'ub-read':['读回已保存的 Y','主机通过 AXI 读取统一缓存的最终结果，testbench 对字节逐一核对。','矩阵数据','每行 4 个 32 位响应：14 个输出字节 + 2 个零填充字节。','RVALID/RREADY 握手时消费。首个响应 5505 ns，最后响应 8805 ns。','src/vhdl/AXI/tinyTPU_v1_0_S00_AXI.vhd']
};
function openHardwarePath(id){
 stop();
 const e=HW_EDGES.find(e=>e.id===id),info=HW_PATH_INFO[id],a=hwPresentation(),f=hwFrame();
 if(!e||!info)return;
 $('hw-path-title').textContent=info[0];
 $('hw-path-endpoints').textContent=HW_NODES[e.from].title+' → '+HW_NODES[e.to].title;
 $('hw-path-purpose').textContent=info[1];$('hw-path-kind').textContent=info[2];
 $('hw-path-payload').textContent=info[3];$('hw-path-validity').textContent=info[4];
 const state=a.edges.has(id)?'本沿有有效传输或控制采样。':a.processing.has(id)?'本步关注这段流水；琥珀虚线不代表本沿有新数据交接。':a.waiting.has(id)?'协调器正在等待；此线表示调度关系，不传输矩阵。':a.allowed.has(id)?(hwClock()?'此模式保留该通路，但所选沿没有新的有效交接。':'本步骤会使用这条通路，但所选沿没有新的有效交接。'):'本步骤未使用这条通路。';
 $('hw-path-current').textContent=HW_NAMES[flowStage]+' · '+f.ns+' ns：'+state;
 $('hw-path-events').textContent=a.events.filter(x=>x.edge===id).map(x=>x.text).join('；');
 $('hw-path-source').onclick=()=>{$('hw-path-dialog').close();openSource(info[5])};
 $('hw-path-dialog').showModal();
}
