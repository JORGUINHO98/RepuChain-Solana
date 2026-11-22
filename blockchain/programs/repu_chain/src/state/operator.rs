use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Operator {
    pub company: Pubkey,
    pub wallet: Pubkey,
    pub active: bool,
    pub bump: u8,
}
