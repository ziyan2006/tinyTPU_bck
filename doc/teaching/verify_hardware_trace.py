"""Verify cache/SDS reconstruction against GTKWave's original GHW arrays.

Run after regenerating the PDF simulations. Requires GTKWave with Tcl support
and a desktop or Xvfb, using the same runtime settings as render_gtkwave.py.
"""
from pathlib import Path
import csv
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from load_dataflow import load_dataflow

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE = HERE / 'pdf-dataflow'
GTK = os.environ.get('GTKWAVE') or shutil.which('gtkwave')
assert GTK, 'Set GTKWAVE to the GTKWave executable'
bundle = load_dataflow(HERE, ROOT)
proof = {'method': 'GTKWave native GHW byte arrays, 1 fs before each consuming rising edge', 'cases': {}}
prefix = 'top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.'
with tempfile.TemporaryDirectory(prefix='tinytpu-hardware-') as directory:
    scratch = Path(directory)
    for key, case in bundle['cases'].items():
        frames = [f for f in case['frames'] if any(row is not None for row in f['sdsRows'])]
        output = scratch / (key + '.csv')
        paths = {kind: [prefix + name + f'[{j}][7:0]' for j in range(14)]
                 for kind, name in [('input', 'buffer_read_port0'), ('sds', 'sds_systolic_output')]}
        body = f'set f [open {{{output}}} w]\nputs $f {{kind,ns,' + ','.join(f'v{j}' for j in range(14)) + '}\n'
        for kind, signals in paths.items():
            for signal in signals:
                body += f'if {{[gtkwave::addSignalsFromList [list {{{signal}}}]] != 1}} {{error {{Missing {signal}}}}}\n'
            for frame in frames:
                body += f'gtkwave::setMarker {frame["ns"] * 1000000 - 1}\nset values [list]\n'
                for signal in signals:
                    body += f'lappend values [gtkwave::getTraceValueAtMarkerFromName {{{signal}}}]\n'
                body += f'puts $f "{kind},{frame["ns"]},[join $values ,]"\n'
        body += 'close $f\n'
        script = scratch / (key + '.tcl')
        script.write_text('if {[catch {\n' + body + '\n} err]} {puts "TCL_ERROR: $err"}\ngtkwave::/File/Quit\n')
        result = subprocess.run([GTK, '-f', str(BASE / 'results' / (key + '.ghw')), '-r', str(BASE / 'views/gtkwaverc'), '-S', str(script)], capture_output=True, text=True, timeout=45)
        assert result.returncode == 0 and 'TCL_ERROR' not in result.stdout + result.stderr, result.stdout + result.stderr
        samples = {}
        for row in csv.DictReader(output.open()):
            values = []
            for j in range(14):
                try:
                    value = int(row[f'v{j}'], 16)
                    if key == 'relu' and value >= 128:
                        value -= 256
                except ValueError:
                    value = None
                values.append(value)
            samples.setdefault(row['ns'], {})[row['kind']] = values
        counts = {'input': 0, 'sds': 0}
        for frame in frames:
            actual = samples[str(frame['ns'])]
            if frame['inputRow'] is not None:
                assert actual['input'] == frame['inputVector'], (key, frame['ns'], 'input')
                counts['input'] += 14
            for j, source_row in enumerate(frame['sdsRows']):
                if source_row is not None:
                    assert actual['sds'][j] == frame['sdsVector'][j], (key, frame['ns'], j, actual['sds'][j], frame['sdsVector'][j])
                    counts['sds'] += 1
        assert counts == {'input': 196, 'sds': 196}
        proof['cases'][key] = {'sourceSha256': {name: hashlib.sha256((BASE / 'results' / name).read_bytes()).hexdigest() for name in (key + '.ghw', key + '.vcd')}, 'checkedValues': counts, 'samples': samples}
        print(key, 'native input/SDS: PASS (196 values each)', flush=True)
(HERE / 'evidence/hardware-native.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2))
