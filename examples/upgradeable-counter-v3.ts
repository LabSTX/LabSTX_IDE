// Upgradeable Counter V3 - Casper 2.0 (casper-contract 5.0 + casper-types 6.0)
// This adds even more features: set_value and multiply
export const upgradeableCounterV3 = {
    'Cargo.toml': `[package]
name = "upgradeable_counter_v3"
version = "3.0.0"
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
    EntryPointAccess, EntryPointType, CLType, URef, Parameter,
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

    // V2 entry points
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

    // NEW V3 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("set_value"),
        vec![Parameter::new("value", CLType::U64)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("multiply"),
        vec![Parameter::new("factor", CLType::U64)],
        CLType::U64,
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

#[no_mangle]
pub extern "C" fn reset() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(counter_uref, 0u64);
}

// NEW in V3: Set counter to specific value
#[no_mangle]
pub extern "C" fn set_value() {
    let value: u64 = runtime::get_named_arg("value");
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(counter_uref, value);
}

// NEW in V3: Multiply counter by factor
#[no_mangle]
pub extern "C" fn multiply() {
    let factor: u64 = runtime::get_named_arg("factor");
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    let result = current.saturating_mul(factor);
    storage::write(counter_uref, result);
    runtime::ret(casper_types::CLValue::from_t(result).unwrap_or_revert());
}

/// Upgrade the contract - adds V3 to existing package
#[no_mangle]
pub extern "C" fn call() {
    // Get the existing package hash from account named keys
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

    // V3 entry points (includes all previous + new set_value and multiply)
    let entry_points = get_entry_points();

    // Keep existing named keys (counter value preserved!)
    let named_keys = NamedKeys::new();

    // Add new version to existing package
    let (contract_hash, contract_version) = storage::add_contract_version(
        package_hash,
        entry_points.into(),
        named_keys.into(),
        Default::default(),
    );

    // Store the V3 contract hash
    runtime::put_key("counter_contract_v3", contract_hash.into());
    
    // Update version number
    let version_uref = storage::new_uref(contract_version);
    runtime::put_key("counter_version", version_uref.into());
}`,

    'README.md': `# Upgradeable Counter V3 (Casper 2.0)

## ⚠️ IMPORTANT: Deploy V1 and V2 First!

This is an **UPGRADE** template. You must have V1 and V2 already deployed.

## New Features in V3

| Entry Point | Parameters | Description |
|-------------|-----------|-------------|
| \`set_value\` | \`value: U64\` | Set counter to specific value |
| \`multiply\` | \`factor: U64\` | Multiply counter by factor |

## All Entry Points

| Version | Entry Points |
|---------|-------------|
| V1 | increment, get_count |
| V2 | + decrement, reset |
| **V3** | + **set_value**, **multiply** |

## Upgrade Steps

1. Get your \`counter_package\` hash from previous deployment
2. Select "Upgrade Contract" mode
3. Enter the package hash
4. Deploy with 200 CSPR

## After Upgrade

- Counter value is preserved!
- All previous entry points still work
- New V3 entry points available
`
};
