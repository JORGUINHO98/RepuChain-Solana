use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(event_id: [u8; 16])]
pub struct RecordMovement<'info> {
    #[account(seeds = [COMPANY, company.authority.as_ref(), &company.external_id], bump = company.bump)]
    pub company: Account<'info, Company>,
    #[account(mut, has_one = company, seeds = [BATCH, company.key().as_ref(), &batch.external_id], bump = batch.bump)]
    pub batch: Account<'info, Batch>,
    #[account(has_one = company, seeds = [OPERATOR, company.key().as_ref(), actor.key().as_ref()], bump = operator.bump,
        constraint = operator.wallet == actor.key() @ RepuError::Unauthorized,
        constraint = operator.active @ RepuError::OperatorRevoked)]
    pub operator: Account<'info, Operator>,
    #[account(init, payer = actor, space = 8 + Movement::INIT_SPACE,
        seeds = [MOVEMENT, batch.key().as_ref(), &event_id], bump)]
    pub movement: Account<'info, Movement>,
    #[account(mut)]
    pub actor: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn record_movement_handler(
    ctx: Context<RecordMovement>,
    event_id: [u8; 16],
    sequence: u64,
    payload_hash: [u8; 32],
    previous_hash: [u8; 32],
) -> Result<()> {
    let custodian = ctx.accounts.batch.custodian;
    crate::evidence::append(
        &mut ctx.accounts.batch,
        &mut ctx.accounts.movement,
        ctx.accounts.actor.key(),
        custodian,
        RECORD,
        event_id,
        sequence,
        payload_hash,
        previous_hash,
        ctx.bumps.movement,
    )
}
