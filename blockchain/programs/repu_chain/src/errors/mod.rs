use anchor_lang::prelude::*;
#[error_code]
pub enum RepuError {
    #[msg("The signer is not authorized for this company")]
    Unauthorized,
    #[msg("The operator has been revoked")]
    OperatorRevoked,
    #[msg("Identifiers and payload hashes must not be zero")]
    InvalidIdentifier,
    #[msg("The event sequence is not the next sequence")]
    SequenceMismatch,
    #[msg("The expected hash does not match the stored evidence")]
    HashMismatch,
    #[msg("The current custodian must authorize this transfer")]
    CustodyMismatch,
    #[msg("The recipient must differ from the current custodian")]
    SameCustodian,
    #[msg("Sequence overflow")]
    Overflow,
    #[msg("The company authority cannot revoke its own operator account")]
    AuthorityRevocation,
}
