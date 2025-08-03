#[allow(unexpected_cfgs)]
pub mod states;
pub mod error;

use anchor_lang::prelude::*;

declare_id!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");

pub mod admin {
    use super::{pubkey, Pubkey};
    #[cfg(feature = "devnet")]
    // The ID of the admin program on devnet.
    pub const ID: Pubkey = pubkey!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");
    // The ID of the admin program on mainnet.
    #[cfg(not(feature = "devnet"))]
    pub const ID: Pubkey = pubkey!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");
}

#[program]
pub mod tokenized_vaults_program {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
      
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
