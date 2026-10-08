"""Extract actual rising-edge controls, check AXI results, and prepare GTKWave views."""
from pathlib import Path
import json,re,os,hashlib
HERE=Path(__file__).resolve().parent;OUT=Path(os.environ.get('TINYTPU_RESULTS',str(HERE/'results')))
TOP='tb_pdf_dataflow';AXI=TOP+'.dut_i';TPU=AXI+'.tpu_i';CORE=TPU+'.tpu_core_i'
def parse(path):
 defs={};scopes=[];events=[];header=True
 for line in path.read_text().splitlines():
  if header:
   if line.startswith('$scope'):scopes.append(line.split()[2])
   elif line.startswith('$upscope'):scopes.pop()
   elif line.startswith('$var'):
    a=line.split();defs[a[3]]={'name':'.'.join(scopes+[a[4].split('[')[0]]),'width':int(a[2])}
   elif line.startswith('$enddefinitions'):header=False
  elif line.startswith('#'):events.append((int(line[1:]),[]))
  elif line and line[0] in 'b01uUxXzZwWlLhH-':
   if line[0]=='b':v,c=line[1:].split()
   else:v,c=line[0],line[1:]
   events[-1][1].append((c,v))
 names={v['name']:k for k,v in defs.items()}
 def snap(state):
  return {defs[k]['name']:None if re.search('[^01]',v) else int(v,2) for k,v in state.items()}
 state={};samples=[]
 for t,changes in events:
  before=state.copy()
  for c,v in changes:state[c]=v
  if any(c==names[TOP+'.clk'] and v=='1' for c,v in changes):samples.append({'ns':t//1000000,'pre':snap(before),'post':snap(state)})
 return samples
alltimings={}
for case in ['passthrough','relu']:
 samples=parse(OUT/(case+'.vcd'))
 def enabled(name):return [s for s in samples if s['pre'].get(name)==1]
 def first(name):return enabled(name)[0]['ns']
 def last(name):return enabled(name)[-1]['ns']
 paths={k:CORE+'.'+k for k in ['weight_instruction_en','weight_en0','mmu_load_weight','mmu_instruction_en','buffer_en0','mmu_activate_weight','reg_write_en','activation_instruction_en','buffer_write_en1','weight_resource_busy','mmu_resource_busy','activation_resource_busy']}
 timing={k:{'firstNs':first(p),'lastNs':last(p),'enabledEdges':len(enabled(p))} for k,p in paths.items()}
 timing['synchronize']={'firstNs':first(TOP+'.synchronize'),'lastNs':last(TOP+'.synchronize'),'enabledEdges':len(enabled(TOP+'.synchronize'))}
 # Requests and responses use pre-edge VALID && READY, independent of TB phase tags.
 ar=[s for s in samples if s['pre'].get(TOP+'.arvalid')==1 and s['pre'].get(TOP+'.arready')==1]
 rr=[s for s in samples if s['pre'].get(TOP+'.rvalid')==1 and s['pre'].get(TOP+'.rready')==1]
 assert len(ar)==len(rr)==56
 assert all(s['pre'][TOP+'.rresp']==0 for s in rr)
 timing['hostRead']={'firstAddressNs':ar[0]['ns'],'firstResponseNs':rr[0]['ns'],'lastResponseNs':rr[-1]['ns'],'transactions':56}
 writes=[s for s in samples if s['pre'].get(TOP+'.wvalid')==1 and s['pre'].get(TOP+'.wready')==1]
 addresses=[s for s in samples if s['pre'].get(TOP+'.awvalid')==1 and s['pre'].get(TOP+'.awready')==1]
 responses=[s for s in samples if s['pre'].get(TOP+'.bvalid')==1 and s['pre'].get(TOP+'.bready')==1]
 assert len(writes)==len(addresses)==len(responses)==124
 assert all(s['pre'][TOP+'.bresp']==0 for s in responses)
 for k in range(112):
  row, chunk, input_write=k//8,(k%8)//2,k%2
  assert addresses[k]['pre'][TOP+'.awaddr']==(0x80000 if input_write else 0)+row*16+chunk*4
  values=[4*(row-j) if case=='relu' else row+2*j+1 for j in range(14)] if input_write else [64 if row==j else 0 for j in range(14)] if case=='relu' else [2 if row==j else 1 if j==row+1 else 0 for j in range(14)]
  packed=sum((values[j]&255)<<(8*(j-chunk*4)) for j in range(chunk*4,min(chunk*4+4,14)))
  assert writes[k]['pre'][TOP+'.wdata']==packed
  assert writes[k]['pre'][TOP+'.wstrb']==(3 if chunk==3 else 15)
 opcodes=[9,33,145,255] if case=='relu' else [8,32,128,255]
 for i,opcode in enumerate(opcodes):
  instruction=((0 if opcode==255 else 14)<<8)|opcode
  for chunk in range(3):
   k=112+i*3+chunk
   assert addresses[k]['pre'][TOP+'.awaddr']==0x90004+chunk*4
   assert writes[k]['pre'][TOP+'.wdata']==((instruction>>(32*chunk))&0xffffffff)
 timing['hostWrite']={'initializationTransactions':112,'instructionTransactions':12,'firstAddressNs':addresses[0]['ns'],'firstDataNs':writes[0]['ns'],'firstResponseNs':responses[0]['ns'],'lastResponseNs':responses[-1]['ns']}
 timing['irqPin']={'riseNs':[s['ns'] for s in samples if s['pre'].get(TOP+'.synchronize')==0 and s['post'].get(TOP+'.synchronize')==1], 'fallNs':[s['ns'] for s in samples if s['pre'].get(TOP+'.synchronize')==1 and s['post'].get(TOP+'.synchronize')==0]}
 assert timing['irqPin']=={'riseNs':[5435],'fallNs':[5445]}
 assert timing['synchronize']['enabledEdges']==1
 assert timing['synchronize']['firstNs']>timing['activation_resource_busy']['lastNs']
 weight=enabled(CORE+'.mmu_load_weight');mmu=enabled(CORE+'.reg_write_en');activation=enabled(CORE+'.buffer_write_en1')
 assert len(weight)==len(mmu)==len(activation)==14
 assert [s['pre'][CORE+'.mmu_weight_address'] for s in weight]==list(range(14))
 assert [s['pre'][CORE+'.reg_write_address'] for s in mmu]==list(range(14))
 assert [s['pre'][CORE+'.buffer_address1'] for s in activation]==list(range(14))
 raw=[[256*(i-j) if case=='relu' else sum((i+2*k+1)*(2 if k==j else 1 if j==k+1 else 0) for k in range(14)) for j in range(14)] for i in range(14)]
 expected=[[max(0,i-j) if case=='relu' else (v>>24)&255 for j,v in enumerate(row)] for i,row in enumerate(raw)]
 observed=[]
 for i in range(14):
  row=[]
  for chunk in range(4):
   s=rr[i*4+chunk];word=s['pre'][TOP+'.rdata'];a=ar[i*4+chunk]['pre'][TOP+'.araddr'];assert a==0x80000+i*16+chunk*4
   for byte in range(4):
    j=chunk*4+byte;v=(word>>(8*byte))&255
    if j<14:row.append(v);assert v==expected[i][j],(case,i,j,v)
    else:assert v==0
  observed.append(row)
 # GTKWave native GHW extraction is requested at the instant before each consuming edge.
 checks={'weight':[{'ns':s['ns'],'row':s['pre'][CORE+'.mmu_weight_address']} for s in weight], 'mmu':[{'ns':s['ns'],'row':s['pre'][CORE+'.reg_write_address']} for s in mmu], 'activation':[{'ns':s['ns'],'row':s['pre'][CORE+'.buffer_address1']} for s in activation]}
 coordinator=CORE+'.control_coordinator_i'
 sync_wait=[s for s in samples if s['pre'].get(coordinator+'.en_flags_cs')==1 and s['pre'].get(coordinator+'.instruction_en_cs')==1 and s['pre'].get(coordinator+'.instruction_running')==1]
 timing['syncWaitingEdges']=[s['ns'] for s in sync_wait]
 (OUT/(case+'-analysis.json')).write_text(json.dumps({'timing':timing,'rawExpected':raw,'outputExpected':expected,'actualHostOutput':observed,'nativeGhwCheckpoints':checks},indent=2))
 alltimings[case]=timing
 print(case,json.dumps(timing))
(OUT/'timings.json').write_text(json.dumps(alltimings,indent=2))
