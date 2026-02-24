// Storage Box V2 - Adds append and clear features
export const storageBoxV2 = {
    'Cargo.toml': `[package]
name = "storage_box_v2"
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
    EntryPointAccess, EntryPointType, CLType, URef, Parameter,
};

const VALUE_KEY: &str = "stored_value";
const PACKAGE_HASH_KEY: &str = "storage_box_package";
const ACCESS_UREF_KEY: &str = "storage_box_access";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

    // V1 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("store"),
        vec![Parameter::new("value", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("get_value"),
        vec![],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    // NEW V2 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("append"),
        vec![Parameter::new("text", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("clear"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points
}

#[no_mangle]
pub extern "C" fn store() {
    let value: String = runtime::get_named_arg("value");
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(value_uref, value);
}

#[no_mangle]
pub extern "C" fn get_value() {
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let value: String = storage::read(value_uref)
        .unwrap_or_revert()
        .unwrap_or(String::from(""));
    runtime::ret(casper_types::CLValue::from_t(value).unwrap_or_revert());
}

// NEW V2
#[no_mangle]
pub extern "C" fn append() {
    let text: String = runtime::get_named_arg("text");
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let mut current: String = storage::read(value_uref)
        .unwrap_or_revert()
        .unwrap_or(String::from(""));
    current.push_str(&text);
    storage::write(value_uref, current);
}

// NEW V2
#[no_mangle]
pub extern "C" fn clear() {
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(value_uref, String::from(""));
}

#[no_mangle]
pub extern "C" fn call() {
    let package_hash: ContractPackageHash = runtime::get_key(PACKAGE_HASH_KEY)
        .unwrap_or_revert()
        .into_hash_addr()
        .map(ContractPackageHash::new)
        .unwrap_or_revert();

    let _access_uref: URef = runtime::get_key(ACCESS_UREF_KEY)
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();

    let entry_points = get_entry_points();
    let named_keys = NamedKeys::new();

    let (contract_hash, contract_version) = storage::add_contract_version(
        package_hash,
        entry_points.into(),
        named_keys.into(),
        Default::default(),
    );

    runtime::put_key("storage_box_contract_v2", contract_hash.into());
    let version_uref = storage::new_uref(contract_version);
    runtime::put_key("storage_box_version", version_uref.into());
}`,

    'README.md': `# Storage Box V2

## New Features
- \`append(text: String)\` - Append text to stored value
- \`clear()\` - Clear the stored value

## Upgrade Steps
1. Use \`storage_box_package\` hash from V1
2. Select "Upgrade Contract" mode
3. Deploy with 150 CSPR
`
};
