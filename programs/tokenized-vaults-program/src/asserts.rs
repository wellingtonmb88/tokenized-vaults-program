use anchor_lang::prelude::*;
use anchor_lang::require;

use crate::{
    error::TokenizedVaultsErrorCode, VaultStrategyType, HIGH_PERFORMANCE_FEE, LOW_PERFORMANCE_FEE,
    MAX_PERCENTAGE, MIN_PERCENTAGE,
};

pub fn assert_vault_strategy_name(name: &str) -> Result<()> {
    require!(
        !name.is_empty(),
        TokenizedVaultsErrorCode::InvalidVaultStrategyName
    );
    Ok(())
}

pub fn assert_vault_strategy_performance_fee(performance_fee: u32) -> Result<()> {
    require!(
        performance_fee <= HIGH_PERFORMANCE_FEE,
        TokenizedVaultsErrorCode::PerformanceFeeTooHigh
    );
    require!(
        performance_fee >= LOW_PERFORMANCE_FEE,
        TokenizedVaultsErrorCode::PerformanceFeeTooLow
    );
    Ok(())
}

pub fn assert_vault_strategy_percentage(percentage: u32) -> Result<()> {
    require!(
        percentage <= MAX_PERCENTAGE,
        TokenizedVaultsErrorCode::PercentageTooHigh
    );
    require!(
        percentage >= MIN_PERCENTAGE,
        TokenizedVaultsErrorCode::PercentageTooLow
    );
    Ok(())
}

pub fn assert_vault_strategy_type(vault_strategy_type: &VaultStrategyType) -> Result<()> {
    match vault_strategy_type {
        VaultStrategyType::Unknown => {
            Err(TokenizedVaultsErrorCode::InvalidVaultStrategyType.into())
        }
        VaultStrategyType::Conservative => Ok(()),
        VaultStrategyType::Balanced => Ok(()),
        VaultStrategyType::Aggressive => Ok(()),
    }
}
