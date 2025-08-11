use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::{InvestorEscrow, USDC_MINT};

#[derive(Accounts)]
pub struct WithdrawFromEscrow<'info> {
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
        constraint = investor_escrow.mint == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint,
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

impl<'info> WithdrawFromEscrow<'info> {
    pub fn transfer_from_escrow(&self, amount: u64) -> Result<()> {
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
            to: self.investor_token_account.to_account_info(),
            authority: self.investor_escrow.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<WithdrawFromEscrow>, amount: u64) -> Result<()> {
    ctx.accounts
        .investor_escrow
        .process_withdraw(amount, ctx.accounts.escrow_vault.amount)?;

    ctx.accounts.transfer_from_escrow(amount)?;

    Ok(())
}
