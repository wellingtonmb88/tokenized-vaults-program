use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{InvestorEscrow, INVESTOR_ESCROW_SEED, USDC_MINT};
use crate::error::TokenizedVaultsErrorCode;

#[derive(Accounts)]
pub struct InitInvestorEscrow<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        init,
        payer = investor,
        space = 8 + InvestorEscrow::INIT_SPACE,
        seeds = [
            INVESTOR_ESCROW_SEED.as_bytes(),
            investor.key().as_ref(),
            usdc_mint.key().as_ref(),
        ],
        bump
    )]
    pub investor_escrow: Account<'info, InvestorEscrow>,

    #[account(
        init,
        payer = investor,
        token::mint = usdc_mint,
        token::authority = investor_escrow,
        seeds = [
            b"escrow_vault",
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

pub fn init_investor_escrow_handler(ctx: Context<InitInvestorEscrow>) -> Result<()> {
    let investor_escrow = &mut ctx.accounts.investor_escrow;
    let bump = ctx.bumps.investor_escrow;

    investor_escrow.initialize(
        ctx.accounts.investor.key(),
        ctx.accounts.usdc_mint.key(),
        bump,
    )?;

    Ok(())
}
