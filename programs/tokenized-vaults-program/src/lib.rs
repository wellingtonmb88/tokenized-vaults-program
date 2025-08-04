#![allow(deprecated,unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;
pub use instructions::*; 


declare_id!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");

#[program]
pub mod tokenized_vaults_program {
    use super::*;

    pub fn init_protocol_config(ctx:Context<InitProtocolConfig>,protocol_fees:u64)->Result<()>{
         let bump = ctx.bumps.protocol_config;
        ctx.accounts.initialize(protocol_fees, bump)
        
    }
}


