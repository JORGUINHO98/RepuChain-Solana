use crate::{constants::*, errors::RepuError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(company_id: [u8; 16])]
pub struct InitializeCompany<'info> {
    #[account(init, payer = authority, space = 8 + Company::INIT_SPACE,
        seeds = [COMPANY, authority.key().as_ref(), &company_id], bump)]
    pub company: Account<'info, Company>,
    #[account(init, payer = authority, space = 8 + Operator::INIT_SPACE,
        seeds = [OPERATOR, company.key().as_ref(), authority.key().as_ref()], bump)]
    pub operator: Account<'info, Operator>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn initialize_company_handler(
    ctx: Context<InitializeCompany>,
    company_id: [u8; 16],
) -> Result<()> {
    require!(company_id != [0; 16], RepuError::InvalidIdentifier);
    ctx.accounts.company.set_inner(Company {
        authority: ctx.accounts.authority.key(),
        external_id: company_id,
        created_at: Clock::get()?.unix_timestamp,
        bump: ctx.bumps.company,
    });
    ctx.accounts.operator.set_inner(Operator {
        company: ctx.accounts.company.key(),
        wallet: ctx.accounts.authority.key(),
        active: true,
        bump: ctx.bumps.operator,
    });
    Ok(())
}
