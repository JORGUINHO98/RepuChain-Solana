use anchor_lang::solana_program::{instruction::Instruction, system_program};
use anchor_lang::{prelude::*, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use repu_chain::{constants::*, state::Batch};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

pub fn company(authority: Pubkey, id: [u8; 16]) -> Pubkey {
    Pubkey::find_program_address(&[COMPANY, authority.as_ref(), &id], &repu_chain::ID).0
}
pub fn operator(company: Pubkey, wallet: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[OPERATOR, company.as_ref(), wallet.as_ref()],
        &repu_chain::ID,
    )
    .0
}
pub fn batch(company: Pubkey, id: [u8; 16]) -> Pubkey {
    Pubkey::find_program_address(&[BATCH, company.as_ref(), &id], &repu_chain::ID).0
}
pub fn movement(batch: Pubkey, id: [u8; 16]) -> Pubkey {
    Pubkey::find_program_address(&[MOVEMENT, batch.as_ref(), &id], &repu_chain::ID).0
}
fn ix(accounts: impl ToAccountMetas, data: impl InstructionData) -> Instruction {
    Instruction {
        program_id: repu_chain::ID,
        accounts: accounts.to_account_metas(None),
        data: data.data(),
    }
}
pub fn initialize(authority: Pubkey, id: [u8; 16]) -> Instruction {
    let company = company(authority, id);
    ix(
        repu_chain::accounts::InitializeCompany {
            company,
            operator: operator(company, authority),
            authority,
            system_program: system_program::ID,
        },
        repu_chain::instruction::InitializeCompany { company_id: id },
    )
}
pub fn authorize(company: Pubkey, authority: Pubkey, wallet: Pubkey) -> Instruction {
    ix(
        repu_chain::accounts::AuthorizeOperator {
            company,
            operator: operator(company, wallet),
            authority,
            system_program: system_program::ID,
        },
        repu_chain::instruction::AuthorizeOperator { wallet },
    )
}
pub fn revoke(company: Pubkey, authority: Pubkey, wallet: Pubkey) -> Instruction {
    ix(
        repu_chain::accounts::RevokeOperator {
            company,
            operator: operator(company, wallet),
            authority,
        },
        repu_chain::instruction::RevokeOperator { wallet },
    )
}
pub fn register(company: Pubkey, actor: Pubkey, id: [u8; 16], payload: [u8; 32]) -> Instruction {
    ix(
        repu_chain::accounts::RegisterBatch {
            company,
            operator: operator(company, actor),
            batch: batch(company, id),
            actor,
            system_program: system_program::ID,
        },
        repu_chain::instruction::RegisterBatch {
            batch_id: id,
            receipt_payload_hash: payload,
        },
    )
}
pub fn record(
    company: Pubkey,
    batch: Pubkey,
    actor: Pubkey,
    event_id: [u8; 16],
    sequence: u64,
    payload: [u8; 32],
    previous: [u8; 32],
) -> Instruction {
    ix(
        repu_chain::accounts::RecordMovement {
            company,
            batch,
            operator: operator(company, actor),
            movement: movement(batch, event_id),
            actor,
            system_program: system_program::ID,
        },
        repu_chain::instruction::RecordMovement {
            event_id,
            sequence,
            payload_hash: payload,
            previous_hash: previous,
        },
    )
}
pub fn transfer(
    company: Pubkey,
    batch: Pubkey,
    actor: Pubkey,
    recipient: Pubkey,
    event_id: [u8; 16],
    sequence: u64,
    previous: [u8; 32],
) -> Instruction {
    ix(
        repu_chain::accounts::TransferCustody {
            company,
            batch,
            operator: operator(company, actor),
            recipient,
            recipient_operator: operator(company, recipient),
            movement: movement(batch, event_id),
            actor,
            system_program: system_program::ID,
        },
        repu_chain::instruction::TransferCustody {
            event_id,
            sequence,
            payload_hash: [9; 32],
            previous_hash: previous,
        },
    )
}
pub fn verify(
    company: Pubkey,
    batch: Pubkey,
    receipt: [u8; 32],
    head: [u8; 32],
    sequence: u64,
) -> Instruction {
    ix(
        repu_chain::accounts::VerifyBatch { company, batch },
        repu_chain::instruction::VerifyBatch {
            receipt_payload_hash: receipt,
            head_hash: head,
            sequence,
        },
    )
}
pub fn send(
    svm: &mut LiteSVM,
    signers: &[&Keypair],
    instruction: Instruction,
) -> litesvm::types::TransactionResult {
    svm.expire_blockhash();
    let mut tx =
        Transaction::new_unsigned(Message::new(&[instruction], Some(&signers[0].pubkey())));
    tx.partial_sign(signers, svm.latest_blockhash());
    svm.send_transaction(tx)
}
pub fn reject(svm: &mut LiteSVM, signers: &[&Keypair], instruction: Instruction, expected: &str) {
    let error = send(svm, signers, instruction)
        .expect_err("unauthorized/invalid instruction unexpectedly succeeded");
    if !expected.is_empty() {
        assert!(error.meta.logs.join("\n").contains(expected), "{:?}", error);
    }
}
pub fn read<T: AccountDeserialize>(svm: &LiteSVM, key: Pubkey) -> T {
    let account = svm.get_account(&key).expect("account missing");
    T::try_deserialize(&mut account.data.as_slice()).unwrap()
}
pub struct Fixture {
    pub svm: LiteSVM,
    pub authority: Keypair,
    pub other: Keypair,
    pub company: Pubkey,
    pub batch: Pubkey,
}
impl Fixture {
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program_from_file(
            repu_chain::ID,
            concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../../target/deploy/repu_chain.so"
            ),
        )
        .unwrap();
        let authority = Keypair::new();
        let other = Keypair::new();
        svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
        svm.airdrop(&other.pubkey(), 10_000_000_000).unwrap();
        let company = company(authority.pubkey(), [1; 16]);
        let batch = batch(company, [2; 16]);
        send(
            &mut svm,
            &[&authority],
            initialize(authority.pubkey(), [1; 16]),
        )
        .unwrap();
        send(
            &mut svm,
            &[&authority],
            authorize(company, authority.pubkey(), other.pubkey()),
        )
        .unwrap();
        send(
            &mut svm,
            &[&authority],
            register(company, authority.pubkey(), [2; 16], [3; 32]),
        )
        .unwrap();
        Self {
            svm,
            authority,
            other,
            company,
            batch,
        }
    }
    pub fn state(&self) -> Batch {
        read(&self.svm, self.batch)
    }
}
