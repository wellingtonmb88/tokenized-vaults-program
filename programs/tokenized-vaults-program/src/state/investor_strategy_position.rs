use anchor_lang::prelude::*;

use crate::{error::TokenizedVaultsErrorCode, DISC_INVESTOR_STR_POS_ACCOUNT};

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_INVESTOR_STR_POS_ACCOUNT)]
pub struct InvestorStrategyPosition {
    pub authority: Pubkey,
    pub vault_strategy_key: Pubkey,
    pub shares: u64,
    pub assets: u64,
    pub bump: u8,
}

impl InvestorStrategyPosition {
    /// The seed used to derive the investor strategy position PDA
    pub const SEED: &'static str = "inv_strtg_pos:";
    const VIRTUAL_ASSETS: u64 = 1; // 1 micro USDC
    const VIRTUAL_SHARES: u64 = 1; // 1 micro share

    pub fn initialize(
        &mut self,
        authority: Pubkey,
        vault_strategy_key: Pubkey,
        assets: u64,
        total_vault_assets: u64,
        total_vault_shares: u64,
        bump: u8,
    ) -> Result<()> {
        self.authority = authority;
        self.vault_strategy_key = vault_strategy_key;
        self.bump = bump;
        self.deposit_assets(assets, total_vault_assets, total_vault_shares)
    }

    pub fn deposit_assets(
        &mut self,
        assets: u64,
        total_vault_assets: u64,
        total_vault_shares: u64,
    ) -> Result<()> {
        self.shares = self.shares.saturating_add(self.convert_assets_to_shares(
            assets,
            total_vault_assets,
            total_vault_shares,
        )?);
        require!(
            self.shares > 0,
            TokenizedVaultsErrorCode::SharesCalculatedToZero
        );
        self.assets = self.assets.saturating_add(assets);
        require!(
            self.assets > 0,
            TokenizedVaultsErrorCode::AssetsCalculatedToZero
        );

        emit!(InvestorStrategyPositionEvent {
            authority: self.authority,
            vault_strategy_key: self.vault_strategy_key,
            shares: self.shares,
            assets: self.assets,
        });
        Ok(())
    }

    fn convert_assets_to_shares(
        &self,
        assets: u64,
        total_vault_assets: u64,
        total_vault_shares: u64,
    ) -> Result<u64> {
        // Virtual assets and shares are used to prevent division by zero
        // and prevent inflation attacks
        let virtual_total_assets = total_vault_assets.saturating_add(Self::VIRTUAL_ASSETS);
        let virtual_total_shares = total_vault_shares.saturating_add(Self::VIRTUAL_SHARES);

        // shares = (assets_deposited * total_shares) / total_assets
        let shares = (assets as u128)
            .checked_mul(virtual_total_shares as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
            .checked_div(virtual_total_assets as u128)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        require!(shares > 0, TokenizedVaultsErrorCode::SharesCalculatedToZero);

        emit!(InvestorStrategyPositionEvent {
            authority: self.authority,
            vault_strategy_key: self.vault_strategy_key,
            shares: total_vault_shares,
            assets: total_vault_assets,
        });
        Ok(shares as u64)
    }

    // / Convert shares to percentage is 1e9 precision,
    // / ex: 10 share in 100 total shares = 10 * 1e9 / 100 = 100_000_000 = 100_000_000/1e9 = 0.1 = 10%
    // / returns an error if the calculation overflows
    // fn convert_shares_to_percentage(&self, total_vault_shares: u64) -> Result<u64> {
    //     if total_vault_shares == 0 {
    //         Ok(0)
    //     } else {
    //         let precision = 10u128
    //             .checked_pow(9)
    //             .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;
    //         let percentage = (self.shares as u128)
    //             .checked_mul(precision)
    //             .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
    //             .checked_div(total_vault_shares as u128)
    //             .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;
    //         Ok(percentage as u64)
    //     }
    // }

    // fn convert_shares_to_assets(
    //     &self,
    //     shares: u64,
    //     total_vault_assets: u64,
    //     total_vault_shares: u64,
    // ) -> Result<u64> {
    //     if self.shares == 0 {
    //         Ok(0)
    //     } else {
    //         require!(
    //             self.shares >= shares,
    //             TokenizedVaultsErrorCode::InsufficientShares
    //         );
    //         // assets = (shares_resgatadas * total_assets) / total_shares
    //         let assets = (shares as u128)
    //             .checked_mul(total_vault_assets as u128)
    //             .ok_or(TokenizedVaultsErrorCode::MathOverflow)?
    //             .checked_div(total_vault_shares as u128)
    //             .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

    //         Ok(assets as u64)
    //     }
    // }
}

#[event]
#[derive(Debug)]
pub struct InvestorStrategyPositionEvent {
    pub authority: Pubkey,
    pub vault_strategy_key: Pubkey,
    pub shares: u64,
    pub assets: u64,
}
