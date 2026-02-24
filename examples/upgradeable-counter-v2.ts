// Upgradeable Counter V2 - Casper 2.0 (casper-contract 5.0 + casper-types 6.0)
// This is the UPGRADE template - requires V1 to be deployed first!
export const upgradeableCounterV2 = {
    'Cargo.toml': `[package]
name = "upgradeable_counter_v2"
version = "2.0.0"
edition = "2021"

[dependencies]
casper-contract = "5.0"
casper-types = "6.0"

[profile.release]
lto = true
codegen-units = 1
opt-level = "z"

[lib]
crate-type = ["cdylib"]`,

    'src/main.rs': `#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    contracts::{EntryPoint, EntryPoints, NamedKeys, ContractPackageHash},
    EntryPointAccess, EntryPointType, CLType, URef,
};

const COUNTER_KEY: &str = "counter";
const PACKAGE_HASH_KEY: &str = "counter_package";
const ACCESS_UREF_KEY: &str = "counter_access_uref";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

    // V1 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("get_count"),
        vec![],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    // NEW V2 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("decrement"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("reset"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points
}

#[no_mangle]
pub extern "C" fn increment() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    storage::write(counter_uref, current + 1);
}

#[no_mangle]
pub extern "C" fn get_count() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let count: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    runtime::ret(casper_types::CLValue::from_t(count).unwrap_or_revert());
}

// NEW in V2
#[no_mangle]
pub extern "C" fn decrement() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    if current > 0 {
        storage::write(counter_uref, current - 1);
    }
}

// NEW in V2
#[no_mangle]
pub extern "C" fn reset() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(counter_uref, 0u64);
}

/// Upgrade the contract - adds V2 to existing package
#[no_mangle]
pub extern "C" fn call() {
    // Get the existing package hash from account named keys
    // Note: into_hash_addr() replaces into_hash() in casper-types 6.0
    let package_hash: ContractPackageHash = runtime::get_key(PACKAGE_HASH_KEY)
        .unwrap_or_revert()
        .into_hash_addr()
        .map(ContractPackageHash::new)
        .unwrap_or_revert();

    // Get the access URef (required for upgrade permission)
    let _access_uref: URef = runtime::get_key(ACCESS_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    // V2 entry points (includes new decrement and reset)
    let entry_points = get_entry_points();

    // Keep existing named keys (counter value preserved!)
    let named_keys = NamedKeys::new();

    // Add new version to existing package
    // add_contract_version in 5.0 requires 4 arguments!
    let (contract_hash, contract_version) = storage::add_contract_version(
        package_hash,
        entry_points.into(),
        named_keys.into(),
        Default::default(),  // message_topics
    );

    // Store the V2 contract hash
    runtime::put_key("counter_contract_v2", contract_hash.into());
    
    // Store version number
    let version_uref = storage::new_uref(contract_version);
    runtime::put_key("counter_version", version_uref.into());
}`,

    'README.md': `# Upgradeable Counter V2 (Casper 2.0)

## ⚠️ IMPORTANT: Deploy V1 First!

This is an **UPGRADE** template. You must:
1. Deploy V1 first using "Fresh Deploy"
2. Then deploy V2 using "Upgrade Contract" mode with the package hash from V1

## New Features in V2
- \`decrement\` - Subtract 1 from counter
- \`reset\` - Reset counter to 0

## Upgrade Steps
1. Get your \`counter_package\` hash from V1 deployment (check named keys on explorer)
2. Select "Upgrade Contract" mode in Deploy Panel
3. Enter the package hash
4. Deploy with 200 CSPR

## After Upgrade
- Counter value is preserved!
- New entry points are available
- V1 still accessible at old contract hash
`
};
