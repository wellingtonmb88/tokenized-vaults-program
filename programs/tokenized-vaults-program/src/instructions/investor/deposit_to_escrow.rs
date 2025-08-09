use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::{InvestorEscrow, INVESTOR_ESCROW_SEED, USDC_MINT};

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            INVESTOR_ESCROW_SEED.as_bytes(),
            investor.key().as_ref(),
            usdc_mint.key().as_ref(),
        ],
        bump = investor_escrow.bump,
        constraint = investor_escrow.authority == investor.key() @ TokenizedVaultsErrorCode::NotApproved,
        constraint = investor_escrow.mint == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint,
    )]
    pub investor_escrow: Account<'info, InvestorEscrow>,

    #[account(
        mut,
        seeds = [
            b"escrow_vault",
            investor_escrow.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = investor_escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_token_account: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

impl<'info> DepositToEscrow<'info> {
    pub fn transfer_to_escrow(&self, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.investor_token_account.to_account_info(),
            to: self.escrow_vault.to_account_info(),
            authority: self.investor.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

pub fn deposit_to_escrow_handler(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
    require!(amount > 0, TokenizedVaultsErrorCode::InvalidAmount);

    require!(
        ctx.accounts.investor_token_account.amount >= amount,
        TokenizedVaultsErrorCode::InsufficientFunds
    );

    ctx.accounts.transfer_to_escrow(amount)?;

    let investor_escrow = &mut ctx.accounts.investor_escrow;
    investor_escrow.deposit(amount)?;

    Ok(())
}
