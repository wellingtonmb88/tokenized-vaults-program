use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::utils::transfer_token;
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
    pub escrow_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = investor,
    )]
    pub investor_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT @ TokenizedVaultsErrorCode::InvalidMint
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

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
        transfer_token(
            &self.investor_token_account,
            &self.escrow_vault,
            amount,
            &self.usdc_mint,
            &self.investor,
            &self.token_program,
            None,
        )?;
        Ok(())
    }
}

pub fn handler(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
    ctx.accounts.deposit(amount)
}
