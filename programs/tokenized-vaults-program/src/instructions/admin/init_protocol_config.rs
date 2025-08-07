#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;


use crate::state::*;

#[derive(Accounts)]
pub struct InitProtocolConfig<'info> {
    // The admin authority that is initializing protocol config.
    #[account(mut)]
    pub admin_authority: Signer<'info>,

    #[account(
        init,
        payer = admin_authority,
        space = ProtocolConfig::DISCRIMINATOR.len() +core::mem::size_of::<ProtocolConfig>(),
        seeds = [PROTOCOL_CONFIG_SEED.as_bytes()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitProtocolConfig<'info> {
    pub fn initialize(&mut self, protocol_fees: u64, bump: u8) -> Result<()> {
        self.protocol_config
            .initialize(self.admin_authority.key(), protocol_fees, bump)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<InitProtocolConfig>, protocol_fees: u64) -> Result<()> {
    
    let bump = ctx.bumps.protocol_config;
    ctx.accounts.initialize(protocol_fees, bump)
}
