-- Copyright 2018 Jonas Fuhrmann. All rights reserved.
--
-- This project is dual licensed under GNU General Public License version 3
-- and a commercial license available on request.
---------------------------------------------------------------------------
-- For non commercial use only:
-- This file is part of tinyTPU.
-- 
-- tinyTPU is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
-- 
-- tinyTPU is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
-- 
-- You should have received a copy of the GNU General Public License
-- along with tinyTPU. If not, see <http://www.gnu.org/licenses/>.

-- PDF data-flow experiment. DUT RTL is unchanged; observational tags are TB-only.
use WORK.TPU_pack.all;
library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;
use std.env.all;
entity TB_PDF_DATAFLOW is
    generic(RELU_CASE : boolean := false);
end entity;
architecture BEH of TB_PDF_DATAFLOW is
    constant N : natural := 14;
    signal CLK : std_logic := '0';
    signal NRESET : std_logic := '0';
    signal AWADDR, ARADDR : std_logic_vector(19 downto 0) := (others => '0');
    signal AWVALID, WVALID, ARVALID, RREADY : std_logic := '0';
    signal BREADY : std_logic := '1';
    signal AWREADY, WREADY, BVALID, ARREADY, RVALID : std_logic;
    signal WDATA : WORD_TYPE := (others => '0');
    signal RDATA : WORD_TYPE;
    signal WSTRB : std_logic_vector(3 downto 0) := (others => '0');
    signal BRESP, RRESP : std_logic_vector(1 downto 0);
    signal SYNCHRONIZE : std_logic;
    signal SYNC_COUNT : natural := 0;
    -- Testbench-only tags, not DUT validity or completion signals.
    signal PHASE : natural range 0 to 7 := 0;
    signal SUBMITTED_INSTRUCTION : std_logic_vector(79 downto 0) := (others => '0');
    signal SUBMITTED_OPCODE : BYTE_TYPE := (others => '0');
    signal READ_ROW : natural range 0 to N-1 := 0;
    signal READ_CHUNK : natural range 0 to 3 := 0;
    signal EXPECTED_WORD : WORD_TYPE := (others => '0');
    signal CHECKED_BYTES : natural := 0;
    function INPUT_VALUE(i,j : natural) return integer is
    begin
        if RELU_CASE then return 4*(integer(i)-integer(j));
        else return integer(i)+2*integer(j)+1; end if;
    end function;
    function WEIGHT_VALUE(i,j : natural) return integer is
    begin
        if RELU_CASE then
            if i=j then return 64; else return 0; end if;
        else
            if i=j then return 2;
            elsif j=i+1 then return 1;
            else return 0; end if;
        end if;
    end function;
    function RAW_RESULT(i,j : natural) return integer is
        variable sum : integer := 0;
    begin
        for k in 0 to N-1 loop sum := sum + INPUT_VALUE(i,k)*WEIGHT_VALUE(k,j); end loop;
        return sum;
    end function;
    function OUTPUT_VALUE(i,j : natural) return integer is
        variable result : integer := RAW_RESULT(i,j);
    begin
        if RELU_CASE then
            if result < 0 then return 0; else return result / 256; end if;
        else return (result / 16777216) mod 256; end if;
    end function;
