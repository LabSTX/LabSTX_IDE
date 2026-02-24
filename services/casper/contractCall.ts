import { DeployUtil, CLValueBuilder, CLPublicKey, RuntimeArgs, CasperClient } from 'casper-js-sdk';
import { DeployConfig, WalletConnection } from '../../types';

/**
 * Convert hex string to Uint8Array (browser-compatible)
 */
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Casper Contract Call Service
 * Handles calling deployed contracts via entry points using StoredContractByHash
 */
export class CasperContractCallService {
    private static readonly RPC_PROXY = '/api/rpc';

    /**
     * Call a deployed contract by its hash (StoredContractByHash variant)
     */
    static async callContractByHash(
        contractHash: string,
        entryPoint: string,
        args: Record<string, any>,
        wallet: WalletConnection,
        config: DeployConfig
    ): Promise<{ deployHash: string }> {
        try {
            if (!wallet.connected || !wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            console.log('='.repeat(50));
            console.log('📞 INITIATING CONTRACT CALL');
            console.log('='.repeat(50));
            console.log('Contract Hash:', contractHash);
            console.log('Entry Point:', entryPoint);
            console.log('Arguments:', JSON.stringify(args, null, 2));
            console.log('Chain:', config.chainName);
            console.log('='.repeat(50));

            // Build runtime args
            const runtimeArgs = await this.buildRuntimeArgs(args);

            // Clean contract hash (remove "hash-" prefix if present)
            const cleanHash = contractHash.replace(/^hash-/, '');
            console.log('Clean contract hash:', cleanHash);

            // Validate hash format (should be 64 hex characters)
            if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
                throw new Error(`Invalid contract hash format: ${cleanHash}. Expected 64 hex characters.`);
            }

            // Create deploy using StoredContractByHash
            const deploy = DeployUtil.makeDeploy(
                new DeployUtil.DeployParams(
                    CLPublicKey.fromHex(wallet.publicKey),
                    config.chainName || 'casper-test',
                    config.gasPrice || 1,
                    config.ttl || 1800000
                ),
                DeployUtil.ExecutableDeployItem.newStoredContractByHash(
                    hexToBytes(cleanHash),
                    entryPoint,
                    runtimeArgs
                ),
                DeployUtil.standardPayment(config.paymentAmount || 2500000000) // 2.5 CSPR default
            );

            console.log('Deploy created successfully');
            console.log('Deploy hash (pre-sign):', this.hashToHex(deploy.hash));

            // Sign deploy with wallet
            const { CasperWalletService } = await import('./casper-wallet-service');
            console.log('Requesting wallet signature...');
            const signedDeploy = await CasperWalletService.signDeploy(deploy, wallet);
            console.log('Deploy signed successfully');

            // Convert deploy hash to hex string
            const deployHashHex = this.hashToHex(signedDeploy.hash);
            console.log('Signed deploy hash:', deployHashHex);

            // Send deploy to network using CasperClient
            console.log('Sending deploy to network via RPC proxy...');
            const client = new CasperClient(this.RPC_PROXY);

            try {
                const result = await client.putDeploy(signedDeploy);
                console.log('Deploy submitted successfully!');
                console.log('Result:', result);
            } catch (rpcError: any) {
                console.error('RPC Error:', rpcError);
                // Try alternative method - direct fetch with proper serialization
                console.log('Attempting direct RPC call...');
                await this.sendDeployDirect(signedDeploy);
            }

            console.log('='.repeat(50));
            console.log('✅ CONTRACT CALL SUBMITTED');
            console.log('Deploy Hash:', deployHashHex);
            console.log('='.repeat(50));

            return {
                deployHash: deployHashHex
            };
        } catch (error: any) {
            console.error('='.repeat(50));
            console.error('❌ CONTRACT CALL FAILED');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('='.repeat(50));
            throw new Error(`Contract call failed: ${error.message}`);
        }
    }

