use crate::{
    error::TokenizedVaultsErrorCode, VaultStrategyStatus, VaultStrategyType, HIGH_PERFORMANCE_FEE,
    LOW_PERFORMANCE_FEE,
};

use anchor_lang::prelude::*;

pub const VAULT_STRATEGY_CONFIG_SEED: &str = "vault_strategy_config:";

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = 2)]
pub struct VaultStrategyConfig {
    pub creator: Pubkey,
    pub performance_fee: u32,
    pub vault_strategy_type: VaultStrategyType,
    pub status: VaultStrategyStatus,
    pub bump: u8,
    #[max_len(3)]
    pub strategies: Vec<Pubkey>,
    #[max_len(32)]
    pub name: String,
}

impl VaultStrategyConfig {
    pub fn initialize(
        &mut self,
        creator: Pubkey,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
        name: String,
        bump: u8,
    ) -> Result<()> {
        // Check vault strategy config is not already initialized.
        require!(
            self.creator == Pubkey::default(),
            TokenizedVaultsErrorCode::VaultStrategyConfigInitialized
        );

        assert_vault_strategy_performance_fee(performance_fee)?;

        assert_vault_strategy_type(&vault_strategy_type)?;

        self.set_inner(
            creator,
            performance_fee,
            vault_strategy_type,
            VaultStrategyStatus::Draft,
            name,
            bump,
        )?;
        Ok(())
    }

    pub fn set_inner(
        &mut self,
        creator: Pubkey,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
        status: VaultStrategyStatus,
        name: String,
        bump: u8,
    ) -> Result<()> {
        self.creator = creator;
        self.performance_fee = performance_fee;
        self.vault_strategy_type = vault_strategy_type;
        self.name = name;
        self.status = status;
        self.strategies = Vec::new();
        self.bump = bump;
        Ok(())
    }
}

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
