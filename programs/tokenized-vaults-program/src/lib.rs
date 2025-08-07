#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub use instructions::*;
pub use state::*;
pub mod constants;
pub use constants::*;

declare_id!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");

#[program]
pub mod tokenized_vaults_program {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn init_protocol_config(
        ctx: Context<InitProtocolConfig>,
        protocol_fees: u64,
    ) -> Result<()> {
        init_protocol_config::handler(ctx, protocol_fees)
    }
}
