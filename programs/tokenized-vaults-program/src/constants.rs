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
