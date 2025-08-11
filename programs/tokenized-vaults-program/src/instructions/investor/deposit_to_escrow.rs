use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::{InvestorEscrow, USDC_MINT};

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
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

pub fn handler(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
    ctx.accounts
        .investor_escrow
        .process_deposit(amount, ctx.accounts.investor_token_account.amount)?;

    ctx.accounts.transfer_to_escrow(amount)?;

    Ok(())
}
