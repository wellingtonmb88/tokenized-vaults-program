use anchor_lang::prelude::*;

declare_id!("63JRAaqV5J7RZ2muRqfhBoNyadtLSChKenKZqjvt4gyL");

#[program]
pub mod tokenized_vaults_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
