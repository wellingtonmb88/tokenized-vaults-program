use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, Transfer};

use crate::error::TokenizedVaultsErrorCode;
use crate::utils::transfer_token;
use crate::{
    InvestReserveVault, InvestorEscrow, InvestorStrategyPosition, VaultStrategyConfig,
    VaultStrategyStatus, USDC_MINT,
};

#[derive(Accounts)]
pub struct InvestReserve<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account()]
    pub vault_strategy_config: Account<'info, VaultStrategyConfig>,

    #[account(
        mut,
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
        seeds = [
            VaultStrategyConfig::VAULT_STRATEGY_CFG_USDC_ESCROW_SEED.as_bytes(),
            vault_strategy_config.key().as_ref(),
        ],
        bump,
        token::mint = usdc_mint,
        token::authority = vault_strategy_config,
    )]
    pub vault_strategy_cfg_usdc_escrow: InterfaceAccount<'info, TokenAccount>,

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
    pub usdc_mint: InterfaceAccount<'info, Mint>,

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
        let seeds = &[
            InvestorEscrow::VAULT_SEED.as_bytes(),
            self.investor.to_account_info().key.as_ref(),
            &[escrow_vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        transfer_token(
            &self.escrow_vault,
            &self.vault_strategy_cfg_usdc_escrow,
            amount,
            &self.usdc_mint,
            &self.investor,
            &self.token_program,
            Some(signer_seeds),
        )?;

        Ok(())
    }
}

pub fn handler(ctx: Context<InvestReserve>, amount: u64) -> Result<()> {
    ctx.accounts.invest(amount, ctx.bumps.escrow_vault)
}
