use anchor_lang::prelude::*;
#[event]
pub struct BatchRegistered {
    pub company: Pubkey,
    pub batch: Pubkey,
    pub receipt_hash: [u8; 32],
}
#[event]
pub struct EvidenceRecorded {
    pub batch: Pubkey,
    pub movement: Pubkey,
    pub sequence: u64,
    pub evidence_hash: [u8; 32],
    pub kind: u8,
}
#[event]
pub struct OperatorChanged {
    pub company: Pubkey,
    pub wallet: Pubkey,
    pub active: bool,
}
#[event]
pub struct BatchVerified {
    pub batch: Pubkey,
    pub sequence: u64,
    pub head_hash: [u8; 32],
}
