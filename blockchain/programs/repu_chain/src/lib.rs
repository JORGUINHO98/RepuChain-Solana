#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
pub mod constants;
pub mod errors;
pub mod events;
pub mod evidence;
pub mod instructions;
pub mod state;
pub use instructions::*;

declare_id!("3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv");

#[program]
pub mod repu_chain {
    use super::*;
    pub fn initialize_company(ctx: Context<InitializeCompany>, company_id: [u8; 16]) -> Result<()> {
        instructions::initialize_company::initialize_company_handler(ctx, company_id)
    }
    pub fn authorize_operator(ctx: Context<AuthorizeOperator>, wallet: Pubkey) -> Result<()> {
        instructions::authorize_operator::authorize_operator_handler(ctx, wallet)
    }
    pub fn revoke_operator(ctx: Context<RevokeOperator>, wallet: Pubkey) -> Result<()> {
        instructions::revoke_operator::revoke_operator_handler(ctx, wallet)
    }
    pub fn register_batch(
        ctx: Context<RegisterBatch>,
        batch_id: [u8; 16],
        receipt_payload_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_batch::register_batch_handler(ctx, batch_id, receipt_payload_hash)
    }
    pub fn record_movement(
        ctx: Context<RecordMovement>,
        event_id: [u8; 16],
        sequence: u64,
        payload_hash: [u8; 32],
        previous_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_movement::record_movement_handler(
            ctx,
            event_id,
            sequence,
            payload_hash,
            previous_hash,
        )
    }
    pub fn transfer_custody(
        ctx: Context<TransferCustody>,
        event_id: [u8; 16],
        sequence: u64,
        payload_hash: [u8; 32],
        previous_hash: [u8; 32],
    ) -> Result<()> {
        instructions::transfer_custody::transfer_custody_handler(
            ctx,
            event_id,
            sequence,
            payload_hash,
            previous_hash,
        )
    }
    pub fn verify_batch(
        ctx: Context<VerifyBatch>,
        receipt_payload_hash: [u8; 32],
        head_hash: [u8; 32],
        sequence: u64,
    ) -> Result<()> {
        instructions::verify_batch::verify_batch_handler(
            ctx,
            receipt_payload_hash,
            head_hash,
            sequence,
        )
    }
}
