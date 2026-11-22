use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Batch {
    pub company: Pubkey,
    pub external_id: [u8; 16],
    pub receipt_payload_hash: [u8; 32],
    pub receipt_hash: [u8; 32],
    pub head_hash: [u8; 32],
    pub custodian: Pubkey,
    pub last_movement: Pubkey,
    pub sequence: u64,
    pub created_at: i64,
    pub bump: u8,
}
