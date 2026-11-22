mod support;
use anchor_lang::prelude::*;
use repu_chain::{
    evidence::{event_hash, receipt_hash},
    state::{Batch, Movement, Operator},
};
use solana_signer::Signer;
use support::*;

#[test]
fn initializes_real_pdas_and_receipt_hash() {
    let f = Fixture::new();
    let state = f.state();
    assert_eq!(state.company, f.company);
    assert_eq!(state.custodian, f.authority.pubkey());
    assert_eq!(state.sequence, 0);
    assert_eq!(state.last_movement, Pubkey::default());
    assert_eq!(
        state.head_hash,
        receipt_hash(
            &f.company,
            &f.batch,
            &[2; 16],
            &[3; 32],
            &f.authority.pubkey()
        )
    );
    assert_eq!(state.head_hash, state.receipt_hash);
    let account = f.svm.get_account(&f.batch).unwrap();
    assert_eq!(account.owner, repu_chain::ID);
    assert_eq!(account.data.len(), 8 + Batch::INIT_SPACE);
}

#[test]
fn records_linked_evidence_and_detects_tampering() {
    let mut f = Fixture::new();
    let first = f.state().head_hash;
    let ix = record(
        f.company,
        f.batch,
        f.other.pubkey(),
        [4; 16],
        1,
        [5; 32],
        first,
    );
    send(&mut f.svm, &[&f.other], ix).unwrap();
    let state = f.state();
    let event: Movement = read(&f.svm, movement(f.batch, [4; 16]));
    assert_eq!(event.actor, f.other.pubkey());
    assert_eq!(event.previous_hash, first);
    assert_eq!(event.previous_movement, Pubkey::default());
    assert_eq!(
        event.evidence_hash,
        event_hash(
            &f.batch,
            &[4; 16],
            1,
            0,
            &[5; 32],
            &first,
            &f.other.pubkey(),
            &f.authority.pubkey(),
            &f.authority.pubkey()
        )
    );
    assert_ne!(
        event.evidence_hash,
        event_hash(
            &f.batch,
            &[4; 16],
            1,
            0,
            &[6; 32],
            &first,
            &f.other.pubkey(),
            &f.authority.pubkey(),
            &f.authority.pubkey()
        )
    );
    assert_eq!(state.head_hash, event.evidence_hash);
    let ix = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [6; 16],
        2,
        [7; 32],
        state.head_hash,
    );
    send(&mut f.svm, &[&f.authority], ix).unwrap();
    let next: Movement = read(&f.svm, movement(f.batch, [6; 16]));
    assert_eq!(next.previous_movement, movement(f.batch, [4; 16]));
    assert_eq!(next.previous_hash, event.evidence_hash);
}

#[test]
fn rejects_wrong_hash_and_sequence_without_mutation() {
    let mut f = Fixture::new();
    let before = f.svm.get_account(&f.batch).unwrap().data;
    for (sequence, previous, error) in [
        (1, [99; 32], "HashMismatch"),
        (2, f.state().head_hash, "SequenceMismatch"),
    ] {
        let ix = record(
            f.company,
            f.batch,
            f.authority.pubkey(),
            [4; 16],
            sequence,
            [5; 32],
            previous,
        );
        reject(&mut f.svm, &[&f.authority], ix, error);
        assert_eq!(f.svm.get_account(&f.batch).unwrap().data, before);
        assert!(f.svm.get_account(&movement(f.batch, [4; 16])).is_none());
    }
}

#[test]
fn events_cannot_be_overwritten_or_reused_at_another_sequence() {
    let mut f = Fixture::new();
    let ix = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    send(&mut f.svm, &[&f.authority], ix.clone()).unwrap();
    let data = f.svm.get_account(&movement(f.batch, [4; 16])).unwrap().data;
    reject(&mut f.svm, &[&f.authority], ix, "");
    let reused = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [4; 16],
        2,
        [9; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority], reused, "");
    assert_eq!(f.state().sequence, 1);
    assert_eq!(
        f.svm.get_account(&movement(f.batch, [4; 16])).unwrap().data,
        data
    );
}

