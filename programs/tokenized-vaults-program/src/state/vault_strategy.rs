use std::mem::MaybeUninit;

use crate::{
    assert_vault_strategy_percentage, error::TokenizedVaultsErrorCode, DISC_VAULT_STRATEGY_ACCOUNT,
};

use anchor_lang::prelude::*;

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_VAULT_STRATEGY_ACCOUNT)]
pub struct VaultStrategy {
    pub creator: Pubkey,
    pub vault_strategy_config_key: Pubkey,
    pub dex_nft_mint: Pubkey,
    pub mint_0: Pubkey,
    pub mint_1: Pubkey,
    pub total_assets: u64,
    pub total_shares: u64,
    pub percentage: u32,
    pub strategy_id: u8,
    pub bump: u8,
}

impl VaultStrategy {
    /// The seed used to derive the vault strategy PDA
    pub const SEED: &str = "vlt_strtg:";

    pub fn initialize(
        &mut self,
        creator: Pubkey,
        vault_strategy_config_key: Pubkey,
        dex_nft_mint: Pubkey,
        mint_0: Pubkey,
        mint_1: Pubkey,
        assets: u64,
        shares: u64,
        percentage: u32,
        strategy_id: u8,
        bump: u8,
    ) -> Result<()> {
        assert_vault_strategy_percentage(percentage)?;

        self.update_assets(assets)?;
        self.update_shares(shares)?;

        self.creator = creator;
        self.vault_strategy_config_key = vault_strategy_config_key;
        self.dex_nft_mint = dex_nft_mint;
        self.mint_0 = mint_0;
        self.mint_1 = mint_1;
        self.percentage = percentage;
        self.strategy_id = strategy_id;
        self.bump = bump;
        Ok(())
    }

    pub fn update_assets(&mut self, assets: u64) -> Result<()> {
        self.total_assets = self.total_assets.saturating_add(assets);
        require!(
            self.total_assets > 0,
            TokenizedVaultsErrorCode::AssetsCalculatedToZero
        );
        Ok(())
    }

    pub fn update_shares(&mut self, shares: u64) -> Result<()> {
        self.total_shares = self.total_shares.saturating_add(shares);
        require!(
            self.total_shares > 0,
            TokenizedVaultsErrorCode::SharesCalculatedToZero
        );
        Ok(())
    }
}
