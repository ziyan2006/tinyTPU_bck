"""Extract native GHW arrays and export real GTKWave figures/save files.

Requires GTKWave with Tcl support, Ghostscript and PyMuPDF. Use DISPLAY when
running under Xvfb, and GTKWave's library/cache settings if installed locally.
"""
from pathlib import Path
import os, subprocess, json, csv, shutil

HERE = Path(__file__).resolve().parent
OUT = Path(os.environ.get('TINYTPU_RESULTS', str(HERE / 'results'))).resolve()
VIEW = OUT.parent / 'views'
VIEW.mkdir(exist_ok=True)
GTK = os.environ.get('GTKWAVE') or shutil.which('gtkwave')
assert GTK, 'Set GTKWAVE to the GTKWave executable'
TOP = 'top.tb_pdf_dataflow'
CORE = TOP + '.dut_i.tpu_i.tpu_core_i'
RC = VIEW / 'gtkwaverc'
RC.write_text('initial_window_x 1900\ninitial_window_y 1050\nhide_sst 1\n'
              'initial_signal_window_width 360\nhier_max_level 2\n'
              'fontname_signals Monospace 13\nfontname_waves Monospace 11\n'
              'splash_disable 1\nscale_to_time_dimension n\n')

def q(s):
    assert '{' not in str(s) and '}' not in str(s)
    return '{' + str(s) + '}'

def run_tcl(case, stem, text):
    script = VIEW / (stem + '.tcl')
    script.write_text(text)
    r = subprocess.run([GTK, '-f', str(OUT / (case + '.ghw')), '-r', str(RC),
                        '-S', str(script)], capture_output=True, text=True, timeout=45)
    (VIEW / (stem + '-gtk.log')).write_text(r.stdout + r.stderr)
    assert r.returncode == 0, r.stdout + r.stderr
    assert 'TCL_ERROR' not in r.stdout + r.stderr, r.stdout + r.stderr

def checked_tcl(body):
    return 'if {[catch {\n' + body + '\n} err]} {puts "TCL_ERROR: $err"}\ngtkwave::/File/Quit\n'

# Value queries are performed on GTKWave native vector traces, not on a Python
# reconstruction of missing VCD arrays. Query one femtosecond before consumption.
for case in ['passthrough', 'relu']:
    analysis = json.loads((OUT / (case + '-analysis.json')).read_text())
    paths = {kind: [CORE + f'.{name}[{j}][{width - 1}:0]' for j in range(14)]
             for kind, name, width in [('weight', 'weight_read_port0', 8),
                                       ('mmu', 'mmu_result_data', 32),
                                       ('activation', 'buffer_write_port1', 8)]}
    body = 'set f [open ' + q(OUT / (case + '-native.csv')) + ' w]\n'
    body += 'puts $f {kind,row,ns,' + ','.join(f'v{j}' for j in range(14)) + '}\n'
    for kind, signals in paths.items():
        for s in signals:
            body += 'if {[gtkwave::addSignalsFromList [list ' + q(s) + ']] != 1} {error ' + q('Missing ' + s) + '}\n'
        for c in analysis['nativeGhwCheckpoints'][kind]:
            body += f'gtkwave::setMarker {c["ns"] * 1000000 - 1}\n'
            body += 'set vals [list]\n'
            for s in signals:
                body += 'lappend vals [gtkwave::getTraceValueAtMarkerFromName ' + q(s) + ']\n'
            body += f'puts $f "{kind},{c["row"]},{c["ns"]},[join $vals ,]"\n'
    body += 'close $f\n'
    run_tcl(case, case + '-native', checked_tcl(body))
    counts = {k: 0 for k in paths}
    actual = {k: [] for k in paths}
    for r in csv.DictReader((OUT / (case + '-native.csv')).open()):
        kind, i = r['kind'], int(r['row'])
        row = [int(r[f'v{j}'], 16) for j in range(14)]
        if kind == 'mmu' and case == 'relu':
            row = [v - (1 << 32) if v >= (1 << 31) else v for v in row]
        if kind == 'weight':
            expected = [64 if i == j else 0 for j in range(14)] if case == 'relu' else [2 if i == j else 1 if j == i + 1 else 0 for j in range(14)]
        else:
            expected = analysis['rawExpected' if kind == 'mmu' else 'outputExpected'][i]
        assert row == expected, (case, kind, i, row, expected)
        actual[kind].append(row)
        counts[kind] += len(row)
    assert all(c == 196 for c in counts.values())
    (OUT / (case + '-native-verified.json')).write_text(json.dumps({'method': 'GTKWave getTraceValueAtMarkerFromName on native GHW vectors, 1 fs before consuming rising edge', 'checkedValues': counts, 'actual': actual}, indent=2))
    print(case, 'native GTKWave weight/MMU/activation: PASS (196 values each)', flush=True)

def t(s): return TOP + '.' + s
def c(s): return CORE + '.' + s
def bus(s, width): return c(s) + f'[{width - 1}:0]'
def lane(s, j, width): return c(s) + f'[{j}][{width - 1}:0]'

