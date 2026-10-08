"""Run the two self-checking PDF data-flow cases without editing DUT RTL."""
from pathlib import Path
import subprocess,os,shutil,json,hashlib
HERE=Path(__file__).resolve().parent
ROOT=Path(os.environ.get('TINYTPU_ROOT',str(HERE.parents[2])))
OUT=Path(os.environ.get('TINYTPU_RESULTS',str(HERE/'results'))).resolve()
GHDL=os.environ.get('GHDL') or shutil.which('ghdl') or '/workspace/tinytpu-env/bin/ghdl'
BUILD=OUT/'build';BUILD.mkdir(parents=True,exist_ok=True)
def run(name,args):
 r=subprocess.run(args,cwd=BUILD,capture_output=True,text=True)
 (OUT/(name+'.log')).write_text('$ '+' '.join(args)+'\n'+r.stdout+r.stderr+f'\nexit_status={r.returncode}\n')
 assert r.returncode==0,r.stdout+r.stderr
 return r.stdout+r.stderr
sources=sorted(ROOT.glob('src/vhdl/**/*.vhd'))+sorted(ROOT.glob('src/vhdl/**/*.vhdl'))
run('import',[GHDL,'-i','--std=08','-frelaxed-rules',*map(str,sources),str(HERE/'TB_PDF_DATAFLOW.vhdl')])
run('build',[GHDL,'-m','--std=08','-frelaxed-rules','TB_PDF_DATAFLOW'])
for case,relu in [('passthrough',False),('relu',True)]:
 text=run(case,[GHDL,'-r','--std=08','-frelaxed-rules','TB_PDF_DATAFLOW','-gRELU_CASE='+str(relu).lower(),'--assert-level=error','--read-wave-opt='+str(HERE/'signals.opt'),'--vcd='+str(OUT/(case+'.vcd')),'--wave='+str(OUT/(case+'.ghw'))])
 assert 'PDF test successful: 196 output bytes plus 28 padding bytes' in text
 assert text.count('PDF_COMMAND')==4 and text.count('PDF_READ row=')==56
 assert 'simulation stopped by --stop-time' not in text
 print(case+': PASS, 196 actual output bytes and 28 padding bytes')
git=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True)
commit=git.stdout.strip() if git.returncode==0 else (ROOT/'SOURCE_COMMIT').read_text().strip() if (ROOT/'SOURCE_COMMIT').exists() else 'unversioned'
manifest={'repositoryCommit':commit,'N':14,'clockNs':10,'testbenchSha256':hashlib.sha256((HERE/'TB_PDF_DATAFLOW.vhdl').read_bytes()).hexdigest(),'rtlSha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},'cases':{'passthrough':{'opcodes':[8,32,128,255],'input':'A[i,j]=i+2j+1','weights':'W[i,i]=2; W[i,i+1]=1; otherwise 0','expected':'C=A*W (all values 2..118); output=floor(C/2^24) mod 256, hence zero for this positive small-value case'},'relu':{'opcodes':[9,33,145,255],'input':'A[i,j]=4(i-j)','weights':'W=64I','expected':'C=256(i-j); output=max(0,i-j)'}},'allStartAddresses':0,'length':14,'syncLength':0,'dataHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.iterdir()) if p.suffix in ['.vcd','.ghw','.log']}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
