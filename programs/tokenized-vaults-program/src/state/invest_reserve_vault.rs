use anchor_lang::prelude::*;
use crate::DISC_INVEST_RESERVE_VAULT_ACCOUNT;

#[derive(Default, Debug, Clone, Copy, InitSpace, AnchorSerialize, AnchorDeserialize)]
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
    pub swap_to_ratio_vaults: [SwapToRatioVault; 3],
}
