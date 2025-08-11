#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;

use crate::{error::TokenizedVaultsErrorCode, state::*, ProtocolStatus, VaultStrategyType};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitVaultStrategyConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [ProtocolConfig::SEED.as_bytes()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = creator,
        space = VaultStrategyConfig::DISCRIMINATOR.len() +VaultStrategyConfig::INIT_SPACE,
        seeds = [VaultStrategyConfig::SEED.as_bytes(), creator.key().as_ref(), name.as_ref()],
        bump
    )]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitVaultStrategyConfig<'info> {
    pub fn initialize(
        &mut self,
        name: String,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
        bump: u8,
    ) -> Result<()> {
        require!(
            self.protocol_config.status == ProtocolStatus::Active,
            TokenizedVaultsErrorCode::ProtocolConfigNotInitialized
        );

        self.vault_strategy_config.initialize(
            self.creator.key(),
            performance_fee,
            vault_strategy_type,
            name,
            bump,
        )?;
        Ok(())
    }
}

pub fn handler(
    ctx: Context<InitVaultStrategyConfig>,
    name: String,
    performance_fee: u32,
    vault_strategy_type: VaultStrategyType,
) -> Result<()> {
    let bump = ctx.bumps.vault_strategy_config;
    ctx.accounts
        .initialize(name, performance_fee, vault_strategy_type, bump)
}
