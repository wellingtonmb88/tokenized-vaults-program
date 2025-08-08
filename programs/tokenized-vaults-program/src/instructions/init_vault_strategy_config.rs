#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;

use crate::{error::TokenizedVaultsErrorCode, state::*, ProtocolStatus, VaultStrategyType};

#[derive(Accounts)]
pub struct InitVaultStrategyConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(  
        seeds = [PROTOCOL_CONFIG_SEED.as_bytes()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = creator,
        space = VaultStrategyConfig::DISCRIMINATOR.len() +VaultStrategyConfig::INIT_SPACE,
        seeds = [VAULT_STRATEGY_CONFIG_SEED.as_bytes()],
        bump
    )]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitVaultStrategyConfig<'info> {
    pub fn initialize(
        &mut self,
        creator: Pubkey,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
        name: String,
        bump: u8,
    ) -> Result<()> {
        require!(
            self.protocol_config.status == ProtocolStatus::Active,
            TokenizedVaultsErrorCode::ProtocolConfigNotInitialized
        );

        self.vault_strategy_config.initialize(
            creator,
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
    creator: Pubkey,
    performance_fee: u32,
    vault_strategy_type: VaultStrategyType,
    name: String,
) -> Result<()> {
    let bump = ctx.bumps.vault_strategy_config;
    ctx.accounts
        .initialize(creator, performance_fee, vault_strategy_type, name, bump)
}
