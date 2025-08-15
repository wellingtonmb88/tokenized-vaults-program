use anchor_lang::prelude::*;
use raydium_clmm_cpi::states::{TickArrayState, TickState, TICK_ARRAY_SIZE};

use crate::error::TokenizedVaultsErrorCode;

pub trait RaydiumTickArrayState {
    fn tick_count(tick_spacing: u16) -> i32;
    fn get_array_start_index(tick_index: i32, tick_spacing: u16) -> i32;
    fn get_tick_offset_in_array(
        start_tick_index: i32,
        tick_index: i32,
        tick_spacing: u16,
    ) -> Result<usize>;
    fn get_tick_state_mut(&mut self, tick_index: i32, tick_spacing: u16) -> Result<&mut TickState>;
    fn get_tick_state(&self, tick_index: i32, tick_spacing: u16) -> Result<&TickState>;
}

impl RaydiumTickArrayState for TickArrayState {
    fn tick_count(tick_spacing: u16) -> i32 {
        TICK_ARRAY_SIZE * i32::from(tick_spacing)
    }
    fn get_array_start_index(tick_index: i32, tick_spacing: u16) -> i32 {
        let ticks_in_array = TickArrayState::tick_count(tick_spacing);
        let mut start = tick_index / ticks_in_array;
        if tick_index < 0 && tick_index % ticks_in_array != 0 {
            start = start - 1;
        }
        start * ticks_in_array
    }
    /// Get tick's offset in current tick array, tick must be include in tick array， otherwise throw an error
    fn get_tick_offset_in_array(
        start_tick_index: i32,
        tick_index: i32,
        tick_spacing: u16,
    ) -> Result<usize> {
        let check_start_tick_index =
            TickArrayState::get_array_start_index(tick_index, tick_spacing);
        require_eq!(
            check_start_tick_index,
            start_tick_index,
            TokenizedVaultsErrorCode::InvalidTickArray
        );

        let offset_in_array = tick_index
            .checked_sub(start_tick_index)
            .unwrap()
            .checked_div(i32::from(tick_spacing))
            .unwrap() as usize;
        Ok(offset_in_array)
    }

    fn get_tick_state_mut(&mut self, tick_index: i32, tick_spacing: u16) -> Result<&mut TickState> {
        let offset_in_array = TickArrayState::get_tick_offset_in_array(
            self.start_tick_index,
            tick_index,
            tick_spacing,
        )?;
        Ok(&mut self.ticks[offset_in_array])
    }

    fn get_tick_state(&self, tick_index: i32, tick_spacing: u16) -> Result<&TickState> {
        let offset_in_array = TickArrayState::get_tick_offset_in_array(
            self.start_tick_index,
            tick_index,
            tick_spacing,
        )?;
        Ok(&self.ticks[offset_in_array])
    }
}

// Calculates the fee growths inside of tick_lower and tick_upper based on their positions relative to tick_current.
/// `fee_growth_inside = fee_growth_global - fee_growth_below(lower) - fee_growth_above(upper)`
pub fn get_fee_growth_inside(
    tick_lower: &TickState,
    tick_upper: &TickState,
    tick_current: i32,
    fee_growth_global_0_x64: u128,
    fee_growth_global_1_x64: u128,
) -> (u128, u128) {
    // calculate fee growth below
    let (fee_growth_below_0_x64, fee_growth_below_1_x64) = if tick_current >= tick_lower.tick {
        (
            tick_lower.fee_growth_outside_0_x64,
            tick_lower.fee_growth_outside_1_x64,
        )
    } else {
        (
            fee_growth_global_0_x64
                .checked_sub(tick_lower.fee_growth_outside_0_x64)
                .unwrap(),
            fee_growth_global_1_x64
                .checked_sub(tick_lower.fee_growth_outside_1_x64)
                .unwrap(),
        )
    };

    // Calculate fee growth above
    let (fee_growth_above_0_x64, fee_growth_above_1_x64) = if tick_current < tick_upper.tick {
        (
            tick_upper.fee_growth_outside_0_x64,
            tick_upper.fee_growth_outside_1_x64,
        )
    } else {
        (
            fee_growth_global_0_x64
                .checked_sub(tick_upper.fee_growth_outside_0_x64)
                .unwrap(),
            fee_growth_global_1_x64
                .checked_sub(tick_upper.fee_growth_outside_1_x64)
                .unwrap(),
        )
    };
    let fee_growth_inside_0_x64 = fee_growth_global_0_x64
        .wrapping_sub(fee_growth_below_0_x64)
        .wrapping_sub(fee_growth_above_0_x64);
    let fee_growth_inside_1_x64 = fee_growth_global_1_x64
        .wrapping_sub(fee_growth_below_1_x64)
        .wrapping_sub(fee_growth_above_1_x64);

    (fee_growth_inside_0_x64, fee_growth_inside_1_x64)
}
