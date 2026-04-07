import { request as stacksRequest } from '@stacks/connect';
import { request as satsRequest, AddressPurpose } from 'sats-connect';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { WalletConnection } from '../../types';

/**
 * Stacks Wallet Service
 */
export class StacksWalletService {
    private static appDetails = {
        name: 'LabSTX IDE',
        icon: window.location.origin + '/logo.svg',
    };

    static async connect(networkType: string = 'testnet', preferredProvider?: 'leather' | 'xverse'): Promise<WalletConnection> {
        const win = window as any;

        // --- XVERSE DIRECT PATH (Sats Connect) ---
        // This bypasses @stacks/connect to avoid the "redefine property" console error
        // --- XVERSE DIRECT PATH (Sats Connect) ---
        if (preferredProvider === 'xverse') {
            return new Promise(async (resolve, reject) => {
                try {
                    // Using sats-connect 'wallet_connect' for the most direct link
                    const response = await satsRequest('wallet_connect', {
                        addresses: [AddressPurpose.Stacks],
                        message: `Connect to ${this.appDetails.name}`,
                    });

                    if (response.status === 'success') {
                        const stacksAddrItem = response.result.addresses.find(a => a.purpose === AddressPurpose.Stacks);
                        console.log(stacksAddrItem);
                        console.log(networkType);

                        if (!stacksAddrItem) {
                            reject(new Error('No Stacks address returned.'));
                            return;
                        }
                        if (stacksAddrItem.address.startsWith('ST') && networkType === 'testnet') {
                            resolve({
                                type: 'xverse',
                                connected: true,
                                address: stacksAddrItem.address,
                                publicKey: stacksAddrItem.publicKey,
                                network: networkType as any,
                                addresses: {
                                    mainnet: stacksAddrItem.address,
                                    testnet: stacksAddrItem.address
                                }
                            });
                        } else if (stacksAddrItem.address.startsWith('SP') && networkType === 'mainnet') {
                            resolve({
                                type: 'xverse',
                                connected: true,
                                address: stacksAddrItem.address,
                                publicKey: stacksAddrItem.publicKey,
                                network: networkType as any,
                                addresses: {
                                    mainnet: stacksAddrItem.address,
                                    testnet: stacksAddrItem.address
                                }
                            });
                        } else {
                            reject(new Error('Please connect to the selected network on your Wallet Extension'));
                            return;
                        }
                    } else {
                        reject(new Error(response.error.message || 'Xverse connection failed'));
                    }
                } catch (err: any) {
                    reject(new Error('User cancelled Xverse login'));
                }
            });
        }

        // --- LEATHER DIRECT PATH (@stacks/connect request) ---
        if (preferredProvider === 'leather') {
            return new Promise(async (resolve, reject) => {
                const provider = win.LeatherProvider || win.StacksProvider;

                if (!provider) {
                    reject(new Error("Leather wallet not found."));
                    return;
                }

                try {
                    // 3-argument version skips the selection modal
                    const response = await stacksRequest(
                        { provider },
                        'getAddresses',
                        { network: networkType as any }
                    );

                    const stacksAddr = response.addresses.find(a => a.symbol === 'STX');

                    if (!stacksAddr) {
                        reject(new Error("No Stacks address found."));
                        return;
                    }

                    resolve({
                        type: 'leather',
                        connected: true,
                        address: stacksAddr.address,
                        publicKey: stacksAddr.publicKey,
                        network: networkType as any,
                        addresses: {
                            mainnet: stacksAddr.address,
                            testnet: stacksAddr.address
                        }
                    });
                } catch (err: any) {
                    reject(new Error("Connection cancelled."));
                }
            });
        }

        // --- FALLBACK (Standard authenticate if no preferred provider) ---
        // This handles cases where you might still want the default popup
        return new Promise((resolve, reject) => {
            // ... your original authenticate logic here if needed
            reject(new Error("Please select a specific wallet (Leather or Xverse)."));
        });
    }

    static disconnect(): WalletConnection {
        return {
            type: 'none',
            connected: false
        };
    }

    static getNetwork(networkType: string) {
        return networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
    }

    static async getBalance(address: string): Promise<string> {
        try {
            const baseUrl = address.startsWith('ST')
                ? 'https://api.testnet.hiro.so'
                : 'https://api.mainnet.hiro.so';

            const response = await fetch(`${baseUrl}/extended/v1/address/${address}/balances`);
            const data = await response.json();

            // Stx balance is in microstacks (uSTX)
            const stxBalance = data.stx.balance;
            // Using BigInt for parsing large strings, then converting to Number for division
            const microStacks = BigInt(stxBalance);
            const formattedBalance = (Number(microStacks) / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return formattedBalance;
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            return '0.00';
        }
    }

    static async checkContractExists(address: string, contractName: string, networkType: string): Promise<boolean> {
        try {
            const baseUrl = networkType === 'mainnet'
                ? 'https://api.mainnet.hiro.so'
                : 'https://api.testnet.hiro.so';

            const response = await fetch(`${baseUrl}/v2/contracts/source/${address}/${contractName}`);
            // If we get 200, the contract source exists, meaning it's deployed
            return response.status === 200;
        } catch (error) {
            console.error('Failed to check contract existence:', error);
            return false;
        }
    }

    static async getContractInterface(address: string, contractName: string, networkType: string): Promise<any> {
        try {
            const baseUrl = networkType === 'mainnet'
                ? 'https://api.mainnet.hiro.so'
                : 'https://api.testnet.hiro.so';

            const response = await fetch(`${baseUrl}/v2/contracts/interface/${address}/${contractName}`);
            if (response.status === 200) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch contract interface:', error);
            return null;
        }
    }

    static async requestTestnetTokens(address: string): Promise<any> {
        try {
            // Parameters moved to the URL
            const baseUrl = 'https://api.testnet.hiro.so/extended/v1/faucets/stx';
            const url = `${baseUrl}?address=${encodeURIComponent(address)}&stacking=false`;

            const response = await fetch(url, {
                method: 'POST', // Keep as POST
                headers: {
                    'Accept': 'application/json',
                    'Content-Length': '0' // Explicitly set length to 0 since body is empty
                }
            });

            const data = await response.json();
            console.log(`[FaucetAPI] Status: ${response.status}`, data);

            if (!response.ok) {
                return {
                    success: false,
                    reason: data.reason || data.message || `API Error ${response.status}`,
                    details: data
                };
            }

            return {
                success: true,
                ...data
            };
        } catch (error: any) {
            console.error('[FaucetAPI] Network Error:', error);
            return {
                success: false,
                reason: error.message || 'Network connection failed'
            };
        }
    }
}