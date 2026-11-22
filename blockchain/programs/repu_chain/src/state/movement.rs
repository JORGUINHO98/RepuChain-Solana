use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Movement {
    pub company: Pubkey,
    pub batch: Pubkey,
    pub event_id: [u8; 16],
    pub payload_hash: [u8; 32],
    pub previous_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub previous_movement: Pubkey,
    pub sequence: u64,
    pub actor: Pubkey,
    pub from_custodian: Pubkey,
    pub to_custodian: Pubkey,
    pub kind: u8,
    pub recorded_at: i64,
    pub bump: u8,
}
