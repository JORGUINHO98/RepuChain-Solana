use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(batch_id: [u8; 16])]
pub struct RegisterBatch<'info> {
    #[account(seeds = [COMPANY, company.authority.as_ref(), &company.external_id], bump = company.bump)]
    pub company: Account<'info, Company>,
    #[account(has_one = company, seeds = [OPERATOR, company.key().as_ref(), actor.key().as_ref()], bump = operator.bump,
        constraint = operator.wallet == actor.key() @ RepuError::Unauthorized,
        constraint = operator.active @ RepuError::OperatorRevoked)]
    pub operator: Account<'info, Operator>,
    #[account(init, payer = actor, space = 8 + Batch::INIT_SPACE,
        seeds = [BATCH, company.key().as_ref(), &batch_id], bump)]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub actor: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn register_batch_handler(
    ctx: Context<RegisterBatch>,
    batch_id: [u8; 16],
    receipt_payload_hash: [u8; 32],
) -> Result<()> {
    require!(
        batch_id != [0; 16] && receipt_payload_hash != [0; 32],
        RepuError::InvalidIdentifier
    );
    let hash = crate::evidence::receipt_hash(
        &ctx.accounts.company.key(),
        &ctx.accounts.batch.key(),
        &batch_id,
        &receipt_payload_hash,
        &ctx.accounts.actor.key(),
    );
    ctx.accounts.batch.set_inner(Batch {
        company: ctx.accounts.company.key(),
        external_id: batch_id,
        receipt_payload_hash,
        receipt_hash: hash,
        head_hash: hash,
        custodian: ctx.accounts.actor.key(),
        last_movement: Pubkey::default(),
        sequence: 0,
        created_at: Clock::get()?.unix_timestamp,
        bump: ctx.bumps.batch,
    });
    emit!(crate::events::BatchRegistered {
        company: ctx.accounts.company.key(),
        batch: ctx.accounts.batch.key(),
        receipt_hash: hash
    });
    Ok(())
}
