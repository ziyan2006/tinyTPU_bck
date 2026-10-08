from pathlib import Path
import json,re,hashlib
OUT=Path(__file__).parent; E=OUT/'evidence'
lines=(E/'system.vcd').read_text().splitlines(); scopes=[]; defs={}; events=[]; header=True
for line in lines:
 if header:
  if line.startswith('$scope'):scopes.append(line.split()[2])
  elif line.startswith('$upscope'):scopes.pop()
  elif line.startswith('$var'):
   a=line.split();defs[a[3]]={'name':'.'.join(scopes+[a[4].split('[')[0]]),'width':int(a[2])}
  elif line.startswith('$enddefinitions'):header=False
 else:
  if line.startswith('#'):events.append((int(line[1:]),[]))
  elif line and line[0] in 'b01uUxXzZwWlLhH-':
   if line[0]=='b':v,c=line[1:].split()
   else:v,c=line[0],line[1:]
   events[-1][1].append((c,v))
byname={d['name']:c for c,d in defs.items()};top='tb_tpu';core=top+'.dut_i.tpu_core_i'
def val(state,name):
 b=state.get(byname[name],'x')
 return None if re.search('[^01]',b) else int(b,2)
def vec(n):
 return [None]*14 if n is None else [((n>>(8*j))&255)-256 if ((n>>(8*j))&255)>=128 else (n>>(8*j))&255 for j in range(14)]
def snap(state):
 fields=['reset','enable','runtime_count','instruction_write_en','instruction_empty','instruction_full','weight_enable','weight_address','buffer_enable','buffer_address','buffer_write_enable','synchronize']
 s={k:val(state,top+'.'+k) for k in fields}
 n=val(state,top+'.instruction_bits')
 s['command']={'hex':f'{n:020X}','opcode':n&255,'length':(n>>8)&0xffffffff,'acc':(n>>40)&0xffff,'buf':(n>>56)&0xffffff} if n is not None else None
 s['input']=vec(val(state,top+'.host_input_bits'));s['weights']=vec(val(state,top+'.host_weight_bits'));s['output']=vec(val(state,top+'.host_output_bits'))
 fields=['weight_en0','weight_address0','buffer_en0','buffer_address0','buffer_write_en1','buffer_address1','mmu_load_weight','mmu_activate_weight','mmu_weight_address','reg_write_en','reg_write_address','reg_accumulate','reg_read_address','activation_function','activation_signed','weight_instruction_en','mmu_instruction_en','activation_instruction_en','control_busy','weight_resource_busy','mmu_resource_busy','activation_resource_busy']
 s['instruction_pop']=val(state,top+'.dut_i.instruction_enable')
 s['core']={k:val(state,core+'.'+k) for k in fields}
 return s
state={};samples=[]
for t,changes in events:
 before=state.copy()
 for c,v in changes:state[c]=v
 if any(c==byname[top+'.clk'] and v=='1' for c,v in changes):samples.append({'ns':t/1e6,'pre':snap(before),'post':snap(state)})
log=(E/'system-run.log').read_text();results=[]
for m in re.finditer(r'@(\d+)ns:.*SYSTEM_RESULT pass=(\d+) row=(\d+) data=([0-9A-F]+)',log):
 ns,p,r,b=m.groups();p=int(p);r=int(r);a=vec(int(b,16));expected=[max(0,p*(r-j)) for j in range(14)]
 assert a==expected
 # The report is after the rising edge + 1 ns; check actual captured port.
 at=next(s for s in samples if s['ns']==int(ns)-1)
 assert at['post']['output']==a
 results.append({'ns':int(ns),'pass':p,'row':r,'values':a})
assert len(results)==28 and '392 output bytes checked' in log
commands=[{'index':i,'ns':s['ns'],**s['pre']['command']} for i,s in enumerate(samples) if s['pre']['instruction_write_en']==7]
assert [c['opcode'] for c in commands]==[9,33,145,255,9,35,145,255]
keys=[{'index':3,'title':'写入权重与输入'}]
for c in commands:keys.append({'index':c['index'],'title':{9:'入队：加载权重',33:'入队：乘法覆盖',35:'入队：乘法累加',145:'入队：有符号 ReLU',255:'入队：同步'}[c['opcode']]})
for key,title in [('weight_instruction_en','控制器启动权重加载'),('mmu_instruction_en','控制器启动矩阵乘法'),('reg_write_en','累加器开始写入'),('activation_instruction_en','控制器启动激活'),('buffer_write_en1','激活回写统一缓存')]:
 for i,s in enumerate(samples):
  if s['pre']['core'][key]==1 and (i==0 or samples[i-1]['pre']['core'][key]!=1):keys.append({'index':i,'title':title})
for i,s in enumerate(samples):
 if s['pre']['synchronize']==1:keys.append({'index':i,'title':'同步信号被采样'})
for p in [1,2]:
 first=next(r for r in results if r['pass']==p and r['row']==0);last=next(r for r in results if r['pass']==p and r['row']==13)
 for r,title in [(first,'首行结果已核对'),(last,'末行结果已核对')]:
  i=next(i for i,s in enumerate(samples) if s['ns']>=r['ns']);keys.append({'index':i,'title':f'第 {p} 轮：'+title})
keys=sorted(keys,key=lambda x:x['index'])
trace={'testbench':'TB_TPU','N':14,'weightDepth':32,'bufferDepth':64,'clockNs':10,'samples':samples,'commands':commands,'results':results,'moments':keys,'completedNs':2516,'vcdSha256':hashlib.sha256((E/'system.vcd').read_bytes()).hexdigest()}
(E/'system-trace.json').write_text(json.dumps(trace,ensure_ascii=False))
print('System trace:',len(samples),'edges,',len(commands),'commands, 392 observed output bytes verified')
