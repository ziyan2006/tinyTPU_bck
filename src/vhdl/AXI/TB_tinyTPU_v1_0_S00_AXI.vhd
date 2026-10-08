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

use WORK.TPU_pack.all;
library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;
use std.env.all;

entity TB_tinyTPU_v1_0_S00_AXI is end entity;
architecture BEH of TB_tinyTPU_v1_0_S00_AXI is
    constant N : natural := 14;
    signal CLK : std_logic := '0';
    signal NRESET : std_logic := '0';
    signal AWADDR, ARADDR : std_logic_vector(19 downto 0) := (others => '0');
    signal AWVALID, WVALID, BREADY, ARVALID, RREADY : std_logic := '0';
    signal AWREADY, WREADY, BVALID, ARREADY, RVALID : std_logic;
    signal WDATA : WORD_TYPE := (others => '0');
    signal RDATA : WORD_TYPE;
    signal WSTRB : std_logic_vector(3 downto 0) := (others => '0');
    signal BRESP, RRESP : std_logic_vector(1 downto 0);
    signal SYNCHRONIZE : std_logic;
    signal SYNC_COUNT : natural := 0;
    signal ALWAYS_READY : std_logic := '1';
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
            elsif SYNCHRONIZE='1' then SYNC_COUNT <= SYNC_COUNT+1;
                report "AXI_SYNC count=" & integer'image(SYNC_COUNT+1) severity NOTE; end if;
        end if;
    end process;
    STIMULUS : process
        procedure TICK(count : positive := 1) is
        begin
            for cycle in 1 to count loop wait until rising_edge(CLK); wait for 1 ns; end loop;
        end procedure;
        procedure ACCEPT(signal valid : in std_logic; signal ready : in std_logic) is
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
            TICK(2); -- Independent address and data channels, delayed data.
            WDATA <= data; WSTRB <= strobe; WVALID <= '1';
            ACCEPT(WVALID,WREADY);
            WVALID <= '0'; WDATA <= (others => '0'); WSTRB <= "0000";
            wait for 1 ns; -- Master may change data/strobes immediately after W handshake.
            ACCEPT(BVALID,ALWAYS_READY);
            assert BRESP="00" report "AXI write response error" severity FAILURE;
            wait for 1 ns;
            TICK(2); -- Hold BREADY low, response must remain valid.
            assert BVALID='1' and BRESP="00" report "AXI write response lost under backpressure" severity FAILURE;
            BREADY <= '1'; TICK; BREADY <= '0'; TICK;
        end procedure;
        procedure READ_WORD(address : natural; variable data : out WORD_TYPE; backpressure : boolean := false) is
            variable held : WORD_TYPE;
        begin
            ARADDR <= std_logic_vector(to_unsigned(address,20)); ARVALID <= '1';
            if backpressure then RREADY <= '0'; else RREADY <= '1'; end if;
            ACCEPT(ARVALID,ARREADY); ARVALID <= '0'; wait for 1 ns;
            ACCEPT(RVALID,ALWAYS_READY); held := RDATA;
            assert RRESP="00" report "AXI read response error" severity FAILURE;
            if backpressure then
                wait for 1 ns; TICK(3);
                assert RVALID='1' and RDATA=held and RRESP="00"
                    report "AXI read response not held under backpressure" severity FAILURE;
                RREADY <= '1'; TICK;
            else wait for 1 ns; end if;
            data := held; RREADY <= '0'; TICK;
        end procedure;
        procedure PAIRED_ADDRESSES is
        begin
            -- A single-transaction slave must not acknowledge two requests
            -- in one cycle and then discard one of them.
            AWADDR <= x"80F10"; ARADDR <= x"80F00";
            AWVALID <= '1'; ARVALID <= '1'; RREADY <= '1';
            ACCEPT(AWVALID,AWREADY);
            assert ARREADY='0' report "AXI accepted simultaneous addresses without queuing both" severity FAILURE;
            AWVALID <= '0'; wait for 1 ns;
            WDATA <= x"12345678"; WSTRB <= "1111"; WVALID <= '1';
            ACCEPT(WVALID,WREADY); WVALID <= '0'; WDATA <= (others=>'0'); WSTRB <= "0000";
            BREADY <= '1'; wait for 1 ns;
            ACCEPT(BVALID,BREADY); BREADY <= '0'; wait for 1 ns;
            ACCEPT(ARVALID,ARREADY); ARVALID <= '0'; wait for 1 ns;
            ACCEPT(RVALID,RREADY);
            assert RDATA=x"11BB33DD" and RRESP="00" report "AXI queued read lost after write arbitration" severity FAILURE;
            RREADY <= '0'; wait for 1 ns; TICK;
        end procedure;
        procedure COMMAND(opcode : natural; length : natural; acc : natural := 0; buf : natural := 0) is
            variable command_bits : std_logic_vector(79 downto 0);
        begin
            command_bits := INSTRUCTION_TO_BITS((
                OP_CODE => std_logic_vector(to_unsigned(opcode,8)),
                CALC_LENGTH => std_logic_vector(to_unsigned(length,32)),
                ACC_ADDRESS => std_logic_vector(to_unsigned(acc,16)),
                BUFFER_ADDRESS => std_logic_vector(to_unsigned(buf,24))));
            WRITE_WORD(16#90004#,command_bits(31 downto 0));
            WRITE_WORD(16#90008#,command_bits(63 downto 32));
            WRITE_WORD(16#9000C#,x"0000" & command_bits(79 downto 64));
        end procedure;
        variable word, data : WORD_TYPE;
        variable weight : integer;
        variable expected : integer;
        variable strobes : std_logic_vector(3 downto 0);
        variable completed : boolean;
    begin
        TICK(3); NRESET <= '1'; TICK;
        -- A byte-mask regression must not depend on live WSTRB after acceptance.
        WRITE_WORD(16#80F00#,x"11223344");
        WRITE_WORD(16#80F00#,x"AABBCCDD","0101");
        READ_WORD(16#80F00#,data);
        assert data=x"11BB33DD" report "AXI byte strobe/data not captured at W handshake, got " & to_hstring(data) severity FAILURE;
        READ_WORD(16#80F00#,data,true);
        assert data=x"11BB33DD" report "AXI backpressure changed data" severity FAILURE;
        PAIRED_ADDRESSES;
        -- Fill all 14 input/weight vectors over the actual 32-bit bus.
        for i in 0 to N-1 loop
            for chunk in 0 to 3 loop
                word := (others => '0'); strobes := (others => '0');
                for byte in 0 to 3 loop
                    if chunk*4+byte < N then
                        if i=chunk*4+byte then weight:=64; else weight:=0; end if;
                        word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_signed(weight,8));
                        strobes(byte):='1';
                    end if;
                end loop;
                WRITE_WORD(i*16+chunk*4,word,strobes);
                word := (others => '0');
                for byte in 0 to 3 loop
                    if chunk*4+byte<N then
                        word((byte+1)*8-1 downto byte*8) := std_logic_vector(to_signed(4*(i-chunk*4-byte),8));
                    end if;
                end loop;
                WRITE_WORD(16#80000#+i*16+chunk*4,word,strobes);
            end loop;
        end loop;
        for pass in 1 to 2 loop
            COMMAND(9,N);
            if pass=1 then COMMAND(33,N); else COMMAND(35,N); end if;
            COMMAND(145,N,0,pass*N); COMMAND(255,0);
            completed:=false;
            for cycle in 1 to 400 loop
                TICK; if SYNC_COUNT>=pass then completed:=true; exit; end if;
            end loop;
            assert completed report "AXI TPU synchronize timeout" severity FAILURE;
            for i in 0 to N-1 loop
                for chunk in 0 to 3 loop
                    READ_WORD(16#80000#+(pass*N+i)*16+chunk*4,data,chunk=0);
                    for byte in 0 to 3 loop
                        if chunk*4+byte<N then
                            expected:=pass*(i-chunk*4-byte);
                            if expected<0 then expected:=0; end if;
                        else expected:=0; end if; -- Padding beyond 14 lanes reads zero.
                        assert data((byte+1)*8-1 downto byte*8)=std_logic_vector(to_signed(expected,8))
                            report "AXI TPU result mismatch pass=" & integer'image(pass)
                            & " row=" & integer'image(i) & " lane=" & integer'image(chunk*4+byte)
                            & " actual word=" & to_hstring(data) severity FAILURE;
                    end loop;
                end loop;
            end loop;
            READ_WORD(16#90000#,data,true);
            assert unsigned(data)>0 report "AXI runtime counter not readable" severity FAILURE;
        end loop;
        report "AXI test successful: 392 output bytes plus 56 padding bytes; strobes, responses, address arbitration, signed ReLU, accumulation and synchronize" severity NOTE;
        stop;
        wait;
    end process;
    WATCHDOG : process
    begin wait for 100 us; assert false report "AXI test watchdog" severity FAILURE; end process;
end architecture;
