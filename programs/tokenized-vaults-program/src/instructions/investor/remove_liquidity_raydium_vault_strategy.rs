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
    AmmConfig, ObservationState, PersonalPositionState, PoolState, TickArrayState, POSITION_SEED,
};

use crate::error::TokenizedVaultsErrorCode;
use crate::{
    get_delta_amounts_signed, get_liquidity_from_amount_0, get_liquidity_from_amount_1,
    get_liquidity_from_amounts, get_raydium_owed_fees, vault_strategy_config, InvestReserveVault,
    InvestorEscrow, InvestorStrategyPosition, RaydiumTickArrayState, SwapToRatioVault,
    VaultStrategy, VaultStrategyConfig, BPS, DENOMINATOR_MULTIPLIER, MAX_PERCENTAGE,
    MAX_PERFORMANCE_FEE, MAX_REMOVE_PERCENTAGE, MIN_REMOVE_PERCENTAGE, RAYDIUM_CLMM_ID, U256,
    USDC_MINT,
};

#[derive(Accounts)]
#[instruction(strategy_id: u8)]
pub struct RemoveLiquidityRaydiumVaultStrategy<'info> {
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
        seeds = [
            InvestorStrategyPosition::SEED.as_bytes(),
            vault_strategy.key().as_ref(),
            investor.key().as_ref(),
        ],
        bump
    )]
    pub investor_strategy_position: Box<Account<'info, InvestorStrategyPosition>>,

    // /// The escrow account for the token 0
    // /// Vault strategy Config receives token 0 in this account from Raydium Swap
    // #[account(
    //     mut,
    //     seeds = [
    //         VaultStrategyConfig::VAULT_SWAP_TO_RATIO_0_ESCROW_SEED.as_bytes(),
    //         vault_strategy_config.key().as_ref(),
    //     ],
    //     bump,
    // )]
    // pub vault_strategy_cfg_mint_0_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    // /// The escrow account for the token 1
    // /// Vault strategy Config receives token 1 in this account from Raydium Swap
    // #[account(
    //     mut,
    //     seeds = [
    //         VaultStrategyConfig::VAULT_SWAP_TO_RATIO_1_ESCROW_SEED.as_bytes(),
    //         vault_strategy_config.key().as_ref(),
    //     ],
    //     bump,
    // )]
    // pub vault_strategy_cfg_mint_1_escrow: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The investor escrow account for the token 0
    /// Vault strategy Config receives token 0 in this account from Raydium LP
    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = raydium_vault_0_mint,
        associated_token::authority = investor,
    )]
    pub investor_mint_0_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The investor escrow account for the token 1
    /// Vault strategy Config receives token 1 in this account from Raydium LP
    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = raydium_vault_1_mint,
        associated_token::authority = investor,
    )]
    pub investor_mint_1_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The escrow account for the token 0
    /// Vault strategy Config receives token 0 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_FEES_0_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_0_fees_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The escrow account for the token 1
    /// Vault strategy Config receives token 1 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_FEES_1_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_1_fees_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The escrow account for the token 0
    /// Vault strategy Config receives token 0 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_PERF_FEES_0_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_0_perf_fees_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The escrow account for the token 1
    /// Vault strategy Config receives token 1 in this account from Raydium Swap
    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_PERF_FEES_1_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
    )]
    pub vault_strategy_cfg_mint_1_perf_fees_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

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
    pub raydium_tick_array_lower: AccountLoader<'info, TickArrayState>,

    /// CHECK:Account to store data for the raydium position's upper tick
    #[account(mut)]
    pub raydium_tick_array_upper: AccountLoader<'info, TickArrayState>,

    /// The address that holds raydium pool tokens for token_0
    #[account(mut)]
    pub raydium_token_vault_0: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The address that holds raydium pool tokens for token_1
    #[account(mut)]
    pub raydium_token_vault_1: Box<InterfaceAccount<'info, TokenAccount>>,

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

