use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct VerifyBatch<'info> {
    #[account(seeds = [COMPANY, company.authority.as_ref(), &company.external_id], bump = company.bump)]
    pub company: Account<'info, Company>,
    #[account(has_one = company, seeds = [BATCH, company.key().as_ref(), &batch.external_id], bump = batch.bump)]
    pub batch: Account<'info, Batch>,
}
pub fn verify_batch_handler(
    ctx: Context<VerifyBatch>,
    receipt_payload_hash: [u8; 32],
    head_hash: [u8; 32],
    sequence: u64,
) -> Result<()> {
    require!(
        ctx.accounts.batch.receipt_payload_hash == receipt_payload_hash
            && ctx.accounts.batch.head_hash == head_hash,
        RepuError::HashMismatch
    );
    require_eq!(
        ctx.accounts.batch.sequence,
        sequence,
        RepuError::SequenceMismatch
    );
    emit!(crate::events::BatchVerified {
        batch: ctx.accounts.batch.key(),
        sequence,
        head_hash
    });
    Ok(())
}
