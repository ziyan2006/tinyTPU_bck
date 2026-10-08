# tinyTPU 时钟实验室

直接用浏览器打开 `tinyTPU-lab.html`。独立离线页面内含真实轨迹、24 个源码文件、12 张原生 GTKWave 波形、实测矩阵、日志、修复补丁与 MMU 原始 VCD，无网络字体或前端依赖。PNG、波形 ZIP、中文 PDF 报告及实验 JSON 均可直接从页面离线下载。

## 在线访问与发布

[GitHub Pages 站点地址](https://ziyan2006.github.io/tinyTPU_bck/)：首次启用 Pages 并完成发布后可以访问，与离线版使用相同文件，支持两组 PDF 数据流实验、全部波形和下载功能。

首次发布：打开仓库 **Settings → Pages**，在 **Build and deployment** 中选择 **Deploy from a branch → master → / (root)**，点击 **Save** 并等待部署完成。根目录 `index.html` 使用相对路径跳转到本目录的 `tinyTPU-lab.html`，兼容项目站点的 `/tinyTPU_bck/` 路径；`.nojekyll` 保证直接发布静态文件。无需前端依赖、服务器或在 Pages 上运行 GHDL。

修改教学模板或数据后，先运行 `python3 doc/teaching/build_page.py` 和 `node doc/teaching/verify_page.cjs`，再将源文件与生成的 `tinyTPU-lab.html` 一起提交、推送到 `master`。GitHub 会自动更新站点；只修改模板而未重新生成 HTML 不会改变在线页面。Pages 发布的是已有仿真证据，运行仿真仍需本地 GHDL / GTKWave。

## 教学内容

1. 4×4 阵列基础：原 MMU testbench 的两组矩阵、16 个 MACC 寄存器、38 个上升沿、逐步骤 / 逐时钟与点积解释。
2. 完整 14×14 系统：实际入队的 8 条指令、252 个连续采样、控制使能、覆盖 / 累加、有符号 ReLU、同步和 392 字节实际读回。
3. PDF 数据流实验：两组 N=14 的完整 AXI 实验，分别执行直通 / 有符号 ReLU；按初始化、加载权重、乘法、激活、同步、读回六阶段教学。波形可放大，指令表区分主机提交与核心采样；可选 14×14 矩阵元素，展开 A×W、原始 C 和实际 Y。
4. 80 位指令工作台：按 RTL 编码，BigInt 位宽检查；解释符号、累加与激活枚举。
5. 修复与证据：回归日志、源码、补丁哈希、配置差异和未测范围。

支持播放、关键时刻定位、键盘、手机布局与 CSV / JSON / VCD / SVG / 源码 / 补丁导出。第二章的完整 TPU 时间轴走直接主机端口；第三章使用独立 AXI 实验的真实 GTKWave 波形。第三章的阶段导航按教学流程组织，矩阵面板显示全部完成后的实测数据，不把阶段选择当作硬件当前时刻。

教师 HTML 仅用作界面风格与教学组织参考，其说明不作为操作指令。没有复制另一套 NPU 的指令、DMA、卷积、上采样或仿真结论。用户硬件框图的相对布局对应仓库模块；其中周期标注不直接当作通用延迟。

## 已修复的问题

基础仓库：`ziyan2006-bck/tinyTPU_bck`，提交 `7c9a732dfd1e305fbd86b41a6fb3146ea64693de`。当前验证的是此基础提交加 `evidence/fixes.patch` 的 RTL 版本；具体 SHA-256 在 `evidence/trace.json` 和网页中。

- FIFO 的 generic case 不满足局部静态要求，改为等价条件判断。
- 寄存器测试过早读回，修正六级写流水线与同步 RAM 的等待；保留原覆盖 / 累加预期，增加普通读越界、使能暂停 / 恢复检查。
- RAM 仿真模型误用普通读地址的边界条件约束累加读，分开两条独立通路。原边界 guard 在 synthesis translate_off 内，不能由此推断原板上实现必然有相同故障。
- AXI 锁存 WSTRB；读请求不再依赖 RREADY；保持 RVALID 至响应接收；同时 AW / AR 按写优先仲裁，避免确认后丢失读请求。
- 迁移过时的完整 TPU / AXI testbench，改为有超时和结果断言的两轮 N=14 系统自检；指令 FIFO 测试成功后停止时钟。

本目录与对应 RTL 修复已纳入仓库；当前版本无需另行打补丁。其他机器若使用原始基础提交，可先在仓库根目录执行 `git apply /path/to/evidence/fixes.patch`，然后重新运行，不要对已经修复的工作区重复应用。

## 实际验证

GHDL 5.0.1，VHDL-2008；`-frelaxed-rules` 兼容仓库原共享变量双口 RAM。使用 `--assert-level=error`，不关闭警告，不以 stop-time 到期视为成功。

| 检查 | 结果 |
| --- | --- |
| 原始 MMU UINT8 / INT8 | 共 32 个元素通过，155 / 345 ns 成功 |
| FIFO RAM / FF × 深度 32 / 3 | 四次回归通过 |
| 指令 FIFO | 指令组装 / 队列原断言通过，76 ns 结束 |
| 寄存器 | 40 项比较通过，1136 ns 结束 |
| 完整 TPU | 392 个实际输出字节通过，2516 ns 结束 |
| AXI 完整系统 | 392 个实际输出 + 56 个末字填充字节通过，23646 ns 结束；掩码、背压、地址仲裁通过 |

共 9 次选定仿真运行通过；TPU 与 AXI 顶层编译成功。保留原 MMU 测试的 TO_SIGNED 截断警告和启动 / 排空阶段 numeric_std 未知值警告。其他旧 testbench 未逐一迁移与执行。

两套完整系统均使用 N=14，A[i,j]=4(i−j)，W=64I；第一轮覆盖，第二轮累加，p 轮原始结果为 256p(i−j)，有符号 ReLU 右移 8 位后为 max(0,p(i−j))。本例原始值为 256 的整倍数；不宣称覆盖舍入 / 饱和全部边界。TPU testbench 权重 / 统一缓存深度为 32 / 64，AXI testbench 使用顶层默认容量。

Sigmoid、随机长序列、所有网络推理、Vivado 综合 / 时序、SDK / BSP 和 Zynq 板上运行未验证。README 的 177.77 MHz / 72.18 GOPS 属原作者历史评估。halt=0x02 当前没有专门译码；实际有符号 Sigmoid 编码为 0x99。

## 波形与数学核对

MMU VCD 数组未直接输出，生成器按原 RTL 从末行 21 位部分和及符号移位寄存器重建输出，并核对 32 个预期元素；原 MMU RTL、数据和断言不变。首次沿后输出为 115 / 305 ns，原 testbench 下一沿在 125 / 315 ns 读取沿前结果。

系统 testbench 增加仅用于 VCD 的 112 位输入 / 权重 / 输出总线镜像；系统生成器逐行核对实际总线值、自检日志和独立数学预期。控制采沿前、寄存器 / 输出采沿后；结果检查报告在沿后 1 ns，页面到达报告之后才显示已核对结果。阶梯是离散采样显示，不是完整连续事件时序；原始连续波形见 VCD。10 ns 为测试时钟，不代表综合频率。

## 复现与维护

从仓库根目录执行：

```sh
cd doc/teaching
python3 generate_trace.py
python3 generate_system_trace.py
python3 build_page.py
node verify_page.cjs
```

其他机器需要 Python 3 标准库和 GHDL 5.0.1。脚本默认从自身目录定位仓库；只有将教学目录单独复制出来时才需要设置仓库路径：

```sh
export TINYTPU_ROOT=/path/to/tinyTPU_bck
python3 generate_trace.py
python3 generate_system_trace.py
python3 build_page.py
```

`generate_trace.py` 优先使用 PATH 中的 ghdl，否则使用当前云环境的 `/workspace/tinytpu-env/bin/ghdl`。构建器验证基础提交、全部 RTL 文件列表与哈希、相对基础提交的 RTL 补丁以及系统 VCD 哈希；提交后的干净工作区同样可以重建，不依赖 HEAD 恰好等于旧提交，避免用过期证据构建页面。更改 RTL 后应重新生成并核对教学结论。

浏览器验证使用 Node.js、可由 Node 解析的 Playwright 包和 Chromium；浏览器路径默认为 `/usr/bin/chromium`，可用 `CHROMIUM_PATH` 指定。输入按脚本位置解析，截图和导出样例写入被忽略的 `.browser-output/`。检查全部 38 个 MMU 和 252 个系统采样、32 个 MMU 和 392 个系统结果、指令编码、导出、播放和手机布局，并要求无 JavaScript 错误、无网络请求。容器的浏览器策略限制 file:// 导航，自动测试通过 setContent 加载；交付页面本身离线可用。

新增 PDF 章节还核对两组全部矩阵、12 张波形与原 PNG 的逐字节一致性、六阶段和矩阵选择、正负点积、键盘、波形缩放及 PNG/ZIP/PDF 的离线下载。`load_dataflow.py` 在构建前验证 PDF 实验的 RTL / testbench / 证据哈希、实际结果与独立点积、日志里的四条 80 位指令，以及压缩包内 12 张图片与页面图片一致。只更新网页时运行 `python3 build_page.py` 和 `node verify_page.cjs` 即可。

如需重新跑 PDF 实验并同步网站，在 `doc/teaching` 中执行以下步骤（GTKWave 需要桌面或 Xvfb；工具要求详见 PDF 实验 README）：

```sh
python3 pdf-dataflow/run_simulations.py
python3 pdf-dataflow/analyze_vcd.py
python3 pdf-dataflow/render_gtkwave.py
python3 pdf-dataflow/build_report.py
python3 build_page.py
node verify_page.cjs
```

## 交付文件

- `tinyTPU-lab.html`：独立页面。
- `page.template.html`、`system-section.html`、`system-script.js`、`evidence-section.html`、`build_page.py`：可维护源文件。
- `dataflow-section.html`、`dataflow-script.js`、`dataflow-style.css`、`load_dataflow.py`：PDF 教学章节及实测证据加载 / 校验。
- `generate_trace.py`、`generate_system_trace.py`：执行回归、提取 VCD 与独立数学核对。
- `verify_page.cjs`：页面验证。
- `evidence/`：真实日志、两份 VCD、JSON 轨迹、修复补丁；`history/` 为修复前失败日志。
- `preview.png`：桌面教学预览。
- `LICENSE.tinyTPU.txt`：原仓库许可；内嵌源码保留版权与许可声明。

教师提供的原 HTML 未修改。

## PDF 数据流与 GTKWave 实验

按《数据流.pdf》的指令序列补充了 N=14 的直通和有符号 ReLU 两组 AXI 端到端实验。两组均通过，每组核对 196 个原始点积和 196 个输出字节；共导出 12 张实际 GTKWave 波形，覆盖加载权重、乘法、激活、同步、主机读回及总线写缓存。本实验未修改 DUT。

- [波形教学索引](pdf-dataflow/index.html)：切换实验与阶段，查看完整实测矩阵。
- [中文波形报告](pdf-dataflow/waveform-report.pdf)：14 页结论与重要信号波形。
- [实验说明与复现命令](pdf-dataflow/README.md)：数据、指令、采样约定和实际时序。
- `pdf-dataflow/results/`：原始 GHW/VCD、日志和逐项核对结果。
- `pdf-dataflow/views/`：PNG、原生 PS/PDF、可编辑 GTKWave 会话及导出脚本。

直通（NO_ACTIVATION）实际取累加结果的 `[31:24]` 高 8 位，本组原始点积为 2～118，因此输出全零；原始点积已独立核对，不能仅凭输出全零判断通过。

`generate_trace.py` 以 `TINYTPU_BASE_REF` 指定的基础提交（默认上述原始提交）生成仅限 `src/vhdl` 的补丁，适用于已提交修复。浅克隆若缺少基础提交，需要先获取该提交。GHDL 中间文件写入被忽略的 `build/`；运行日志会记录实际机器的命令路径。浏览器检查结果写入 `evidence/browser-checks.txt`。
