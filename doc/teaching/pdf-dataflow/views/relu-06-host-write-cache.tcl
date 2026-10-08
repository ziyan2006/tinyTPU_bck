if {[catch {
gtkwave::addCommentTracesFromList [list {RELU | 6 HOST AXI WRITE CACHE | PDF last diagram; input initialization}]
gtkwave::addCommentTracesFromList [list {-- Host write channels --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.awaddr[19:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.awaddr[19:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.awaddr[19:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.awaddr[19:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.awvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.awvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.awvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.awvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.awready}]] != 1} {error {Missing top.tb_pdf_dataflow.awready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.awready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.awready}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.wdata[31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.wdata[31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.wdata[31:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.wdata[31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.wstrb[3:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.wstrb[3:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.wstrb[3:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.wstrb[3:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.wvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.wvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.wvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.wvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.wready}]] != 1} {error {Missing top.tb_pdf_dataflow.wready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.wready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.wready}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.bvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.bvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.bvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.bvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.bready}]] != 1} {error {Missing top.tb_pdf_dataflow.bready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.bready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.bready}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.bresp[1:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.bresp[1:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.bresp[1:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.bresp[1:0]}]
gtkwave::addCommentTracesFromList [list {-- AXI wrapper to unified cache --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_write_enable[0:13]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.buffer_write_enable[0:13]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_write_enable[0:13]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_write_enable[0:13]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_enable_on_write}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.buffer_enable_on_write}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_enable_on_write}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.buffer_enable_on_write}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[0][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[0][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[0][7:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[0][7:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[13][7:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[13][7:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[13][7:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.dut_i.tpu_i.tpu_core_i.buffer_write_port[13][7:0]}]
gtkwave::setZoomRangeTimes 40000000 365000000
gtkwave::setWindowStartTime 40000000
gtkwave::setNamedMarker A 95000000 {UB_WDATA_0}
gtkwave::setNamedMarker B 115000000 {UB_BRESP_0}
gtkwave::setNamedMarker C 335000000 {PARTIAL_WDATA}
gtkwave::setNamedMarker D 355000000 {PARTIAL_BRESP}
gtkwave::setMarker 94999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/relu-06-host-write-cache.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/relu-06-host-write-cache.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
