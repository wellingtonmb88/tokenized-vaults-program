use crate::{
    fixed_point_64,
    state::{raydium_tick_array, RaydiumTickArrayState},
    MulDiv, U128,
};
use anchor_lang::prelude::*;
use num_bigint::BigInt;
use raydium_clmm_cpi::states::{PersonalPositionState, PoolState, TickArrayState, TickState};

pub fn get_raydium_owed_fees<'info>(
    tick_lower_state: &TickState,
    tick_upper_state: &TickState,
    personal_position: &PersonalPositionState,
    tick_current: i32,
    fee_growth_global_0_x64: u128,
    fee_growth_global_1_x64: u128,
) -> (u64, u64) {
    let (fee_growth_inside_0_last_x64, fee_growth_inside_1_last_x64) =
        raydium_tick_array::get_fee_growth_inside(
            tick_lower_state,
            tick_upper_state,
            tick_current,
            fee_growth_global_0_x64,
            fee_growth_global_1_x64,
        );

    let fees_owed_0 = calculate_raydium_latest_fees(
        personal_position.token_fees_owed_0,
        personal_position.fee_growth_inside_0_last_x64,
        fee_growth_inside_0_last_x64,
        personal_position.liquidity,
    );
    let fees_owed_1 = calculate_raydium_latest_fees(
        personal_position.token_fees_owed_1,
        personal_position.fee_growth_inside_1_last_x64,
        fee_growth_inside_1_last_x64,
        personal_position.liquidity,
    );

    (fees_owed_0, fees_owed_1)
}

pub fn calculate_raydium_latest_fees(
    last_total_fees: u64,
    fee_growth_inside_last_x64: u128,
    fee_growth_inside_latest_x64: u128,
    liquidity: u128,
) -> u64 {
    if fee_growth_inside_latest_x64 <= fee_growth_inside_last_x64 || liquidity == 0 {
        return last_total_fees;
    }
    let fee_growth_delta =
        U128::from(fee_growth_inside_latest_x64.wrapping_sub(fee_growth_inside_last_x64))
            .mul_div_floor(U128::from(liquidity), U128::from(fixed_point_64::Q64))
            .unwrap()
            .to_underflow_u64();

    last_total_fees.checked_add(fee_growth_delta).unwrap()
}
