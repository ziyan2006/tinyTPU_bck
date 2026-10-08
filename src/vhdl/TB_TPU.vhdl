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

entity TB_TPU is
end entity;

architecture BEH of TB_TPU is
    constant N : natural := 14;
    constant clock_period : time := 10 ns;
    signal CLK : std_logic := '0';
    signal RESET : std_logic := '1';
    signal ENABLE : std_logic := '0';
    signal RUNTIME_COUNT : WORD_TYPE;
    signal INSTRUCTION : INSTRUCTION_TYPE := INIT_INSTRUCTION;
    signal INSTRUCTION_BITS : std_logic_vector(INSTRUCTION_WIDTH-1 downto 0);
    signal INSTRUCTION_WRITE_EN : std_logic_vector(0 to 2) := (others => '0');
    signal INSTRUCTION_EMPTY, INSTRUCTION_FULL : std_logic;
    signal WEIGHT_WRITE_PORT : BYTE_ARRAY_TYPE(0 to N-1) := (others => (others => '0'));
    signal WEIGHT_ADDRESS : WEIGHT_ADDRESS_TYPE := (others => '0');
    signal WEIGHT_ENABLE : std_logic := '0';
    signal WEIGHT_WRITE_ENABLE : std_logic_vector(0 to N-1) := (others => '0');
    signal BUFFER_WRITE_PORT : BYTE_ARRAY_TYPE(0 to N-1) := (others => (others => '0'));
    signal BUFFER_READ_PORT : BYTE_ARRAY_TYPE(0 to N-1);
    signal BUFFER_ADDRESS : BUFFER_ADDRESS_TYPE := (others => '0');
    signal BUFFER_ENABLE : std_logic := '0';
    signal BUFFER_WRITE_ENABLE : std_logic_vector(0 to N-1) := (others => '0');
    signal SYNCHRONIZE : std_logic;
    signal HOST_WEIGHT_BITS, HOST_INPUT_BITS, HOST_OUTPUT_BITS : std_logic_vector(N*BYTE_WIDTH-1 downto 0);
