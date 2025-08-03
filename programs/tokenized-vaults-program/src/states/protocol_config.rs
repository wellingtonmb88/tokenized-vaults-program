
use crate::error::ErrorCode;
use anchor_lang::prelude::*;

pub const PROTOCOL_CONFIG_SEED: &str = "protocol_config";

#[account]
#[derive(Default, Debug)]
pub struct ProtocolConfig{
    pub owner: Pubkey,
    pub protocol_fees:u64,
    pub status:u8,
    pub bump:u8,

    
    // This is used to reserve space for future upgrades.
    // padding space for upgrade
    pub padding_u32: u32,
    //pub fund_owner: Pubkey,
    pub padding: [u64; 3],
}

impl ProtocolConfig{
    pub const LEN: usize = 8+ // discriminator
        32 + // owner
        8 + // protocol_fees
        1 + // status
        1 +// bump
        4 + // padding_u32
        //32 + // fund_owner
        24; // padding 
    
         pub fn is_authorized<'info>(
        &self,
        signer: &Signer<'info>,
        expect_pubkey: Pubkey,
    ) -> Result<()> {
        require!(
            signer.key() == self.owner || expect_pubkey == signer.key(),
            ErrorCode::NotApproved
        );
        Ok(())
    }

}

/// Emitted when create or update a config
#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct ConfigChangeEvent {
    //pub index: u16,
    pub owner: Pubkey,
    pub protocol_fee: u32,
    pub status: u8,
  
}