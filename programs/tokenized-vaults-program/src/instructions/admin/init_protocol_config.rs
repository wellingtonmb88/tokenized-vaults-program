#![allow(deprecated,unexpected_cfgs)]
use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct InitProtocolConfig<'info>{
    // The admin authority that is initializing protocol config.
    #[account(mut)]
    pub admin_authority: Signer<'info>,


    #[account(
        init,
        payer = admin_authority,
        space = ProtocolConfig::LEN,
        seeds = [PROTOCOL_CONFIG_SEED.as_bytes()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info,System>,
    
}

impl<'info> InitProtocolConfig<'info> {
    pub fn initialize(&mut self, fees: u64, bump:u8,) -> Result<()> {
        let config = &mut self.protocol_config;
        // Check that fee not exceed 10% (100_000 ppm).
        require!(fees <= 100_000, ErrorCode::FeeTooHigh);
        // Check protocol config is not already initialized.
        require!(config.admin_authority == Pubkey::default(), ErrorCode::AlreadyInitialized);

        config.admin_authority = self.admin_authority.key();
        config.protocol_fees = fees;
        config.status = ProtocolStatus::Active;
        config.bump = bump;
        Ok(())
    }
}

