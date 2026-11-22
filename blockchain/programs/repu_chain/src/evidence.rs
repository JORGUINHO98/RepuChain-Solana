use crate::{
    constants::*,
    errors::RepuError,
    events::EvidenceRecorded,
    state::{Batch, Movement},
};
use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

pub fn receipt_hash(
    company: &Pubkey,
    batch: &Pubkey,
    id: &[u8; 16],
    payload: &[u8; 32],
    actor: &Pubkey,
) -> [u8; 32] {
    hashv(&[
        RECEIPT_DOMAIN,
        company.as_ref(),
        batch.as_ref(),
        id,
        payload,
        actor.as_ref(),
    ])
    .to_bytes()
}
pub fn event_hash(
    batch: &Pubkey,
    event_id: &[u8; 16],
    sequence: u64,
    kind: u8,
    payload: &[u8; 32],
    previous: &[u8; 32],
    actor: &Pubkey,
    from: &Pubkey,
    to: &Pubkey,
) -> [u8; 32] {
    hashv(&[
        EVENT_DOMAIN,
        batch.as_ref(),
        event_id,
        &sequence.to_le_bytes(),
        &[kind],
        payload,
        previous,
        actor.as_ref(),
        from.as_ref(),
        to.as_ref(),
    ])
    .to_bytes()
}
pub fn append(
    batch: &mut Account<Batch>,
    movement: &mut Account<Movement>,
    actor: Pubkey,
    recipient: Pubkey,
    kind: u8,
    event_id: [u8; 16],
    sequence: u64,
    payload_hash: [u8; 32],
    previous_hash: [u8; 32],
    bump: u8,
) -> Result<()> {
    require!(
        event_id != [0; 16] && payload_hash != [0; 32],
        RepuError::InvalidIdentifier
    );
    require_eq!(
        sequence,
        batch.sequence.checked_add(1).ok_or(RepuError::Overflow)?,
        RepuError::SequenceMismatch
    );
    require!(previous_hash == batch.head_hash, RepuError::HashMismatch);
    let batch_key = batch.key();
    let from = batch.custodian;
    let hash = event_hash(
        &batch_key,
        &event_id,
        sequence,
        kind,
        &payload_hash,
        &previous_hash,
        &actor,
        &from,
        &recipient,
    );
    movement.set_inner(Movement {
        company: batch.company,
        batch: batch_key,
        event_id,
        payload_hash,
        previous_hash,
        evidence_hash: hash,
        previous_movement: batch.last_movement,
        sequence,
        actor,
        from_custodian: from,
        to_custodian: recipient,
        kind,
        recorded_at: Clock::get()?.unix_timestamp,
        bump,
    });
    batch.head_hash = hash;
    batch.sequence = sequence;
    batch.last_movement = movement.key();
    batch.custodian = recipient;
    emit!(EvidenceRecorded {
        batch: batch_key,
        movement: movement.key(),
        sequence,
        evidence_hash: hash,
        kind
    });
    Ok(())
}
