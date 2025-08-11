use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

pub const MAXIMUM_PRICE_AGE: u64 = 600; // Ten minutes

#[derive(Debug, Clone)]
pub struct TokenPriceInfo {
    pub price: i64,
    pub expo: i32,
    pub conf: u64,
}

impl TokenPriceInfo {
    /// Convert raw price to a normalized price with given decimal places
    pub fn get_normalized_price(&self, target_decimals: u8) -> Result<u64> {
        if self.price < 0 {
            return Err(error!(crate::error::TokenizedVaultsErrorCode::InvalidPrice));
        }

        let price = self.price as u64;
        let expo_diff = target_decimals as i32 + self.expo;

        if expo_diff >= 0 {
            Ok(price.checked_mul(10u64.pow(expo_diff as u32)).unwrap_or(0))
        } else {
            Ok(price
                .checked_div(10u64.pow((-expo_diff) as u32))
                .unwrap_or(0))
        }
    }
}

/// Extract price from Pyth price update account
pub fn get_price_from_pyth_update<'info>(
    price_update: &Account<'info, PriceUpdateV2>,
    feed_id: &str,
) -> Result<TokenPriceInfo> {
    let price_feed = price_update
        .get_price_unchecked(&get_feed_id_from_hex(feed_id)?)
        .map_err(|_| error!(crate::error::TokenizedVaultsErrorCode::PythPriceFeedNotFound))?;
    // .get_price_no_older_than(
    //     &Clock::get()?,
    //     MAXIMUM_PRICE_AGE,
    //     &get_feed_id_from_hex(feed_id)?,
    // )?;
    // .map_err(|_| error!(crate::error::TokenizedVaultsErrorCode::PythPriceFeedNotFound))?;

    Ok(TokenPriceInfo {
        price: price_feed.price,
        expo: price_feed.exponent,
        conf: price_feed.conf,
    })
}

/// Convert token amounts to USD equivalent using Pyth prices
pub fn convert_amounts_to_usd(
    amount_0: u64,
    amount_1: u64,
    token_0_decimals: u8,
    token_1_decimals: u8,
    token_0_price_info: &TokenPriceInfo,
    token_1_price_info: &TokenPriceInfo,
    usdc_decimals: u8,
) -> Result<(u64, u64)> {
    // Convert amount_0 to USD equivalent
    let amount_0_normalized = normalize_token_amount(amount_0, token_0_decimals, usdc_decimals)?;
    let token_0_price_normalized = token_0_price_info.get_normalized_price(usdc_decimals)?;
    let amount_0_usd = amount_0_normalized
        .checked_mul(token_0_price_normalized)
        .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?
        .checked_div(10u64.pow(usdc_decimals as u32))
        .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;

    // Convert amount_1 to USD equivalent
    let amount_1_normalized = normalize_token_amount(amount_1, token_1_decimals, usdc_decimals)?;
    let token_1_price_normalized = token_1_price_info.get_normalized_price(usdc_decimals)?;
    let amount_1_usd = amount_1_normalized
        .checked_mul(token_1_price_normalized)
        .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?
        .checked_div(10u64.pow(usdc_decimals as u32))
        .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;

    Ok((amount_0_usd, amount_1_usd))
}

/// Normalize token amount to target decimal places
fn normalize_token_amount(amount: u64, from_decimals: u8, to_decimals: u8) -> Result<u64> {
    if from_decimals == to_decimals {
        return Ok(amount);
    }

    if from_decimals < to_decimals {
        let diff = to_decimals
            .checked_sub(from_decimals)
            .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;
        let scale = 10u64
            .checked_pow(diff as u32)
            .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;
        amount
            .checked_mul(scale)
            .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))
    } else {
        let diff = from_decimals
            .checked_sub(to_decimals)
            .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;
        let scale = 10u64
            .checked_pow(diff as u32)
            .ok_or(error!(crate::error::TokenizedVaultsErrorCode::MathOverflow))?;
        Ok(amount.checked_div(scale).unwrap_or(0))
    }
}
