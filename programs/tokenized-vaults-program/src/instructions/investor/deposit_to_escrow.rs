use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::{InvestorEscrow, USDC_MINT};

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        init_if_needed,
        payer = investor,
        seeds = [
            InvestorEscrow::VAULT_SEED.as_bytes(),
            investor.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = investor,
    )]
    pub investor_token_account: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositToEscrow<'info> {
    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        self.transfer_to_escrow(amount)?;

        Ok(())
    }

    fn transfer_to_escrow(&self, amount: u64) -> Result<()> {
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
    ctx.accounts.deposit(amount)
}
