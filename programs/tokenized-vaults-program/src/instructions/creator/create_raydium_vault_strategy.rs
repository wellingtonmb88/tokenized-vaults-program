#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{Mint, Token2022, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use raydium_clmm_cpi::{cpi, program::RaydiumClmm, states::PoolState, ID as RAYDIUM_CLMM_ID};

use crate::{
    error::TokenizedVaultsErrorCode,
    state::*,
    utils::{convert_amounts_to_usd, get_price_from_pyth_update},
    ProtocolStatus, VaultStrategyStatus,
};

#[derive(Accounts)]
#[instruction(vault_strategy_name: String, strategy_id: u8)]
pub struct CreateRaydiumVaultStrategy<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(seeds = [ProtocolConfig::SEED.as_bytes()], bump)]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,

    #[account(
        mut,
        seeds = [VaultStrategyConfig::SEED.as_bytes(), creator.key().as_ref(), vault_strategy_name.as_ref()],
        bump
    )]
    pub vault_strategy_config: Box<Account<'info, VaultStrategyConfig>>,

    #[account(
        init_if_needed,
        payer = creator,
        space = VaultStrategy::DISCRIMINATOR.len() + VaultStrategy::INIT_SPACE,
        seeds = [
            VaultStrategy::SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
            raydium_vault_0_mint.key().as_ref(),
            raydium_vault_1_mint.key().as_ref(),
            strategy_id.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub vault_strategy: Account<'info, VaultStrategy>,

    #[account(
        init_if_needed,
        payer = creator,
        space = InvestorStrategyPosition::DISCRIMINATOR.len() + InvestorStrategyPosition::INIT_SPACE,
        seeds = [
            InvestorStrategyPosition::SEED.as_bytes(),
            vault_strategy.key().as_ref(),
            creator.key().as_ref(),
        ],
        bump
    )]
    pub investor_strategy_position: Account<'info, InvestorStrategyPosition>,

    /* Pyth Price Feeds */
    /// CHECK: Pyth price update account for token 0
    pub pyth_token_0_price_update: Account<'info, PriceUpdateV2>,

    /// CHECK: Pyth price update account for token 1
    pub pyth_token_1_price_update: Account<'info, PriceUpdateV2>,

    /* DEX Raydium */
    #[account(address = RAYDIUM_CLMM_ID)]
    pub raydium_clmm_program: Program<'info, RaydiumClmm>,

    /// CHECK: Unique raydium token mint address, random keypair
    #[account(mut)]
    pub raydium_position_nft_mint: Signer<'info>,

    /// This account created in the contract by cpi to avoid large stack variables
    /// CHECK: Token account where raydium position NFT will be minted to
    #[account(mut)]
    pub raydium_position_nft_account: UncheckedAccount<'info>,

    /// CHECK: Add liquidity for this raydium pool
    #[account(mut)]
    pub raydium_pool_state: AccountLoader<'info, PoolState>,

    /// CHECK: Store the information of raydium market marking in range
    #[account(mut)]
    pub raydium_protocol_position: UncheckedAccount<'info>,

    /// CHECK: Account to mark the raydium position's lower tick as initialized
    #[account(mut)]
    pub raydium_tick_array_lower: UncheckedAccount<'info>,

    /// CHECK:Account to store data for the raydium position's upper tick
    #[account(mut)]
    pub raydium_tick_array_upper: UncheckedAccount<'info>,

    /// CHECK: raydium personal position state
    #[account(mut)]
    pub raydium_personal_position: UncheckedAccount<'info>,

    /// The token_0 account that will deposit tokens to the raydium pool
    #[account(mut)]
    pub raydium_token_account_0: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The token_1 account that will deposit tokens to the raydium pool
    #[account(mut)]
    pub raydium_token_account_1: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The address that holds raydium pool tokens for token_0
    #[account(mut)]
    pub raydium_token_vault_0: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The address that holds raydium pool tokens for token_1
    #[account(mut)]
    pub raydium_token_vault_1: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The mint of raydium token vault 0
    pub raydium_vault_0_mint: Box<InterfaceAccount<'info, Mint>>,
    /// The mint of raydium token vault 1
    pub raydium_vault_1_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Sysvar for token mint and ATA creation
    pub rent: Sysvar<'info, Rent>,

    /// Program to create the position manager state account
    pub system_program: Program<'info, System>,
    /// Program to create mint account and mint tokens
    pub token_program: Program<'info, Token>,
    /// Program to create an ATA for receiving position NFT
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Program to create mint account and mint tokens
    pub token_program_2022: Program<'info, Token2022>,
    // remaining accounts Raydium
    // #[account(
    //     seeds = [
    //         POOL_TICK_ARRAY_BITMAP_SEED.as_bytes(),
    //         pool_state.key().as_ref(),
    //     ],
    //     bump
    // )]
    // pub raydium_tick_array_bitmap: AccountLoader<'info, TickArrayBitmapExtension>,
}

