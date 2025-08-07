use crate::error::ErrorCode;
use crate::state::ProtocolStatus;
use anchor_lang::prelude::*;
use core::mem::size_of;

pub const PROTOCOL_CONFIG_SEED: &str = "protocol_config";

#[derive(Default, Debug)]
#[account(discriminator = 1)]

pub struct ProtocolConfig {
    pub admin_authority: Pubkey,
    pub protocol_fees: u64,
    pub status: ProtocolStatus,
    pub bump: u8,
}

impl ProtocolConfig {
    pub fn initialize(
        &mut self,
        admin_authority: Pubkey,
        protocol_fees: u64,
        bump: u8,
    ) -> Result<()> {
        // Check protocol config is not already initialized.
        require!(
            self.admin_authority == Pubkey::default(),
            ErrorCode::ProtocolConfigInitialized
        );

        self.set_inner(admin_authority, protocol_fees, ProtocolStatus::Active, bump)?;
        Ok(())
    }

    pub fn set_inner(
        &mut self,
        admin_authority: Pubkey,
        protocol_fees: u64,
        status: ProtocolStatus,
        bump: u8,
    ) -> Result<()> {
        self.admin_authority = admin_authority;
        self.protocol_fees = protocol_fees;
        self.status = status;
        self.bump = bump;
        Ok(())
    }
}
