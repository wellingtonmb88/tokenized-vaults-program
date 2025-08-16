#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;
pub use instructions::*;
pub use state::*;
pub mod constants;
pub use constants::*;
pub mod status;
pub use status::*;
pub mod asserts;
pub use asserts::*;
pub mod libraries;
pub use libraries::*;

declare_id!("YyUUJsRpeJ5fJEL6JBD7LKibaK43LXov4FzHs2w53J4");

#[program]
pub mod tokenized_vaults_program {
    use super::*;

    #[instruction(discriminator = DISC_INIT_PROTOCOL_CONFIG_IX)]
    pub fn init_protocol_config(
        ctx: Context<InitProtocolConfig>,
        protocol_fees: u32,
    ) -> Result<()> {
        init_protocol_config::handler(ctx, protocol_fees)
    }

    #[instruction(discriminator = DISC_PAUSE_PROTOCOL_IX)]
    pub fn pause_protocol(ctx: Context<PauseProtocol>) -> Result<()> {
        pause_protocol::handler(ctx)
    }

    #[instruction(discriminator = DISC_UNPAUSE_PROTOCOL_IX)]
    pub fn unpause_protocol(ctx: Context<UnpauseProtocol>) -> Result<()> {
        unpause_protocol::handler(ctx)
    }

    #[instruction(discriminator = DISC_INIT_VAULT_STRATEGY_CONFIG_IX)]
    pub fn init_vault_strategy_config(
        ctx: Context<InitVaultStrategyConfig>,
        name: String,
        performance_fee: u32,
        vault_strategy_type: VaultStrategyType,
    ) -> Result<()> {
        init_vault_strategy_config::handler(ctx, name, performance_fee, vault_strategy_type)
    }

    #[instruction(discriminator = DISC_PAUSE_VAULT_IX)]
    pub fn pause_vault(ctx: Context<PauseVault>) -> Result<()> {
        pause_vault::handler(ctx)
    }

    #[instruction(discriminator = DISC_UNPAUSE_VAULT_IX)]
    pub fn unpause_vault(ctx: Context<UnpauseVault>) -> Result<()> {
        unpause_vault::handler(ctx)
    }

    #[instruction(discriminator = DISC_CREATE_RAYDIUM_VAULT_STRATEGY_IX)]
    pub fn create_raydium_vault_strategy<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateRaydiumVaultStrategy<'info>>,
        strategy_id: u8,
        percentage: u32,
        amount_0_max: u64,
        amount_1_max: u64,
        tick_lower_index: i32,
        tick_upper_index: i32,
        tick_array_lower_start_index: i32,
        tick_array_upper_start_index: i32,
        token_0_feed_id: String,
        token_1_feed_id: String,
        look_up_table: Pubkey,
    ) -> Result<()>
    where
        'c: 'info,
    {
        create_raydium_vault_strategy::handler(
            ctx,
            strategy_id,
            percentage,
            amount_0_max,
            amount_1_max,
            tick_lower_index,
            tick_upper_index,
            tick_array_lower_start_index,
            tick_array_upper_start_index,
            token_0_feed_id,
            token_1_feed_id,
            look_up_table,
        )
    }

    #[instruction(discriminator = DISC_DEPOSIT_TO_ESCROW_IX)]
    pub fn deposit_to_escrow(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
        deposit_to_escrow::handler(ctx, amount)
    }

    #[instruction(discriminator = DISC_WITHDRAW_FROM_ESCROW_IX)]
    pub fn withdraw_from_escrow(ctx: Context<WithdrawFromEscrow>, amount: u64) -> Result<()> {
        withdraw_from_escrow::handler(ctx, amount)
    }

    #[instruction(discriminator = DISC_INVEST_RESERVE_IX)]
    pub fn invest_reserve(ctx: Context<InvestReserve>, amount: u64) -> Result<()> {
        invest_reserve::handler(ctx, amount)
    }

    #[instruction(discriminator = DISC_SWAP_TO_RATIO_RAYDIUM_VAULT_STRATEGY_IX)]
    pub fn swap_to_ratio_raydium_vault_strategy<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SwapToRatioRaydiumVaultStrategy<'info>>,
        strategy_id: u8,
        token_0_amount_out_min: u64,
        token_1_amount_out_min: u64,
    ) -> Result<()>
    where
        'c: 'info,
    {
        swap_to_ratio_raydium_vault_strategy::handler(
            ctx,
            strategy_id,
            token_0_amount_out_min,
            token_1_amount_out_min,
        )
    }

    #[instruction(discriminator = DISC_ADD_LIQUIDITY_RAYDIUM_VAULT_STRATEGY_IX)]
    pub fn add_liquidity_raydium_vault_strategy<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddLiquidityRaydiumVaultStrategy<'info>>,
        strategy_id: u8,
    ) -> Result<()>
    where
        'c: 'info,
    {
        add_liquidity_raydium_vault_strategy::handler(ctx, strategy_id)
    }
}
