use anchor_lang::prelude::*;
use repu_chain::evidence::{event_hash, receipt_hash};
fn hex(bytes: [u8; 32]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
#[test]
fn receipt_matches_independent_node_sha256_vector() {
    assert_eq!(
        hex(receipt_hash(
            &Pubkey::new_from_array([1; 32]),
            &Pubkey::new_from_array([2; 32]),
            &[3; 16],
            &[4; 32],
            &Pubkey::new_from_array([5; 32])
        )),
        "bc89a3bc694d4a3d3b63d8c37690e05c947b3b872c01c37045976c4bb0e937a5"
    );
}
#[test]
fn movement_matches_independent_node_sha256_vector() {
    assert_eq!(
        hex(event_hash(
            &Pubkey::new_from_array([2; 32]),
            &[6; 16],
            258,
            0,
            &[7; 32],
            &[8; 32],
            &Pubkey::new_from_array([5; 32]),
            &Pubkey::new_from_array([9; 32]),
            &Pubkey::new_from_array([9; 32])
        )),
        "834455c9ab7e11242a9edd2f917501af1cc1c4682653e98a40f6b73e2875f698"
    );
}
#[test]
fn custody_matches_independent_node_sha256_vector() {
    assert_eq!(
        hex(event_hash(
            &Pubkey::new_from_array([2; 32]),
            &[6; 16],
            258,
            1,
            &[7; 32],
            &[8; 32],
            &Pubkey::new_from_array([5; 32]),
            &Pubkey::new_from_array([9; 32]),
            &Pubkey::new_from_array([10; 32])
        )),
        "9deae620881fb868b60439a3b871d97f4bab993e2b5a5a16270226224129a1a5"
    );
}
