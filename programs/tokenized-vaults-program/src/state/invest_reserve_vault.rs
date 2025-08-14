use anchor_lang::prelude::*;

use crate::{error::TokenizedVaultsErrorCode, DISC_INVEST_RESERVE_VAULT_ACCOUNT};

#[derive(
    Default, Debug, Clone, Copy, InitSpace, AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Hash,
)]
pub struct SwapToRatioVault {
    pub vault_strategy_key: Pubkey,
    pub amount_in: u64,
    pub token_0_amount: u64,
    pub token_1_amount: u64,
}

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = DISC_INVEST_RESERVE_VAULT_ACCOUNT)]
pub struct InvestReserveVault {
    pub vault_strategy_config_key: Pubkey,
    pub reserved_amount: u64,
    #[max_len(3)]
    pub swap_to_ratio_vaults: Vec<SwapToRatioVault>,
}

impl InvestReserveVault {
    pub const SEED: &'static str = "invest_reserve_vault:";

    pub fn initialize(&mut self, vault_strategy_config_key: Pubkey, reserved_amount: u64) {
        self.vault_strategy_config_key = vault_strategy_config_key;
        self.reserved_amount = reserved_amount;
        self.swap_to_ratio_vaults = Vec::new();
    }

    pub fn add_swap_to_ratio_vault(&mut self, vault: SwapToRatioVault) -> Result<()> {
        require!(
            self.swap_to_ratio_vaults.len() < 3,
            TokenizedVaultsErrorCode::MaxSwapToRatioVaultsReached
        );
        require!(vault.amount_in > 0, TokenizedVaultsErrorCode::InvalidAmount);

        require!(
            !self.swap_to_ratio_vaults.contains(&vault),
            TokenizedVaultsErrorCode::SwapToRatioVaultAlreadyExists
        );

        let current_sum = self
            .swap_to_ratio_vaults
            .iter()
            .map(|v| v.amount_in)
            .sum::<u64>();

        // Check if adding this vault would exceed reserved amount
        let total_after_add = current_sum
            .checked_add(vault.amount_in)
            .ok_or(TokenizedVaultsErrorCode::MathOverflow)?;

        require!(
            total_after_add <= self.reserved_amount,
            TokenizedVaultsErrorCode::InvalidAmount
        );
        self.swap_to_ratio_vaults.push(vault);
        Ok(())
    }

    pub fn clear_swap_to_ratio_vaults(&mut self) -> Result<()> {
        require!(
            !self.swap_to_ratio_vaults.is_empty(),
            TokenizedVaultsErrorCode::NoSwapToRatioVaultsToClear
        );
        self.reserved_amount = 0;
        self.swap_to_ratio_vaults.clear();
        Ok(())
    }
}
