use anchor_lang::prelude::*;

pub const INVESTOR_ESCROW_SEED: &str = "investor_escrow:";

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = 3)]
pub struct InvestorEscrow {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl InvestorEscrow {
    pub fn initialize(
        &mut self,
        authority: Pubkey,
        mint: Pubkey,
        bump: u8,
    ) -> Result<()> {
        self.authority = authority;
        self.mint = mint;
        self.amount = 0;
        self.bump = bump;
        Ok(())
    }

    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        self.amount = self.amount.checked_add(amount)
            .ok_or(crate::error::TokenizedVaultsErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        require!(
            self.amount >= amount,
            crate::error::TokenizedVaultsErrorCode::InsufficientFunds
        );
        self.amount = self.amount.checked_sub(amount)
            .ok_or(crate::error::TokenizedVaultsErrorCode::MathOverflow)?;
        Ok(())
    }
}