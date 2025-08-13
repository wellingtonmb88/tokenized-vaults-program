#![allow(deprecated, unexpected_cfgs)]
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PauseVault<'info> {
    // the admin that is pausin vault
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator,
        seeds= [VaultStrategyConfig::SEED.as_bytes()],
        bump = vault_strategy_config.bump
    )]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,
    pub system_program: Program<'info, System>,
}

impl<'info> PauseVault<'info> {
    pub fn pause_vault(&mut self) -> Result<()> {
        self.vault_strategy_config.pause_vault()?;
        Ok(())
    }
}
pub fn handler(ctx: Context<PauseVault>) -> Result<()> {
    ctx.accounts.pause_vault()
}
