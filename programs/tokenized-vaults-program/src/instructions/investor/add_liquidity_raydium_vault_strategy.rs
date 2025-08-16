use std::ops::Mul;

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::memo::Memo;
use anchor_spl::token::{self, Token, Transfer};

use crate::libraries::tick_math;
use crate::utils::transfer_token;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use num_bigint::BigInt;
use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::program::RaydiumClmm;
use raydium_clmm_cpi::states::{
    AmmConfig, ObservationState, PersonalPositionState, PoolState, POSITION_SEED,
};
use raydium_clmm_cpi::{cpi, ID as RAYDIUM_CLMM_ID};

use crate::error::TokenizedVaultsErrorCode;
use crate::{
    get_delta_amounts_signed, get_liquidity_from_amount_0, get_liquidity_from_amount_1,
    get_liquidity_from_amounts, vault_strategy_config, InvestReserveVault, InvestorEscrow,
    SwapToRatioVault, VaultStrategy, VaultStrategyConfig, DENOMINATOR_MULTIPLIER, MAX_PERCENTAGE,
    U256, USDC_MINT,
};

#[derive(Accounts)]
#[instruction(strategy_id: u8)]
pub struct AddLiquidityRaydiumVaultStrategy<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(mut)]
    pub vault_strategy_config: Box<Account<'info, VaultStrategyConfig>>,

    #[account(
        mut,
        seeds = [
            VaultStrategy::SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
            raydium_vault_0_mint.key().as_ref(),
            raydium_vault_1_mint.key().as_ref(),
            strategy_id.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub vault_strategy: Box<Account<'info, VaultStrategy>>,

    #[account(
        mut,
        seeds = [InvestReserveVault::SEED.as_bytes(), investor.key().as_ref(), vault_strategy_config.key().as_ref()],
        bump
    )]
    pub invest_reserve_vault: Box<Account<'info, InvestReserveVault>>,

    /// The escrow account for the token 0
    /// Vault strategy Config receives token 0 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_SWAP_TO_RATIO_0_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_0_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The escrow account for the token 1
    /// Vault strategy Config receives token 1 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_SWAP_TO_RATIO_1_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_1_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    /* DEX Raydium */
    #[account(address = RAYDIUM_CLMM_ID)]
    pub raydium_clmm_program: Program<'info, RaydiumClmm>,

    /// This account created in the contract by cpi to avoid large stack variables
    /// CHECK: Token account where raydium position NFT will be minted to
    #[account(mut)]
    pub raydium_position_nft_account: UncheckedAccount<'info>,

    /// CHECK:
    /// The program account of the pool in which the swap will be performed
    /// Represents the state of the pool Token 0 / Token 1
    #[account(mut)]
    pub raydium_pool_state: AccountLoader<'info, PoolState>,

    /// CHECK:
    /// Increase liquidity for this position
    /// Represents the position in the pool Token 0 / Token 1
    #[account(mut)]
    pub raydium_personal_position: Box<Account<'info, PersonalPositionState>>,

    /// CHECK: Store the information of raydium market marking in range
    #[account(mut)]
    pub raydium_protocol_position: UncheckedAccount<'info>,

    /// CHECK: Account to mark the raydium position's lower tick as initialized
    #[account(mut)]
    pub raydium_tick_array_lower: UncheckedAccount<'info>,

    /// CHECK:Account to store data for the raydium position's upper tick
    #[account(mut)]
    pub raydium_tick_array_upper: UncheckedAccount<'info>,

    /// The address that holds raydium pool tokens for token_0
    #[account(mut)]
    pub raydium_token_vault_0: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Unchecked account for raydium token vault 0
    // #[account(mut)]
    // pub raydium_token_vault_0: UncheckedAccount<'info>,

    /// The address that holds raydium pool tokens for token_1
    #[account(mut)]
    pub raydium_token_vault_1: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Unchecked account for raydium token vault 1
    // #[account(mut)]
    // pub raydium_token_vault_1: UncheckedAccount<'info>,

    /// The mint of token 0
    #[account()]
    pub raydium_vault_0_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The mint of token 1
    #[account()]
    pub raydium_vault_1_mint: Box<InterfaceAccount<'info, Mint>>,

    /// SPL program for token transfers
    pub token_program: Program<'info, Token>,

    /// SPL program 2022 for token transfers
    pub token_program_2022: Program<'info, Token2022>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    /// memo program
    pub memo_program: Program<'info, Memo>,

    /// System program
    pub system_program: Program<'info, System>,
    // remaining account
    // #[account(
    //     seeds = [
    //         POOL_TICK_ARRAY_BITMAP_SEED.as_bytes(),
    //         pool_state.key().as_ref(),
    //     ],
    //     bump
    // )]
    // pub tick_array_bitmap: AccountLoader<'info, TickArrayBitmapExtension>,
}

