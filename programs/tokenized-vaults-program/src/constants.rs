use anchor_lang::prelude::*;

/// Scale: 1% = 10_000 bps → 100% = 1_000_000
pub const BPS: u32 = 10_000;

/// Low fee for transaction: 10%
pub const LOW_FEES: u32 = 0; // 0

/// High fee for transaction: 10%
pub const HIGH_FEES: u32 = 10u32 * BPS; // 100_000

/// High performance fee: 100%
pub const HIGH_PERFORMANCE_FEE: u32 = 100u32 * BPS; // 1_000_000

/// Low performance fee: 10%
pub const LOW_PERFORMANCE_FEE: u32 = 10u32 * BPS; // 100_000

/// USDC mint address - conditional based on network
/// Devnet: Test token that can be minted for testing (We can change this to anything we want to send to our wallets)
/// Mainnet: Official USDC token (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
#[cfg(feature = "devnet")]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC-Dev on devnet

#[cfg(not(feature = "devnet"))]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC on mainnet

/// Maximum number of strategies per vault
pub const MAX_NUM_STRATEGIES: u8 = 3;

/// Max performance fee: 100%
pub const MAX_PERCENTAGE: u32 = 100u32 * BPS; // 1_000_000

/// Min performance fee: 10%
pub const MIN_PERCENTAGE: u32 = 10u32 * BPS; // 100_000


pub const DISC_INIT_PROTOCOL_CONFIG_IX: &[u8] = &[0]; 
pub const DISC_PAUSE_PROTOCOL_IX: &[u8] = &[1]; 
pub const DISC_UNPAUSE_PROTOCOL_IX: &[u8] = &[2]; 
pub const DISC_INIT_VAULT_STRATEGY_CONFIG_IX: &[u8] = &[3]; 
pub const DISC_CREATE_RAYDIUM_VAULT_STRATEGY_IX: &[u8] = &[4]; 
pub const DISC_INIT_INVESTOR_ESCROW_IX: &[u8] = &[5]; 
pub const DISC_DEPOSIT_TO_ESCROW_IX: &[u8] = &[6]; 
pub const DISC_WITHDRAW_FROM_ESCROW_IX: &[u8] = &[7]; 
