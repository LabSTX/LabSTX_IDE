// Storage Box V1 - A different upgradeable contract example
// Uses different package names so it can coexist with Counter templates
export const storageBoxV1 = {
    'Cargo.toml': `[package]
name = "storage_box"
version = "1.0.0"
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
    contracts::{EntryPoint, EntryPoints, NamedKeys},
    EntryPointAccess, EntryPointType, CLType, Key, URef, Parameter,
};

const VALUE_KEY: &str = "stored_value";
const PACKAGE_HASH_KEY: &str = "storage_box_package";  // Different from counter!
const ACCESS_UREF_KEY: &str = "storage_box_access";    // Different from counter!

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

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
pub extern "C" fn call() {
    let value_uref = storage::new_uref(String::from("Hello Casper!"));
    let value_key = Key::URef(value_uref);
    
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(VALUE_KEY), value_key);
    
    let entry_points = get_entry_points();
    
    let (stored_contract_hash, _) = storage::new_contract(
        entry_points.into(),
        Some(named_keys.into()),
        Some(String::from(PACKAGE_HASH_KEY)),  // "storage_box_package"
        Some(String::from(ACCESS_UREF_KEY)),   // "storage_box_access"
        None,
    );
    
    runtime::put_key("storage_box_contract", stored_contract_hash.into());
}`,

    'README.md': `# Storage Box V1

A string storage contract with different package names from Counter.

## Entry Points
- \`store(value: String)\` - Store a string value
- \`get_value()\` - Get the stored value

## Named Keys Created
- \`storage_box_package\` - Package hash for upgrades
- \`storage_box_access\` - Upgrade permission
- \`storage_box_contract\` - V1 contract hash

## Can Coexist with Counter!
This uses different named keys, so you can deploy both:
- Counter package + Storage Box package
`
};
