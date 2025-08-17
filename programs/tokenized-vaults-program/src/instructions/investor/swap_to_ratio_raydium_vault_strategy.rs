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
use raydium_clmm_cpi::cpi;
use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::program::RaydiumClmm;
use raydium_clmm_cpi::states::{
    AmmConfig, ObservationState, PersonalPositionState, PoolState, POSITION_SEED,
};

use crate::error::TokenizedVaultsErrorCode;
use crate::{
    get_delta_amounts_signed, vault_strategy_config, InvestReserveVault, InvestorEscrow,
    SwapToRatioVault, VaultStrategy, VaultStrategyConfig, VaultStrategyStatus, MAX_PERCENTAGE,
    RAYDIUM_CLMM_ID, U256, USDC_MINT,
};

#[derive(Accounts)]
#[instruction(strategy_id: u8)]
pub struct SwapToRatioRaydiumVaultStrategy<'info> {
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

    /// The escrow account for the USDC
    /// Vault strategy Config receives USDC in this account from User's escrow vault
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_STRATEGY_CFG_USDC_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_usdc_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

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

    #[account()]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,

    /* DEX Raydium */
    #[account(address = RAYDIUM_CLMM_ID)]
    pub raydium_clmm_program: Program<'info, RaydiumClmm>,

    /// CHECK:
    /// The program account of the pool in which the swap will be performed
    /// Represents the state of the pool Token 0 / Token 1
    #[account(mut)]
    pub raydium_pool_state: AccountLoader<'info, PoolState>,

    /// CHECK:
    /// Increase liquidity for this position
    /// Represents the position in the pool Token 0 / Token 1
    #[account()]
    pub raydium_personal_position: Box<Account<'info, PersonalPositionState>>,

    /// CHECK:
    /// The factory state to read protocol fees
    #[account(mut)]
    pub raydium_amm_config_usdc_for_token_0: Box<Account<'info, AmmConfig>>,

    /// CHECK:
    /// The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub raydium_pool_state_usdc_for_token_0: AccountLoader<'info, PoolState>,

    /// CHECK:
    /// The factory state to read protocol fees
    #[account(mut)]
    pub raydium_amm_config_usdc_for_token_1: Box<Account<'info, AmmConfig>>,

    /// CHECK:
    /// The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub raydium_pool_state_usdc_for_token_1: AccountLoader<'info, PoolState>,

    /// CHECK:
    /// The vault token account for input token
    /// User sends USDC to this account to swap to token 0
    /// Pool: USDC / Token 0
    #[account(mut)]
    pub raydium_vault_0_input: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK:
    /// The vault token account for input token
    /// User sends USDC to this account to swap to token 1
    /// Pool: USDC / Token 1
    #[account(mut)]
    pub raydium_vault_1_input: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK:
    /// The vault token account for output token
    /// User receives token 0 from this account
    /// Pool: USDC / Token 0
    #[account(mut)]
    pub raydium_vault_0_output: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK:
    /// The vault token account for output token
    /// User receives token 1 from this account
    /// Pool: USDC / Token 1
    #[account(mut)]
    pub raydium_vault_1_output: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The mint of token 0
    #[account()]
    pub raydium_vault_0_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The mint of token 1
    #[account()]
    pub raydium_vault_1_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The program account for the most recent oracle observation
    /// USDC/Token 0
    #[account(mut)]
    pub raydium_observation_state_0: AccountLoader<'info, ObservationState>,

    /// The program account for the most recent oracle observation
    /// USDC/Token 1
    #[account(mut)]
    pub raydium_observation_state_1: AccountLoader<'info, ObservationState>,

    /// The address that holds raydium pool tokens for token_0
    #[account(mut)]
    pub raydium_token_vault_0: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The address that holds raydium pool tokens for token_1
    #[account(mut)]
    pub raydium_token_vault_1: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for token transfers
    pub token_program: Program<'info, Token>,

    /// SPL program 2022 for token transfers
    pub token_program_2022: Program<'info, Token2022>,

    /// memo program
    pub memo_program: Program<'info, Memo>,

    /// System program
    pub system_program: Program<'info, System>,
    // remaining accounts
    // tickarray_bitmap_extension: must add account if need
    // tick_array_account_1
    // tick_array_account_2
    // tick_array_account_...
}