    /**
     * Send deploy directly via fetch with proper JSON serialization
     */
    private static async sendDeployDirect(signedDeploy: any): Promise<void> {
        // Serialize the deploy to JSON format
        const deployJson = DeployUtil.deployToJson(signedDeploy);

        console.log('Serialized deploy for RPC:', JSON.stringify(deployJson, null, 2).substring(0, 500) + '...');

        const response = await fetch(this.RPC_PROXY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'account_put_deploy',
                params: [deployJson]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('RPC response error:', text);
            throw new Error(`RPC returned ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log('RPC response:', JSON.stringify(data, null, 2));

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
    }

    /**
     * Call a contract using package hash (StoredVersionedContractByHash variant)
     */
    static async callVersionedContract(
        packageHash: string,
        entryPoint: string,
        args: Record<string, any>,
        wallet: WalletConnection,
        config: DeployConfig,
        version?: number
    ): Promise<{ deployHash: string }> {
        try {
            if (!wallet.connected || !wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            console.log('='.repeat(50));
            console.log('📞 INITIATING VERSIONED CONTRACT CALL');
            console.log('='.repeat(50));
            console.log('Package Hash:', packageHash);
            console.log('Entry Point:', entryPoint);
            console.log('Version:', version || 'latest');
            console.log('Arguments:', JSON.stringify(args, null, 2));
            console.log('='.repeat(50));

            const runtimeArgs = await this.buildRuntimeArgs(args);

            // Clean hash - remove various prefixes
            const cleanHash = packageHash
                .replace(/^contract-package-wasm/, '')
                .replace(/^contract-package-/, '')
                .replace(/^hash-/, '');

            console.log('Clean package hash:', cleanHash);

            // Validate hash format
            if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
                throw new Error(`Invalid package hash format: ${cleanHash}. Expected 64 hex characters.`);
            }

            const deploy = DeployUtil.makeDeploy(
                new DeployUtil.DeployParams(
                    CLPublicKey.fromHex(wallet.publicKey),
                    config.chainName || 'casper-test',
                    config.gasPrice || 1,
                    config.ttl || 1800000
                ),
                DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
                    hexToBytes(cleanHash),
                    version || null, // null = latest version
                    entryPoint,
                    runtimeArgs
                ),
                DeployUtil.standardPayment(config.paymentAmount || 2500000000)
            );

            console.log('Versioned deploy created, requesting signature...');

            const { CasperWalletService } = await import('./casper-wallet-service');
            const signedDeploy = await CasperWalletService.signDeploy(deploy, wallet);

            const deployHashHex = this.hashToHex(signedDeploy.hash);
            console.log('Signed deploy hash:', deployHashHex);

            // Send deploy
            const client = new CasperClient(this.RPC_PROXY);
            try {
                await client.putDeploy(signedDeploy);
            } catch (rpcError: any) {
                console.warn('CasperClient failed, trying direct method:', rpcError.message);
                await this.sendDeployDirect(signedDeploy);
            }

            console.log('='.repeat(50));
            console.log('✅ VERSIONED CONTRACT CALL SUBMITTED');
            console.log('Deploy Hash:', deployHashHex);
            console.log('='.repeat(50));

            return {
                deployHash: deployHashHex
            };
        } catch (error: any) {
            console.error('Versioned contract call failed:', error);
            throw new Error(`Versioned contract call failed: ${error.message}`);
        }
    }

    /**
     * Convert hash bytes to hex string
     */
    private static hashToHex(hash: Uint8Array | string): string {
        if (typeof hash === 'string') {
            return hash;
        }
        return Array.from(hash)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Build runtime arguments from object
     */
    private static async buildRuntimeArgs(args: Record<string, any>): Promise<RuntimeArgs> {
        const runtimeArgsMap: Record<string, any> = {};

        for (const [key, value] of Object.entries(args)) {
            if (value === undefined || value === null || value === '') {
                continue;
            }

            // Auto-detect type and convert
            if (typeof value === 'string') {
                if (/^-?\d+$/.test(value)) {
                    // Integer string
                    runtimeArgsMap[key] = CLValueBuilder.u64(BigInt(value));
                } else if (/^-?\d+\.\d+$/.test(value)) {
                    // Decimal string
                    runtimeArgsMap[key] = CLValueBuilder.u512(BigInt(Math.floor(parseFloat(value))));
                } else {
                    // Regular string
                    runtimeArgsMap[key] = CLValueBuilder.string(value);
                }
            } else if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    runtimeArgsMap[key] = CLValueBuilder.u64(BigInt(value));
                } else {
                    runtimeArgsMap[key] = CLValueBuilder.u512(BigInt(Math.floor(value)));
                }
            } else if (typeof value === 'boolean') {
                runtimeArgsMap[key] = CLValueBuilder.bool(value);
            } else if (typeof value === 'bigint') {
                runtimeArgsMap[key] = CLValueBuilder.u64(value);
            } else {
                // Fallback to string
                runtimeArgsMap[key] = CLValueBuilder.string(String(value));
            }
        }

        console.log('Built runtime args:', Object.keys(runtimeArgsMap));
        return RuntimeArgs.fromMap(runtimeArgsMap);
    }

    /**
     * Query a contract's named key value (free read, no gas)
     * This is used to READ state from a contract without executing a transaction
     */
    static async queryContractState(
        contractHash: string,
        keyName: string
    ): Promise<{ value: any; rawValue: any }> {
        try {
            console.log('='.repeat(50));
            console.log('🔍 QUERYING CONTRACT STATE');
            console.log('='.repeat(50));
            console.log('Contract Hash:', contractHash);
            console.log('Key Name:', keyName);
            console.log('='.repeat(50));

            // Clean contract hash
            const cleanHash = contractHash.replace(/^hash-/, '');

            // First, get the contract info to find named keys
            const contractKeyResponse = await fetch(this.RPC_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'query_global_state',
                    params: {
                        state_identifier: null,
                        key: `hash-${cleanHash}`,
                        path: []
                    }
                })
            });

            const contractData = await contractKeyResponse.json();
            console.log('Contract query response:', contractData);

            if (contractData.error) {
                throw new Error(contractData.error.message || 'Failed to query contract');
            }

            // Get the contract's named_keys
            const contract = contractData.result?.stored_value?.Contract ||
                contractData.result?.stored_value?.AddressableEntity;

            if (!contract) {
                throw new Error('Could not find contract data in response');
            }

            console.log('Contract named_keys:', contract.named_keys);

            // Find the specific key we're looking for
            const namedKey = contract.named_keys?.find((nk: any) => nk.name === keyName);

            if (!namedKey) {
                // List available keys for debugging
                const availableKeys = contract.named_keys?.map((nk: any) => nk.name) || [];
                throw new Error(`Key "${keyName}" not found. Available keys: ${availableKeys.join(', ')}`);
            }

            console.log(`Found named key "${keyName}":`, namedKey.key);

            // Now query the actual value at that URef/key
            const valueResponse = await fetch(this.RPC_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'query_global_state',
                    params: {
                        state_identifier: null,
                        key: namedKey.key,
                        path: []
                    }
                })
            });

            const valueData = await valueResponse.json();
            console.log('Value query response:', valueData);

            if (valueData.error) {
                throw new Error(valueData.error.message || 'Failed to query value');
            }

            const storedValue = valueData.result?.stored_value;
            let parsedValue = storedValue;

            // Try to parse CLValue
            if (storedValue?.CLValue) {
                parsedValue = storedValue.CLValue.parsed;
                console.log('Parsed CLValue:', parsedValue);
            }

            console.log('='.repeat(50));
            console.log('✅ QUERY SUCCESSFUL');
            console.log(`${keyName} = ${JSON.stringify(parsedValue)}`);
            console.log('='.repeat(50));

            return {
                value: parsedValue,
                rawValue: storedValue
            };

        } catch (error: any) {
            console.error('='.repeat(50));
            console.error('❌ QUERY FAILED');
            console.error('Error:', error.message);
            console.error('='.repeat(50));
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    /**
     * Query a dictionary value from a contract
     */
    static async queryContractDictionary(
        contractHash: string,
        dictionaryName: string,
        dictionaryKey: string
    ): Promise<{ value: any; rawValue: any }> {
        try {
            console.log('='.repeat(50));
            console.log('🔍 QUERYING CONTRACT DICTIONARY');
            console.log('='.repeat(50));
            console.log('Contract Hash:', contractHash);
            console.log('Dictionary Name:', dictionaryName);
            console.log('Dictionary Key:', dictionaryKey);
            console.log('='.repeat(50));

            const cleanHash = contractHash.replace(/^hash-/, '');

            const response = await fetch(this.RPC_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'state_get_dictionary_item',
                    params: {
                        state_root_hash: null,
                        dictionary_identifier: {
                            ContractNamedKey: {
                                key: `hash-${cleanHash}`,
                                dictionary_name: dictionaryName,
                                dictionary_item_key: dictionaryKey
                            }
                        }
                    }
                })
            });

            const data = await response.json();
            console.log('Dictionary query response:', data);

            if (data.error) {
                throw new Error(data.error.message || 'Dictionary query failed');
            }

            const storedValue = data.result?.stored_value;
            let parsedValue = storedValue;

            if (storedValue?.CLValue) {
                parsedValue = storedValue.CLValue.parsed;
            }

            console.log('='.repeat(50));
            console.log('✅ DICTIONARY QUERY SUCCESSFUL');
            console.log(`${dictionaryName}[${dictionaryKey}] = ${JSON.stringify(parsedValue)}`);
            console.log('='.repeat(50));

            return {
                value: parsedValue,
                rawValue: storedValue
            };

        } catch (error: any) {
            console.error('Dictionary query failed:', error);
            throw new Error(`Dictionary query failed: ${error.message}`);
        }
    }
}
