use anchor_lang::prelude::*;

/// Scale: 1% = 10_000 bps → 100% = 1_000_000
pub const BPS: u32 = 10_000;
/// High fee for transaction: 10%
pub const HIGH_FEES: u32 = 10u32.checked_mul(BPS).unwrap(); // 100_000
/// High performance fee: 100%
pub const HIGH_PERFORMANCE_FEE: u32 = 100u32.checked_mul(BPS).unwrap(); // 1_000_000
/// Low performance fee: 10%
pub const LOW_PERFORMANCE_FEE: u32 = 10u32.checked_mul(BPS).unwrap(); // 100_000

/// USDC mint address - conditional based on network
/// Devnet: Test token that can be minted for testing
/// Mainnet: Official USDC token (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
#[cfg(feature = "devnet")]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC-Dev on devnet

#[cfg(not(feature = "devnet"))]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC on mainnet
