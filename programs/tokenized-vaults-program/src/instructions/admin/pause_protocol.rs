#![allow(deprecated, unexpected_cfgs)]
use crate::error::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PauseProtocol<'info> {
    // The admin authority that is pausing the protocol.
    #[account(mut)]
    pub admin_authority: Signer<'info>,

    #[account(
        mut,
        has_one = admin_authority,
        seeds = [PROTOCOL_CONFIG_SEED.as_bytes()],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> PauseProtocol<'info> {
    pub fn pause(&mut self) -> Result<()> {
        let config = &mut self.protocol_config;
        // Check protocol is not already paused.
        require!(
            config.status == ProtocolStatus::Active,
            ErrorCode::ProtocolAlreadyPaused
        );

        config.status = ProtocolStatus::Paused;
        Ok(())
    }
}
pub fn pause_handler(ctx: Context<PauseProtocol>) -> Result<()> {
    ctx.accounts.pause()
}
