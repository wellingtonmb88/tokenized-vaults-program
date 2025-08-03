use crate::error::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;



#[derive(Accounts)]

pub struct InitProtocolConfig<'info> {
     /// Address to be set as protocol owner.
     #[account(
        mut,
        address = crate::admin::ID @ ErrorCode::NotApproved
    )]
    pub owner: Signer<'info>,

    /// Initialize config state account to store protocol owner address
    #[account(
        init,
        payer = owner,
        seeds = [PROTOCOL_CONFIG_SEED.as_bytes()],
        space = ProtocolConfig::LEN,
        bump
    )]

    pub protocol_config: Account<'info, ProtocolConfig>,
   

    pub system_program: Program<'info, System>,
   
}
