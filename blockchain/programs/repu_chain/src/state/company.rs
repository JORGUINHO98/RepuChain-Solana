use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Company {
    pub authority: Pubkey,
    pub external_id: [u8; 16],
    pub created_at: i64,
    pub bump: u8,
}