impl<'info> SwapToRatioRaydiumVaultStrategy<'info> {
    pub fn process(
        &mut self,
        token_0_amount_out_min: u64,
        token_1_amount_out_min: u64,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        // require!(
        //     self.vault_strategy_config.status == VaultStrategyStatus::Active,
        //     TokenizedVaultsErrorCode::VaultStrategyConfigNotActive
        // );

        let usdc_amount = self
            .invest_reserve_vault
            .reserved_amount
            .saturating_mul(self.vault_strategy.percentage as u64)
            .saturating_div(MAX_PERCENTAGE as u64);

        require!(usdc_amount > 0, TokenizedVaultsErrorCode::NoReservedAmount);

        msg!("usdc_amount: {}", usdc_amount);

        let (usdc_for_token_0_amount, usdc_for_token_1_amount) =
            self.calc_ratio_amounts_for_usdc(usdc_amount)?;

        msg!("usdc_for_token_0_amount: {}", usdc_for_token_0_amount);
        msg!("usdc_for_token_1_amount: {}", usdc_for_token_1_amount);

        let (token_0_amount_out, token_1_amount_out) = self.swap_usdc_for_tokens(
            usdc_for_token_0_amount,
            token_0_amount_out_min,
            usdc_for_token_1_amount,
            token_1_amount_out_min,
            remaining_accounts,
        )?;

        msg!("Token 0 amount swapped: {}", token_0_amount_out);
        msg!("Token 1 amount swapped: {}", token_1_amount_out);

        self.invest_reserve_vault
            .add_swap_to_ratio_vault(SwapToRatioVault {
                vault_strategy_key: self.vault_strategy.key(),
                amount_in: usdc_amount,
                token_0_amount: token_0_amount_out,
                token_1_amount: token_1_amount_out,
                executed: false,
            })?;

        msg!("Swap to ratio vault added successfully");

        Ok(())
    }

