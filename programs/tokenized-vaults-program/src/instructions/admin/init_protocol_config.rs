use crate::error::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;



#[derive(Accounts)]
#[instruction(state:u8)]
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

pub fn init_protocol_config(
    ctx: Context<InitProtocolConfig>)->Result<()>{
        let protocol_config = &mut ctx.accounts.protocol_config; //.deref_mut(); ???
        protocol_config.owner = ctx.accounts.owner.key();
        protocol_config.protocol_fees = 1000; // Initial protocol fees
        protocol_config.status = 0; // Initial status
        protocol_config.bump = ctx.bumps.protocol_config;

        emit!(ConfigChangeEvent{
            owner: protocol_config.owner,
            protocol_fees: 0,
            status: 0,
            bump: protocol_config.bump,
                       
        });
        Ok(())
    }

