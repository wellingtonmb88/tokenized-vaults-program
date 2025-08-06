use crate::error::ErrorCode;
use crate::state::ProtocolStatus;
use anchor_lang::prelude::*;
use core::mem::size_of;

pub const PROTOCOL_CONFIG_SEED: &str = "protocol_config";
/// Scale: 1% = 10_000 bps → 100% = 1_000_000
pub const BPS: u64 = 10_000;
/// High fee for transaction: 10%
pub const HIGH_FEES: u64 = 10 * BPS; // 100_000

#[account]
#[derive(Default, Debug)]
pub struct ProtocolConfig {
    pub admin_authority: Pubkey,
    pub protocol_fees: u64,
    pub status: ProtocolStatus,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const LEN: usize = size_of::<u8>()+ // discriminator
        size_of::<Pubkey>() + // owner
        size_of::<u64>() + // protocol_fees
        size_of::<u8>() + // status
        size_of::<u8>(); // bump

    pub fn is_authorized<'info>(
        &self,
        signer: &Signer<'info>,
        expect_pubkey: Pubkey,
    ) -> Result<()> {
        require!(
            signer.key() == self.admin_authority || expect_pubkey == signer.key(),
            ErrorCode::NotApproved
        );
        Ok(())
    }
}
