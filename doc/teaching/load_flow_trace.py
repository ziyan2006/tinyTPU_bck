"""Sample the existing PDF VCDs for the instruction/hardware teaching view.

Controls are read immediately before each rising edge. Unsupported VCD arrays
are reconstructed only for the two byte-vector read pipelines and SDS, using
the actual RAM output bits and the verified RTL reset/enable rules.
"""
import re
import hashlib
import json

TOP = 'tb_pdf_dataflow'
AXI = TOP + '.dut_i'
TPU = AXI + '.tpu_i'
CORE = TPU + '.tpu_core_i'


def load_flow_trace(path, case, signed):
    fields = {name: TOP + '.' + name for name in (
        'nreset awaddr araddr awvalid awready wvalid wready wdata wstrb '
        'bvalid bready bresp arvalid arready rvalid rready rdata rresp '
        'synchronize checked_bytes').split()}
    fields.update({name: CORE + '.' + name for name in (
        'reset enable weight_en0 weight_address0 buffer_en0 buffer_address0 '
        'mmu_load_weight mmu_weight_address mmu_activate_weight '
        'reg_write_en reg_write_address reg_accumulate reg_read_address '
        'activation_function activation_signed buffer_write_en1 buffer_address1 '
        'weight_instruction_en mmu_instruction_en activation_instruction_en '
        'weight_resource_busy mmu_resource_busy activation_resource_busy').split()})
    fields.update({name: TPU + '.' + name for name in (
        'instruction_write_en instruction_enable instruction_empty instruction_full '
        'weight_enable weight_address weight_write_enable buffer_enable '
        'buffer_address buffer_write_enable').split()})
    fields.update({
        'weight_ram': CORE + '.weight_buffer_i.read_port0_bits',
        'input_ram': CORE + '.unified_buffer_i.read_port0_bits',
        'sync_flags': CORE + '.control_coordinator_i.en_flags_cs',
        'sync_en': CORE + '.control_coordinator_i.instruction_en_cs',
        'sync_running': CORE + '.control_coordinator_i.instruction_running',
        'instruction_word': AXI + '.write_data_cs',
    })
    scopes, definitions, events = [], {}, []
    header = True
    for line in path.read_text().splitlines():
        if header:
            if line.startswith('$scope'):
                scopes.append(line.split()[2])
            elif line.startswith('$upscope'):
                scopes.pop()
            elif line.startswith('$var'):
                words = line.split()
                definitions['.'.join(scopes + [words[4].split('[')[0]])] = words[3]
            elif line.startswith('$enddefinitions'):
                header = False
        elif line.startswith('#'):
            events.append((int(line[1:]), []))
        elif line and line[0] in 'b01uUxXzZwWlLhH-':
            value, code = line[1:].split() if line[0] == 'b' else (line[0], line[1:])
            events[-1][1].append((code, value))
    assert set(fields.values()).issubset(definitions), 'Missing hardware teaching signals'
    codes = {key: definitions[name] for key, name in fields.items()}
    clock = definitions[TOP + '.clk']
    state, frames = {}, []
    ub_pipe, wb_pipe = [0, 0], [0, 0]
    ub_rows = [None, None, None]
    delays = [[0] * 14 for _ in range(13)]
    row_delays = [[None] * 14 for _ in range(13)]
    def number(code):
        value = state.get(code, 'x')
        return None if re.search('[^01]', value) else int(value, 2)
    def vector(value):
        if value is None:
            return [None] * 14
        result = [(value >> (8 * j)) & 255 for j in range(14)]
        return [v - 256 if signed and v >= 128 else v for v in result]
    for stamp, changes in events:
        rising = any(code == clock and value == '1' for code, value in changes)
        if rising:
            frame = {'ns': stamp // 1000000, **{key: number(code) for key, code in codes.items()}}
            input_bits, weight_bits = frame.pop('input_ram'), frame.pop('weight_ram')
            frame['inputVector'] = vector(ub_pipe[1])
            frame['weightVector'] = vector(wb_pipe[1])
            frame['inputRow'] = ub_rows[2]
            frame['sdsVector'] = [frame['inputVector'][0]] + [delays[j-1][j] for j in range(1, 14)]
            frame['sdsRows'] = [ub_rows[2]] + [row_delays[j-1][j] for j in range(1, 14)]
            frame['sync_wait'] = int(frame['sync_flags'] == 1 and frame['sync_en'] == 1 and frame['sync_running'] == 1)
            for kind, enable, address, source in (
                ('weight', 'mmu_load_weight', 'mmu_weight_address', 'weights'),
                ('mmu', 'reg_write_en', 'reg_write_address', 'raw'),
                ('activation', 'buffer_write_en1', 'buffer_address1', 'writeback')):
                if frame[enable] == 1:
                    checkpoint = next(p for p in case['checkpoints'][kind] if p['ns'] == frame['ns'])
                    assert checkpoint['row'] == frame[address]
                    frame[kind + 'Vector'] = case[source][checkpoint['row']]
            if frame['mmu_load_weight'] == 1:
                assert vector(wb_pipe[1]) == case['weights'][frame['mmu_weight_address']], 'Weight read pipeline differs from native GHW'
            if frame['inputRow'] is not None:
                assert frame['inputVector'] == case['input'][frame['inputRow']], 'Input read pipeline differs from initialization'
            # Store only JSON-safe numbers; the vectors above carry the wide buses.
            frames.append(frame)
            if frame['reset'] == 1:
                ub_pipe, wb_pipe = [0, 0], [0, 0]
                ub_rows = [None, None, None]
                delays = [[0] * 14 for _ in range(13)]
                row_delays = [[None] * 14 for _ in range(13)]
            elif frame['enable'] == 1:
                ub_pipe = [input_bits, ub_pipe[0]]
                wb_pipe = [weight_bits, wb_pipe[0]]
                delays = [frame['inputVector']] + delays[:-1]
                row_delays = [[ub_rows[2]] * 14] + row_delays[:-1]
                row = frame['buffer_address0'] if frame['buffer_en0'] == 1 and frame['buffer_enable'] != 1 else None
                ub_rows = [row] + ub_rows[:2]
        for code, value in changes:
            state[code] = value
    assert len(frames) == 883 and frames[-1]['ns'] == 8825
    for signal in ('mmu_load_weight', 'reg_write_en', 'buffer_write_en1'):
        assert sum(f[signal] == 1 for f in frames) == 14
    assert sum(f['sync_wait'] for f in frames) == len(case['timing']['syncWaitingEdges'])
    return frames


def verify_native_flow(evidence, base, cases):
    """Reject stale reconstruction evidence before publishing the page."""
    proof = json.loads(evidence.read_text())
    for key, case in cases.items():
        record = proof['cases'][key]
        for name, expected in record['sourceSha256'].items():
            assert hashlib.sha256((base / 'results' / name).read_bytes()).hexdigest() == expected, 'Regenerate native hardware checks: ' + name
        counts = {'input': 0, 'sds': 0}
        for frame in case['frames']:
            if not any(row is not None for row in frame['sdsRows']):
                continue
            actual = record['samples'][str(frame['ns'])]
            if frame['inputRow'] is not None:
                assert actual['input'] == frame['inputVector'], 'Input reconstruction differs from native GHW'
                counts['input'] += 14
            for j, row in enumerate(frame['sdsRows']):
                if row is not None:
                    assert actual['sds'][j] == frame['sdsVector'][j], 'SDS reconstruction differs from native GHW'
                    counts['sds'] += 1
        assert counts == record['checkedValues'] == {'input': 196, 'sds': 196}