impl<'a, 'b, 'c: 'info, 'info> CreateRaydiumVaultStrategy<'info> {
    pub fn create(
        &mut self,
        _vault_strategy_name: String,
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
        remaining_accounts: &'c [AccountInfo<'info>],
        bump: u8,
    ) -> Result<()> {
        require!(
            self.protocol_config.status == ProtocolStatus::Active,
            TokenizedVaultsErrorCode::ProtocolConfigNotActive
        );

        require!(
            self.vault_strategy_config.status == VaultStrategyStatus::Draft,
            TokenizedVaultsErrorCode::VaultStrategyConfigNotDraft
        );

        self.dex_open_position(
            tick_lower_index,
            tick_upper_index,
            tick_array_lower_start_index,
            tick_array_upper_start_index,
            0, // do not provide liquidity, because we are just creating the position
            amount_0_max,
            amount_1_max,
            remaining_accounts,
        )?;

        //// Convert amounts to USDC equivalent
        let (amount_0_max_usd, amount_1_max_usd) = self.token_amounts_in_usd(
            amount_0_max,
            amount_1_max,
            &token_0_feed_id,
            &token_1_feed_id,
        )?;

        msg!(
            "Original amounts: token_0={}, token_1={}",
            amount_0_max,
            amount_1_max
        );
        msg!(
            "USDC equivalent amounts: token_0={}, token_1={}",
            amount_0_max_usd,
            amount_1_max_usd
        );

        let amount_assets = amount_0_max_usd.saturating_add(amount_1_max_usd);

        self.investor_strategy_position.initialize(
            self.creator.key(),
            self.vault_strategy.key(),
            amount_assets,
            self.vault_strategy.total_assets,
            self.vault_strategy.total_shares,
            bump,
        )?;
        msg!(
            "amount_assets: {}, shares={}",
            amount_assets,
            self.investor_strategy_position.shares
        );

        self.vault_strategy_config
            .add_strategy(self.vault_strategy.key(), percentage)?;

        self.vault_strategy.initialize(
            self.creator.key(),
            self.vault_strategy_config.key(),
            self.raydium_position_nft_mint.key(),
            self.raydium_vault_0_mint.key(),
            self.raydium_vault_1_mint.key(),
            amount_assets,
            self.investor_strategy_position.shares,
            percentage,
            strategy_id,
            bump,
        )?;

        msg!("Vault strategy created successfully with USDC conversion");

        Ok(())
    }

    fn token_amounts_in_usd(
        &self,
        amount_0: u64,
        amount_1: u64,
        token_0_feed_id: &str,
        token_1_feed_id: &str,
    ) -> Result<(u64, u64)> {
        //// Get price information from Pyth feeds
        let token_0_price_info =
            get_price_from_pyth_update(&self.pyth_token_0_price_update, &token_0_feed_id)?;
        let token_1_price_info =
            get_price_from_pyth_update(&self.pyth_token_1_price_update, &token_1_feed_id)?;

        //// Convert amounts to USD equivalent
        convert_amounts_to_usd(
            amount_0,
            amount_1,
            self.raydium_vault_0_mint.decimals,
            self.raydium_vault_1_mint.decimals,
            &token_0_price_info,
            &token_1_price_info,
            6, // USD decimals
        )
    }

    fn dex_open_position(
        &mut self,
        tick_lower_index: i32,
        tick_upper_index: i32,
        tick_array_lower_start_index: i32,
        tick_array_upper_start_index: i32,
        liquidity: u128,
        amount_0_max: u64,
        amount_1_max: u64,
        remaining_accounts: &'c [AccountInfo<'info>],
    ) -> Result<()> {
        let cpi_accounts = cpi::accounts::OpenPositionWithToken22Nft {
            payer: self.creator.to_account_info(),
            position_nft_owner: self.vault_strategy.to_account_info(),
            position_nft_mint: self.raydium_position_nft_mint.to_account_info(),
            position_nft_account: self.raydium_position_nft_account.to_account_info(),
            pool_state: self.raydium_pool_state.to_account_info(),
            protocol_position: self.raydium_protocol_position.to_account_info(),
            tick_array_lower: self.raydium_tick_array_lower.to_account_info(),
            tick_array_upper: self.raydium_tick_array_upper.to_account_info(),
            personal_position: self.raydium_personal_position.to_account_info(),
            token_account_0: self.raydium_token_account_0.to_account_info(),
            token_account_1: self.raydium_token_account_1.to_account_info(),
            token_vault_0: self.raydium_token_vault_0.to_account_info(),
            token_vault_1: self.raydium_token_vault_1.to_account_info(),
            vault_0_mint: self.raydium_vault_0_mint.to_account_info(),
            vault_1_mint: self.raydium_vault_1_mint.to_account_info(),
            rent: self.rent.to_account_info(),
            system_program: self.system_program.to_account_info(),
            token_program: self.token_program.to_account_info(),
            associated_token_program: self.associated_token_program.to_account_info(),
            token_program_2022: self.token_program_2022.to_account_info(),
        };

        let cpi_context =
            CpiContext::new(self.raydium_clmm_program.to_account_info(), cpi_accounts)
                .with_remaining_accounts(remaining_accounts.to_vec());

        cpi::open_position_with_token22_nft(
            cpi_context,
            tick_lower_index,
            tick_upper_index,
            tick_array_lower_start_index,
            tick_array_upper_start_index,
            liquidity,
            amount_0_max,
            amount_1_max,
            false,
            Some(true),
        )?;
        Ok(())
    }
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CreateRaydiumVaultStrategy<'info>>,
    vault_strategy_name: String,
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
) -> Result<()>
where
    'c: 'info,
{
    let bump = ctx.bumps.vault_strategy;
    ctx.accounts.create(
        vault_strategy_name,
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
        ctx.remaining_accounts,
        bump,
    )
}
