#![allow(deprecated, unexpected_cfgs)]
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UnpauseVault<'info> {
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

impl<'info> UnpauseVault<'info> {
    pub fn unpause_vault(&mut self) -> Result<()> {
        self.vault_strategy_config.unpause_vault()?;
        Ok(())
    }
}
pub fn handler(ctx: Context<UnpauseVault>) -> Result<()> {
    ctx.accounts.unpause_vault()
}
