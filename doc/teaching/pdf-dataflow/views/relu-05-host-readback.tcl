if {[catch {
gtkwave::addCommentTracesFromList [list {RELU | 5 HOST AXI READ | first two vector rows (56 reads total)}]
gtkwave::addCommentTracesFromList [list {-- Read address channel --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.clk}]] != 1} {error {Missing top.tb_pdf_dataflow.clk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.clk}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]] != 1} {error {Missing top.tb_pdf_dataflow.synchronize}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.synchronize}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.araddr[19:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.araddr[19:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.araddr[19:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.araddr[19:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.arvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.arvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.arready}]] != 1} {error {Missing top.tb_pdf_dataflow.arready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.arready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.arready}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.read_row}]] != 1} {error {Missing top.tb_pdf_dataflow.read_row}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.read_row}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.read_row}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.read_chunk}]] != 1} {error {Missing top.tb_pdf_dataflow.read_chunk}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.read_chunk}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.read_chunk}]
gtkwave::addCommentTracesFromList [list {-- Read response channel --}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.rvalid}]] != 1} {error {Missing top.tb_pdf_dataflow.rvalid}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.rvalid}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.rvalid}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.rready}]] != 1} {error {Missing top.tb_pdf_dataflow.rready}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.rready}]
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.rready}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.rdata[31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.rdata[31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.rdata[31:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.rdata[31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.rresp[1:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.rresp[1:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.rresp[1:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.rresp[1:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.expected_word[31:0]}]] != 1} {error {Missing top.tb_pdf_dataflow.expected_word[31:0]}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.expected_word[31:0]}]
gtkwave::/Edit/Data_Format/Hex
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.expected_word[31:0]}]
if {[gtkwave::addSignalsFromList [list {top.tb_pdf_dataflow.checked_bytes}]] != 1} {error {Missing top.tb_pdf_dataflow.checked_bytes}}
gtkwave::highlightSignalsFromList [list {top.tb_pdf_dataflow.checked_bytes}]
gtkwave::/Edit/Data_Format/Decimal
gtkwave::unhighlightSignalsFromList [list {top.tb_pdf_dataflow.checked_bytes}]
gtkwave::setZoomRangeTimes 5420000000 5960000000
gtkwave::setWindowStartTime 5420000000
gtkwave::setNamedMarker A 5445000000 {IRQ}
gtkwave::setNamedMarker B 5455000000 {AR_ROW0_W0}
gtkwave::setNamedMarker C 5505000000 {R_ROW0_W0}
gtkwave::setNamedMarker D 5745000000 {R_ROW1_W0}
gtkwave::setMarker 5744999999
update
gtkwave::/File/Write_Save_File_As {/workspace/pdf-dataflow-sim/views/relu-05-host-readback.gtkw}
gtkwave::/File/Print_To_File PS {Letter (8.5" x 11")} Full {/workspace/pdf-dataflow-sim/views/relu-05-host-readback.ps}

} err]} {puts "TCL_ERROR: $err"}
gtkwave::/File/Quit