impl<'info> AddLiquidityRaydiumVaultStrategy<'info> {
    pub fn process(&mut self, remaining_accounts: &[AccountInfo<'info>]) -> Result<()> {
        let amount_0_max = self
            .invest_reserve_vault
            .swap_to_ratio_vaults
            .iter()
            .find(|v| !v.executed && v.vault_strategy_key == self.vault_strategy.key())
            .map_or(0, |v| v.token_0_amount);

        let amount_1_max = self
            .invest_reserve_vault
            .swap_to_ratio_vaults
            .iter()
            .find(|v| !v.executed && v.vault_strategy_key == self.vault_strategy.key())
            .map_or(0, |v| v.token_1_amount);

        // Add validation to ensure we have non-zero amounts
        require!(
            amount_0_max > 0 || amount_1_max > 0,
            TokenizedVaultsErrorCode::InsufficientFunds
        );

        msg!(
            "Adding liquidity with amounts: token_0={}, token_1={}",
            amount_0_max,
            amount_1_max
        );

        self.increase_liquidity(amount_0_max, amount_1_max, remaining_accounts)?;

        if let Some(strategy) = self.vault_strategy_config.strategies.last() {
            if self.vault_strategy.key() == strategy.key() {
                self.invest_reserve_vault.clean_up()?;
            } else {
                self.invest_reserve_vault
                    .set_swap_to_ratio_executed(self.vault_strategy.key(), true)?;
            }
        } else {
            self.invest_reserve_vault
                .set_swap_to_ratio_executed(self.vault_strategy.key(), true)?;
        }

        msg!("Liquidity added successfully");
        Ok(())
    }

    fn increase_liquidity(
        &mut self,
        amount_0_max: u64,
        amount_1_max: u64,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        let liquidity = {
            let pool_state = self.raydium_pool_state.load()?;
            let current_sqrt_price = pool_state.sqrt_price_x64;
            let low_sqrt_price =
                tick_math::get_sqrt_price_at_tick(self.raydium_personal_position.tick_lower_index)
                    .unwrap();
            let high_sqrt_price =
                tick_math::get_sqrt_price_at_tick(self.raydium_personal_position.tick_upper_index)
                    .unwrap();

            get_liquidity_from_amounts(
                current_sqrt_price,
                low_sqrt_price,
                high_sqrt_price,
                amount_0_max,
                amount_1_max,
            )
        };

        let vault_strategy_config_bump_seed = &[self.vault_strategy_config.bump];
        let vault_strategy_config_seeds = &[
            VaultStrategyConfig::SEED.as_bytes(),
            self.vault_strategy_config.creator.as_ref(),
            self.vault_strategy_config.name.as_ref(),
            vault_strategy_config_bump_seed,
        ];

        let signer_seeds = &[&vault_strategy_config_seeds[..]];

        let cpi_accounts = cpi::accounts::IncreaseLiquidityV2 {
            nft_owner: self.vault_strategy_config.to_account_info(),
            nft_account: self.raydium_position_nft_account.to_account_info(),
            pool_state: self.raydium_pool_state.to_account_info(),
            protocol_position: self.raydium_protocol_position.to_account_info(),
            personal_position: self.raydium_personal_position.to_account_info(),
            tick_array_lower: self.raydium_tick_array_lower.to_account_info(),
            tick_array_upper: self.raydium_tick_array_upper.to_account_info(),
            token_account_0: self.vault_strategy_cfg_mint_0_escrow.to_account_info(),
            token_account_1: self.vault_strategy_cfg_mint_1_escrow.to_account_info(),
            token_vault_0: self.raydium_token_vault_0.to_account_info(),
            token_vault_1: self.raydium_token_vault_1.to_account_info(),
            token_program: self.token_program.to_account_info(),
            token_program_2022: self.token_program_2022.to_account_info(),
            vault_0_mint: self.raydium_vault_0_mint.to_account_info(),
            vault_1_mint: self.raydium_vault_1_mint.to_account_info(),
        };
        let cpi_context = CpiContext::new_with_signer(
            self.raydium_clmm_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        )
        .with_remaining_accounts(remaining_accounts.to_vec());

        // let percentage: f64 = 5.0;
        // let slippage_tolerance = U256::from(percentage.mul(1e6) as u64);
        // let amount_0_slippage = U256::from(amount_0_max)
        //     .checked_mul(slippage_tolerance)
        //     .unwrap()
        //     .checked_div(U256::from(100_000_000))
        //     .unwrap();
        // let amount_1_slippage = U256::from(amount_1_max)
        //     .checked_mul(slippage_tolerance)
        //     .unwrap()
        //     .checked_div(U256::from(100_000_000))
        //     .unwrap();

        // let amount_0_max = amount_0_max.checked_add(amount_0_slippage.as_u64()).unwrap();
        // let amount_1_max = amount_1_max.checked_add(amount_1_slippage.as_u64()).unwrap();
        // msg!("amount_0_max with slippage : {}", amount_0_max);
        // msg!("amount_1_max with slippage : {}", amount_1_max);
        cpi::increase_liquidity_v2(
            cpi_context,
            liquidity,
            amount_0_max,
            amount_1_max,
            Some(true),
        )?;

        Ok(())
    }
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, AddLiquidityRaydiumVaultStrategy<'info>>,
    _strategy_id: u8,
) -> Result<()>
where
    'c: 'info,
{
    ctx.accounts.process(ctx.remaining_accounts)
}