begin
    CLK <= not CLK after clock_period / 2;
    HOST_WEIGHT_BITS <= BYTE_ARRAY_TO_BITS(WEIGHT_WRITE_PORT);
    HOST_INPUT_BITS <= BYTE_ARRAY_TO_BITS(BUFFER_WRITE_PORT);
    HOST_OUTPUT_BITS <= BYTE_ARRAY_TO_BITS(BUFFER_READ_PORT);
    INSTRUCTION_BITS <= INSTRUCTION_TO_BITS(INSTRUCTION);
    DUT_i : entity WORK.TPU(BEH)
    generic map(MATRIX_WIDTH => N, WEIGHT_BUFFER_DEPTH => 32, UNIFIED_BUFFER_DEPTH => 64)
    port map(
        CLK => CLK, RESET => RESET, ENABLE => ENABLE,
        RUNTIME_COUNT => RUNTIME_COUNT,
        LOWER_INSTRUCTION_WORD => INSTRUCTION_BITS(31 downto 0),
        MIDDLE_INSTRUCTION_WORD => INSTRUCTION_BITS(63 downto 32),
        UPPER_INSTRUCTION_WORD => INSTRUCTION_BITS(79 downto 64),
        INSTRUCTION_WRITE_EN => INSTRUCTION_WRITE_EN,
        INSTRUCTION_EMPTY => INSTRUCTION_EMPTY, INSTRUCTION_FULL => INSTRUCTION_FULL,
        WEIGHT_WRITE_PORT => WEIGHT_WRITE_PORT, WEIGHT_ADDRESS => WEIGHT_ADDRESS,
        WEIGHT_ENABLE => WEIGHT_ENABLE, WEIGHT_WRITE_ENABLE => WEIGHT_WRITE_ENABLE,
        BUFFER_WRITE_PORT => BUFFER_WRITE_PORT, BUFFER_READ_PORT => BUFFER_READ_PORT,
        BUFFER_ADDRESS => BUFFER_ADDRESS, BUFFER_ENABLE => BUFFER_ENABLE,
        BUFFER_WRITE_ENABLE => BUFFER_WRITE_ENABLE, SYNCHRONIZE => SYNCHRONIZE
    );
    STIMULUS : process
        procedure TICK(count : positive := 1) is
        begin
            for cycle in 1 to count loop
                wait until rising_edge(CLK);
                wait for 1 ns;
            end loop;
        end procedure;
        procedure COMMAND(opcode : natural; length : natural; acc : natural := 0; buf : natural := 0) is
        begin
            assert INSTRUCTION_FULL = '0' report "Instruction FIFO full" severity FAILURE;
            INSTRUCTION <= (
                OP_CODE => std_logic_vector(to_unsigned(opcode, OP_CODE_WIDTH)),
                CALC_LENGTH => std_logic_vector(to_unsigned(length, LENGTH_WIDTH)),
                ACC_ADDRESS => std_logic_vector(to_unsigned(acc, ACCUMULATOR_ADDRESS_WIDTH)),
                BUFFER_ADDRESS => std_logic_vector(to_unsigned(buf, BUFFER_ADDRESS_WIDTH))
            );
            INSTRUCTION_WRITE_EN <= (others => '1');
            TICK;
            INSTRUCTION_WRITE_EN <= (others => '0');
            TICK;
        end procedure;
        procedure WAIT_SYNC is
            variable seen : boolean := false;
        begin
            for cycle in 1 to 400 loop
                TICK;
                if SYNCHRONIZE = '1' then seen := true; exit; end if;
            end loop;
            assert seen report "TPU synchronize timeout" severity FAILURE;
            report "SYSTEM_SYNC runtime=" & integer'image(to_integer(unsigned(RUNTIME_COUNT))) severity NOTE;
            assert unsigned(RUNTIME_COUNT) > 0 report "Runtime counter did not run" severity FAILURE;
            TICK(2);
            assert INSTRUCTION_EMPTY = '1' report "Instructions not drained" severity FAILURE;
        end procedure;
        variable expected : integer;
    begin
        TICK(2);
        RESET <= '0'; ENABLE <= '1';
        TICK;
        -- Signed inputs A[i,j] = 4*(i-j), weights W = 64*identity.
        -- Raw point products are multiples of 256, so ReLU's /256 rounding
        -- has an independent exact integer reference (no LUT approximation).
        WEIGHT_ENABLE <= '1'; WEIGHT_WRITE_ENABLE <= (others => '1');
        BUFFER_ENABLE <= '1'; BUFFER_WRITE_ENABLE <= (others => '1');
        for i in 0 to N-1 loop
            WEIGHT_ADDRESS <= std_logic_vector(to_unsigned(i, WEIGHT_ADDRESS_WIDTH));
            BUFFER_ADDRESS <= std_logic_vector(to_unsigned(i, BUFFER_ADDRESS_WIDTH));
            for j in 0 to N-1 loop
                if i=j then WEIGHT_WRITE_PORT(j) <= x"40";
                else WEIGHT_WRITE_PORT(j) <= x"00"; end if;
                BUFFER_WRITE_PORT(j) <= std_logic_vector(to_signed(4*(i-j), BYTE_WIDTH));
            end loop;
            TICK;
        end loop;
        WEIGHT_ENABLE <= '0'; WEIGHT_WRITE_ENABLE <= (others => '0');
        BUFFER_ENABLE <= '0'; BUFFER_WRITE_ENABLE <= (others => '0');
        TICK;
        for pass in 1 to 2 loop
            COMMAND(9, N); -- signed weight load, base 0
            if pass=1 then COMMAND(33, N); -- overwrite
            else COMMAND(35, N); end if; -- add second point product
            COMMAND(145, N, 0, pass*N); -- signed ReLU, distinct output buffers
            COMMAND(255, 0);
            WAIT_SYNC;
            BUFFER_ENABLE <= '1';
            for i in 0 to N-1 loop
                BUFFER_ADDRESS <= std_logic_vector(to_unsigned(pass*N+i, BUFFER_ADDRESS_WIDTH));
                TICK(3); -- synchronous RAM plus two host-read registers
                for j in 0 to N-1 loop
                    expected := pass*(i-j);
                    if expected < 0 then expected := 0; end if;
                    assert BUFFER_READ_PORT(j) = std_logic_vector(to_signed(expected, BYTE_WIDTH))
                        report "TPU result mismatch pass=" & integer'image(pass)
                        & " row=" & integer'image(i) & " lane=" & integer'image(j)
                        & " expected=" & integer'image(expected)
                        & " actual=" & to_hstring(BUFFER_READ_PORT(j)) severity FAILURE;
                end loop;
                report "SYSTEM_RESULT pass=" & integer'image(pass) & " row=" & integer'image(i)
                    & " data=" & to_hstring(BYTE_ARRAY_TO_BITS(BUFFER_READ_PORT)) severity NOTE;
            end loop;
            BUFFER_ENABLE <= '0';
            TICK;
        end loop;
        report "TPU test successful: 392 output bytes checked; overwrite, accumulation, signed ReLU and synchronize" severity NOTE;
        stop;
        wait;
    end process;
    WATCHDOG : process
    begin
        wait for 30 us;
        assert false report "TPU test watchdog" severity FAILURE;
    end process;
end architecture;
