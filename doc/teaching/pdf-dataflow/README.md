# PDF 数据流实验与 GTKWave 波形

在 `9fffbb67b8b344d9269766f9ee6f4750be714841` 的实际 RTL 上，用 GHDL 5.0.1 跑两组完整 AXI 端到端仿真，再由 GTKWave 3.3.121 读取原生 GHW 并导出波形。两组均通过，仿真在 8826 ns 自检完成后主动结束。本实验没有修改 DUT。

打开 [波形教学索引](index.html) 可切换两组实验、查看六个阶段和完整实测矩阵；[中文波形报告](waveform-report.pdf) 适合下载打印。`views/` 包含 12 张 PNG、12 个原生矢量 PDF/PS 和 12 个可编辑 `.gtkw` 会话；`results/` 保存 GHW、VCD、自检日志、逐拍分析及 GTKWave 内部数组采样。

## 与 PDF 的对应关系

PDF 的实验序列是 `read_weights 0 N → matrix_multiply 0 0 N → activate 0 0 N → synchronise`，激活结果原地回写统一缓存第 0 行。PDF 未指定具体输入、权重和激活类型，本次按用户确认选择 N=14、直通与有符号 ReLU。所有数据地址为 0，前三条长度为 14，同步长度为 0。PDF 最后一图题为“总线写缓存”，所以补画初始化 AXI 写缓存波形；另画同步后的 AXI 读回来验证输出。

| 操作 | 直通组 opcode | ReLU 组 opcode |
|---|---:|---:|
| 加载权重 | 0x08 | 0x09 |
| 矩阵乘法（覆盖累加器） | 0x20 | 0x21 |
| 激活并回写 | 0x80 | 0x91 |
| 同步 | 0xFF | 0xFF |

指令为 80 位：`[79:56] buffer_address(24)`、`[55:40] acc_address(16)`、`[39:8] length(32)`、`[7:0] opcode(8)`；加载权重时前两段合成 40 位权重地址。主机在 0x90004、0x90008、0x9000C 依次写低 32 位、中 32 位、最高 16 位。统一缓存的 AXI 基址为 0x80000，权重缓存为 0；每行 14 字节占 16 字节地址步长，最后一个 32 位字仅写低两字节（WSTRB=0x3）。

## 数据及结论

索引 i、j、k 均从 0 到 13；实际验证 `C[i,j]=Σ A[i,k]×W[k,j]`，没有把权重转置。

- 直通组：`A[i,j]=i+2j+1`；W 主对角线为 2、上邻对角线为 1，其余为 0。原始点积 `C[i,0]=2(i+1)`，`C[i,j]=3i+6j+1 (j>0)`，范围为 2～118。**NO_ACTIVATION 实际取 C[31:24] 高 8 位**，因此本组输出全部为 0；这是对之前“取低 8 位”说法的纠正。GTKWave 同时验证了全部 196 个原始点积，避免仅凭输出全零判定通过。
- ReLU 组：`A[i,j]=4(i-j)`；`W=64I`；原始点积 `C=256(i-j)`；实际输出 `max(0,i-j)`。输入包含负数、零和正数，本组没有触发正向饱和。RTL 的有符号 ReLU 是先按低字节最高位舍入右移 8 位，再截负值为 0、截大于 127 的值为 127；本组 C 全是 256 的整数倍。
- 每组校验 196 个权重值、196 个 MMU 原始结果、196 个激活写回字节，以及 56 次 AXI 读回中的 196 个输出字节和 28 个填充字节。前三级通过 GTKWave Tcl 在原生 GHW 上逐向量取值；AXI 结果由 VHDL 自检及独立 VCD 握手分析核对。另核对 112 次初始化写入和 12 次指令字写入，所有有效响应均为 OKAY。

## 实测时序

10 ns 时钟。下表为**上升沿到达前**信号有效时被消费的采样沿；14 个连续有效沿的首尾差为 13 个周期。不是信号拉高沿的时间。两组控制时序相同。

