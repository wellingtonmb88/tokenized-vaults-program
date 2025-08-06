use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Not approved")]
    NotApproved,

    #[msg("Fee cannot exceed 10% (1% = 10 * 10_000 = 100_000)")]
    FeeTooHigh,

    #[msg("ProtocolConfig already initialized")]
    ProtocolConfigInitialized,

    #[msg("Protocol is already paused")]
    ProtocolAlreadyPaused,
}
