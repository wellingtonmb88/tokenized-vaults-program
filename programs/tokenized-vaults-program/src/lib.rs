#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub use instructions::*;
pub use state::*;
pub mod constants;
pub use constants::*;
pub mod status;
pub use status::*;

declare_id!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");

#[program]
pub mod tokenized_vaults_program {

    use crate::instructions::pause_protocol;

    use super::*;

    #[instruction(discriminator = 0)]
    pub fn init_protocol_config(
        ctx: Context<InitProtocolConfig>,
        protocol_fees: u32,
    ) -> Result<()> {
        init_protocol_config::handler(ctx, protocol_fees)
    }

    #[instruction(discriminator = 1)]
    pub fn pause_protocol(ctx: Context<PauseProtocol>) -> Result<()> {
        pause_protocol::handler(ctx)
    }

    #[instruction(discriminator = 2)]
    pub fn init_vault_strategy_config(
        ctx: Context<InitVaultStrategyConfig>,
        creator: Pubkey,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
        name: String,
    ) -> Result<()> {
        init_vault_strategy_config::handler(
            ctx,
            creator,
            performance_fee,
            vault_strategy_type,
            name,
        )
    }

    #[instruction(discriminator = 3)]
    pub fn init_investor_escrow(ctx: Context<InitInvestorEscrow>) -> Result<()> {
        init_investor_escrow_handler(ctx)
    }
}
