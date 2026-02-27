import { showConnect, authenticate } from '@stacks/connect';
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

    static async connect(networkType: string = 'testnet'): Promise<WalletConnection> {
        return new Promise((resolve, reject) => {
            authenticate({
                appDetails: this.appDetails,
                onFinish: (data) => {
                    const userData = data.userSession.loadUserData();

                    // Detect provider
                    let type: 'hiro' | 'leather' | 'xverse' | 'none' = 'leather';
                    const win = window as any;

                    if (win.XverseProviders || win.BitcoinProvider?.isXverse) {
                        type = 'xverse';
                    } else if (win.HiroWalletProvider || win.StacksProvider?.isHiro) {
                        type = 'hiro';
                    } else if (win.LeatherProvider || win.StacksProvider?.isLeather) {
                        type = 'leather';
                    }

                    // Robust address extraction
                    const profile = userData.profile || {};
                    const stxAddresses = profile.stxAddress || {};

                    const mainnetAddr = typeof stxAddresses === 'string' ? stxAddresses : stxAddresses.mainnet;
                    const testnetAddr = typeof stxAddresses === 'string' ? stxAddresses : stxAddresses.testnet;

                    // Final address to use for this connection
                    const address = networkType === 'mainnet'
                        ? (mainnetAddr || testnetAddr)
                        : (testnetAddr || mainnetAddr);

                    resolve({
                        type,
                        connected: true,
                        address: address,
                        publicKey: userData.appPrivateKey,
                        network: networkType,
                        addresses: {
                            mainnet: mainnetAddr || address,
                            testnet: testnetAddr || address
                        }
                    });
                },
                onCancel: () => {
                    reject(new Error('User cancelled login'));
                }
            });
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
        const response = await fetch('https://api.testnet.hiro.so/extended/v1/faucets/stx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, stacking: false })
        });
        return await response.json();
    }
}