impl<'info> RemoveLiquidityRaydiumVaultStrategy<'info> {
    /// percentage has to be between 10%(10*1e8) and 100%(100*1e9)
    pub fn process(
        &mut self,
        percentage: u64,
        amount_0_min: u64,
        amount_1_min: u64,
        remaining_accounts: &[AccountInfo<'info>],
        _bumps: &RemoveLiquidityRaydiumVaultStrategyBumps,
    ) -> Result<()> {
        require!(
            percentage >= MIN_REMOVE_PERCENTAGE,
            TokenizedVaultsErrorCode::InvalidRemovePercentage
        );
        require!(
            percentage <= MAX_REMOVE_PERCENTAGE,
            TokenizedVaultsErrorCode::InvalidRemovePercentage
        );

        msg!("removing percentage: {}", percentage);

        let burn_shares = (percentage as u128)
            .checked_mul(self.investor_strategy_position.shares as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(MAX_REMOVE_PERCENTAGE as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)? as u64;

        require!(
            burn_shares > 0,
            TokenizedVaultsErrorCode::SharesCalculatedToZero
        );

        let (strategy_fees_collected_0, strategy_fees_collected_1) =
            self.collect_fees(remaining_accounts)?;

        let total_vault_shares = self.vault_strategy.total_shares;

        let investor_shares_percentage = self
            .investor_strategy_position
            .convert_shares_to_percentage(total_vault_shares)?;

        msg!("investor_shares_percentage: {}", investor_shares_percentage);

        let (dex_liquidity_to_remove, _investor_remove_percentage) =
            self.liquidity_to_remove(percentage, investor_shares_percentage)?;

        self.decrease_liquidity(
            dex_liquidity_to_remove,
            amount_0_min,
            amount_1_min,
            &self.investor_mint_0_account.to_account_info(),
            &self.investor_mint_1_account.to_account_info(),
            remaining_accounts,
        )?;

        self.transfer_fees(
            investor_shares_percentage,
            strategy_fees_collected_0,
            strategy_fees_collected_1,
        )?;

        let total_vault_assets = self.vault_strategy.total_assets;
        let total_vault_shares = self.vault_strategy.total_shares;
        msg!("strategy total_assets: {}", total_vault_assets);
        msg!("strategy total_shares: {}", total_vault_shares);

        let burn_assets = self.investor_strategy_position.convert_shares_to_assets(
            burn_shares,
            total_vault_assets,
            total_vault_shares,
        )?;
        self.investor_strategy_position.remove_shares(
            burn_shares,
            total_vault_assets,
            total_vault_shares,
        )?;
        msg!("burn_assets: {}", burn_assets);
        msg!("burn_shares: {}", burn_shares);
        self.vault_strategy.remove_assets(burn_assets)?;
        self.vault_strategy.remove_shares(burn_shares)?;

        msg!("Liquidity removed successfully");
        Ok(())
    }

    fn liquidity_to_remove(
        &self,
        percentage: u64,
        investor_shares_percentage: u64,
    ) -> Result<(u128, u128)> {
        let investor_remove_percentage = (investor_shares_percentage as u128)
            .checked_mul(percentage as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(MAX_REMOVE_PERCENTAGE as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        msg!("investor_remove_percentage: {}", investor_remove_percentage);

        msg!(
            "raydium_personal_position.liquidity: {}",
            self.raydium_personal_position.liquidity
        );

        let dex_liquidity_to_remove = investor_remove_percentage
            .checked_mul(self.raydium_personal_position.liquidity)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(DENOMINATOR_MULTIPLIER as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        msg!("dex_liquidity_to_remove: {}", dex_liquidity_to_remove);

        Ok((dex_liquidity_to_remove, investor_remove_percentage))
    }

    fn split_fees(
        &mut self,
        investor_shares_percentage: u64,
        strategy_fees_owed_0: u64,
        strategy_fees_owed_1: u64,
    ) -> Result<(u64, u64, u64, u64)> {
        // Calculate the percentage of shares to remove
        let investor_fees_owed_0 = (investor_shares_percentage as u128)
            .checked_mul(strategy_fees_owed_0 as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(DENOMINATOR_MULTIPLIER as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            as u64;

        let investor_fees_owed_1 = (investor_shares_percentage as u128)
            .checked_mul(strategy_fees_owed_1 as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(DENOMINATOR_MULTIPLIER as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            as u64;

        msg!("investor_fees_owed_0: {}", investor_fees_owed_0);
        msg!("investor_fees_owed_1: {}", investor_fees_owed_1);

        let creator_fees_owed_0 = (investor_fees_owed_0 as u128)
            .checked_mul(self.vault_strategy_config.performance_fee as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(MAX_PERFORMANCE_FEE as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            as u64;

        let creator_fees_owed_1 = (investor_fees_owed_1 as u128)
            .checked_mul(self.vault_strategy_config.performance_fee as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(MAX_PERFORMANCE_FEE as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            as u64;

        msg!("creator_fees_owed_0: {}", creator_fees_owed_0);
        msg!("creator_fees_owed_1: {}", creator_fees_owed_1);

        let investor_fees_owed_0 = investor_fees_owed_0
            .checked_sub(creator_fees_owed_0)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        let investor_fees_owed_1 = investor_fees_owed_1
            .checked_sub(creator_fees_owed_1)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        msg!(
            "investor_fees_owed_0 minus performance fee: {}",
            investor_fees_owed_0
        );
        msg!(
            "investor_fees_owed_1 minus performance fee: {}",
            investor_fees_owed_1
        );

        Ok((
            investor_fees_owed_0,
            investor_fees_owed_1,
            creator_fees_owed_0,
            creator_fees_owed_1,
        ))
    }

    fn get_owed_fees(&mut self) -> Result<(u64, u64)> {
        let tick_array_lower_loader = self.raydium_tick_array_lower.load()?;
        let tick_array_upper_loader = self.raydium_tick_array_upper.load()?;

        let tick_lower_index = self.raydium_personal_position.tick_lower_index;
        let tick_upper_index = self.raydium_personal_position.tick_upper_index;
        let pool_state = self.raydium_pool_state.load()?;

        let tick_lower_state =
            tick_array_lower_loader.get_tick_state(tick_lower_index, pool_state.tick_spacing)?;
        let tick_upper_state =
            tick_array_upper_loader.get_tick_state(tick_upper_index, pool_state.tick_spacing)?;

        let (fees_owed_0, fees_owed_1) = get_raydium_owed_fees(
            tick_lower_state,
            tick_upper_state,
            &self.raydium_personal_position,
            pool_state.tick_current,
            pool_state.fee_growth_global_0_x64,
            pool_state.fee_growth_global_1_x64,
        );
        Ok((fees_owed_0, fees_owed_1))
    }

    fn transfer_fees(
        &mut self,
        investor_shares_percentage: u64,
        strategy_fees_owed_0: u64,
        strategy_fees_owed_1: u64,
    ) -> Result<()> {
        let (investor_fees_owed_0, investor_fees_owed_1, creator_fees_owed_0, creator_fees_owed_1) =
            self.split_fees(
                investor_shares_percentage,
                strategy_fees_owed_0,
                strategy_fees_owed_1,
            )?;

        // let fees_escrow_0_bump_seed = &[bumps.vault_strategy_cfg_mint_0_fees_escrow];
        // let fees_escrow_0_seeds = &[
        //     VaultStrategyConfig::VAULT_FEES_0_ESCROW_SEED.as_bytes(),
        //     self.vault_strategy_config.to_account_info().key.as_ref(),
        //     fees_escrow_0_bump_seed,
        // ];

        // let fees_escrow_0_signer_seeds = &[&fees_escrow_0_seeds[..]];

        // let fees_escrow_1_bump_seed = &[bumps.vault_strategy_cfg_mint_1_fees_escrow];
        // let fees_escrow_1_seeds = &[
        //     VaultStrategyConfig::VAULT_FEES_1_ESCROW_SEED.as_bytes(),
        //     self.vault_strategy_config.to_account_info().key.as_ref(),
        //     fees_escrow_1_bump_seed,
        // ];

        // let fees_escrow_1_signer_seeds = &[&fees_escrow_1_seeds[..]];

        let vault_strategy_config_bump_seed = &[self.vault_strategy_config.bump];
        let vault_strategy_config_seeds = &[
            VaultStrategyConfig::SEED.as_bytes(),
            self.vault_strategy_config.creator.as_ref(),
            self.vault_strategy_config.name.as_ref(),
            vault_strategy_config_bump_seed,
        ];

        let signer_seeds = &[&vault_strategy_config_seeds[..]];

        transfer_token(
            &self.vault_strategy_cfg_mint_0_fees_escrow,
            &self.investor_mint_0_account,
            investor_fees_owed_0,
            &self.raydium_vault_0_mint,
            &self.vault_strategy_config.to_account_info(),
            &self.token_program,
            Some(signer_seeds),
        )?;

        transfer_token(
            &self.vault_strategy_cfg_mint_1_fees_escrow,
            &self.investor_mint_1_account,
            investor_fees_owed_1,
            &self.raydium_vault_1_mint,
            &self.vault_strategy_config.to_account_info(),
            &self.token_program,
            Some(signer_seeds),
        )?;

        transfer_token(
            &self.vault_strategy_cfg_mint_0_fees_escrow,
            &self.vault_strategy_cfg_mint_0_perf_fees_escrow,
            creator_fees_owed_0,
            &self.raydium_vault_0_mint,
            &self.vault_strategy_config.to_account_info(),
            &self.token_program,
            Some(signer_seeds),
        )?;

        transfer_token(
            &self.vault_strategy_cfg_mint_1_fees_escrow,
            &self.vault_strategy_cfg_mint_1_perf_fees_escrow,
            creator_fees_owed_1,
            &self.raydium_vault_1_mint,
            &self.vault_strategy_config.to_account_info(),
            &self.token_program,
            Some(signer_seeds),
        )?;

        Ok(())
    }

    fn collect_fees(&mut self, remaining_accounts: &[AccountInfo<'info>]) -> Result<(u64, u64)> {
        let (strategy_fees_owed_0, strategy_fees_owed_1) = self.get_owed_fees()?;
        msg!("strategy_fees_owed_0: {}", strategy_fees_owed_0);
        msg!("strategy_fees_owed_1: {}", strategy_fees_owed_1);

        self.decrease_liquidity(
            0,
            0,
            0,
            &self.vault_strategy_cfg_mint_0_fees_escrow.to_account_info(),
            &self.vault_strategy_cfg_mint_1_fees_escrow.to_account_info(),
            remaining_accounts,
        )?;

        Ok((strategy_fees_owed_0, strategy_fees_owed_1))
    }

    fn decrease_liquidity(
        &mut self,
        liquidity: u128,
        amount_0_min: u64,
        amount_1_min: u64,
        recipient_token_account_0: &AccountInfo<'info>,
        recipient_token_account_1: &AccountInfo<'info>,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        let vault_strategy_config_bump_seed = &[self.vault_strategy_config.bump];
        let vault_strategy_config_seeds = &[
            VaultStrategyConfig::SEED.as_bytes(),
            self.vault_strategy_config.creator.as_ref(),
            self.vault_strategy_config.name.as_ref(),
            vault_strategy_config_bump_seed,
        ];

        let signer_seeds = &[&vault_strategy_config_seeds[..]];

        let cpi_accounts = cpi::accounts::DecreaseLiquidityV2 {
            nft_owner: self.vault_strategy_config.to_account_info(),
            nft_account: self.raydium_position_nft_account.to_account_info(),
            pool_state: self.raydium_pool_state.to_account_info(),
            protocol_position: self.raydium_protocol_position.to_account_info(),
            personal_position: self.raydium_personal_position.to_account_info(),
            tick_array_lower: self.raydium_tick_array_lower.to_account_info(),
            tick_array_upper: self.raydium_tick_array_upper.to_account_info(),
            recipient_token_account_0: recipient_token_account_0.clone(),
            recipient_token_account_1: recipient_token_account_1.clone(),
            token_vault_0: self.raydium_token_vault_0.to_account_info(),
            token_vault_1: self.raydium_token_vault_1.to_account_info(),
            token_program: self.token_program.to_account_info(),
            token_program_2022: self.token_program_2022.to_account_info(),
            vault_0_mint: self.raydium_vault_0_mint.to_account_info(),
            vault_1_mint: self.raydium_vault_1_mint.to_account_info(),
            memo_program: self.memo_program.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.raydium_clmm_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        )
        .with_remaining_accounts(remaining_accounts.to_vec());
        cpi::decrease_liquidity_v2(cpi_context, liquidity, amount_0_min, amount_1_min)
    }
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, RemoveLiquidityRaydiumVaultStrategy<'info>>,
    _strategy_id: u8,
    percentage: u64,
    amount_0_min: u64,
    amount_1_min: u64,
) -> Result<()>
where
    'c: 'info,
{
    ctx.accounts.process(
        percentage,
        amount_0_min,
        amount_1_min,
        ctx.remaining_accounts,
        &ctx.bumps,
    )
}
