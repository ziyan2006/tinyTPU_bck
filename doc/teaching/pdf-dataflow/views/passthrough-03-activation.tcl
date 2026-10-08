if {[catch {
gtkwave::addCommentTracesFromList [list {PASSTHROUGH | 3 ACC -> ACTIVATION -> UNIFIED BUFFER | 14 vectors}]
gtkwave::addCommentTracesFromList [list {-- Control --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction_en}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction_en}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction_en}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction_en}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction.op_code[7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction.op_code[7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction.op_code[7:0]}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_instruction.op_code[7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_signed}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_signed}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_signed}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_signed}]
gtkwave::addCommentTracesFromList [list {-- Accumulator and activation input --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_address[15:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_address[15:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_address[15:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_address[15:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[0][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[0][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[0][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[0][31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[1][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[1][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[1][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[1][31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[13][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[13][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[13][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_read_port[13][31:0]}]
gtkwave::addCommentTracesFromList [list {-- Actual bytes written back --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address1[23:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address1[23:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address1[23:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address1[23:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[0][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[0][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[0][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[0][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[1][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[1][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[1][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[1][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[13][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[13][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[13][7:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port1[13][7:0]}]
gtkwave::setZoomRangeTimes 4940000000 5490000000
gtkwave::setWindowStartTime 4940000000
gtkwave::setNamedMarker A 4975000000 {ACT_CMD}
gtkwave::setNamedMarker B 5305000000 {UB_WRITE_0}
gtkwave::setNamedMarker C 5435000000 {UB_WRITE_13}
gtkwave::setNamedMarker D 5445000000 {IRQ}
gtkwave::setMarker 5374999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/passthrough-03-activation.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/passthrough-03-activation.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
