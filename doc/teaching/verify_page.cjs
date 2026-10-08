const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const ROOT=__dirname;const SCRATCH=path.join(ROOT,'.browser-output');fs.mkdirSync(SCRATCH,{recursive:true});const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});const page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.setContent(fs.readFileSync(path.join(ROOT,'tinyTPU-lab.html'),'utf8'));
 assert.equal(await page.locator('#time').textContent(),'15 ns');
 await page.screenshot({path:path.join(SCRATCH,'desktop.png'),fullPage:true});
 await page.locator('[data-step="1"]').click();assert.equal(await page.locator('#time').textContent(),'25 ns');
 await page.locator('[data-moment="5"]').click();assert.equal(await page.locator('#time').textContent(),'55 ns');
 await page.locator('#mode').selectOption('clock');await page.locator('#next').click();assert.equal(await page.locator('#time').textContent(),'65 ns');
 await page.locator('[data-cell="0,0"]').click();assert((await page.locator('#registers').textContent()).includes('工作权重13'));
 await page.locator('#goto-check').click();assert.equal(await page.locator('#time').textContent(),'125 ns');
 assert.equal(await page.locator('#matrix-c button').first().textContent(),'30565');
 await page.locator('[data-result="3,0"]').click();await page.locator('#goto-check').click();assert.equal(await page.locator('#time').textContent(),'155 ns');
 assert.equal(await page.locator('#matrix-c .checked').count(),16);
 await page.locator('#case-select').selectOption('1');assert.equal(await page.locator('#time').textContent(),'205 ns');
 await page.locator('#goto-check').click();assert.equal(await page.locator('#time').textContent(),'345 ns');assert.equal(await page.locator('#matrix-c button').first().textContent(),'-17778');
 const expected=require(path.join(ROOT,'evidence/trace.json')).cases[1].expected.flat().map(String);assert.deepEqual(await page.locator('#matrix-c button').allTextContents(),expected);
 // Every time sample must render the actual captured register values.
 for (const c of [0,1]){await page.locator('#case-select').selectOption(String(c));for(let i=0;i<19;i++){await page.locator('#timeline').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},String(i));const s=await page.evaluate(()=>samples()[index]);assert.equal(await page.locator('#time').textContent(),s.ns+' ns');const labels=await page.locator('#array .cell strong').allTextContents();assert.deepEqual(labels,s.post.cells.flat().map(x=>'Σ '+x.partial_sum_cs))}assert.deepEqual(await page.locator('#matrix-c button').allTextContents(),require(path.join(ROOT,'evidence/trace.json')).cases[c].expected.flat().map(String))}
 await page.locator('#window').selectOption('19');await page.locator('[data-time-index="6"]').click();assert.equal(await page.locator('#time').textContent(),'255 ns');
 await page.locator('[data-module="fifo"]').click();assert((await page.locator('#module-note').textContent()).includes('回归均通过'));
 await page.locator('#module-source').click();assert(await page.locator('#source-dialog').isVisible());assert((await page.locator('#source-content').textContent()).includes('entity INSTRUCTION_FIFO'));await page.keyboard.press('Escape');
 const csvWait=page.waitForEvent('download');await page.locator('#csv-download').click();const csv=await csvWait;await csv.saveAs(path.join(SCRATCH,'export-int8.csv'));assert.equal(fs.readFileSync(path.join(SCRATCH,'export-int8.csv'),'utf8').trim().split('\n').length,20);
 const svgWait=page.waitForEvent('download');await page.locator('#svg-download').click();const svg=await svgWait;await svg.saveAs(path.join(SCRATCH,'export-architecture.svg'));
 await page.locator('#tab-system').click();assert.equal(await page.locator('#system-time').textContent(),'5 ns');
 const sys=require(path.join(ROOT,'evidence/system-trace.json'));assert.equal(await page.locator('#system-commands tr').count(),8);
 await page.locator('#system-commands button').first().click();assert.equal(await page.locator('#system-time').textContent(),sys.commands[0].ns+' ns');
 await page.locator('#system-next').click();assert.equal(await page.locator('#system-time').textContent(),(sys.commands[0].ns+10)+' ns');
 await page.locator('#system-reset').click();await page.locator('#system-moment').click();assert.equal(await page.locator('#system-time').textContent(),sys.samples[sys.moments[0].index].ns+' ns');
 // Verify the 252 rendered system samples against the captured control and output buses.
 for(let i=0;i<sys.samples.length;i++){
  await page.locator('#system-timeline').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},String(i));
  const sample=sys.samples[i],controls=await page.locator('#system-controls b').allTextContents();
  const fmt=n=>n==null?'X':String(n),p=sample.pre,c=p.core;
  assert.deepEqual(controls,[`${fmt(p.instruction_write_en)} / ${fmt(p.instruction_pop)}`,c.weight_en0,c.buffer_en0,c.mmu_load_weight,c.reg_write_en,c.reg_accumulate,c.buffer_write_en1,p.synchronize,sample.post.runtime_count].map(fmt));
  assert.deepEqual(await page.locator('#system-live-output b').allTextContents(),sample.post.output.map(fmt));
 }
 assert((await page.locator('#system-count').textContent()).includes('392 / 392'));
 for(const r of sys.results){
  await page.locator('#system-pass').selectOption(String(r.pass));await page.locator('#system-row').selectOption(String(r.row));await page.locator('#system-goto-row').click();
  assert.deepEqual(await page.locator('#system-result-values b').allTextContents(),r.values.map(String));
 }
 await page.locator('#system-reset').click();assert.deepEqual(await page.locator('#system-result-values b').allTextContents(),Array(14).fill('—'));
 await page.locator('#system-play').click();await page.waitForTimeout(460);assert.notEqual(await page.locator('#system-time').textContent(),'5 ns');await page.locator('#system-play').click();
 const si=await page.evaluate(()=>systemIndex);await page.locator('#system-next').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>systemIndex),si+1);
 await page.locator('[data-smodule="register"]').click();await page.locator('#system-module-source').click();assert((await page.locator('#source-content').textContent()).includes('ACC_ACCU_ADDRESS'));await page.keyboard.press('Escape');
 const sysWait=page.waitForEvent('download');await page.locator('#system-download').click();await(await sysWait).saveAs(path.join(SCRATCH,'export-system-trace.json'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(SCRATCH,'export-system-trace.json'))),sys);
 await page.locator('#system-pass').selectOption('2');await page.locator('#system-row').selectOption('13');await page.locator('#system-goto-row').click();await page.screenshot({path:path.join(SCRATCH,'system-desktop.png'),fullPage:true});
 // The new chapter uses the original GTKWave images and observed GHW/AXI data.
 await page.locator('#tab-system').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-dataflow').getAttribute('aria-selected'),'true');
 const flowStages=['06-host-write-cache','01-weights','02-multiply','03-activation','04-synchronize','05-host-readback'];
 for(const key of ['passthrough','relu']){
  await page.locator('#flow-case').selectOption(key);
  const native=JSON.parse(fs.readFileSync(path.join(ROOT,'pdf-dataflow/results',key+'-native-verified.json'))),analysis=JSON.parse(fs.readFileSync(path.join(ROOT,'pdf-dataflow/results',key+'-analysis.json')));
  for(let i=0;i<6;i++){
   await page.locator('#flow-stages [data-flow-stage="'+i+'"]').click();await page.locator('#flow-wave-image').evaluate(img=>img.decode());
   assert.equal(await page.locator('#flow-stages [aria-pressed="true"]').count(),1);
   const src=await page.locator('#flow-wave-image').getAttribute('src');assert.equal(src,'data:image/png;base64,'+fs.readFileSync(path.join(ROOT,'pdf-dataflow/views',key+'-'+flowStages[i]+'.png')).toString('base64'));
   assert.equal(await page.locator('#flow-markers tr').count(),4);
  }
  const inputs=Array.from({length:14},(_,i)=>Array.from({length:14},(_,j)=>key==='relu'?4*(i-j):i+2*j+1));
  for(const [kind,expected] of [['input',inputs],['weights',native.actual.weight],['raw',native.actual.mmu],['output',analysis.actualHostOutput]]){
   await page.locator('#flow-matrix-kind').selectOption(kind);assert.deepEqual(await page.locator('#flow-matrix tbody td button').allTextContents(),expected.flat().map(String));
  }
  assert.deepEqual(await page.locator('#flow-commands tr td:nth-child(2)').allTextContents(),key==='relu'?['0x09','0x21','0x91','0xFF']:['0x08','0x20','0x80','0xFF']);
  const wait=page.waitForEvent('download');await page.locator('#flow-json').click();const name=path.join(SCRATCH,'export-pdf-'+key+'.json');await(await wait).saveAs(name);const observed=JSON.parse(fs.readFileSync(name));assert.deepEqual(observed.raw,native.actual.mmu);assert.deepEqual(observed.output,analysis.actualHostOutput);assert.deepEqual(observed.timing,analysis.timing);
 }
 await page.locator('#flow-matrix-kind').selectOption('raw');await page.locator('[data-flow-cell="0,13"]').click();assert.equal(await page.locator('#flow-cell-title').textContent(),'C[0,13] → Y[0,13]');assert.deepEqual(await page.locator('#flow-values b').allTextContents(),['-3328','0']);assert((await page.locator('#flow-dot-terms').textContent()).endsWith('Σ = -3328'));
 await page.locator('#flow-matrix-kind').selectOption('weights');await page.locator('[data-flow-cell="2,2"]').click();assert.equal(await page.locator('#flow-cell-title').textContent(),'C[0,13] → Y[0,13]');
 await page.locator('#flow-matrix-kind').selectOption('output');await page.locator('[data-flow-cell="13,0"]').click();assert.deepEqual(await page.locator('#flow-values b').allTextContents(),['3328','13']);
 await page.locator('#flow-stages [data-flow-stage="3"]').click();await page.locator('#flow-next').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>flowStage),4);await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>flowStage),3);
 await page.locator('#flow-source').click();assert((await page.locator('#source-content').textContent()).includes('INPUT_REG_cs(i)(4*BYTE_WIDTH-1 downto 3*BYTE_WIDTH)'));await page.keyboard.press('Escape');
 for(const [id,source] of [['flow-png','views/relu-03-activation.png'],['flow-zip','waveforms.zip'],['flow-report','waveform-report.pdf']]){
  const wait=page.waitForEvent('download');await page.locator('#'+id).click();const dest=path.join(SCRATCH,id+'-download');await(await wait).saveAs(dest);assert(fs.readFileSync(dest).equals(fs.readFileSync(path.join(ROOT,'pdf-dataflow',source))));
 }
 await page.locator('#flow-zoom').evaluate(input=>{input.value='2';input.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.locator('#flow-zoom-value').textContent(),'200%');assert(await page.locator('#flow-wave-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));
 await page.locator('#flow-zoom').evaluate(input=>{input.value='1';input.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.screenshot({path:path.join(SCRATCH,'dataflow-desktop.png'),fullPage:true});
 await page.locator('#tab-isa').click();assert.equal(await page.locator('#packed-hex').textContent(),'0x00000000000000000E09');
 await page.locator('#opcode').selectOption('153');await page.locator('#buffer-address').fill('14');assert.equal(await page.locator('#packed-hex').textContent(),'0x00000E00000000000E99');assert.equal(await page.locator('#text-command').textContent(),'[153,14,0,14]');
 await page.locator('#acc-address').fill('65536');assert((await page.locator('#pack-error').textContent()).includes('超出'));assert(await page.locator('#copy-command').isDisabled());
 await page.locator('#acc-address').fill('65535');await page.locator('#length').fill('4294967295');await page.locator('#buffer-address').fill('16777215');assert.equal(await page.locator('#packed-hex').textContent(),'0xFFFFFFFFFFFFFFFFFF99');
 await page.locator('#opcode').selectOption('9');await page.locator('#weight-address').fill('1099511627775');assert.equal(await page.locator('#packed-hex').textContent(),'0xFFFFFFFFFFFFFFFFFF09');
 await page.locator('#opcode').selectOption('255');assert.equal(await page.locator('#packed-hex').textContent(),'0x000000000000000000FF');
 await page.locator('#opcode').selectOption('2');assert((await page.locator('#pack-flags').textContent()).includes('空操作'));
 await page.screenshot({path:path.join(SCRATCH,'isa-desktop.png'),fullPage:true});
 await page.locator('#tab-evidence').click();const vcdWait=page.waitForEvent('download');await page.locator('#vcd-download').click();await (await vcdWait).saveAs(path.join(SCRATCH,'export-mmu.vcd'));assert.equal(fs.readFileSync(path.join(SCRATCH,'export-mmu.vcd'),'utf8'),fs.readFileSync(path.join(ROOT,'evidence/mmu.vcd'),'utf8'));assert((await page.locator('#mmu-log').textContent()).includes('@155ns'));assert((await page.locator('#tpu-log').textContent()).includes('exit_status=0'));assert((await page.locator('#register-log').textContent()).includes('40 lane comparisons'));await page.screenshot({path:path.join(SCRATCH,'evidence-desktop.png'),fullPage:true});
 await page.locator('#tab-lab').click();await page.locator('#case-select').selectOption('0');await page.locator('[data-step="3"]').click();await page.locator('[data-moment="11"]').click();await page.locator('[data-cell="3,0"]').click();await page.screenshot({path:path.join(SCRATCH,'teaching-desktop.png'),fullPage:true});
 await page.locator('#help-open').click();assert(await page.locator('#help-dialog').isVisible());await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(SCRATCH,'mobile.png'),fullPage:true});
 let overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'Mobile body overflow');
 for(const tab of ['system','dataflow','isa','evidence']){await page.locator('#tab-'+tab).click();assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Mobile '+tab+' overflow');if(tab==='dataflow')await page.screenshot({path:path.join(SCRATCH,'dataflow-mobile.png'),fullPage:true})}
 await page.locator('#tab-lab').click();await page.locator('#mode').selectOption('clock');await page.locator('#reset').click();await page.locator('#speed').selectOption('200');await page.locator('#play').click();await page.waitForTimeout(460);assert((await page.locator('#time').textContent())!=='15 ns');await page.locator('#play').click();
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await browser.close();fs.writeFileSync(path.join(ROOT,'evidence/browser-checks.txt'),'PASS: desktop and 390px mobile; 38 MMU and 252 system sample renders; 32 MMU and 392 system result comparisons; step/clock/play; actual 8-command system program; PDF dataflow chapter with both cases and 12 exact GTKWave PNGs; all 14x14 observed matrices; signed point-product selection; six-stage keyboard navigation; exact offline PNG/ZIP/PDF downloads and observed JSON exports; source dialog; waveform seeking; CSV/SVG/JSON/VCD export; BigInt encoding and range validation; zero JS errors; zero network requests.\n');console.log('Browser checks: PASS');
})().catch(e=>{console.error(e);process.exit(1)})
