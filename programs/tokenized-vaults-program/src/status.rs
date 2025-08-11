use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum VaultStrategyType {
    #[default]
    Unknown,
    Conservative,
    Balanced,
    Aggressive,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum ProtocolStatus {
    #[default]
    Unknown,
    Active,
    Paused,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum VaultStrategyStatus {
    #[default]
    Unknown,
    Draft,
    Active,
    Paused,
    Closed,
}