#[test]
fn batch_and_company_cannot_be_reinitialized() {
    let mut f = Fixture::new();
    let ix = initialize(f.authority.pubkey(), [1; 16]);
    reject(&mut f.svm, &[&f.authority], ix, "");
    let ix = register(f.company, f.authority.pubkey(), [2; 16], [8; 32]);
    reject(&mut f.svm, &[&f.authority], ix, "");
    assert_eq!(f.state().receipt_payload_hash, [3; 32]);
}

#[test]
fn revocation_takes_effect_and_only_authority_can_restore_operator() {
    let mut f = Fixture::new();
    let ix = revoke(f.company, f.authority.pubkey(), f.other.pubkey());
    send(&mut f.svm, &[&f.authority], ix).unwrap();
    let state: Operator = read(&f.svm, operator(f.company, f.other.pubkey()));
    assert!(!state.active);
    let ix = record(
        f.company,
        f.batch,
        f.other.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.other], ix, "OperatorRevoked");
    let ix = authorize(f.company, f.other.pubkey(), f.other.pubkey());
    reject(&mut f.svm, &[&f.other], ix, "");
    let ix = authorize(f.company, f.authority.pubkey(), f.other.pubkey());
    send(&mut f.svm, &[&f.authority], ix).unwrap();
    let ix = record(
        f.company,
        f.batch,
        f.other.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    send(&mut f.svm, &[&f.other], ix).unwrap();
    assert_eq!(f.state().sequence, 1);
}

#[test]
fn authority_cannot_revoke_itself() {
    let mut f = Fixture::new();
    let ix = revoke(f.company, f.authority.pubkey(), f.authority.pubkey());
    reject(&mut f.svm, &[&f.authority], ix, "AuthorityRevocation");
}

#[test]
fn transfer_requires_two_signatures_and_updates_custody_in_the_chain() {
    let mut f = Fixture::new();
    let previous = f.state().head_hash;
    let ix = transfer(
        f.company,
        f.batch,
        f.authority.pubkey(),
        f.other.pubkey(),
        [4; 16],
        1,
        previous,
    );
    reject(&mut f.svm, &[&f.authority], ix.clone(), "");
    assert_eq!(f.state().sequence, 0);
    send(&mut f.svm, &[&f.authority, &f.other], ix).unwrap();
    assert_eq!(f.state().custodian, f.other.pubkey());
    let event: Movement = read(&f.svm, movement(f.batch, [4; 16]));
    assert_eq!(event.kind, 1);
    assert_eq!(event.from_custodian, f.authority.pubkey());
    assert_eq!(event.to_custodian, f.other.pubkey());
    assert_eq!(
        event.evidence_hash,
        event_hash(
            &f.batch,
            &[4; 16],
            1,
            1,
            &[9; 32],
            &previous,
            &f.authority.pubkey(),
            &f.authority.pubkey(),
            &f.other.pubkey()
        )
    );
}

#[test]
fn former_custodian_cannot_transfer_again() {
    let mut f = Fixture::new();
    let ix = transfer(
        f.company,
        f.batch,
        f.authority.pubkey(),
        f.other.pubkey(),
        [4; 16],
        1,
        f.state().head_hash,
    );
    send(&mut f.svm, &[&f.authority, &f.other], ix).unwrap();
    let ix = transfer(
        f.company,
        f.batch,
        f.authority.pubkey(),
        f.other.pubkey(),
        [5; 16],
        2,
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority, &f.other], ix, "CustodyMismatch");
    assert_eq!(f.state().sequence, 1);
}

#[test]
fn revoked_recipient_cannot_accept_custody() {
    let mut f = Fixture::new();
    let ix = revoke(f.company, f.authority.pubkey(), f.other.pubkey());
    send(&mut f.svm, &[&f.authority], ix).unwrap();
    let ix = transfer(
        f.company,
        f.batch,
        f.authority.pubkey(),
        f.other.pubkey(),
        [4; 16],
        1,
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority, &f.other], ix, "OperatorRevoked");
}

