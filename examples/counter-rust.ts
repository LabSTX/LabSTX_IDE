// Counter Contract Example (Rust)
export const counterRustExample = {
  'Cargo.toml': `[package]
name = "counter"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "1.4.4"
casper-types = "1.5.0"

[lib]
crate-type = ["cdylib"]`,
  
  'src/main.rs': `#![no_std]
#![no_main]

#[cfg(not(target_arch = "wasm32"))]
compile_error!("target arch should be wasm32: compile with '--target wasm32-unknown-unknown'");

extern crate alloc;
use alloc::string::String;
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    CLType, EntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Parameter, Key, URef,
    runtime_args, RuntimeArgs, U256
};

const COUNTER_KEY: &str = "counter";
const COUNTER_INC: &str = "counter_inc";
const COUNTER_DEC: &str = "counter_dec";
const COUNTER_GET: &str = "counter_get";

#[no_mangle]
pub extern "C" fn call() {
    let entry_points = {
        let mut entry_points = EntryPoints::new();
        
        entry_points.add_entry_point(EntryPoint::new(
            COUNTER_INC,
            vec![],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
        ));
        
        entry_points.add_entry_point(EntryPoint::new(
            COUNTER_DEC,
            vec![],
            CLType::Unit,
            EntryPointAccess::Public,
            EntryPointType::Contract,
        ));
        
        entry_points.add_entry_point(EntryPoint::new(
            COUNTER_GET,
            vec![],
            CLType::U256,
            EntryPointAccess::Public,
            EntryPointType::Contract,
        ));
        
        entry_points
    };
    
    let (contract_hash, _contract_version) = storage::new_contract(
        entry_points,
        None,
        Some(COUNTER_KEY.to_string()),
        None,
    );
    
    runtime::put_key(COUNTER_KEY, contract_hash.into());
    
    // Initialize counter to 0
    let counter_uref = storage::new_uref(U256::zero());
    runtime::put_key("counter_value", counter_uref.into());
}

#[no_mangle]
pub extern "C" fn counter_inc() {
    let counter_uref: URef = runtime::get_key("counter_value")
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    
    let current: U256 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    
    let new_value = current + U256::one();
    storage::write(counter_uref, new_value);
}

#[no_mangle]
pub extern "C" fn counter_dec() {
    let counter_uref: URef = runtime::get_key("counter_value")
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    
    let current: U256 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    
    let new_value = current - U256::one();
    storage::write(counter_uref, new_value);
}

#[no_mangle]
pub extern "C" fn counter_get() {
    let counter_uref: URef = runtime::get_key("counter_value")
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    
    let current: U256 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or_revert();
    
    runtime::ret(CLValue::from_t(current).unwrap_or_revert());
}`
};










