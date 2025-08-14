use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::{
    InvestReserveVault, InvestorEscrow, VaultStrategyConfig, VaultStrategyStatus, USDC_MINT,
};

#[derive(Accounts)]
pub struct InvestReserve<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            InvestorEscrow::SEED.as_bytes(),
            investor.key().as_ref(),
            usdc_mint.key().as_ref(),
        ],
        bump = investor_escrow.bump,
        constraint = investor_escrow.authority == investor.key() @ TokenizedVaultsErrorCode::NotApproved,
    )]
    pub investor_escrow: Account<'info, InvestorEscrow>,

    #[account(
        mut,
        seeds = [
            InvestorEscrow::VAULT_SEED.as_bytes(),
            investor_escrow.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = investor_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            VaultStrategyConfig::SEED.as_bytes(),
            vault_strategy_config.creator.as_ref(),
            vault_strategy_config.name.as_ref(),
        ],
        bump = vault_strategy_config.bump,
    )]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,

    #[account(
        mut,
        seeds = [
            VaultStrategyConfig::VAULT_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = vault_strategy_config,
    )]
    pub vault_strategy_config_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = investor,
        space = InvestReserveVault::DISCRIMINATOR.len() + InvestReserveVault::INIT_SPACE,
        seeds = [
            InvestReserveVault::SEED.as_bytes(),
            investor.key().as_ref(),
            vault_strategy_config.key().as_ref(),
        ],
        bump
    )]
    pub invest_reserve_vault: Account<'info, InvestReserveVault>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> InvestReserve<'info> {
    pub fn invest(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, TokenizedVaultsErrorCode::InvalidAmount);

        require!(
            self.vault_strategy_config.status == VaultStrategyStatus::Active,
            TokenizedVaultsErrorCode::VaultStrategyConfigNotActive
        );

        require!(
            self.investor_escrow.amount >= amount,
            TokenizedVaultsErrorCode::InsufficientFunds
        );

        require!(
            self.escrow_vault.amount >= amount,
            TokenizedVaultsErrorCode::InsufficientFunds
        );

        self.investor_escrow.withdraw(amount)?;

        if self.invest_reserve_vault.vault_strategy_config_key == Pubkey::default() {
            self.invest_reserve_vault.vault_strategy_config_key = self.vault_strategy_config.key();
        }

        self.invest_reserve_vault.reserved_amount = self
            .invest_reserve_vault
            .reserved_amount
            .checked_add(amount)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        self.transfer_to_vault_strategy_config(amount)?;

        Ok(())
    }

    fn transfer_to_vault_strategy_config(&self, amount: u64) -> Result<()> {
        let investor_key = self.investor.key();
        let usdc_mint_key = self.usdc_mint.key();

        let seeds = &[
            InvestorEscrow::SEED.as_bytes(),
            investor_key.as_ref(),
            usdc_mint_key.as_ref(),
            &[self.investor_escrow.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: self.escrow_vault.to_account_info(),
            to: self.vault_strategy_config_vault.to_account_info(),
            authority: self.investor_escrow.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<InvestReserve>, amount: u64) -> Result<()> {
    ctx.accounts.invest(amount)
}
