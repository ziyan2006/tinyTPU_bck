from pathlib import Path
import json, re, subprocess, hashlib, os, shutil
OUT=Path(__file__).resolve().parent; ROOT=Path(os.environ.get('TINYTPU_ROOT',str(OUT.parents[1]))); BASE_REF=os.environ.get('TINYTPU_BASE_REF','7c9a732dfd1e305fbd86b41a6fb3146ea64693de'); E=OUT/'evidence'; E.mkdir(exist_ok=True)
G=shutil.which('ghdl') or '/workspace/tinytpu-env/bin/ghdl'; BUILD=OUT/'build'; BUILD.mkdir(exist_ok=True)
def run(args, name, good=True):
 p=subprocess.run(args,cwd=BUILD,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (E/name).write_text('$ '+' '.join(args)+'\n'+p.stdout+f'\nexit_status={p.returncode}\n')
 if good and p.returncode: raise RuntimeError(p.stdout)
 return p
sources=sorted(ROOT.glob('src/vhdl/**/*.vhd'))+sorted(ROOT.glob('src/vhdl/**/*.vhdl'))
run([G,'-i','--std=08','-frelaxed-rules',*map(str,sources)],'import.log')
run([G,'-m','--std=08','-frelaxed-rules','TB_MATRIX_MULTIPLY_UNIT'],'mmu-build.log')
p=run([G,'-r','--std=08','-frelaxed-rules','TB_MATRIX_MULTIPLY_UNIT','--assert-level=error','--vcd='+str(E/'mmu.vcd')],'mmu-run.log')
assert len(re.findall('Test was successful!',p.stdout))==2
run([G,'-m','--std=08','-frelaxed-rules','TPU'],'tpu-build.log')
run([G,'-m','--std=08','-frelaxed-rules','tinyTPU_v1_0'],'axi-top-build.log')
regression_cases=[
 ('TB_FIFO',[], 'fifo-ram32'),
 ('TB_FIFO',['-gUSE_FF=true'], 'fifo-ff32'),
 ('TB_FIFO',['-gTEST_DEPTH=3'], 'fifo-ram3'),
 ('TB_FIFO',['-gUSE_FF=true','-gTEST_DEPTH=3'], 'fifo-ff3'),
 ('TB_INSTRUCTION_FIFO',[], 'instruction-fifo'),
 ('TB_REGISTER_FILE',[], 'register'),
 ('TB_TPU',[], 'system'),
 ('TB_tinyTPU_v1_0_S00_AXI',[], 'axi-system'),
]
regression_results=[]
for target,generics,name in regression_cases:
 run([G,'-m','--std=08','-frelaxed-rules',target],name+'-build.log')
 args=[G,'-r','--std=08','-frelaxed-rules',target,*generics,'--assert-level=error']
 if name=='system':args.append('--vcd='+str(E/'system.vcd'))
 result=run(args,name+'-run.log')
 assert 'successful' in result.stdout.lower(), 'No success marker: '+target
 assert 'simulation stopped by --stop-time' not in result.stdout, 'Incomplete test: '+target
 regression_results.append({'name':name,'target':target,'generics':generics,'status':'passed','log':name+'-run.log'})
baseline=subprocess.check_output(['git','rev-parse',BASE_REF+'^{commit}'],cwd=ROOT,text=True).strip()
patch=subprocess.check_output(['git','diff','--no-ext-diff','--no-textconv','--binary',baseline,'--','src/vhdl'],cwd=ROOT)
(E/'fixes.patch').write_bytes(patch)
# VCD arrays are not emitted by GHDL. Use each MACC scalar port/register.
# Bottom-row partial sums and sign_control_cs reconstruct RESULT_ASSIGNMENT exactly.
lines=(E/'mmu.vcd').read_text().splitlines(); scopes=[]; defs={}; events=[]; time=0; header=True
for line in lines:
 if header:
  if line.startswith('$scope'): scopes.append(line.split()[2])
  elif line.startswith('$upscope'): scopes.pop()
  elif line.startswith('$var'):
   t=line.split(); defs[t[3]]={'name':'.'.join(scopes+[t[4].split('[')[0]]),'width':int(t[2])}
  elif line.startswith('$enddefinitions'): header=False
 else:
  if line.startswith('#'): time=int(line[1:]); events.append((time,[]))
  elif line and line[0] in '01uUxXzZwWlLhH-bB':
   if line[0] in 'bB': val,code=line[1:].split()
   else: val,code=line[0],line[1:]
   events[-1][1].append((code,val))
byname={v['name']:k for k,v in defs.items()}
top='tb_matrix_multiply_unit'; dut=top+'.dut_i'
def value(state,name,signed=False):
 v=state.get(byname[name],'X')
 if re.search('[^01]',v): return None
 n=int(v,2); w=defs[byname[name]]['width']
 return n-(1<<w) if signed and n&(1<<(w-1)) else n
def snapshot(state):
 s={k:value(state,top+'.'+k) for k in ['reset','enable','weight_signed','systolic_signed','activate_weight','load_weight','weight_address','start','evaluate']}
 s['activate_map']=state.get(byname[dut+'.activate_map'],'xxxx'); s['sign_control']=state.get(byname[dut+'.sign_control_cs'],'xxxxxx')
 cells=[]
 for i in range(4):
  row=[]
  for j in range(4):
   prefix=f'{dut}.macc_gen({i}).macc_2d({j}).'
   path=next(n.rsplit('.',1)[0] for n in byname if n.startswith(prefix) and n.endswith('.input_cs'))
   row.append({k:value(state,path+'.'+k,k not in ['preload_weight','load_weight']) for k in ['weight_input','preweight_cs','weight_cs','input','input_cs','pipeline_cs','partial_sum_cs','preload_weight','load_weight']})
  cells.append(row)
 s['cells']=cells
 sign=s['sign_control'][-1:]
 s['result']=[]
 for j in range(4):
  n=cells[3][j]['partial_sum_cs']
  if n is not None and sign=='0': n=n&((1<<21)-1)
  s['result'].append(n)
 return s
state={}; samples=[]
for t,changes in events:
 before=dict(state)
 for code,val in changes: state[code]=val
 if any(code==byname[top+'.clk'] and val=='1' for code,val in changes):
  samples.append({'ns':t/1e6,'pre':snapshot(before),'post':snapshot(state)})
text=(ROOT/'src/vhdl/MMU/TB_MATRIX_MULTIPLY_UNIT.vhdl').read_text()
def matrix(name):
 m=re.search(r'constant '+name+r'\s*:.*?:=\s*\((.*?)\);',text,re.S)
 return [list(map(int,re.findall(r'-?\s*\d+',row.replace('- ','-')))) for row in re.findall(r'\(([^()]+)\)',m[1])]
cases=[]
for signed in [False,True]:
 suffix='_SIGNED' if signed else ''; A=matrix('INPUT_MATRIX'+suffix); W=matrix('WEIGHT_MATRIX'+suffix); R=matrix('RESULT_MATRIX'+suffix)
 calculated=[[sum(A[i][k]*W[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
 assert calculated==R
 times=[315,325,335,345] if signed else [125,135,145,155]
 for i,t in enumerate(times): assert next(s for s in samples if s['ns']==t)['pre']['result']==R[i]
 cases.append({'name':'有符号 INT8' if signed else '无符号 UINT8','signed':signed,'input':A,'weights':W,'expected':R,'checkTimes':times,'start':195 if signed else 5,'end':375 if signed else 185})
data={'commit':baseline,'tool':subprocess.check_output([G,'--version'],text=True).splitlines()[0],'clockNs':10,'sampling':'上升沿前端口 / 上升沿后稳定寄存器；testbench 在上升沿读取的是沿前结果','testbench':'TB_MATRIX_MULTIPLY_UNIT','cases':cases,'samples':samples,'hashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'src/vhdl/TPU_pack.vhdl',ROOT/'src/vhdl/MMU/MACC.vhdl',ROOT/'src/vhdl/MMU/MATRIX_MULTIPLY_UNIT.vhdl',ROOT/'src/vhdl/MMU/TB_MATRIX_MULTIPLY_UNIT.vhdl']}}
data['regressions']=regression_results
data['sourceModifiedFromBase']=bool(patch)
data['patchSha256']=hashlib.sha256(patch).hexdigest()
data['sourceTreeSha256']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
(E/'trace.json').write_text(json.dumps(data,ensure_ascii=False))
print('Trace verified: 2 cases, 32 result entries,',len(samples),'rising edges')
print('Regression cases: MMU plus',len(regression_results),'additional runs passed')
print([(s['ns'],s['pre']['result'],s['post']['result']) for s in samples if s['ns'] in [115,125,135,145,155,305,315,325,335,345]])
