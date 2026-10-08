"""Build an offline Chinese index and a PDF containing real GTKWave exports."""
from pathlib import Path
import os,json,hashlib,html,re
import fitz

HERE=Path(__file__).resolve().parent
OUT=Path(os.environ.get('TINYTPU_RESULTS',str(HERE/'results'))).resolve()
BASE=OUT.parent
VIEWS=BASE/'views'
MAN=json.loads((OUT/'manifest.json').read_text())
DATA={case:json.loads((OUT/(case+'-analysis.json')).read_text()) for case in ['passthrough','relu']}
NATIVE={case:json.loads((OUT/(case+'-native-verified.json')).read_text()) for case in DATA}
STAGES=[
 ('01-weights','加载权重','权重缓存 → MMU 预装寄存器。观察 weight_en0、mmu_load_weight 与地址 0～13；两者有效采样分别从 4825、4855 ns 开始，MMU 共加载 14 个向量。'),
 ('02-multiply','矩阵乘法','统一缓存 → SDS 错拍 → MMU → 累加器。观察 buffer_en0、各 lane 的错拍数据及 reg_write_en。累加器在 5025～5155 ns 连续写入 14 个原始结果向量，reg_accumulate=0。'),
 ('03-activation','激活与回写','累加器 → 激活 → 统一缓存。写使能在 5305～5435 ns 有效，写地址为 0～13。主光标选第 7 行的写入沿前：ReLU 输出 lane0=7、lane1=6、lane13=0；直通输出均为 0。'),
 ('04-synchronize','同步与 IRQ','协调器在 5035～5435 ns 等待资源。IRQ 引脚在 5435 ns 拉高、5445 ns 拉低；5445 ns 的上升沿被主机采样一次。en_flags_cs=0x1 代表同步，须与 instruction_en_cs 同看。'),
 ('05-host-readback','主机读回','展示前两行的 8 次 AXI 读。首次 AR 握手 5455 ns、R 握手 5505 ns，相差 5 周期；全程 56 次读至 8805 ns。有效 RRESP=0；RDATA 在 RVALID/RREADY 握手时与参考字比较。'),
 ('06-host-write-cache','总线写缓存','对应 PDF 最后一张图。先由主机交错写入权重和输入；统一缓存 AXI 地址从 0x80000 开始。展示第 0 行的初始化，最后一字 WSTRB=0x3，仅写 lane12/13。AW、W、B 分别握手；无效周期的响应默认值不代表事务错误。'),
]
CASE_TITLE={'passthrough':'直通 / 0x80','relu':'有符号 ReLU / 0x91'}
for case in DATA:
 assert DATA[case]['actualHostOutput']==NATIVE[case]['actual']['activation']
 assert DATA[case]['rawExpected']==NATIVE[case]['actual']['mmu']
 assert all(v==196 for v in NATIVE[case]['checkedValues'].values())
 for stem,_,_ in STAGES:
  for suffix in ['png','pdf','ps','gtkw']:
   assert (VIEWS/(case+'-'+stem+'.'+suffix)).is_file()

