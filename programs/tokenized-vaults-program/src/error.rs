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

    #[msg("ProtocolConfig not active")]
    ProtocolConfigNotActive,

    #[msg("Protocol is already paused")]
    ProtocolAlreadyPaused,

    #[msg("Protocol is not paused")]
    ProtocolNotPaused,

    #[msg("VaultStrategyConfig is already initialized")]
    VaultStrategyConfigInitialized,

    #[msg("VaultStrategyConfig is not in active status")]
    VaultStrategyConfigNotActive,

    #[msg("VaultStrategyConfig is not in draft status")]
    VaultStrategyConfigNotDraft,

    #[msg("VaultStrategyConfig is not in paused status")]
    VaultStrategyConfigNotPaused,

    #[msg("VaultStrategyConfig max strategies reached")]
    VaultStrategyConfigMaxStrategiesReached,

    #[msg("Invalid vault strategy type")]
    InvalidVaultStrategyType,

    #[msg("Invalid vault strategy name")]
    InvalidVaultStrategyName,

    #[msg("Invalid vault strategy percentage")]
    InvalidVaultStrategyPercentage,

    #[msg("Performance fee cannot exceed 100% (1_000_000)")]
    PerformanceFeeTooHigh,

    #[msg("Performance fee cannot be less than 10% (100_000)")]
    PerformanceFeeTooLow,

    #[msg("Investor escrow already initialized")]
    InvestorEscrowAlreadyInitialized,

    #[msg("Insufficient funds in escrow")]
    InsufficientFunds,

    #[msg("Invalid Pyth price feed")]
    InvalidPrice,

    #[msg("Pyth price feed not found")]
    PythPriceFeedNotFound,

    #[msg("Invalid Pyth feed ID")]
    InvalidPythFeedId,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Percentage cannot exceed 100% (1_000_000)")]
    PercentageTooHigh,

    #[msg("Percentage cannot be less than 10% (100_000)")]
    PercentageTooLow,

    #[msg("Shares calculated to zero")]
    SharesCalculatedToZero,

    #[msg("Assets calculated to zero")]
    AssetsCalculatedToZero,

    #[msg("Insufficient shares")]
    InsufficientShares,

    #[msg("Invalid tick range")]
    InvalidTickRange,

    #[msg("sqrt_price_x64 out of range")]
    SqrtPriceX64,

    #[msg("The tick must be lesser than, or equal to the maximum tick(443636)")]
    TickUpperOverflow,

    #[msg("Invalid tick array")]
    InvalidTickArray,

    #[msg("Insufficient remaining accounts")]
    InsufficientRemainingAccounts,

    #[msg("Invalid remaining accounts for swap to ratio")]
    InvalidRemainingAccountsForSwapToRatio,

    #[msg("Max 3 swap to ratio vaults allowed")]
    MaxSwapToRatioVaultsReached,

    #[msg("SwapToRatioVault already exists")]
    SwapToRatioVaultAlreadyExists,

    #[msg("No SwapToRatioVaults to clear")]
    NoSwapToRatioVaultsToClear,

    #[msg("Transfer failed")]
    TransferFailed,

    #[msg("Invalid strategy index")]
    InvalidStrategyIndex,

    #[msg("Invalid allocation - total does not match reserved amount")]
    InvalidAllocation,

    #[msg("SwapToRatioVault not found")]
    SwapToRatioVaultNotFound,

    #[msg("InvestReserveVault already initialized")]
    InvestReserveVaultAlreadyInitialized
}
