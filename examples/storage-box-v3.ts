// Storage Box V3 - Adds get_length and replace features
export const storageBoxV3 = {
    'Cargo.toml': `[package]
name = "storage_box_v3"
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

    // V2 entry points
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

    // NEW V3 entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("get_length"),
        vec![],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("replace"),
        vec![
            Parameter::new("old", CLType::String),
            Parameter::new("new", CLType::String),
        ],
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

#[no_mangle]
pub extern "C" fn clear() {
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    storage::write(value_uref, String::from(""));
}

// NEW V3
#[no_mangle]
pub extern "C" fn get_length() {
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let value: String = storage::read(value_uref)
        .unwrap_or_revert()
        .unwrap_or(String::from(""));
    let length = value.len() as u64;
    runtime::ret(casper_types::CLValue::from_t(length).unwrap_or_revert());
}

// NEW V3
#[no_mangle]
pub extern "C" fn replace() {
    let old: String = runtime::get_named_arg("old");
    let new: String = runtime::get_named_arg("new");
    let value_uref: URef = runtime::get_key(VALUE_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let current: String = storage::read(value_uref)
        .unwrap_or_revert()
        .unwrap_or(String::from(""));
    let replaced = current.replace(&old, &new);
    storage::write(value_uref, replaced);
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

    runtime::put_key("storage_box_contract_v3", contract_hash.into());
    let version_uref = storage::new_uref(contract_version);
    runtime::put_key("storage_box_version", version_uref.into());
}`,

    'README.md': `# Storage Box V3

## New Features
- \`get_length()\` - Get the length of stored string
- \`replace(old, new)\` - Replace substring in stored value

## All Entry Points
| Version | Entry Points |
|---------|-------------|
| V1 | store, get_value |
| V2 | + append, clear |
| **V3** | + **get_length**, **replace** |
`
};
