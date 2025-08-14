use crate::constants::{HIGH_FEES, LOW_FEES};
use crate::error::TokenizedVaultsErrorCode;
use crate::{ProtocolStatus, DISC_PROTOCOL_CONFIG_ACCOUNT};
use anchor_lang::prelude::*;

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_PROTOCOL_CONFIG_ACCOUNT)]
pub struct ProtocolConfig {
    pub admin_authority: Pubkey,
    pub protocol_fees: u32,
    pub status: ProtocolStatus,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SEED: &'static str = "protocol_config:";

    pub fn initialize(
        &mut self,
        admin_authority: Pubkey,
        protocol_fees: u32,
        bump: u8,
    ) -> Result<()> {
        // Check protocol config is not already initialized.
        require!(
            self.status == ProtocolStatus::Unknown,
            TokenizedVaultsErrorCode::ProtocolConfigInitialized
        );

        // Check that fee not exceed 10% (100_000 BPS).
        require!(
            protocol_fees <= HIGH_FEES,
            TokenizedVaultsErrorCode::FeeTooHigh
        );
        // Check that fee not 0 (ZERO).
        require!(
            protocol_fees > LOW_FEES,
            TokenizedVaultsErrorCode::FeeTooLow
        );

        self.set_inner(admin_authority, protocol_fees, ProtocolStatus::Active, bump)?;

        emit!(ProtocolConfigEvent {
            admin_authority,
            protocol_fees,
            status: self.status,
        });
        Ok(())
    }

    pub fn set_inner(
        &mut self,
        admin_authority: Pubkey,
        protocol_fees: u32,
        status: ProtocolStatus,
        bump: u8,
    ) -> Result<()> {
        self.admin_authority = admin_authority;
        self.protocol_fees = protocol_fees;
        self.status = status;
        self.bump = bump;

        Ok(())
    }

    pub fn pause(&mut self) -> Result<()> {
        // Check protocol is not already paused.
        require!(
            self.status == ProtocolStatus::Active,
            TokenizedVaultsErrorCode::ProtocolAlreadyPaused
        );

        self.status = ProtocolStatus::Paused;
        emit!(ProtocolConfigEvent {
            admin_authority: self.admin_authority,
            protocol_fees: self.protocol_fees,
            status: self.status,
        });
        Ok(())
    }

    pub fn unpause(&mut self) -> Result<()> {
        // Check protocol is not already paused.
        require!(
            self.status == ProtocolStatus::Paused,
            TokenizedVaultsErrorCode::ProtocolNotPaused
        );

        self.status = ProtocolStatus::Active;

        emit!(ProtocolConfigEvent {
            admin_authority: self.admin_authority,
            protocol_fees: self.protocol_fees,
            status: self.status,
        });
        Ok(())
    }
}
/// Emitted when update status of Protocolconfig
#[event]
#[derive(Debug)]
pub struct ProtocolConfigEvent {
    pub admin_authority: Pubkey,
    pub protocol_fees: u32,
    pub status: ProtocolStatus,
}
