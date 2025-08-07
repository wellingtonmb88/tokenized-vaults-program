use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, Default)]
pub enum ProtocolStatus {
    #[default]
    Initialized,
    Active,
    Paused,
    Closed,
}
