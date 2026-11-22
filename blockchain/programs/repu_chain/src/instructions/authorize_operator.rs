use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct AuthorizeOperator<'info> {
    #[account(has_one = authority @ RepuError::Unauthorized,
        seeds = [COMPANY, authority.key().as_ref(), &company.external_id], bump = company.bump)]
    pub company: Account<'info, Company>,
    #[account(init_if_needed, payer = authority, space = 8 + Operator::INIT_SPACE,
        seeds = [OPERATOR, company.key().as_ref(), wallet.as_ref()], bump)]
    pub operator: Account<'info, Operator>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn authorize_operator_handler(ctx: Context<AuthorizeOperator>, wallet: Pubkey) -> Result<()> {
    require!(wallet != Pubkey::default(), RepuError::InvalidIdentifier);
    ctx.accounts.operator.set_inner(Operator {
        company: ctx.accounts.company.key(),
        wallet,
        active: true,
        bump: ctx.bumps.operator,
    });
    emit!(crate::events::OperatorChanged {
        company: ctx.accounts.company.key(),
        wallet,
        active: true
    });
    Ok(())
}
