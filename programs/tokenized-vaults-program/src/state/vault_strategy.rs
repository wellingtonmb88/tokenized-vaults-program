use crate::{
    assert_vault_strategy_percentage, error::TokenizedVaultsErrorCode, DISC_VAULT_STRATEGY_ACCOUNT,
};

use anchor_lang::prelude::*;

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_VAULT_STRATEGY_ACCOUNT)]
pub struct VaultStrategy {
    pub creator: Pubkey,
    pub look_up_table: Pubkey,
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
    pub const SEED: &'static str = "vlt_strtg:";

    pub fn initialize(
        &mut self,
        creator: Pubkey,
        look_up_table: Pubkey,
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
        require!(
            self.dex_nft_mint == Pubkey::default(),
            TokenizedVaultsErrorCode::VaultStrategyInitialized
        );

        assert_vault_strategy_percentage(percentage)?;

        self.add_assets(assets)?;
        self.add_shares(shares)?;

        self.set_inner(
            creator,
            look_up_table,
            vault_strategy_config_key,
            dex_nft_mint,
            mint_0,
            mint_1,
            percentage,
            strategy_id,
            bump,
        )?;

        emit!(VaultStrategyInitializeEvent {
            creator,
            vault_strategy_config_key,
            dex_nft_mint,
            mint_0,
            mint_1,
            assets,
            shares,
            percentage,
            strategy_id,
        });

        Ok(())
    }

    pub fn set_inner(
        &mut self,
        creator: Pubkey,
        look_up_table: Pubkey,
        vault_strategy_config_key: Pubkey,
        dex_nft_mint: Pubkey,
        mint_0: Pubkey,
        mint_1: Pubkey,
        percentage: u32,
        strategy_id: u8,
        bump: u8,
    ) -> Result<()> {
        self.creator = creator;
        self.look_up_table = look_up_table;
        self.vault_strategy_config_key = vault_strategy_config_key;
        self.dex_nft_mint = dex_nft_mint;
        self.mint_0 = mint_0;
        self.mint_1 = mint_1;
        self.percentage = percentage;
        self.strategy_id = strategy_id;
        self.bump = bump;
        Ok(())
    }

    pub fn add_assets(&mut self, assets: u64) -> Result<()> {
        self.total_assets = self.total_assets.saturating_add(assets);
        require!(
            self.total_assets > 0,
            TokenizedVaultsErrorCode::AssetsCalculatedToZero
        );

        emit!(VaultStrategyUpdateAssetsEvent {
            creator: self.creator,
            vault_strategy_config_key: self.vault_strategy_config_key,
            assets: self.total_assets,
            strategy_id: self.strategy_id
        });
        Ok(())
    }

    pub fn add_shares(&mut self, shares: u64) -> Result<()> {
        self.total_shares = self.total_shares.saturating_add(shares);
        require!(
            self.total_shares > 0,
            TokenizedVaultsErrorCode::SharesCalculatedToZero
        );
        emit!(VaultStrategyUpdateShareEvent {
            creator: self.creator,
            vault_strategy_config_key: self.vault_strategy_config_key,
            shares: self.total_shares,
            strategy_id: self.strategy_id
        });
        Ok(())
    }

    pub fn remove_assets(&mut self, assets: u64) -> Result<()> {
        self.total_assets = self.total_assets.saturating_sub(assets);
        emit!(VaultStrategyUpdateAssetsEvent {
            creator: self.creator,
            vault_strategy_config_key: self.vault_strategy_config_key,
            assets: self.total_assets,
            strategy_id: self.strategy_id
        });
        Ok(())
    }

    pub fn remove_shares(&mut self, shares: u64) -> Result<()> {
        self.total_shares = self.total_shares.saturating_sub(shares);
        emit!(VaultStrategyUpdateShareEvent {
            creator: self.creator,
            vault_strategy_config_key: self.vault_strategy_config_key,
            shares: self.total_shares,
            strategy_id: self.strategy_id
        });
        Ok(())
    }
}

#[event]
#[derive(Debug)]
pub struct VaultStrategyInitializeEvent {
    creator: Pubkey,
    vault_strategy_config_key: Pubkey,
    dex_nft_mint: Pubkey,
    mint_0: Pubkey,
    mint_1: Pubkey,
    assets: u64,
    shares: u64,
    percentage: u32,
    strategy_id: u8,
}
#[event]
#[derive(Debug)]
pub struct VaultStrategyUpdateAssetsEvent {
    creator: Pubkey,
    vault_strategy_config_key: Pubkey,
    assets: u64,
    strategy_id: u8,
}

#[event]
#[derive(Debug)]
pub struct VaultStrategyUpdateShareEvent {
    creator: Pubkey,
    vault_strategy_config_key: Pubkey,
    shares: u64,
    strategy_id: u8,
}