begin
    CLK <= not CLK after 5 ns;
    DUT_i : entity WORK.tinyTPU_v1_0_S00_AXI(arch_imp)
    port map(
        S_AXI_ACLK => CLK, S_AXI_ARESETN => NRESET,
        S_AXI_AWADDR => AWADDR, S_AXI_AWPROT => "000", S_AXI_AWVALID => AWVALID, S_AXI_AWREADY => AWREADY,
        S_AXI_WDATA => WDATA, S_AXI_WSTRB => WSTRB, S_AXI_WVALID => WVALID, S_AXI_WREADY => WREADY,
        S_AXI_BRESP => BRESP, S_AXI_BVALID => BVALID, S_AXI_BREADY => BREADY,
        S_AXI_ARADDR => ARADDR, S_AXI_ARPROT => "000", S_AXI_ARVALID => ARVALID, S_AXI_ARREADY => ARREADY,
        S_AXI_RDATA => RDATA, S_AXI_RRESP => RRESP, S_AXI_RVALID => RVALID, S_AXI_RREADY => RREADY,
        SYNCHRONIZE => SYNCHRONIZE
    );
    SYNC_MONITOR : process(CLK)
    begin
        if rising_edge(CLK) then
            if NRESET='0' then SYNC_COUNT <= 0;
            elsif SYNCHRONIZE='1' then
                SYNC_COUNT <= SYNC_COUNT+1;
                report "PDF_SYNCHRONIZE" severity NOTE;
            end if;
        end if;
    end process;
    STIMULUS : process
        procedure TICK(count : positive := 1) is
        begin
            for cycle in 1 to count loop wait until rising_edge(CLK); wait for 1 ns; end loop;
        end procedure;
        procedure ACCEPT(signal valid, ready : in std_logic) is
            variable accepted : boolean := false;
        begin
            for cycle in 1 to 100 loop
                wait until rising_edge(CLK);
                if valid='1' and ready='1' then accepted:=true; exit; end if;
            end loop;
            assert accepted report "AXI handshake timeout" severity FAILURE;
        end procedure;
        procedure WRITE_WORD(address : natural; data : WORD_TYPE; strobe : std_logic_vector(3 downto 0) := "1111") is
        begin
            AWADDR <= std_logic_vector(to_unsigned(address,20)); AWVALID <= '1';
            ACCEPT(AWVALID,AWREADY); AWVALID <= '0'; wait for 1 ns;
            WDATA <= data; WSTRB <= strobe; WVALID <= '1';
            ACCEPT(WVALID,WREADY);
            WVALID <= '0'; WDATA <= (others => '0'); WSTRB <= "0000"; wait for 1 ns;
            ACCEPT(BVALID,BREADY);
            assert BRESP="00" report "AXI write error" severity FAILURE;
            wait for 1 ns;
        end procedure;
        procedure READ_WORD(address : natural; variable data : out WORD_TYPE) is
        begin
            ARADDR <= std_logic_vector(to_unsigned(address,20)); ARVALID <= '1'; RREADY <= '1';
            ACCEPT(ARVALID,ARREADY); ARVALID <= '0'; wait for 1 ns;
            ACCEPT(RVALID,RREADY); data := RDATA;
            assert RRESP="00" report "AXI read error" severity FAILURE;
            RREADY <= '0'; wait for 1 ns;
        end procedure;
        procedure COMMAND(opcode : natural; length : natural) is
            variable bits : std_logic_vector(79 downto 0);
        begin
            bits := INSTRUCTION_TO_BITS((
                OP_CODE => std_logic_vector(to_unsigned(opcode,8)),
                CALC_LENGTH => std_logic_vector(to_unsigned(length,32)),
                ACC_ADDRESS => (others => '0'), BUFFER_ADDRESS => (others => '0')));
            SUBMITTED_INSTRUCTION <= bits; SUBMITTED_OPCODE <= std_logic_vector(to_unsigned(opcode,8));
            report "PDF_COMMAND opcode=" & integer'image(opcode) & " length=" & integer'image(length)
                & " acc=0 buf=0 bits=" & to_hstring(bits) severity NOTE;
            WRITE_WORD(16#90004#,bits(31 downto 0));
            WRITE_WORD(16#90008#,bits(63 downto 32));
            WRITE_WORD(16#9000C#,x"0000" & bits(79 downto 64));
        end procedure;
        variable word, data, reference_word : WORD_TYPE;
        variable strobes : std_logic_vector(3 downto 0);
        variable byte_value : integer;
        variable completed : boolean := false;
    begin
        TICK(3); NRESET <= '1'; TICK;
        PHASE <= 1;
        for i in 0 to N-1 loop
            for chunk in 0 to 3 loop
                word := (others => '0'); strobes := (others => '0');
                for byte in 0 to 3 loop
                    if chunk*4+byte < N then
                        byte_value := WEIGHT_VALUE(i,chunk*4+byte);
                        word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_unsigned(byte_value,8));
                        strobes(byte):='1';
                    end if;
                end loop;
                WRITE_WORD(i*16+chunk*4,word,strobes);
                word := (others => '0');
                for byte in 0 to 3 loop
                    if chunk*4+byte < N then
                        byte_value := INPUT_VALUE(i,chunk*4+byte);
                        if RELU_CASE then
                            word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_signed(byte_value,8));
                        else word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_unsigned(byte_value,8)); end if;
                    end if;
                end loop;
                WRITE_WORD(16#80000#+i*16+chunk*4,word,strobes);
            end loop;
        end loop;
        PHASE <= 2;
        if RELU_CASE then COMMAND(9,N); else COMMAND(8,N); end if;
        PHASE <= 3;
        if RELU_CASE then COMMAND(33,N); else COMMAND(32,N); end if;
        PHASE <= 4;
        if RELU_CASE then COMMAND(145,N); else COMMAND(128,N); end if;
        PHASE <= 5; COMMAND(255,0);
        for cycle in 1 to 400 loop
            TICK; if SYNC_COUNT=1 then completed:=true; exit; end if;
        end loop;
        assert completed report "PDF synchronize timeout" severity FAILURE;
        PHASE <= 6;
        -- Exactly the PDF's in-place writeback: output vectors start at buffer 0.
        for i in 0 to N-1 loop
            READ_ROW <= i;
            for chunk in 0 to 3 loop
                READ_CHUNK <= chunk; reference_word := (others => '0');
                for byte in 0 to 3 loop
                    if chunk*4+byte < N then
                        reference_word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_unsigned(OUTPUT_VALUE(i,chunk*4+byte),8));
                    end if;
                end loop;
                EXPECTED_WORD <= reference_word;
                READ_WORD(16#80000#+i*16+chunk*4,data);
                assert data=reference_word report "PDF output mismatch row=" & integer'image(i)
                    & " chunk=" & integer'image(chunk) & " actual=" & to_hstring(data)
                    & " expected=" & to_hstring(reference_word) severity FAILURE;
                report "PDF_READ row=" & integer'image(i) & " chunk=" & integer'image(chunk)
                    & " actual=" & to_hstring(data) & " expected=" & to_hstring(reference_word) severity NOTE;
                if chunk=3 then CHECKED_BYTES <= CHECKED_BYTES+2;
                else CHECKED_BYTES <= CHECKED_BYTES+4; end if;
            end loop;
        end loop;
        TICK; PHASE <= 7; TICK;
        assert CHECKED_BYTES=196 report "PDF output comparison count" severity FAILURE;
        assert SYNC_COUNT=1 report "Unexpected synchronization count" severity FAILURE;
        report "PDF test successful: 196 output bytes plus 28 padding bytes; RELU_CASE=" & boolean'image(RELU_CASE) severity NOTE;
        stop; wait;
    end process;
    WATCHDOG : process
    begin wait for 50 us; assert false report "PDF watchdog timeout" severity FAILURE; end process;
end architecture;
