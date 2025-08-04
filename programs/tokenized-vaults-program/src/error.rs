use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
   
    #[msg("Not approved")]
    NotApproved,

    #[msg("Fee cannot exceed 100% (1_000_000 parts per million)")]
    FeeTooHigh,

    #[msg("ProtocolConfig already initialized")]
    AlreadyInitialized,
}