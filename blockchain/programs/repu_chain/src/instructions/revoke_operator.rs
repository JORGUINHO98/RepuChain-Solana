use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct RevokeOperator<'info> {
    #[account(has_one = authority @ RepuError::Unauthorized,
        seeds = [COMPANY, authority.key().as_ref(), &company.external_id], bump = company.bump)]
    pub company: Account<'info, Company>,
    #[account(mut, has_one = company, seeds = [OPERATOR, company.key().as_ref(), wallet.as_ref()], bump = operator.bump)]
    pub operator: Account<'info, Operator>,
    pub authority: Signer<'info>,
}
pub fn revoke_operator_handler(ctx: Context<RevokeOperator>, wallet: Pubkey) -> Result<()> {
    require_keys_neq!(
        wallet,
        ctx.accounts.authority.key(),
        RepuError::AuthorityRevocation
    );
    ctx.accounts.operator.active = false;
    emit!(crate::events::OperatorChanged {
        company: ctx.accounts.company.key(),
        wallet,
        active: false
    });
    Ok(())
}
