use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use crate::state::ProtocolStatus;

pub const PROTOCOL_CONFIG_SEED: &str = "protocol_config";

#[account]
#[derive(Default, Debug)]
pub struct ProtocolConfig{
    pub admin_authority: Pubkey,
    pub protocol_fees:u64,
    pub status:ProtocolStatus,
    pub bump:u8,
}

impl ProtocolConfig{
    pub const LEN: usize = 8+ // discriminator
        32 + // owner
        8 + // protocol_fees
        1 + // status
        1 ;// bump
       
    
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

