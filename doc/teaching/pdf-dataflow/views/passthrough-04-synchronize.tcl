if {[catch {
gtkwave::addCommentTracesFromList [list {PASSTHROUGH | 4 SYNCHRONISE | wait for resources, then one IRQ}]
gtkwave::addCommentTracesFromList [list {-- Coordinator --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.en_flags_cs[0:3]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.en_flags_cs[0:3]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.en_flags_cs[0:3]}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.en_flags_cs[0:3]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_en_cs}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_en_cs}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_en_cs}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_en_cs}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_running}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_running}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_running}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.control_coordinator_i.instruction_running}]
gtkwave::addCommentTracesFromList [list {-- Resource interlock --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.weight_resource_busy}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.mmu_resource_busy}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.activation_resource_busy}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_en1}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]] != 1} {error {Missing top.tb_pdf_dataflow.synchronize}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.sync_count}]] != 1} {error {Missing top.tb_pdf_dataflow.sync_count}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.sync_count}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.sync_count}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.arvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.arready}]] != 1} {error {Missing top.tb_pdf_dataflow.arready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.arready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.arready}]
gtkwave::setZoomRangeTimes 4960000000 5500000000
gtkwave::setWindowStartTime 4960000000
gtkwave::setNamedMarker A 5035000000 {WAIT_START}
gtkwave::setNamedMarker B 5435000000 {LAST_ACT_BUSY}
gtkwave::setNamedMarker C 5445000000 {IRQ}
gtkwave::setNamedMarker D 5455000000 {HOST_AR}
gtkwave::setMarker 5444999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/passthrough-04-synchronize.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/passthrough-04-synchronize.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