| 事件/信号 | 首个有效采样沿 ns | 最后有效采样沿 ns | 数量 |
|---|---:|---:|---:|
| 权重指令 `weight_instruction_en` | 4785 | 4785 | 1 |
| 权重缓存读 `weight_en0` | 4825 | 4955 | 14 |
| MMU 权重加载 `mmu_load_weight` | 4855 | 4985 | 14 |
| 乘法指令 `mmu_instruction_en` | 4795 | 4795 | 1 |
| 统一缓存读 `buffer_en0` | 4835 | 4965 | 14 |
| 切换权重 `mmu_activate_weight` | 4865 | 4865 | 1 |
| 写入累加器 `reg_write_en` | 5025 | 5155 | 14 |
| 激活指令 `activation_instruction_en` | 4975 | 4975 | 1 |
| 激活回写 `buffer_write_en1` | 5305 | 5435 | 14 |
| 同步 IRQ 被采样 | 5445 | 5445 | 1 |
| 主机读响应握手 | 5505 | 8805 | 56 |

IRQ 引脚实际在 **5435 ns 拉高，5445 ns 拉低**，宽 10 ns；主机在 5445 ns 的上升沿消费该脉冲。协调器在 5035～5435 ns 的 41 个采样沿等待资源完成；主机第一次 AR 握手为 5455 ns，第一次 R 握手为 5505 ns，相差 5 周期。

从上述端点测得：权重指令到缓存读 4 周期、到 MMU 权重加载 7 周期；乘法指令到统一缓存读 4 周期、到累加器写入 23 周期；激活指令到实际回写 33 周期。这些端点均在图中标注。PDF 图中的 5、21、9、12 等数字不能直接当作这些端到端延迟：控制流水和模块内部延迟的计时起点不同，激活地址管线还依赖 N。资源操作允许流水重叠，不能把四条指令的启动沿当作严格串行完成沿。

读图时，操作码只在相应 `instruction_en` 有效时有意义；地址/数据只在对应读写使能或 VALID/READY 握手时有意义。未初始化 RAM 或无效流水周期的 U/X、AXI 无效周期的响应默认值，以及空闲时继续变化的地址，都不能作为有效计算结果。日志保留了 numeric_std 的初始化/流水排空警告；有效事务和结果均已检查。两组实验覆盖这两条具体数据路径，并不等于验证所有指令、饱和边界或任意 AXI 背压。

## 复现

在仓库根目录（或下载包解压出的根目录）执行：

```bash
python3 doc/teaching/pdf-dataflow/run_simulations.py
python3 doc/teaching/pdf-dataflow/analyze_vcd.py
python3 doc/teaching/pdf-dataflow/render_gtkwave.py
python3 doc/teaching/pdf-dataflow/build_report.py
```

需要 GHDL（VHDL-2008、`-frelaxed-rules`）、带 Tcl 的 GTKWave、Ghostscript，以及 Python 的 PyMuPDF。无桌面机器可先运行 `Xvfb :94 -screen 0 2200x1500x24 -nolisten tcp`，设置 `DISPLAY=:94`。`GHDL`、`GTKWAVE` 可覆盖可执行文件路径；`TINYTPU_ROOT` 可覆盖 RTL 仓库根目录，`TINYTPU_RESULTS` 可覆盖结果目录。波形视图会生成在结果目录同级的 `views/`。从已有数据重做图片也可仅运行后两步。

手工打开示例（从 views 目录运行）：

```bash
cd doc/teaching/pdf-dataflow/views
gtkwave ../results/relu.ghw relu-02-multiply.gtkw
```

GHW 保存 VHDL 原生数组/记录，VCD 用于标准标量控制与总线信号。需查看数组时优先打开 GHW。`.gtkw` 已使用相对波形路径；显式指定 GHW 的上述命令也可避免工作目录差异。

`results/manifest.json` 记录实际 RTL 基线与源文件哈希，`artifact-manifest.json` 记录交付文件哈希。GTKWave 图中的主光标置于所选消费沿前 1 fs，便于显示稳定输入；字母标记为表中采样沿。总线窗口显示代表性事务，完整 56 次读回与所有矩阵值见日志/JSON 和教学索引。GTKWave 原生 PS/PDF 保留完整导出，PNG 仅裁去打印页的空白边缘。