#[test]
fn verification_is_read_only_and_rejects_altered_expectations() {
    let mut f = Fixture::new();
    let state = f.state();
    let before = f.svm.get_account(&f.batch).unwrap().data;
    let ix = verify(f.company, f.batch, [3; 32], state.head_hash, 0);
    send(&mut f.svm, &[&f.other], ix).unwrap();
    let ix = verify(f.company, f.batch, [9; 32], state.head_hash, 0);
    reject(&mut f.svm, &[&f.other], ix, "HashMismatch");
    let ix = verify(f.company, f.batch, [3; 32], state.head_hash, 1);
    reject(&mut f.svm, &[&f.other], ix, "SequenceMismatch");
    assert_eq!(f.svm.get_account(&f.batch).unwrap().data, before);
}

#[test]
fn cross_company_accounts_are_rejected() {
    let mut f = Fixture::new();
    let other_company = company(f.other.pubkey(), [7; 16]);
    send(
        &mut f.svm,
        &[&f.other],
        initialize(f.other.pubkey(), [7; 16]),
    )
    .unwrap();
    let ix = record(
        other_company,
        f.batch,
        f.other.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.other], ix, "");
    let ix = verify(other_company, f.batch, [3; 32], f.state().head_hash, 0);
    reject(&mut f.svm, &[&f.other], ix, "");
    assert_eq!(f.state().sequence, 0);
}

#[test]
fn zero_ids_and_hashes_are_rejected() {
    let mut f = Fixture::new();
    let ix = register(f.company, f.authority.pubkey(), [0; 16], [3; 32]);
    reject(&mut f.svm, &[&f.authority], ix, "InvalidIdentifier");
    let ix = register(f.company, f.authority.pubkey(), [9; 16], [0; 32]);
    reject(&mut f.svm, &[&f.authority], ix, "InvalidIdentifier");
    let ix = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [0; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority], ix, "InvalidIdentifier");
    let ix = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [4; 16],
        1,
        [0; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority], ix, "InvalidIdentifier");
    assert_eq!(f.state().sequence, 0);
}

#[test]
fn stale_concurrent_event_is_rejected_then_can_retry_with_new_head() {
    let mut f = Fixture::new();
    let old_head = f.state().head_hash;
    let a = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [4; 16],
        1,
        [5; 32],
        old_head,
    );
    let b = record(
        f.company,
        f.batch,
        f.other.pubkey(),
        [6; 16],
        1,
        [7; 32],
        old_head,
    );
    send(&mut f.svm, &[&f.authority], a).unwrap();
    reject(&mut f.svm, &[&f.other], b, "SequenceMismatch");
    let retry = record(
        f.company,
        f.batch,
        f.other.pubkey(),
        [6; 16],
        2,
        [7; 32],
        f.state().head_hash,
    );
    send(&mut f.svm, &[&f.other], retry).unwrap();
    assert_eq!(f.state().sequence, 2);
}

#[test]
fn actor_must_sign_even_when_another_operator_pays_fees() {
    let mut f = Fixture::new();
    let mut ix = record(
        f.company,
        f.batch,
        f.authority.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    for account in &mut ix.accounts {
        if account.pubkey == f.authority.pubkey() {
            account.is_signer = false;
        }
    }
    reject(&mut f.svm, &[&f.other], ix, "AccountNotSigner");
    assert_eq!(f.state().sequence, 0);
}
#[test]
fn unregistered_wallet_cannot_create_evidence() {
    let mut f = Fixture::new();
    let outsider = solana_keypair::Keypair::new();
    f.svm.airdrop(&outsider.pubkey(), 1_000_000_000).unwrap();
    let ix = record(
        f.company,
        f.batch,
        outsider.pubkey(),
        [4; 16],
        1,
        [5; 32],
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&outsider], ix, "AccountNotInitialized");
    assert_eq!(f.state().sequence, 0);
}
#[test]
fn cannot_transfer_custody_to_same_wallet() {
    let mut f = Fixture::new();
    let ix = transfer(
        f.company,
        f.batch,
        f.authority.pubkey(),
        f.authority.pubkey(),
        [4; 16],
        1,
        f.state().head_hash,
    );
    reject(&mut f.svm, &[&f.authority], ix, "SameCustodian");
    assert_eq!(f.state().sequence, 0);
}
