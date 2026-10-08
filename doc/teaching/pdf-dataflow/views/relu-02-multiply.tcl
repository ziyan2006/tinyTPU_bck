if {[catch {
gtkwave::addCommentTracesFromList [list {RELU | 2 UNIFIED BUFFER -> SDS -> MMU -> ACC | C=A*W}]
gtkwave::addCommentTracesFromList [list {-- Control --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction_en}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction_en}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction_en}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction_en}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction.op_code[7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction.op_code[7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction.op_code[7:0]}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_instruction.op_code[7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_systolic_signed}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_systolic_signed}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_systolic_signed}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_systolic_signed}]
gtkwave::addCommentTracesFromList [list {-- Buffer and systolic skew --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_en0}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_en0}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_en0}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_en0}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address0[23:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address0[23:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address0[23:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_address0[23:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_read_port0[0][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_read_port0[0][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_read_port0[0][7:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_read_port0[0][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[0][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[0][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[0][7:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[0][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[13][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[13][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[13][7:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.sds_systolic_output[13][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_activate_weight}]
gtkwave::addCommentTracesFromList [list {-- Raw 32-bit dot products --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_en}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_en}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_en}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_en}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_address[15:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_address[15:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_address[15:0]}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_write_address[15:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_accumulate}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_accumulate}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_accumulate}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.reg_accumulate}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[0][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[0][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[0][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[0][31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[1][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[1][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[1][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[1][31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[13][31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[13][31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[13][31:0]}]
gtkwave::/Edit/Data_Format/Signed_Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_result_data[13][31:0]}]
gtkwave::setZoomRangeTimes 4760000000 5200000000
gtkwave::setWindowStartTime 4760000000
gtkwave::setNamedMarker A 4795000000 {MMU_CMD}
gtkwave::setNamedMarker B 4835000000 {UB_READ_0}
gtkwave::setNamedMarker C 5025000000 {ACC_WRITE_0}
gtkwave::setNamedMarker D 5155000000 {ACC_WRITE_13}
gtkwave::setMarker 5024999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/relu-02-multiply.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/relu-02-multiply.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
