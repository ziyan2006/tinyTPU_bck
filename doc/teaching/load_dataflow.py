"""Load verified PDF experiments into the standalone teaching page."""
from pathlib import Path
import base64, hashlib, json, re, zipfile

STAGE_ORDER = ['06-host-write-cache', '01-weights', '02-multiply',
               '03-activation', '04-synchronize', '05-host-readback']

def load_dataflow(teaching, root):
    base = teaching / 'pdf-dataflow'
    manifest = json.loads((base / 'results/manifest.json').read_text())
    artifact = json.loads((base / 'artifact-manifest.json').read_text())
    for name, expected in manifest['rtlSha256'].items():
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, 'PDF experiment RTL changed: ' + name
    for name, expected in artifact['experimentSourceSha256'].items():
        assert hashlib.sha256((base / name).read_bytes()).hexdigest() == expected, 'PDF experiment source changed: ' + name
    for name, expected in artifact['filesSha256'].items():
        assert hashlib.sha256((base / name).read_bytes()).hexdigest() == expected, 'PDF experiment evidence changed: ' + name
    assert manifest['N'] == 14 and manifest['clockNs'] == 10
    views = {v['stage']: v for v in json.loads((base / 'views/views.json').read_text())}
    bundle = {'N': 14, 'clockNs': 10, 'commit': manifest['repositoryCommit'],
              'stages': [views[s] for s in STAGE_ORDER], 'cases': {}, 'images': {}, 'downloads': {}}
    def binary(name, mime):
        data = (base / name).read_bytes()
        return {'name': Path(name).name, 'mime': mime,
                'base64': base64.b64encode(data).decode('ascii'),
                'sha256': hashlib.sha256(data).hexdigest()}
    for key in ['passthrough', 'relu']:
        analysis = json.loads((base / f'results/{key}-analysis.json').read_text())
        native = json.loads((base / f'results/{key}-native-verified.json').read_text())
        assert native['actual']['mmu'] == analysis['rawExpected']
        assert native['actual']['activation'] == analysis['outputExpected'] == analysis['actualHostOutput']
        assert native['checkedValues'] == {'weight': 196, 'mmu': 196, 'activation': 196}
        input_matrix = [[4*(i-j) if key == 'relu' else i+2*j+1 for j in range(14)] for i in range(14)]
        weights = native['actual']['weight']
        raw = native['actual']['mmu']
        assert all(sum(input_matrix[i][k]*weights[k][j] for k in range(14)) == raw[i][j] for i in range(14) for j in range(14))
        log = (base / f'results/{key}.log').read_text()
        assert 'PDF test successful: 196 output bytes plus 28 padding bytes' in log and 'exit_status=0' in log
        commands = []
        enable_names = ['weight_instruction_en','mmu_instruction_en','activation_instruction_en','synchronize']
        for i, match in enumerate(re.finditer(r'@(\d+)ns:.*PDF_COMMAND opcode=(\d+) length=(\d+) acc=0 buf=0 bits=([0-9A-F]{20})', log)):
            ns, op, length, bits = match.groups()
            assert int(bits, 16) == (int(length) << 8) | int(op)
            commands.append({'submittedNs': int(ns), 'opcode': int(op), 'length': int(length),
                             'hex': bits, 'sampleNs': analysis['timing'][enable_names[i]]['firstNs']})
        assert [c['opcode'] for c in commands] == manifest['cases'][key]['opcodes'] and len(commands) == 4
        bundle['cases'][key] = {'title': '有符号 ReLU' if key == 'relu' else '直通（取高字节）',
                                 'input': input_matrix, 'weights': weights, 'raw': raw,
                                 'output': analysis['actualHostOutput'], 'writeback': native['actual']['activation'],
                                 'timing': analysis['timing'], 'commands': commands,
                                 'checkpoints': analysis['nativeGhwCheckpoints'], 'log': log}
        for stage in STAGE_ORDER:
            name = key + '-' + stage
            bundle['images'][name] = binary('views/' + name + '.png', 'image/png')
    bundle['downloads']['zip'] = binary('waveforms.zip', 'application/zip')
    bundle['downloads']['report'] = binary('waveform-report.pdf', 'application/pdf')
    with zipfile.ZipFile(base / 'waveforms.zip') as archive:
        assert len(archive.namelist()) == 12 and archive.testzip() is None
        assert sorted(hashlib.sha256(archive.read(p)).hexdigest() for p in archive.namelist()) == sorted(v['sha256'] for v in bundle['images'].values())
    return bundle