# Each window is tied to measured consuming edges. Hex for opcodes/AXI, signed
# decimal for raw sums (including negative ReLU inputs), decimal for addresses.
views = [
 ('01-weights', '1 WEIGHT BUFFER -> MMU | 14 rows', 4740, 5030,
  [('A',4785,'WEIGHT_CMD'),('B',4825,'WB_READ_0'),('C',4855,'MMU_LOAD_0'),('D',4985,'MMU_LOAD_13')],
  [('Control', [(t('clk'),'bin'),(c('weight_instruction_en'),'bin'),(c('weight_instruction.op_code[7:0]'),'hex'),(c('weight_resource_busy'),'bin')]),
   ('Weight cache and MMU',[(c('weight_en0'),'bin'),(bus('weight_address0',40),'dec'),(lane('weight_read_port0',0,8),'dec'),(lane('weight_read_port0',1,8),'dec'),(lane('weight_read_port0',13,8),'dec'),(c('mmu_load_weight'),'bin'),(bus('mmu_weight_address',8),'dec'),(c('mmu_weight_signed'),'bin'),(c('mmu_activate_weight'),'bin')])]),
 ('02-multiply','2 UNIFIED BUFFER -> SDS -> MMU -> ACC | C=A*W',4760,5200,
  [('A',4795,'MMU_CMD'),('B',4835,'UB_READ_0'),('C',5025,'ACC_WRITE_0'),('D',5155,'ACC_WRITE_13')],
  [('Control',[(t('clk'),'bin'),(c('mmu_instruction_en'),'bin'),(c('mmu_instruction.op_code[7:0]'),'hex'),(c('mmu_resource_busy'),'bin'),(c('mmu_systolic_signed'),'bin')]),
   ('Buffer and systolic skew',[(c('buffer_en0'),'bin'),(bus('buffer_address0',24),'dec'),(lane('buffer_read_port0',0,8),'signed'),(lane('sds_systolic_output',0,8),'signed'),(lane('sds_systolic_output',13,8),'signed'),(c('mmu_activate_weight'),'bin')]),
   ('Raw 32-bit dot products',[(c('reg_write_en'),'bin'),(bus('reg_write_address',16),'dec'),(c('reg_accumulate'),'bin'),(lane('mmu_result_data',0,32),'signed'),(lane('mmu_result_data',1,32),'signed'),(lane('mmu_result_data',13,32),'signed')])]),
 ('03-activation','3 ACC -> ACTIVATION -> UNIFIED BUFFER | 14 vectors',4940,5490,
  [('A',4975,'ACT_CMD'),('B',5305,'UB_WRITE_0'),('C',5435,'UB_WRITE_13'),('D',5445,'IRQ')],
  [('Control',[(t('clk'),'bin'),(c('activation_instruction_en'),'bin'),(c('activation_instruction.op_code[7:0]'),'hex'),(c('activation_resource_busy'),'bin'),(c('activation_signed'),'bin')]),
   ('Accumulator and activation input',[(bus('reg_read_address',16),'dec'),(lane('reg_read_port',0,32),'signed'),(lane('reg_read_port',1,32),'signed'),(lane('reg_read_port',13,32),'signed')]),
   ('Actual bytes written back',[(c('buffer_write_en1'),'bin'),(bus('buffer_address1',24),'dec'),(lane('buffer_write_port1',0,8),'dec'),(lane('buffer_write_port1',1,8),'dec'),(lane('buffer_write_port1',13,8),'dec')])]),
 ('04-synchronize','4 SYNCHRONISE | wait for resources, then one IRQ',4960,5500,
  [('A',5035,'WAIT_START'),('B',5435,'LAST_ACT_BUSY'),('C',5445,'IRQ'),('D',5455,'HOST_AR')],
  [('Coordinator',[(t('clk'),'bin'),(c('control_coordinator_i.en_flags_cs[0:3]'),'hex'),(c('control_coordinator_i.instruction_en_cs'),'bin'),(c('control_coordinator_i.instruction_running'),'bin')]),
   ('Resource interlock',[(c('weight_resource_busy'),'bin'),(c('mmu_resource_busy'),'bin'),(c('activation_resource_busy'),'bin'),(c('buffer_write_en1'),'bin'),(t('synchronize'),'bin'),(t('sync_count'),'dec'),(t('arvalid'),'bin'),(t('arready'),'bin')])]),
 ('05-host-readback','5 HOST AXI READ | first two vector rows (56 reads total)',5420,5960,
  [('A',5445,'IRQ'),('B',5455,'AR_ROW0_W0'),('C',5505,'R_ROW0_W0'),('D',5745,'R_ROW1_W0')],
  [('Read address channel',[(t('clk'),'bin'),(t('synchronize'),'bin'),(t('araddr[19:0]'),'hex'),(t('arvalid'),'bin'),(t('arready'),'bin'),(t('read_row'),'dec'),(t('read_chunk'),'dec')]),
   ('Read response channel',[(t('rvalid'),'bin'),(t('rready'),'bin'),(t('rdata[31:0]'),'hex'),(t('rresp[1:0]'),'hex'),(t('expected_word[31:0]'),'hex'),(t('checked_bytes'),'dec')])]),
 ('06-host-write-cache','6 HOST AXI WRITE CACHE | PDF last diagram; input initialization',40,365,
  [('A',95,'UB_WDATA_0'),('B',115,'UB_BRESP_0'),('C',335,'PARTIAL_WDATA'),('D',355,'PARTIAL_BRESP')],
  [('Host write channels',[(t('clk'),'bin'),(t('awaddr[19:0]'),'hex'),(t('awvalid'),'bin'),(t('awready'),'bin'),(t('wdata[31:0]'),'hex'),(t('wstrb[3:0]'),'hex'),(t('wvalid'),'bin'),(t('wready'),'bin'),(t('bvalid'),'bin'),(t('bready'),'bin'),(t('bresp[1:0]'),'hex')]),
   ('AXI wrapper to unified cache',[(t('dut_i.buffer_write_enable[0:13]'),'hex'),(t('dut_i.buffer_enable_on_write'),'bin'),(lane('buffer_write_port',0,8),'hex'),(lane('buffer_write_port',13,8),'hex')])]),
]

