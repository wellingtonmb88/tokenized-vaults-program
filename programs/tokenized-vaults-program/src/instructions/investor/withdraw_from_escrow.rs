use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::utils::transfer_token;
use crate::{InvestorEscrow, USDC_MINT};

#[derive(Accounts)]
pub struct WithdrawFromEscrow<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            InvestorEscrow::VAULT_SEED.as_bytes(),
            investor.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = investor
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

impl<'info> WithdrawFromEscrow<'info> {
    pub fn withdraw(&mut self, amount: u64, escrow_vault_bump: u8) -> Result<()> {
        self.transfer_from_escrow(amount, escrow_vault_bump)?;

        Ok(())
    }

    fn transfer_from_escrow(&self, amount: u64, escrow_vault_bump: u8) -> Result<()> {
        let seeds = &[
            InvestorEscrow::VAULT_SEED.as_bytes(),
            self.investor.to_account_info().key.as_ref(),
            &[escrow_vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        transfer_token(
            &self.escrow_vault,
            &self.investor_token_account,
            amount,
            &self.usdc_mint,
            &self.investor,
            &self.token_program,
            Some(signer_seeds),
        )?;
        Ok(())
    }
}

pub fn handler(ctx: Context<WithdrawFromEscrow>, amount: u64) -> Result<()> {
    ctx.accounts.withdraw(amount, ctx.bumps.escrow_vault)
}
