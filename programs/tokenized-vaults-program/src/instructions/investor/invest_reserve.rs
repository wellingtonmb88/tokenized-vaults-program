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

    #[account()]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,

    #[account(
        mut,
        // seeds = [
        //     InvestorEscrow::VAULT_SEED.as_bytes(),
        //     investor.key().as_ref(),
        // ],
        // bump,
        // token::mint = usdc_mint,
        // token::authority = investor,
        associated_token::mint = usdc_mint,
        associated_token::authority = investor,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_strategy_config,
    )]
    pub vault_strategy_cfg_usdc_escrow: Account<'info, TokenAccount>,

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
    pub fn invest(&mut self, amount: u64, escrow_vault_bump: u8) -> Result<()> {
        require!(amount > 0, TokenizedVaultsErrorCode::InvalidAmount);

        // require!(
        //     self.vault_strategy_config.status == VaultStrategyStatus::Active,
        //     TokenizedVaultsErrorCode::VaultStrategyConfigNotActive
        // );

        require!(
            self.escrow_vault.amount >= amount,
            TokenizedVaultsErrorCode::InsufficientFunds
        );

        self.transfer_to_vault_strategy_cfg_usdc_escrow(amount, escrow_vault_bump)?;

        self.invest_reserve_vault
            .initialize(self.vault_strategy_config.key(), amount)?;

        Ok(())
    }

    fn transfer_to_vault_strategy_cfg_usdc_escrow(
        &self,
        amount: u64,
        escrow_vault_bump: u8,
    ) -> Result<()> {
        // let seeds = &[
        //     InvestorEscrow::VAULT_SEED.as_bytes(),
        //     self.investor.to_account_info().key.as_ref(),
        //     &[escrow_vault_bump],
        // ];
        // let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: self.escrow_vault.to_account_info(),
            to: self.vault_strategy_cfg_usdc_escrow.to_account_info(),
            authority: self.investor.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        // let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<InvestReserve>, amount: u64) -> Result<()> {
    ctx.accounts.invest(amount, 1)
}
