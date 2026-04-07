import React, { useState } from 'react';
import { request as satsRequest } from 'sats-connect';
import { PostConditionMode } from '@stacks/transactions';

interface DeployPanelProps {
    walletConnection: {
        address: string;
        type: 'leather' | 'xverse' | 'none';
        network: 'mainnet' | 'testnet';
    };
}

const DeployPanell: React.FC<DeployPanelProps> = ({ walletConnection }) => {
    const [contractName, setContractName] = useState('labstx-contract-v1');
    const [codeBody, setCodeBody] = useState('(define-public (hello) (ok "LabsTX"))');
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

    const handleDeploy = async () => {
        if (walletConnection.type !== 'xverse') {
            setStatus({ type: 'error', msg: 'Please connect with Xverse for this test.' });
            return;
        }

        setStatus({ type: 'loading', msg: 'Awaiting Xverse approval...' });

        // 1. Prepare the payload
        const requestPayload = {
            name: contractName.trim(),
            clarityCode: codeBody,
            network: walletConnection.network,
            postConditionMode: 'allow',
            postConditions: [],
        };

        // 2. Log for "The People" (Maintainers)
        console.log("--- DEBUG START FOR SATS-CONNECT ---");
        console.log("Payload being sent to satsRequest:", JSON.stringify(requestPayload, null, 2));

        try {
            const response = await satsRequest('stx_deployContract', requestPayload);

            if (response.status === 'success') {
                console.log("Wallet reported success. TXID:", response.result.txid);
                setStatus({
                    type: 'success',
                    msg: `Success! TXID: ${response.result.txid.substring(0, 15)}...`
                });
            } else {
                // This is where the "too long" error usually appears in the response object
                console.error("SATS-CONNECT ERROR RESPONSE:", response.error);
                setStatus({
                    type: 'error',
                    msg: response.error?.message || 'Transaction rejected'
                });
            }
        } catch (err: any) {
            // This is for internal library crashes
            console.error("SATS-CONNECT LIBRARY CRASH:", err);

            // If the error message contains that specific Base64 string, identify the bug
            if (err.message?.includes('IntcImp') || err.message?.includes('too long')) {
                console.warn("BUG DETECTED: The library is incorrectly serializing the request object into the contract name field.");
            }

            setStatus({ type: 'error', msg: err.message || 'Internal Error' });
        }
        console.log("--- DEBUG END ---");
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-slate-200 p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-[#1a1d23] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-[#23272e] flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">LabsTX Deployer <span className="text-slate-500 font-normal text-sm">(Xverse Test)</span></h2>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-mono uppercase">
                        {walletConnection.network}
                    </span>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Contract Name</label>
                        <input
                            value={contractName}
                            onChange={(e) => setContractName(e.target.value)}
                            className="w-full bg-[#0f1115] border border-slate-700 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Clarity Code</label>
                        <textarea
                            value={codeBody}
                            onChange={(e) => setCodeBody(e.target.value)}
                            className="w-full h-48 bg-[#0f1115] border border-slate-700 rounded-md p-4 font-mono text-sm text-emerald-400 outline-none resize-none focus:ring-1 focus:ring-emerald-500/30"
                        />
                    </div>

                    <button
                        onClick={handleDeploy}
                        disabled={status.type === 'loading'}
                        className={`w-full py-4 rounded-lg font-bold text-white transition-all shadow-lg ${status.type === 'loading'
                            ? 'bg-slate-700 cursor-not-allowed opacity-70'
                            : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] shadow-indigo-500/20'
                            }`}
                    >
                        {status.type === 'loading' ? 'Checking Wallet...' : 'Deploy via Xverse'}
                    </button>

                    {status.msg && (
                        <div className={`p-4 rounded-lg text-sm text-center border animate-in fade-in slide-in-from-top-1 ${status.type === 'error'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                            {status.msg}
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-mono text-blue-400">
                        Check browser console (F12) for maintainer debug logs.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeployPanell;