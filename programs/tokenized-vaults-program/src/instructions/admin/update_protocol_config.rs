use crate::error::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateProtocolConfig<'info> {
    /// The protocol config owner or admin
    #[account(address = crate::admin::ID @ ErrorCode::NotApproved)]
    pub owner: Signer<'info>,

    /// Protocol config account to be updated
    #[account(mut)]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

pub fn update_protocol_config(ctx: Context<UpdateProtocolConfig>, param: u8, value: u32) -> Result<()> {
    let protocol_config = &mut ctx.accounts.protocol_config;
    let match_param = Some(param);
    match match_param {
        // Some(0) => update_trade_fee_rateprotocol_config, value),
        // Some(1) => update_protocol_fee_rate(protocol_config, value),
        // Some(2) => update_fund_fee_rate(protocol_config, value),
        Some(0) => {
            let new_owner = *ctx.remaining_accounts.iter().next().unwrap().key;
            set_new_owner(protocol_config, new_owner);
        }
       
        _ => return err!(ErrorCode::InvalidUpdateConfigFlag),
    }

    emit!(ConfigChangeEvent {
      
        owner: protocol_config.owner,
        
    });

    Ok(())
}

fn set_new_owner(protocol_config: &mut Account<ProtocolConfig>, new_owner: Pubkey) {
    #[cfg(feature = "enable-log")]
    msg!(
        "protocol_config, old_owner:{}, new_owner:{}",
        protocol_config.owner.to_string(),
        new_owner.key().to_string()
    );
    protocol_config.owner = new_owner;
}