    fn swap_usdc_for_tokens(
        &mut self,
        usdc_for_token_0_amount: u64,
        token_0_amount_out_min: u64,
        usdc_for_token_1_amount: u64,
        token_1_amount_out_min: u64,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<(u64, u64)> {
        let mut split_index = 0;
        for (index, account_info) in remaining_accounts.iter().enumerate() {
            if account_info.key() == Pubkey::default() {
                split_index = index;
                break;
            }
        }

        // Ensure we have valid splits for both swap operations
        require!(
            split_index > 0,
            TokenizedVaultsErrorCode::InvalidRemainingAccountsForSwapToRatio
        );

        let remaining_accounts_usdc_for_token_0 = &remaining_accounts[..split_index];
        let remaining_accounts_usdc_for_token_1 = &remaining_accounts[split_index + 1..];

        // Validate that we have accounts for both swaps
        require!(
            remaining_accounts_usdc_for_token_0.len() > 0,
            TokenizedVaultsErrorCode::InsufficientRemainingAccounts
        );
        require!(
            remaining_accounts_usdc_for_token_1.len() > 0,
            TokenizedVaultsErrorCode::InsufficientRemainingAccounts
        );

        let token_0_amount_out = self.swap_usdc_for_token_0(
            usdc_for_token_0_amount,
            token_0_amount_out_min,
            remaining_accounts_usdc_for_token_0,
        )?;

        let token_1_amount_out = self.swap_usdc_for_token_1(
            usdc_for_token_1_amount,
            token_1_amount_out_min,
            remaining_accounts_usdc_for_token_1,
        )?;

        Ok((token_0_amount_out, token_1_amount_out))
    }

    fn swap_usdc_for_token_0(
        &mut self,
        amount_in: u64,
        amount_out_min: u64,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<u64> {
        let bump_seed = &[self.vault_strategy_config.bump];
        let seeds = &[
            VaultStrategyConfig::SEED.as_bytes(),
            self.vault_strategy_config.creator.as_ref(),
            self.vault_strategy_config.name.as_ref(),
            bump_seed,
        ];
        let signer_seeds = &[&seeds[..]];

        let is_usdc_token_mint_0 = {
            let pool_state = self.raydium_pool_state_usdc_for_token_0.load()?;
            self.usdc_mint.key() == pool_state.token_mint_0
                && self.usdc_mint.key() == self.vault_strategy_cfg_mint_0_escrow.mint.key()
        };
        if is_usdc_token_mint_0 {
            transfer_token(
                &self.vault_strategy_cfg_usdc_escrow,
                &self.vault_strategy_cfg_mint_0_escrow,
                amount_in,
                &self.usdc_mint,
                &self.vault_strategy_config.to_account_info(),
                &self.token_program,
                Some(signer_seeds),
            )
            .map_err(|_| error!(TokenizedVaultsErrorCode::TransferFailed))?;
            self.vault_strategy_cfg_mint_0_escrow.reload()?;
            return Ok(amount_in);
        }

        let before_balance = self.vault_strategy_cfg_mint_0_escrow.amount;

        let cpi_usdc_for_token_0_accounts = SwapSingleV2 {
            payer: self.vault_strategy_config.to_account_info(),
            amm_config: self.raydium_amm_config_usdc_for_token_0.to_account_info(),
            pool_state: self.raydium_pool_state_usdc_for_token_0.to_account_info(),
            input_token_account: self.vault_strategy_cfg_usdc_escrow.to_account_info(),
            output_token_account: self.vault_strategy_cfg_mint_0_escrow.to_account_info(),
            input_vault: self.raydium_vault_0_input.to_account_info(),
            output_vault: self.raydium_vault_0_output.to_account_info(),
            observation_state: self.raydium_observation_state_0.to_account_info(),
            token_program: self.token_program.to_account_info(),
            token_program_2022: self.token_program_2022.to_account_info(),
            memo_program: self.memo_program.to_account_info(),
            input_vault_mint: self.usdc_mint.to_account_info(),
            output_vault_mint: self.raydium_vault_0_mint.to_account_info(),
        };

        let cpi_usdc_for_token_0_context = CpiContext::new(
            self.raydium_clmm_program.to_account_info(),
            cpi_usdc_for_token_0_accounts,
        )
        .with_remaining_accounts(remaining_accounts.to_vec())
        .with_signer(signer_seeds);

        cpi::swap_v2(
            cpi_usdc_for_token_0_context,
            amount_in,
            amount_out_min,
            0,
            true, // True : Base In (amount_in, amount_out_minimum)
        )?;

        // Reload the account to get the updated balance
        self.vault_strategy_cfg_mint_0_escrow.reload()?;
        let after_balance = self.vault_strategy_cfg_mint_0_escrow.amount;
        let amount_out = after_balance.saturating_sub(before_balance);

        msg!(
            "Token 0 swap: amount_in={}, amount_out={}",
            amount_in,
            amount_out
        );

        Ok(amount_out)
    }

    fn swap_usdc_for_token_1(
        &mut self,
        amount_in: u64,
        amount_out_min: u64,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<u64> {
        let bump_seed = &[self.vault_strategy_config.bump];
        let seeds = &[
            VaultStrategyConfig::SEED.as_bytes(),
            self.vault_strategy_config.creator.as_ref(),
            self.vault_strategy_config.name.as_ref(),
            bump_seed,
        ];
        let signer_seeds = &[&seeds[..]];
        let is_usdc_token_mint_1 = {
            let pool_state = self.raydium_pool_state_usdc_for_token_1.load()?;
            self.usdc_mint.key() == pool_state.token_mint_1
                && self.usdc_mint.key() == self.vault_strategy_cfg_mint_1_escrow.mint.key()
        };
        if is_usdc_token_mint_1 {
            transfer_token(
                &self.vault_strategy_cfg_usdc_escrow,
                &self.vault_strategy_cfg_mint_1_escrow,
                amount_in,
                &self.usdc_mint,
                &self.vault_strategy_config.to_account_info(),
                &self.token_program,
                Some(signer_seeds),
            )
            .map_err(|_| error!(TokenizedVaultsErrorCode::TransferFailed))?;
            self.vault_strategy_cfg_mint_1_escrow.reload()?;
            return Ok(amount_in);
        }

        let before_balance = self.vault_strategy_cfg_mint_1_escrow.amount;

        let cpi_usdc_for_token_1_accounts = SwapSingleV2 {
            payer: self.vault_strategy_config.to_account_info(),
            amm_config: self.raydium_amm_config_usdc_for_token_1.to_account_info(),
            pool_state: self.raydium_pool_state_usdc_for_token_1.to_account_info(),
            input_token_account: self.vault_strategy_cfg_usdc_escrow.to_account_info(),
            output_token_account: self.vault_strategy_cfg_mint_1_escrow.to_account_info(),
            input_vault: self.raydium_vault_1_input.to_account_info(),
            output_vault: self.raydium_vault_1_output.to_account_info(),
            observation_state: self.raydium_observation_state_1.to_account_info(),
            token_program: self.token_program.to_account_info(),
            token_program_2022: self.token_program_2022.to_account_info(),
            memo_program: self.memo_program.to_account_info(),
            input_vault_mint: self.usdc_mint.to_account_info(),
            output_vault_mint: self.raydium_vault_1_mint.to_account_info(),
        };

        let cpi_usdc_for_token_1_context = CpiContext::new(
            self.raydium_clmm_program.to_account_info(),
            cpi_usdc_for_token_1_accounts,
        )
        .with_remaining_accounts(remaining_accounts.to_vec())
        .with_signer(signer_seeds);

        cpi::swap_v2(
            cpi_usdc_for_token_1_context,
            amount_in,
            amount_out_min,
            0,
            true, // True : Base In (amount_in, amount_out_minimum)
        )?;

        // Reload the account to get the updated balance
        self.vault_strategy_cfg_mint_1_escrow.reload()?;
        let after_balance = self.vault_strategy_cfg_mint_1_escrow.amount;
        let amount_out = after_balance.saturating_sub(before_balance);

        msg!(
            "Token 1 swap: amount_in={}, amount_out={}",
            amount_in,
            amount_out
        );

        Ok(amount_out)
    }

    fn calc_ratio_amounts_for_usdc(&self, usdc_amount: u64) -> Result<(u64, u64)> {
        let pool_state = self.raydium_pool_state.load()?;
        let current_tick = pool_state.tick_current;
        let current_sqrt_price = pool_state.sqrt_price_x64;
        let tick_lower = self.raydium_personal_position.tick_lower_index;
        let tick_upper = self.raydium_personal_position.tick_upper_index;
        let personal_liq = self.raydium_personal_position.liquidity;
        let (vault_amount_0, vault_amount_1) = get_delta_amounts_signed(
            current_tick,
            current_sqrt_price,
            tick_lower,
            tick_upper,
            -(personal_liq as i128),
        )
        .unwrap();
        msg!(
            "Vault amounts: token_0={}, token_1={}",
            vault_amount_0,
            vault_amount_1
        );

        // price_token_0_in_token1 = 1/(((current_sqrt_price/(2**64))**2)/10**delta_decimals)
        // Decode the fixed-point square root price
        let sqrt_price = current_sqrt_price as f64 / (1_u128 << 64) as f64;
        let decimal_0 = pool_state.mint_decimals_0;
        let decimal_1 = pool_state.mint_decimals_1;
        let decimals_delta = decimal_0 as i8 - decimal_1 as i8;
        // Calculate the price of token1 in terms of token0
        let price_token1_in_token0 = sqrt_price * sqrt_price;

        // Calculate the price of token0 in terms of token1
        let price_token0_in_token1 =
            (1.0 / price_token1_in_token0) / 10f64.powi(decimals_delta as i32);

        let ratio = (vault_amount_0 as f64 * price_token0_in_token1)
            / ((vault_amount_0 as f64 * price_token0_in_token1) + (vault_amount_1 as f64))
            * 100.0;

        let ratio = U256::from(ratio.mul(1e6) as u64);
        let amount_token_0 = U256::from(usdc_amount)
            .checked_mul(ratio)
            .unwrap()
            .checked_div(U256::from(100_000_000))
            .unwrap();

        let amount_token_1 = U256::from(usdc_amount).checked_sub(amount_token_0).unwrap();
        Ok((
            amount_token_0.to_string().parse().unwrap(),
            amount_token_1.to_string().parse().unwrap(),
        ))
    }
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SwapToRatioRaydiumVaultStrategy<'info>>,
    _strategy_id: u8,
    token_0_amount_out_min: u64,
    token_1_amount_out_min: u64,
) -> Result<()>
where
    'c: 'info,
{
    ctx.accounts.process(
        token_0_amount_out_min,
        token_1_amount_out_min,
        ctx.remaining_accounts,
    )
}
