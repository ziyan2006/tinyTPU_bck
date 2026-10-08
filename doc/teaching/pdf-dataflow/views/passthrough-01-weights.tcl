if {[catch {
gtkwave::addCommentTracesFromList [list {PASSTHROUGH | 1 WEIGHT BUFFER -> MMU | 14 rows}]
gtkwave::addCommentTracesFromList [list {-- Control --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction_en}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction_en}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction_en}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction_en}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction.op_code[7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction.op_code[7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction.op_code[7:0]}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_instruction.op_code[7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]
gtkwave::addCommentTracesFromList [list {-- Weight cache and MMU --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_en0}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_en0}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_en0}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_en0}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_address0[39:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_address0[39:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_address0[39:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_address0[39:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[0][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[0][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[0][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[0][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[1][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[1][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[1][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[1][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[13][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[13][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[13][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_read_port0[13][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_load_weight}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_load_weight}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_load_weight}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_load_weight}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_address[7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_address[7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_address[7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_address[7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_signed}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_signed}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_signed}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_weight_signed}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]
gtkwave::setZoomRangeTimes 4740000000 5030000000
gtkwave::setWindowStartTime 4740000000
gtkwave::setNamedMarker A 4785000000 {WEIGHT_CMD}
gtkwave::setNamedMarker B 4825000000 {WB_READ_0}
gtkwave::setNamedMarker C 4855000000 {MMU_LOAD_0}
gtkwave::setNamedMarker D 4985000000 {MMU_LOAD_13}
gtkwave::setMarker 4854999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/passthrough-01-weights.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/passthrough-01-weights.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
