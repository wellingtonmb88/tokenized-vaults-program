use anchor_lang::prelude::*;

#[error_code]
pub enum TokenizedVaultsErrorCode {
    #[msg("Not approved")]
    NotApproved,

    #[msg("Fee cannot exceed 10% (100_000)")]
    FeeTooHigh,
    #[msg("Fee cannot be 0 or less (0)")]
    FeeTooLow,

    #[msg("ProtocolConfig already initialized")]
    ProtocolConfigInitialized,

    #[msg("ProtocolConfig not initialized")]
    ProtocolConfigNotInitialized,

    #[msg("Protocol is already paused")]
    ProtocolAlreadyPaused,

    #[msg("Protocol is not paused")]
    ProtocolNotPaused,

    #[msg("VaultStrategyConfig already initialized")]
    VaultStrategyConfigInitialized,

    #[msg("Invalid vault strategy type")]
    InvalidVaultStrategyType,

    #[msg("Invalid vault strategy name")]
    InvalidVaultStrategyName,

    #[msg("Performance fee cannot exceed 100% (1_000_000)")]
    PerformanceFeeTooHigh,

    #[msg("Performance fee cannot be less than 10% (100_000)")]
    PerformanceFeeTooLow,
}
