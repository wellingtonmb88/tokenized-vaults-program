#![allow(deprecated, unexpected_cfgs)]
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UnpauseProtocol<'info> {
    // The admin authority that is pausing the protocol.
    #[account(mut)]
    pub admin_authority: Signer<'info>,

    #[account(
        mut,
        has_one = admin_authority,
        seeds = [ProtocolConfig::SEED.as_bytes()],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> UnpauseProtocol<'info> {
    pub fn unpause(&mut self) -> Result<()> {
        self.protocol_config.unpause()?;
        Ok(())
    }
}
pub fn handler(ctx: Context<UnpauseProtocol>) -> Result<()> {
    ctx.accounts.unpause()
}