bundle={case:{'title':CASE_TITLE[case],'analysis':DATA[case],'native':NATIVE[case]} for case in DATA}
payload=json.dumps({'cases':bundle,'stages':STAGES},ensure_ascii=False).replace('</','<\\/')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>tinyTPU · PDF 数据流波形实验</title>
<style>
:root{--ink:#172c46;--blue:#2466c0;--line:#d8e2ee;--muted:#5a6d84}*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:var(--ink);font:16px/1.7 system-ui,"Noto Sans CJK SC",sans-serif}main{max-width:1320px;margin:auto;padding:40px 24px}h1{font-size:34px;line-height:1.3;margin:8px 0}h2{font-size:22px;margin:0 0 16px}p{margin:12px 0}header{margin-bottom:28px}.eyebrow{letter-spacing:.15em;color:var(--blue);font-size:13px}.muted{color:var(--muted)}.badge{display:inline-block;color:#127448;background:#e4f5eb;padding:4px 14px;border-radius:20px}.panel{background:white;border:1px solid var(--line);border-radius:12px;padding:24px;margin:20px 0}.toolbar{display:flex;gap:16px;align-items:center;flex-wrap:wrap}select,button{font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--ink)}button{cursor:pointer}button[aria-pressed=true]{background:var(--blue);color:white;border-color:var(--blue)}nav{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}a{color:var(--blue)}.links{display:flex;flex-wrap:wrap;gap:18px;margin:10px 0}.wave{overflow:auto;border:1px solid var(--line);background:white}.wave img{display:block;width:100%;min-width:900px;cursor:zoom-in}.note{border-left:4px solid var(--blue);padding:12px 20px;background:#edf4ff}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px;border:1px solid var(--line);text-align:center}th{background:#edf3fa}code,pre{font-family:ui-monospace,monospace}pre{background:#f1f5fa;padding:16px;overflow:auto}.matrix td{padding:5px;min-width:45px;font-family:ui-monospace,monospace}.negative{color:#a43944;background:#fff0f0}.positive{color:#126d53;background:#ecfaf4}details{margin:16px 0}summary{cursor:pointer;font-weight:600}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:800px){main{padding:24px 12px}h1{font-size:27px}.panel{padding:16px}.grid{grid-template-columns:1fr}}
</style><main><header><span class="eyebrow">tinyTPU / GTKWave / ACTUAL RTL</span><h1>跟着 PDF 看一次真实的数据流</h1><p class="muted">N=14 · 10 ns 时钟 · 两组 AXI 端到端仿真 · 每组六个观察窗口</p><span class="badge">两组全部通过 · 每组 196 个输出字节</span><p>波形由 GTKWave 读取 GHDL 原生 GHW 后导出。权重、原始点积、激活写回和主机读回均已核对；本实验未改动 DUT。</p><div class="links"><a href="waveform-report.pdf">下载中文波形报告</a><a href="README.md">实验与复现说明</a><a href="results/manifest.json">RTL 基线与哈希</a></div></header>
<aside class="note"><b>先理解“直通”的实际含义。</b>当前 NO_ACTIVATION 取累加结果 <code>[31:24]</code> 高 8 位，本组原始值 2～118，所以输出为 0。有符号 ReLU 则先舍入右移 8 位，本组输出 <code>max(0,i-j)</code>。PDF 未指定数据或激活函数，这两组选择由用户确认。</aside>
<section class="panel"><div class="toolbar"><label for="case">选择实验</label><select id="case"><option value="passthrough">直通 · 0x08 / 0x20 / 0x80 / 0xFF</option><option value="relu">有符号 ReLU · 0x09 / 0x21 / 0x91 / 0xFF</option></select><span class="muted" id="case-summary"></span></div><nav aria-label="波形阶段" id="stages"></nav><h2 id="stage-title"></h2><p id="stage-note"></p><div class="wave"><a id="image-link" target="_blank"><img id="wave-image" alt="GTKWave 原生信号波形"></a></div><div class="links"><a id="png-link">PNG 原图</a><a id="pdf-link">GTKWave 矢量 PDF</a><a id="gtkw-link" download>可编辑 GTKWave 会话</a><a id="ghw-link">完整 GHW</a><a id="vcd-link">VCD</a><a id="log-link">自检日志</a></div><p class="muted">字母标记为有效消费的上升采样沿，主光标在选定沿前 1 fs。指令总线仅在 instruction_en 有效时解释；数据仅在相应读写使能或 VALID/READY 握手时解释。U/X 和空闲变化保留原始波形；窄格中的“+”表示文字放不下，可打开 GHW 放大或查看下面的完整矩阵。</p></section>
<div class="grid"><section class="panel"><h2>输入与结果</h2><p id="formula"></p><p>每组逐项核对 196 个权重、196 个原始点积、196 个激活字节，以及 56 次 AXI 读回中的 196 个输出字节和 28 个填充字节。初始化另检查 112 次数据写入和 12 次指令字写入。</p><div class="links"><a id="native-link">GTKWave 逐向量实测</a><a id="analysis-link">时序与读回核对</a></div></section><section class="panel"><h2>实测采样沿 / ns</h2><div class="scroll"><table id="timing"></table></div></section></div>
<section class="panel"><h2>查看全部 14×14 实测矩阵</h2><p>原始结果从 GTKWave 的原生数组逐行读取，输出从实际 AXI RDATA 握手重建。下表均为观测值。</p><details><summary>权重 W</summary><div class="scroll" id="weights"></div></details><details><summary>原始点积 C（32 位有符号显示）</summary><div class="scroll" id="raw"></div></details><details open><summary>主机读回的输出 Y（8 位）</summary><div class="scroll" id="output"></div></details></section>
<section class="panel"><h2>PDF 的周期数字如何理解</h2><p>本实验保持 <code>read_weights 0 14 → matrix_multiply 0 0 14 → activate 0 0 14 → synchronise</code>，所有地址为 0，激活原地回写。权重、乘法、激活控制可流水重叠。</p><p>以 instruction_en 的有效采样沿为起点，权重到 MMU 加载为 7 周期，乘法到累加器写入为 23 周期，激活到统一缓存回写为 33 周期。PDF 的 5、21、9、12 等标注需要给出相同起止点后比较；它们不能直接替代这里的端到端测量。资源 BUSY 的有效采样沿数量分别为 20、36、46。</p><p>IRQ 引脚在 5435 ns 上升，5445 ns 被主机采样一次；首次读地址握手为 5455 ns，首次读响应为 5505 ns。PDF 最后一图是“总线写缓存”，本索引补画初始化写入并另保留结果读回。</p></section>
<section class="panel"><h2>在 GTKWave 中继续看</h2><pre>cd doc/teaching/pdf-dataflow/views\ngtkwave ../results/relu.ghw relu-02-multiply.gtkw</pre><p>完整复现命令、指令字段、输入公式、有效周期说明见 README。此次覆盖两种具体数据路径；ReLU 数据含正负值，但未触发正向饱和，也没有穷举所有指令或 AXI 背压。基础 numeric_std 初始化与排空警告保留在日志中。</p><p class="muted">RTL 基线：<code>COMMIT</code> · GHDL 5.0.1 · GTKWave 3.3.121</p></section></main>
<script>const DATA=PAYLOAD;let stage=0;const $=id=>document.getElementById(id);function matrix(a){return '<table class="matrix"><thead><tr><th>i / j</th>'+a[0].map((_,j)=>'<th>'+j+'</th>').join('')+'</tr></thead><tbody>'+a.map((row,i)=>'<tr><th>'+i+'</th>'+row.map(v=>'<td class="'+(v<0?'negative':v>0?'positive':'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}function render(){const key=$('case').value,c=DATA.cases[key],s=DATA.stages[stage],prefix='views/'+key+'-'+s[0];$('stage-title').textContent=(stage+1)+' · '+s[1];$('stage-note').textContent=s[2];$('wave-image').src=prefix+'.png';$('wave-image').alt=c.title+'：'+s[1]+' GTKWave 波形';$('image-link').href=prefix+'.png';for(const ext of ['png','pdf','gtkw'])$(ext+'-link').href=prefix+'.'+ext;for(const ext of ['ghw','vcd','log'])$(ext+'-link').href='results/'+key+'.'+ext;$('native-link').href='results/'+key+'-native-verified.json';$('analysis-link').href='results/'+key+'-analysis.json';$('case-summary').textContent=c.title+' · 8826 ns 自检结束';$('formula').textContent=key==='relu'?'A[i,j]=4(i-j)，W=64I；C=256(i-j)，Y=max(0,i-j)。':'A[i,j]=i+2j+1，W 主对角线为 2、上邻对角线为 1；C 为 2～118，Y=C[31:24]=0。';$('weights').innerHTML=matrix(c.native.actual.weight);$('raw').innerHTML=matrix(c.native.actual.mmu);$('output').innerHTML=matrix(c.analysis.actualHostOutput);const rows=[['MMU 权重加载',4855,4985,14],['统一缓存输入读',4835,4965,14],['累加器写入',5025,5155,14],['激活回写',5305,5435,14],['IRQ 采样',5445,5445,1],['AXI 读响应',5505,8805,56]];$('timing').innerHTML='<tr><th>事件</th><th>首沿</th><th>末沿</th><th>数量</th></tr>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('');document.querySelectorAll('#stages button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));}DATA.stages.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s[1];b.onclick=()=>{stage=i;render()};$('stages').append(b)});$('case').onchange=render;render();</script></html>'''
page=page.replace('COMMIT',MAN['repositoryCommit']).replace('PAYLOAD',payload)
(BASE/'index.html').write_text(page)

doc=fitz.open()
fontfile=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
if fontfile.exists():
 try:
  from fontTools.ttLib import TTFont
  from fontTools.subset import Subsetter,Options
  font=TTFont(str(fontfile),fontNumber=2) # Noto Sans CJK SC, as a standalone font
  opts=Options();opts.desubroutinize=True
  sub=Subsetter(options=opts)
  sub.populate(text=Path(__file__).read_text()+MAN['repositoryCommit'])
  sub.subset(font)
  fontfile=BASE/'.report-font.otf'
  font.save(str(fontfile))
 except ImportError: pass
FONT='cn' if fontfile.exists() else 'china-s'
def text(p,x,y,s,size=11,color=(.09,.17,.27)):
 p.insert_text((x,y),s,fontname=FONT,fontsize=size,color=color)
def textbox(p,box,s,size=11):
 spare=p.insert_textbox(box,s,fontname=FONT,fontsize=size,color=(.09,.17,.27),lineheight=1.7)
 assert spare>=0,(box,s)
def new(title):
 p=doc.new_page(width=842,height=595)
 if fontfile.exists(): p.insert_font(fontname=FONT,fontfile=str(fontfile))
 p.draw_rect(fitz.Rect(0,0,842,12),color=None,fill=(.14,.38,.73))
 text(p,32,48,title,20)
 text(p,32,574,'tinyTPU · 实际 RTL / GHDL / GTKWave',9)
 text(p,785,574,str(len(doc)),9)
 return p
p=new('PDF 数据流实验：两组仿真与 GTKWave 波形')
textbox(p,fitz.Rect(32,70,810,195),'实验配置：N=14，时钟 10 ns，所有起始地址为 0；前三条指令长度为 14，同步长度为 0。\nPDF 序列：read_weights → matrix_multiply → activate → synchronise；激活结果原地回写统一缓存。\n两组均在 8826 ns 自检通过后结束，未改动 DUT。每组共六张阶段波形，含 PDF 的总线写缓存及额外主机读回。\nRTL 基线：'+MAN['repositoryCommit'],12)
textbox(p,fitz.Rect(32,205,810,360),'直通组：0x08 / 0x20 / 0x80 / 0xFF。A[i,j]=i+2j+1，W 主对角线为 2、上邻对角线为 1。\n原始点积范围 2～118。NO_ACTIVATION 实际取结果 [31:24] 高 8 位，所以本组输出全零。此前“取低 8 位”的说法在此纠正。\nReLU 组：0x09 / 0x21 / 0x91 / 0xFF。A[i,j]=4(i-j)，W=64I，C=256(i-j)。\n有符号 ReLU 舍入右移 8 位后截负值和饱和值，本组输出 max(0,i-j)，未触发正向饱和。',12)
textbox(p,fitz.Rect(32,370,810,530),'验证证据：每组 196 个权重、196 个原始点积、196 个激活写回字节均通过 GTKWave 原生 GHW 数组采样核对；56 次 AXI 读回中的 196 个输出字节及 28 个填充字节也均通过 VHDL 自检与 VCD 握手核对。另检查 112 次数据写入与 12 次指令字写入。\n附带 PNG、原生 PS/PDF、可编辑 .gtkw、GHW/VCD、自检日志、完整矩阵 JSON、源代码及复现脚本。离线 index.html 可切换实验和阶段。',12)
p=new('实测时序与读图约定')
rows=[['信号 / 事件','首采样 ns','末采样 ns','数量'],['weight_instruction_en','4785','4785','1'],['weight_en0','4825','4955','14'],['mmu_load_weight','4855','4985','14'],['mmu_instruction_en','4795','4795','1'],['buffer_en0','4835','4965','14'],['reg_write_en','5025','5155','14'],['activation_instruction_en','4975','4975','1'],['buffer_write_en1','5305','5435','14'],['IRQ 被采样','5445','5445','1'],['主机 R 响应握手','5505','8805','56']]
xs=[32,440,560,680,810];top=70;rh=22
for i,row in enumerate(rows):
 for j,v in enumerate(row):
  p.draw_rect(fitz.Rect(xs[j],top+i*rh,xs[j+1],top+(i+1)*rh),color=(.8,.85,.9),fill=(.93,.96,.99) if i==0 else None,width=.5)
  text(p,xs[j]+7,top+i*rh+16,v,10)
textbox(p,fitz.Rect(32,330,810,535),'时间定义：表中与字母标记采用上升沿前信号有效时的消费沿。主光标置于选定消费沿前 1 fs，可读到稳定输入。14 个连续有效沿的首尾差为 13 个周期。IRQ 引脚在 5435 ns 拉高、5445 ns 拉低，主机在 5445 ns 采样一次。\n端点延迟：权重指令→MMU 加载为 7 周期；乘法指令→累加器写入为 23 周期；激活指令→缓存回写为 33 周期。首次 AR=5455 ns，首次 R=5505 ns，相差 5 周期。PDF 数字需明确相同起止点后比较，不能直接当作这些端到端延迟；控制与数据流水允许重叠。\n操作码只在 instruction_en 有效时解释；数据只在对应使能或握手时解释。无效周期的 U/X、空闲地址变化、默认响应不代表有效计算错误。日志保留初始化/排空警告，所有有效事务均已检查。本次没有穷举饱和边界或 AXI 背压。',11)
toc=[]
for case in DATA:
 for stage,(stem,title,note) in enumerate(STAGES):
  p=new(CASE_TITLE[case]+' · '+str(stage+1)+' / '+title)
  toc.append([1,CASE_TITLE[case]+' / '+title,len(doc)])
  textbox(p,fitz.Rect(32,66,810,121),note,11)
  source=fitz.open(VIEWS/(case+'-'+stem+'.pdf'))
  src=source[0];boxes=[fitz.Rect(b[:4])*src.rotation_matrix for b in src.get_text('blocks')]
  clip=fitz.Rect(65,65,727,max(b.y1 for b in boxes)+8)
  clip=clip*src.derotation_matrix
  rotation=src.rotation
  src.set_rotation(0)
  p.show_pdf_page(fitz.Rect(32,128,810,548),source,0,clip=clip,rotate=-rotation)
  source.close()
doc.set_toc([[1,'配置与结论',1],[1,'实测时序与读图约定',2]]+toc)
doc.set_metadata({'title':'tinyTPU PDF 数据流实验与 GTKWave 波形','author':'tinyTPU teaching experiment','subject':'Actual RTL, two N=14 cases, real GTKWave exports'})
doc.subset_fonts()
doc.save(BASE/'waveform-report.pdf',garbage=4,deflate=True)
doc.close()
(BASE/'README.md').write_text((HERE/'README.md').read_text())
files=[p for p in OUT.iterdir() if p.is_file() and (p.name in ['build.log','import.log','timings.json','manifest.json'] or p.name.startswith(('passthrough','relu')))]
files += [p for p in VIEWS.iterdir() if p.is_file() and (p.name in ['gtkwaverc','views.json'] or p.name.startswith(tuple(case+'-'+stem for case in DATA for stem in ['native']+[s[0] for s in STAGES])))]
files += [BASE/'index.html',BASE/'README.md',BASE/'waveform-report.pdf']
sourcefiles=[p for p in HERE.iterdir() if p.is_file() and p.suffix in ['.py','.vhdl','.opt','.md']]
record={'rtlCommit':MAN['repositoryCommit'],'ghdlVersion':'5.0.1','gtkwaveVersion':'3.3.121','casesPassed':['passthrough','relu'],'nativeValuesCheckedPerCase':NATIVE['relu']['checkedValues'],'filesSha256':{str(p.relative_to(BASE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},'experimentSourceSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(sourcefiles)}}
(BASE/'artifact-manifest.json').write_text(json.dumps(record,indent=2,ensure_ascii=False))
print('Created offline index and 14-page Chinese GTKWave report:',BASE)
