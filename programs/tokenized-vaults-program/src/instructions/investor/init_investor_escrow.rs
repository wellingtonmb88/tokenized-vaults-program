use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::TokenizedVaultsErrorCode;
use crate::{InvestorEscrow, USDC_MINT};

#[derive(Accounts)]
pub struct InitInvestorEscrow<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        init_if_needed,
        payer = investor,
        space = InvestorEscrow::DISCRIMINATOR.len() + InvestorEscrow::INIT_SPACE,
        seeds = [
            InvestorEscrow::SEED.as_bytes(),
            investor.key().as_ref(),
            usdc_mint.key().as_ref(),
        ],
        bump
    )]
    pub investor_escrow: Account<'info, InvestorEscrow>,

    #[account(
        init_if_needed,
        payer = investor,
        token::mint = usdc_mint,
        token::authority = investor_escrow,
        seeds = [
            InvestorEscrow::VAULT_SEED.as_bytes(),
            investor_escrow.key().as_ref(),
        ],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> InitInvestorEscrow<'info> {
    pub fn initialize(&mut self, bump: u8) -> Result<()> {
        self.investor_escrow.initialize(self.investor.key(), bump)?;

        Ok(())
    }
}

pub fn handler(ctx: Context<InitInvestorEscrow>) -> Result<()> {
    let bump = ctx.bumps.investor_escrow;
    ctx.accounts.initialize(bump)
}
