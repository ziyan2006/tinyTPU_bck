from pathlib import Path
import json, os, hashlib, subprocess
from load_dataflow import load_dataflow
from load_flow_trace import verify_native_flow
OUT=Path(__file__).resolve().parent; ROOT=Path(os.environ.get('TINYTPU_ROOT',str(OUT.parents[1])))
trace=json.loads((OUT/'evidence/trace.json').read_text())
system=json.loads((OUT/'evidence/system-trace.json').read_text())
assert system['vcdSha256']==hashlib.sha256((OUT/'evidence/system.vcd').read_bytes()).hexdigest(), 'System VCD changed; regenerate trace'
assert trace['patchSha256']==hashlib.sha256(subprocess.check_output(['git','diff','--no-ext-diff','--no-textconv','--binary',trace['commit'],'--','src/vhdl'],cwd=ROOT)).hexdigest(), 'Patch changed; regenerate evidence'
assert trace['commit']==subprocess.check_output(['git','rev-parse',trace['commit']+'^{commit}'],cwd=ROOT,text=True).strip(), 'Evidence baseline unavailable'
current_sources={str(p.relative_to(ROOT)) for pattern in ('*.vhd','*.vhdl') for p in ROOT.glob('src/vhdl/**/'+pattern)}
assert current_sources==set(trace['sourceTreeSha256']), 'RTL file list changed; regenerate evidence'
for name,h in trace['sourceTreeSha256'].items():
 assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==h, 'RTL changed; regenerate evidence: '+name
files=['TB_TPU.vhdl','AXI/TB_tinyTPU_v1_0_S00_AXI.vhd','Instruction_FIFO/TB_FIFO.vhdl','Instruction_FIFO/TB_INSTRUCTION_FIFO.vhdl','TPU_pack.vhdl','TPU.vhdl','TPU_CORE.vhdl','AXI/tinyTPU_v1_0_S00_AXI.vhd','Unified_Buffer/UNIFIED_BUFFER.vhdl','Weight_Buffer/WEIGHT_BUFFER.vhdl','SDS/SYSTOLIC_DATA_SETUP.vhdl','MMU/MATRIX_MULTIPLY_UNIT.vhdl','MMU/MACC.vhdl','MMU/TB_MATRIX_MULTIPLY_UNIT.vhdl','Instruction_FIFO/INSTRUCTION_FIFO.vhdl','Instruction_FIFO/FIFO.vhdl','Control_Unit/CONTROL_COORDINATOR.vhdl','Control_Unit/WEIGHT_CONTROL.vhdl','Control_Unit/MATRIX_MULTIPLY_CONTROL.vhdl','Control_Unit/ACTIVATION_CONTROL.vhdl','Register_File/REGISTER_FILE.vhdl','Register_File/TB_REGISTER_FILE.vhdl','Activation/ACTIVATION.vhdl']
sources={f'src/vhdl/{p}':(ROOT/'src/vhdl'/p).read_text() for p in files}
dataflow=load_dataflow(OUT,ROOT)
verify_native_flow(OUT/'evidence/hardware-native.json',OUT/'pdf-dataflow',dataflow['cases'])
sources['doc/teaching/pdf-dataflow/TB_PDF_DATAFLOW.vhdl']=(OUT/'pdf-dataflow/TB_PDF_DATAFLOW.vhdl').read_text()
logs={p.name:p.read_text() for p in (OUT/'evidence').glob('*.log')}
logs['fixes.patch']=(OUT/'evidence/fixes.patch').read_text()
logs['mmu.vcd']=(OUT/'evidence/mmu.vcd').read_text()
s=(OUT/'page.template.html').read_text()
for key,name in [('SYSTEM_SECTION','system-section.html'),('SYSTEM_SCRIPT','system-script.js'),('EVIDENCE_SECTION','evidence-section.html'),('DATAFLOW_SECTION','dataflow-section.html'),('DATAFLOW_SCRIPT','dataflow-script.js'),('DATAFLOW_STYLE','dataflow-style.css'),('HARDWARE_FLOW_SECTION','hardware-flow-section.html'),('HARDWARE_FLOW_STYLE','hardware-flow-style.css'),('HARDWARE_LESSONS_SCRIPT','hardware-lessons.js'),('HARDWARE_PATHS_SCRIPT','hardware-paths.js'),('HARDWARE_FLOW_SCRIPT','hardware-flow-script.js')]: s=s.replace('__'+key+'__',(OUT/name).read_text())
for key,obj in [('SYSTEM',system),('TRACE',trace),('SOURCES',sources),('LOGS',logs),('PDF_FLOW',dataflow)]: s=s.replace('__'+key+'__',json.dumps(obj,ensure_ascii=False).replace('</','<\\/'))
assert '__PDF_FLOW__' not in s and '__DATAFLOW_' not in s and '__HARDWARE_' not in s, 'Missing dataflow template replacement'
(OUT/'tinyTPU-lab.html').write_text(s)
print('Built standalone HTML:',len(s.encode()),'bytes')
