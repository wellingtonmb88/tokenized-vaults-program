use std::mem::MaybeUninit;

use crate::{
    assert_vault_strategy_percentage, assert_vault_strategy_performance_fee,
    assert_vault_strategy_type, error::TokenizedVaultsErrorCode, VaultStrategyStatus,
    VaultStrategyType, DISC_VAULT_STRATEGY_CONFIG_ACCOUNT, MAX_NUM_STRATEGIES, MAX_PERCENTAGE,
};

use anchor_lang::prelude::*;

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_VAULT_STRATEGY_CONFIG_ACCOUNT)]
pub struct VaultStrategyConfig {
    pub creator: Pubkey,
    pub performance_fee: u32,
    pub vault_strategy_type: VaultStrategyType,
    pub status: VaultStrategyStatus,
    pub bump: u8,
    #[max_len(MAX_NUM_STRATEGIES)]
    pub strategies: Vec<Pubkey>, // [0, 1, 2]
    #[max_len(MAX_NUM_STRATEGIES)]
    pub percentages: Vec<u32>, // [300_000, 500_000, 200_000]
    #[max_len(32)]
    pub name: String,
}

impl VaultStrategyConfig {
    pub const SEED: &str = "vault_strategy_config:";
    pub const VAULT_SEED: &str = "vlt_strtg_cfg_vault:";
    pub const VAULT_STRATEGY_CFG_USDC_ESCROW_SEED: &str = "vlt_strategy_cfg_usdc_escrow:";
    pub const VAULT_SWAP_TO_RATIO_0_ESCROW_SEED: &str = "vlt_swap_ratio_0_escrow:";
    pub const VAULT_SWAP_TO_RATIO_1_ESCROW_SEED: &str = "vlt_swap_ratio_1_escrow:";
    pub const VAULT_FEES_0_ESCROW_SEED: &str = "vlt_fees_0_escrow:";
    pub const VAULT_FEES_1_ESCROW_SEED: &str = "vlt_fees_1_escrow:";
    pub const VAULT_PERF_FEES_0_ESCROW_SEED: &str = "vlt_perf_fees_0_escrow:";
    pub const VAULT_PERF_FEES_1_ESCROW_SEED: &str = "vlt_perf_fees_1_escrow:";

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
            self.status == VaultStrategyStatus::Unknown,
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

        emit!(VaultStrategyConfigEvent {
            creator: self.creator,
            performance_fee: self.performance_fee,
            vault_strategy_type: self.vault_strategy_type,
            status: self.status,
        });

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

    pub fn add_strategy(&mut self, strategy: Pubkey, percentage: u32) -> Result<()> {
        require!(
            self.strategies.len() < MAX_NUM_STRATEGIES as usize,
            TokenizedVaultsErrorCode::VaultStrategyConfigMaxStrategiesReached
        );

        let total_percentage: u32 = self.percentages.iter().sum();
        require!(
            total_percentage + percentage <= MAX_PERCENTAGE,
            TokenizedVaultsErrorCode::InvalidVaultStrategyPercentage
        );

        assert_vault_strategy_percentage(percentage)?;

        self.strategies.push(strategy);
        self.percentages.push(percentage);

        emit!(VaultStrategyConfigEvent {
            creator: self.creator,
            performance_fee: self.performance_fee,
            vault_strategy_type: self.vault_strategy_type,
            status: self.status,
        });
        Ok(())
    }

    pub fn pause_vault(&mut self) -> Result<()> {
        require!(
            self.status == VaultStrategyStatus::Active,
            TokenizedVaultsErrorCode::VaultStrategyConfigNotActive
        );

        self.status = VaultStrategyStatus::Paused;
        Ok(())
    }

    pub fn unpause_vault(&mut self) -> Result<()> {
        require!(
            self.status == VaultStrategyStatus::Paused,
            TokenizedVaultsErrorCode::VaultStrategyConfigNotPaused
        );

        self.status = VaultStrategyStatus::Active;

        emit!(VaultStrategyConfigEvent {
            creator: self.creator,
            performance_fee: self.performance_fee,
            vault_strategy_type: self.vault_strategy_type,
            status: self.status,
        });

        Ok(())
    }
}
/// Emitted when update status of VaultStrategyConfig
#[event]
#[derive(Debug)]
pub struct VaultStrategyConfigEvent {
    pub creator: Pubkey,
    pub performance_fee: u32,
    pub vault_strategy_type: VaultStrategyType,
    pub status: VaultStrategyStatus,
}
