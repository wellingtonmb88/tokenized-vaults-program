use crate::{
    fixed_point_64,
    state::{raydium_tick_array, RaydiumTickArrayState},
    MulDiv, U128,
};
use anchor_lang::prelude::*;
use num_bigint::BigInt;
use raydium_clmm_cpi::states::{PersonalPositionState, PoolState, TickArrayState};

pub fn get_raydium_owed_fees<'info>(
    tick_array_lower: AccountLoader<'info, TickArrayState>,
    tick_array_upper: AccountLoader<'info, TickArrayState>,
    personal_position: &PersonalPositionState,
    pool_state: &AccountLoader<'info, PoolState>,
) -> (u64, u64) {
    let pool_state = match pool_state.clone().load() {
        Ok(state) => Box::new(state.clone()),
        Err(_) => {
            msg!("Failed to load pool_state");
            return (0, 0);
        }
    };
    let (fee_growth_inside_0_last_x64, fee_growth_inside_1_last_x64) =
        get_raydium_fees_growth_inside_last(
            tick_array_lower.clone(),
            tick_array_upper.clone(),
            &personal_position,
            &pool_state,
        );

    let fees_owed0 = calculate_raydium_latest_fees(
        personal_position.token_fees_owed_0,
        personal_position.fee_growth_inside_0_last_x64,
        fee_growth_inside_0_last_x64,
        personal_position.liquidity,
    );
    let fees_owed1 = calculate_raydium_latest_fees(
        personal_position.token_fees_owed_1,
        personal_position.fee_growth_inside_1_last_x64,
        fee_growth_inside_1_last_x64,
        personal_position.liquidity,
    );

    (fees_owed0, fees_owed1)
}

pub fn get_raydium_fees_growth_inside_last<'info>(
    tick_array_lower: AccountLoader<'info, TickArrayState>,
    tick_array_upper: AccountLoader<'info, TickArrayState>,
    personal_position: &PersonalPositionState,
    pool_state: &PoolState,
) -> (u128, u128) {
    let tick_array_lower_loader = tick_array_lower.load().unwrap();
    let tick_array_upper_loader = tick_array_upper.load().unwrap();

    let tick_lower_index = personal_position.tick_lower_index;
    let tick_upper_index = personal_position.tick_upper_index;

    let tick_lower_state = tick_array_lower_loader
        .get_tick_state(tick_lower_index, pool_state.tick_spacing)
        .unwrap();
    let tick_upper_state = tick_array_upper_loader
        .get_tick_state(tick_upper_index, pool_state.tick_spacing)
        .unwrap();

    let (fee_growth_inside_0_last_x64, fee_growth_inside_1_last_x64) =
        raydium_tick_array::get_fee_growth_inside(
            &tick_lower_state,
            &tick_upper_state,
            pool_state.tick_current,
            pool_state.fee_growth_global_0_x64,
            pool_state.fee_growth_global_1_x64,
        );

    (fee_growth_inside_0_last_x64, fee_growth_inside_1_last_x64)
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

pub fn raydium_fees_indexes(liquidity: u128, fees_owed0: u64, fees_owed1: u64) -> (u128, u128) {
    let denominator_multiplier = BigInt::from(10).pow(10);
    let mut fees_index_0: u128 = 0;
    let mut fees_index_1: u128 = 0;

    if fees_owed0 > 0 && liquidity > 0 {
        fees_index_0 = BigInt::from(fees_owed0)
            .checked_mul(&denominator_multiplier)
            .unwrap()
            .checked_div(&BigInt::from(liquidity))
            .unwrap()
            .to_string()
            .parse::<u128>()
            .unwrap();
    }
    if fees_owed1 > 0 && liquidity > 0 {
        fees_index_1 = BigInt::from(fees_owed1)
            .checked_mul(&denominator_multiplier)
            .unwrap()
            .checked_div(&BigInt::from(liquidity))
            .unwrap()
            .to_string()
            .parse::<u128>()
            .unwrap();
    }

    (fees_index_0, fees_index_1)
}

pub fn calculate_raydium_fees(
    investor_liquidity: u128,
    fee_index: u128,
    investor_fee_index: u128,
) -> u64 {
    let denominator_multiplier = BigInt::from(10).pow(10);
    let res = BigInt::from(investor_liquidity)
        .checked_mul(
            &BigInt::from(fee_index)
                .checked_sub(&BigInt::from(investor_fee_index))
                .unwrap(),
        )
        .unwrap()
        .checked_div(&denominator_multiplier)
        .unwrap()
        .to_string();
    res.parse::<u64>().unwrap()
}
