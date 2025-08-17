use anchor_lang::prelude::*;

use crate::{
    error::TokenizedVaultsErrorCode, 
    state::{ProtocolConfig, VaultStrategyConfig}, 
    ProtocolStatus, VaultStrategyStatus
};

#[derive(Accounts)]
pub struct ActivateVaultStrategyConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [ProtocolConfig::SEED.as_bytes()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::SEED.as_bytes(), 
            creator.key().as_ref(), 
            vault_strategy_config.name.as_ref()
        ],
        bump = vault_strategy_config.bump,
        has_one = creator @ TokenizedVaultsErrorCode::Unauthorized
    )]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,
}

impl<'info> ActivateVaultStrategyConfig<'info> {
    pub fn activate(&mut self) -> Result<()> {
        require!(
            self.protocol_config.status == ProtocolStatus::Active,
            TokenizedVaultsErrorCode::ProtocolConfigNotInitialized
        );

        require!(
            self.vault_strategy_config.status == VaultStrategyStatus::Draft,
            TokenizedVaultsErrorCode::VaultStrategyConfigNotDraft
        );

        require!(
            !self.vault_strategy_config.strategies.is_empty(),
            TokenizedVaultsErrorCode::VaultStrategyConfigNoStrategies
        );

        let total_percentage: u32 = self.vault_strategy_config.percentages.iter().sum();
        require!(
            total_percentage == 1_000_000, // 100%
            TokenizedVaultsErrorCode::InvalidVaultStrategyPercentage
        );

        self.vault_strategy_config.status = VaultStrategyStatus::Active;

        emit!(crate::state::vault_strategy_config::VaultStrategyConfigEvent {
            creator: self.vault_strategy_config.creator,
            performance_fee: self.vault_strategy_config.performance_fee,
            vault_strategy_type: self.vault_strategy_config.vault_strategy_type,
            status: self.vault_strategy_config.status,
        });

        Ok(())
    }
}

pub fn handler(ctx: Context<ActivateVaultStrategyConfig>) -> Result<()> {
    ctx.accounts.activate()
}