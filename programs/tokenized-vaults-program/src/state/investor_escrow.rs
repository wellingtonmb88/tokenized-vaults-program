use anchor_lang::prelude::*;

#[derive(Default, Debug, InitSpace)]
#[account(discriminator = 3)]
pub struct InvestorEscrow {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl InvestorEscrow {
    pub const SEED: &'static str = "investor_escrow:";
    pub const VAULT_SEED: &'static str = "escrow_vault";

    pub fn initialize(&mut self, authority: Pubkey, mint: Pubkey, bump: u8) -> Result<()> {
        self.authority = authority;
        self.mint = mint;
        self.amount = 0;
        self.bump = bump;

        Ok(())
    }

    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        self.amount = self
            .amount
            .checked_add(amount)
            .ok_or(crate::error::TokenizedVaultsErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn process_deposit(&mut self, amount: u64, investor_balance: u64) -> Result<()> {
        require!(
            amount > 0,
            crate::error::TokenizedVaultsErrorCode::InvalidAmount
        );

        require!(
            investor_balance >= amount,
            crate::error::TokenizedVaultsErrorCode::InsufficientFunds
        );

        self.deposit(amount)?;

        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        require!(
            self.amount >= amount,
            crate::error::TokenizedVaultsErrorCode::InsufficientFunds
        );
        self.amount = self
            .amount
            .checked_sub(amount)
            .ok_or(crate::error::TokenizedVaultsErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn process_withdraw(&mut self, amount: u64, vault_balance: u64) -> Result<()> {
        require!(
            amount > 0,
            crate::error::TokenizedVaultsErrorCode::InvalidAmount
        );

        require!(
            self.amount >= amount,
            crate::error::TokenizedVaultsErrorCode::InsufficientFunds
        );

        require!(
            vault_balance >= amount,
            crate::error::TokenizedVaultsErrorCode::InsufficientFunds
        );

        self.withdraw(amount)?;

        Ok(())
    }
}