for case in ['passthrough','relu']:
    for stem, title, start, end, markers, groups in views:
        if os.environ.get('TINYTPU_VIEW_FILTER') and not any(pattern in stem for pattern in os.environ['TINYTPU_VIEW_FILTER'].split(',')):
            continue
        name = case + '-' + stem
        height = 180 + 26 * (1 + sum(1 + len(signals) for _, signals in groups))
        import re
        RC.write_text(re.sub(r'initial_window_y \d+', 'initial_window_y '+str(height), RC.read_text()))
        body = 'gtkwave::addCommentTracesFromList [list ' + q(case.upper() + ' | ' + title) + ']\n'
        for label, signals in groups:
            body += 'gtkwave::addCommentTracesFromList [list ' + q('-- ' + label + ' --') + ']\n'
            for signal, fmt in signals:
                body += 'if {[gtkwave::addSignalsFromList [list ' + q(signal) + ']] != 1} {error ' + q('Missing ' + signal) + '}\n'
                body += 'gtkwave::highlightSignalsFromList [list ' + q(signal) + ']\n'
                if fmt in ['dec','signed','hex']:
                    body += 'gtkwave::/Edit/Data_Format/' + {'signed':'Signed_Decimal','dec':'Decimal','hex':'Hex'}[fmt] + '\n'
                body += 'gtkwave::unhighlightSignalsFromList [list ' + q(signal) + ']\n'
        body += f'gtkwave::setZoomRangeTimes {start*1000000} {end*1000000}\n'
        body += f'gtkwave::setWindowStartTime {start*1000000}\n'
        for letter, ns, label in markers:
            body += f'gtkwave::setNamedMarker {letter} {ns*1000000} ' + q(label) + '\n'
        cursor = {'01-weights':4855, '02-multiply':5025, '03-activation':5375,
                  '04-synchronize':5445, '05-host-readback':5745,
                  '06-host-write-cache':95}[stem]
        body += f'gtkwave::setMarker {cursor*1000000-1}\n'
        body += 'update\n'
        body += 'gtkwave::/File/Write_Save_File_As ' + q(VIEW / (name + '.gtkw')) + '\n'
        body += 'gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full ' + q(VIEW / (name + '.ps')) + '\n'
        run_tcl(case, name, checked_tcl(body))
        assert (VIEW / (name + '.ps')).stat().st_size > 1000
        subprocess.run(['gs','-q','-dBATCH','-dNOPAUSE','-sDEVICE=pdfwrite','-sOutputFile='+str(VIEW/(name+'.pdf')),str(VIEW/(name+'.ps'))],check=True,capture_output=True)
        import fitz
        doc = fitz.open(VIEW / (name + '.pdf'))
        page = doc[0]
        boxes = [fitz.Rect(b[:4]) * page.rotation_matrix for b in page.get_text('blocks')]
        # Remove only unused print margins; all wave traces and labels remain.
        clip = fitz.Rect(65, 65, 727, max(b.y1 for b in boxes) + 8)
        page.get_pixmap(matrix=fitz.Matrix(3,3), clip=clip).save(VIEW / (name + '.png'))
        doc.close()
        # GTKWave command line dump argument takes precedence over saved path.
        # Also save relative references for reopening from the views directory.
        save = VIEW / (name + '.gtkw')
        s = save.read_text()
        s = re.sub(r'^\[dumpfile\].*$', '[dumpfile] "../results/'+case+'.ghw"', s, flags=re.M)
        s = re.sub(r'^\[savefile\].*$', '[savefile] "'+name+'.gtkw"', s, flags=re.M)
        save.write_text(s)
        print('GTKWave exported:', name, flush=True)
    (VIEW / 'views.json').write_text(json.dumps([{'stage':s,'title':t,'windowNs':[a,b],'markers':m,'signals':g} for s,t,a,b,m,g in views],indent=2))
