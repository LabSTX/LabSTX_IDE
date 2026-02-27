import React, { useState, useEffect } from 'react';
import { FileNode, WalletConnection, DeployedContract, CompilationResult, ProjectSettings } from '../../types';
import WalletConnectionComponent from './WalletConnection';
import { Button } from '../UI/Button';
import { RocketIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from '../UI/Icons';
import CodeEditor from '../Editor/CodeEditor';
import { openContractDeploy, openContractCall } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET, STACKS_MOCKNET } from '@stacks/network';
import { StacksWalletService } from '../../services/stacks/wallet';
import {
  uintCV, intCV, principalCV, standardPrincipalCV, contractPrincipalCV,
  trueCV, falseCV, noneCV, someCV, stringUtf8CV, stringAsciiCV, listCV, tupleCV,
  ClarityValue, serializeCV, deserializeCV, cvToValue
} from '@stacks/transactions';
import { bytesToHex, hexToBytes } from '@stacks/common';

interface DeployPanelProps {
  files: FileNode[];
  wallet: WalletConnection;
  onWalletConnect: (wallet: WalletConnection) => void;
  onWalletDisconnect: () => void;
  compilationResult?: CompilationResult;
  onDeploySuccess?: (contract: DeployedContract) => void;
  onAddTerminalLine?: (line: any) => void;
  width?: number;
  theme: 'dark' | 'light';
  settings?: ProjectSettings;
  onUpdateSettings?: (key: keyof ProjectSettings, value: any) => void;
}

const DeployPanel: React.FC<DeployPanelProps> = ({
  files,
  wallet,
  onWalletConnect,
  onWalletDisconnect,
  compilationResult,
  onDeploySuccess,
  onAddTerminalLine,
  width = 320,
  theme,
  settings,
  onUpdateSettings
}) => {
  // Use global settings network as source of truth
  const network = settings?.network || 'testnet';

  // Local function to update network (updates global settings)
  const setNetwork = (newNet: 'testnet' | 'mainnet' | 'devnet') => {
    if (onUpdateSettings) {
      onUpdateSettings('network', newNet);
    }
  };
  const [deploying, setDeploying] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [contractName, setContractName] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAlreadyDeployed, setIsAlreadyDeployed] = useState(false);
  const [checkingDeployment, setCheckingDeployment] = useState(false);
  const [contractInterface, setContractInterface] = useState<any>(null);

  // Advanced params
  const [customFee, setCustomFee] = useState<string>('');
  const [customNonce, setCustomNonce] = useState<string>('');

  // Interaction State
  const [interactContractHash, setInteractContractHash] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [argumentsJson, setArgumentsJson] = useState('{}');
  const [keyName, setKeyName] = useState('');
  const [requestingTokens, setRequestingTokens] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('labstx-deployed-contracts');
    if (saved) {
      try {
        setDeployedContracts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load deployed contracts:', e);
      }
    }
  }, []);

  // Sync wallet address with current network toggle
  useEffect(() => {
    if (wallet.connected && (wallet.addresses || wallet.address) && onWalletConnect) {
      const correctAddress = network === 'mainnet'
        ? (wallet.addresses?.mainnet || wallet.address || '')
        : (wallet.addresses?.testnet || wallet.address || '');

      if (wallet.address !== correctAddress || wallet.network !== network) {
        console.log(`Syncing wallet: Using ${network} address ${correctAddress}`);
        onWalletConnect({
          ...wallet,
          address: correctAddress,
          network: network
        });
      }
    }
  }, [network, wallet.connected, wallet.addresses, wallet.address, wallet.network, onWalletConnect]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (wallet.connected) {
        // Use the address matching the network to avoid fetching 0 for wrong principal
        const addressToUse = network === 'mainnet'
          ? (wallet.addresses?.mainnet || wallet.address)
          : (wallet.addresses?.testnet || wallet.address);

        if (addressToUse) {
          const bal = await StacksWalletService.getBalance(addressToUse);
          setBalance(bal);
        }
      }
    };
    fetchBalance();

    // Refresh balance every 60 seconds (slower to be nicer to API)
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, wallet.addresses, network]);

  const clarityFiles = React.useMemo(() => {
    const results: FileNode[] = [];
    const traverse = (nodeList: FileNode[]) => {
      nodeList.forEach(node => {
        if (node.type === 'file' && (node.name.endsWith('.clar') || node.language === 'clarity')) {
          results.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(files);
    return results;
  }, [files]);

  useEffect(() => {
    if (clarityFiles.length > 0 && !selectedFileId) {
      setSelectedFileId(clarityFiles[0].id);
    }
  }, [clarityFiles, selectedFileId]);

  // Sync contract name when file changes
  useEffect(() => {
    const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
    if (selectedFile) {
      // Default to sanitized filename
      const baseName = selectedFile.name.replace('.clar', '');
      const sanitized = baseName.toLowerCase().replace(/[^a-z0-9-_]/g, '-').substring(0, 40);
      setContractName(sanitized);
    }
  }, [selectedFileId, clarityFiles]);

  // Check if contract is already deployed
  useEffect(() => {
    const checkStatus = async () => {
      const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
      if (selectedFile && wallet.address && wallet.connected) {
        setCheckingDeployment(true);
        const contractName = selectedFile.name.replace('.clar', '');
        const exists = await StacksWalletService.checkContractExists(wallet.address, contractName, network);
        setIsAlreadyDeployed(exists);

        if (exists) {
          const abi = await StacksWalletService.getContractInterface(wallet.address, contractName, network);
          setContractInterface(abi);
        } else {
          setContractInterface(null);
        }

        setCheckingDeployment(false);
      } else {
        setIsAlreadyDeployed(false);
        setContractInterface(null);
      }
    };
    checkStatus();
  }, [selectedFileId, wallet.address, wallet.connected, network, clarityFiles]);

  const handleDeploy = async () => {
    const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
    if (!selectedFile || !selectedFile.content) {
      console.error('ERROR: No contract code available.');
      return;
    }

    if (!wallet.connected) {
      console.error('ERROR: Please connect a wallet first');
      return;
    }

    if (isAlreadyDeployed) {
      const confirmRedeploy = confirm('This contract name is already deployed on this network from your address. Redeploying will likely fail as Clarity contracts are immutable. Do you want to proceed anyway?');
      if (!confirmRedeploy) return;
    }

    if (!contractName || contractName.length > 40) {
      alert('Contract name must be between 1 and 40 characters');
      return;
    }

    if (!/^[a-z_][a-z0-9-_]*$/.test(contractName.toLowerCase())) {
      alert('Invalid contract name. Use only letters, numbers, dashes, and underscores. Cannot start with a number.');
      return;
    }

    setDeploying(true);

    if (onAddTerminalLine) {
      onAddTerminalLine({
        type: 'command',
        content: `Broadcasting contract deployment: ${contractName} on ${network}...`
      });
    }

    try {
      const stxNetwork = network === 'mainnet'
        ? STACKS_MAINNET
        : network === 'testnet'
          ? STACKS_TESTNET
          : STACKS_MOCKNET;

      const deployOptions: any = {
        contractName: contractName.trim(),
        codeBody: selectedFile.content,
        network: stxNetwork,
        appDetails: {
          name: 'LabSTX IDE',
          icon: window.location.origin + '/logo192.png',
        },
        onFinish: (data: any) => {
          console.log('Stacks Transaction broadcast:', data);

          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'success',
              content: `Contract deployment broadcasted! TXID: ${data.txId.substring(0, 16)}...`
            });
          }

          const newContract: DeployedContract = {
            id: Date.now().toString(),
            name: contractName,
            contractHash: `${wallet.address}.${contractName}`,
            deployHash: data.txId,
            network,
            timestamp: Date.now(),
          };

          const updated = [newContract, ...deployedContracts];
          setDeployedContracts(updated);
          localStorage.setItem('labstx-deployed-contracts', JSON.stringify(updated));

          if (onDeploySuccess) {
            onDeploySuccess(newContract);
          }
          setDeploying(false);
        },
        onCancel: () => {
          console.log('Deployment cancelled');
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'info',
              content: 'Deployment cancelled by user.'
            });
          }
          setDeploying(false);
        }
      };

      // Add custom fee if specified
      if (customFee) {
        deployOptions.fee = customFee;
      }

      // Add custom nonce if specified
      if (customNonce) {
        deployOptions.nonce = customNonce;
      }

      await openContractDeploy(deployOptions);

    } catch (error: any) {
      console.error('Deployment error:', error);
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'error',
          content: `Deployment failed: ${error.message}`
        });
      }
      setDeploying(false);
    }
  };

  const handleCallContract = async () => {
    if (!interactContractHash || !entryPoint) {
      alert('Please provide contract hash and function name');
      return;
    }

    // Helper to convert JS values to Clarity Values
    const toCV = (val: any): ClarityValue => {
      if (typeof val === 'number') return uintCV(val);
      if (typeof val === 'boolean') return val ? trueCV() : falseCV();
      if (val === null) return noneCV();
      if (typeof val === 'string') {
        if ((val.startsWith('SP') || val.startsWith('ST')) && (val.includes('.') || val.length >= 39)) {
          return principalCV(val);
        }
        return stringUtf8CV(val);
      }
      if (Array.isArray(val)) return listCV(val.map(toCV));
      if (typeof val === 'object') {
        const tupleData: any = {};
        for (const [k, v] of Object.entries(val)) {
          tupleData[k] = toCV(v);
        }
        return tupleCV(tupleData);
      }
      return stringUtf8CV(String(val));
    };

    try {
      const parts = interactContractHash.split('.');
      if (parts.length !== 2) throw new Error('Invalid contract hash format. Expected: principal.contract-name');

      const [contractAddress, contractName] = parts;

      let cvArgs: ClarityValue[] = [];
      try {
        const trimmedJson = argumentsJson.trim();
        if (!trimmedJson || trimmedJson === '{}' || trimmedJson === '[]') {
          cvArgs = [];
        } else {
          const parsed = JSON.parse(trimmedJson);
          if (Array.isArray(parsed)) {
            cvArgs = parsed.map(toCV);
          } else {
            // Check if it's a single value or a keyed object that should be a tuple
            cvArgs = [toCV(parsed)];
          }
        }
        console.log('Final Clarity Arguments:', cvArgs);
      } catch (e) {
        console.warn('Arguments parsing failed, sending empty args');
      }

      // Network check
      if (wallet.network && wallet.network !== network) {
        const proceed = confirm(`Network Mismatch: Your wallet is on ${wallet.network} but the IDE is set to ${network}. This transaction will likely fail. Proceed anyway?`);
        if (!proceed) return;
      }

      const stxNetwork = network === 'mainnet' ? STACKS_MAINNET : network === 'testnet' ? STACKS_TESTNET : STACKS_MOCKNET;

      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'command',
          content: `Broadcasting contract call: ${interactContractHash}::${entryPoint}...`,
          data: {
            args: argumentsJson
          }
        });
      }

      await openContractCall({
        contractAddress: contractAddress.trim(),
        contractName: contractName.trim(),
        functionName: entryPoint.trim(),
        functionArgs: cvArgs,
        network: stxNetwork,
        appDetails: {
          name: 'LabSTX IDE',
          icon: window.location.origin + '/logo192.png',
        },
        onFinish: (data) => {
          console.log('Contract call broadcast:', data);
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'success',
              content: `Contract call broadcasted! TXID: ${data.txId.substring(0, 16)}...`
            });
          }
        },
        onCancel: () => {
          console.log('Call cancelled');
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'info',
              content: 'Contract call cancelled by user.'
            });
          }
        }
      });
    } catch (err: any) {
      alert(`Interaction Error: ${err.message}`);
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'error',
          content: `Contract call failed: ${err.message}`
        });
      }
    }
  };

  const handleRequestTokens = async () => {
    if (!wallet.address || !wallet.connected) {
      alert('Please connect your wallet first.');
      return;
    }

    setRequestingTokens(true);
    if (onAddTerminalLine) {
      onAddTerminalLine({
        type: 'command',
        content: `Requesting testnet STX tokens for ${wallet.address}...`
      });
    }

    try {
      const result = await StacksWalletService.requestTestnetTokens(wallet.address);
      console.log('Faucet result:', result);

      if (result.success || result.txid) {
        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'success',
            content: `Tokens requested successfully! It may take a few minutes to reflect in your balance.`
          });
        }
        // Refresh balance after a short delay
        setTimeout(async () => {
          const bal = await StacksWalletService.getBalance(wallet.address!);
          setBalance(bal);
        }, 5000);
      } else {
        throw new Error(result.reason || result.message || 'Unknown error from faucet.');
      }
    } catch (err: any) {
      console.error('Faucet error:', err);
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'error',
          content: `Faucet request failed: ${err.message}`
        });
      }
      alert(`Faucet Error: ${err.message}`);
    } finally {
      setRequestingTokens(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Clear all deployment history?')) {
      setDeployedContracts([]);
      localStorage.removeItem('labstx-deployed-contracts');
    }
  };

  const handleQueryState = async () => {
    if (!interactContractHash || !keyName) {
      alert('Key Name and Contract Hash are required for state query');
      return;
    }

    // Helper to convert JS values to Clarity Values
    const toCV = (val: any): ClarityValue => {
      if (typeof val === 'number') return uintCV(val);
      if (typeof val === 'boolean') return val ? trueCV() : falseCV();
      if (val === null) return noneCV();
      if (typeof val === 'string') {
        if ((val.startsWith('SP') || val.startsWith('ST')) && (val.includes('.') || val.length >= 39)) {
          return principalCV(val);
        }
        return stringUtf8CV(val);
      }
      if (Array.isArray(val)) return listCV(val.map(toCV));
      if (typeof val === 'object') {
        const tupleData: any = {};
        for (const [k, v] of Object.entries(val)) {
          tupleData[k] = toCV(v);
        }
        return tupleCV(tupleData);
      }
      return stringUtf8CV(String(val));
    };

    try {
      const [contractAddress, contractName] = interactContractHash.split('.');
      const apiUrl = network === 'mainnet'
        ? 'https://api.mainnet.hiro.so'
        : 'https://api.testnet.hiro.so';

      let cvArgs: string[] = [];
      try {
        const parsed = JSON.parse(argumentsJson);
        const argsArray = Array.isArray(parsed) ? parsed : [parsed];
        cvArgs = argsArray.map(arg => {
          const cv = toCV(arg);
          const bytes = serializeCV(cv);
          return '0x' + (typeof bytes === 'string' ? bytes : bytesToHex(bytes as Uint8Array));
        });
      } catch (e) {
        console.warn('Query arguments parsing failed, sending empty');
      }

      console.log(`Querying ${keyName}...`);

      const response = await fetch(`${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${keyName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: wallet.address || contractAddress,
          arguments: cvArgs
        })
      });

      const result = await response.json();

      if (result.okay) {
        console.log('Query result (raw):', result.result);
        try {
          // Decode the Hex mapping to human-readable Clarity Value
          const hex = result.result.startsWith('0x') ? result.result.slice(2) : result.result;
          const decodedCV = deserializeCV(hexToBytes(hex));
          const humanReadable = cvToValue(decodedCV);

          // Format based on type
          const formatted = typeof humanReadable === 'object'
            ? JSON.stringify(humanReadable, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)
            : String(humanReadable);

          console.log('Decoded Result:', humanReadable);

          // Add to terminal logs
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'query',
              content: `${keyName} call returned value`,
              data: {
                contract: `${contractAddress}.${contractName}`,
                function: keyName,
                args: argumentsJson.trim() || '[]',
                result: formatted
              }
            });
          }

          // alert(`Query Result:\n${formatted}`);
        } catch (decodeErr) {
          console.warn('Failed to decode result hex, showing raw:', decodeErr);
          //  alert(`Query Result (Raw): ${result.result}`);
        }
      } else {
        console.error('Query failed:', result.cause);
        //  alert(`Query Failed: ${result.cause || 'Unknown Error'}. Ensure the contract is confirmed on-chain.`);

        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'error',
            content: `Query failed for ${keyName}: ${result.cause || 'Unknown Error'}`
          });
        }
      }
    } catch (err: any) {
      alert(`Query Error: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-caspier-border flex items-center gap-2 bg-caspier-black min-w-0">
        <RocketIcon className="w-4 h-4 text-labstx-orange flex-shrink-0" />
        {width >= 200 && (
          <span className="text-xs font-bold text-caspier-text tracking-wider whitespace-nowrap">
            STX CONTRACT DEPLOY
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Wallet Section */}
        <section>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-bold text-caspier-muted uppercase tracking-tight">BALANCE:</h3>
              {network === 'testnet' && wallet.connected && (
                <button
                  onClick={handleRequestTokens}
                  disabled={requestingTokens}
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border transition-all ${requestingTokens
                    ? 'bg-caspier-dark border-caspier-border text-caspier-muted cursor-not-allowed'
                    : 'bg-labstx-orange/10 border-labstx-orange/30 text-labstx-orange hover:bg-labstx-orange hover:text-white hover:border-labstx-orange'
                    }`}
                >
                  {requestingTokens ? 'Requesting...' : 'Get Tokens'}
                </button>
              )}
            </div>
            {wallet.connected && (
              <span className="text-[10px] font-mono font-bold text-labstx-orange bg-labstx-orange/10 px-1.5 py-0.5 rounded">
                {balance} STX
              </span>
            )}
          </div>
          {!wallet.addresses && wallet.connected && (
            <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400">
              💡 Please <strong>Reconnect Wallet</strong> to enable seamless Mainnet/Testnet switching.
            </div>
          )}
          <WalletConnectionComponent
            wallet={wallet}
            onConnect={onWalletConnect}
            onDisconnect={onWalletDisconnect}
            network={network}
          />
        </section>

        {/* Contract Selection */}
        <section>
          <h3 className="text-[10px] font-bold text-caspier-muted mb-2 uppercase tracking-tight">Select Contract</h3>
          <select
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-sm focus:border-labstx-orange outline-none rounded-sm transition-colors"
          >
            {clarityFiles.length === 0 && <option value="">No .clar files found</option>}
            {clarityFiles.map(file => (
              <option key={file.id} value={file.id}>{file.name}</option>
            ))}
          </select>

          {/* Contract Name Input */}
          <div className="mt-3">
            <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Contract Name (on-chain)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="my-contract"
                maxLength={40}
                className="flex-1 bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
              <div className="flex items-center text-[10px] text-caspier-muted bg-caspier-black px-2 border border-caspier-border rounded-sm">
                {contractName.length}/40
              </div>
            </div>
            <p className="text-[8px] text-caspier-muted mt-1 italic">Used as the unique ID for this contract on the blockchain</p>
          </div>

          {/* Code Preview */}
          {selectedFileId && clarityFiles.find(f => f.id === selectedFileId) && (
            <div className="mt-3 bg-caspier-black border border-caspier-border rounded overflow-hidden ">
              <div className="px-2.5 py-1.5 border-b border-caspier-border flex justify-between items-center bg-caspier-dark/40">
                <span className="text-[9px] text-caspier-muted uppercase font-black tracking-widest">Contract Preview</span>
                <span className="text-[9px] text-labstx-orange font-mono">.clar</span>
              </div>
              <div className="h-40 bg-[#0a0a0a]">
                <CodeEditor
                  code={clarityFiles.find(f => f.id === selectedFileId)?.content || ''}
                  language="clarity"
                  onChange={() => { }}
                  readOnly={true}
                  theme={theme}
                  settings={{
                    fontSize: 11,
                    wordWrap: 'on',
                    minimap: false,
                    tabSize: 2,
                    network: 'testnet',
                    autoCompile: false,
                    enableOptimization: false,
                    clarityVersion: '2.0',
                    aiModel: 'openai/gpt-4o',
                    aiApiKey: ''
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Network Selection */}
        <section>
          <h3 className="text-[10px] font-bold text-caspier-muted mb-2 uppercase tracking-tight">Network</h3>
          <div className="grid grid-cols-3 gap-1">
            {(['mainnet', 'testnet', 'devnet'] as const).map((net) => (
              <button
                key={net}
                onClick={() => setNetwork(net)}
                className={`px-1 py-1.5 text-[10px] font-bold uppercase border rounded-sm transition-all ${network === net
                  ? 'bg-labstx-orange border-labstx-orange text-white'
                  : 'bg-caspier-dark border-caspier-border text-caspier-muted hover:border-labstx-orange'
                  }`}
              >
                {net}
              </button>
            ))}
          </div>
        </section>

        {/* Advanced Options */}
        <section className="bg-caspier-black/40 border border-caspier-border rounded p-2 overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex justify-between items-center text-[10px] font-bold text-caspier-muted uppercase tracking-tight"
          >
            <span>Advanced Options</span>
            {showAdvanced ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className="text-[9px] text-caspier-muted mb-1 block">Custom Fee (uSTX)</label>
                <input
                  type="text"
                  placeholder="e.g. 2000"
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                  className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-caspier-muted mb-1 block">Custom Nonce</label>
                <input
                  type="text"
                  placeholder="Auto if empty"
                  value={customNonce}
                  onChange={(e) => setCustomNonce(e.target.value)}
                  className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Deploy Button */}
        <div className="space-y-2">
          {isAlreadyDeployed && (
            <div className="p-2 bg-labstx-orange/10 border border-labstx-orange/30 rounded text-[10px] text-labstx-orange flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-3 h-3 flex-shrink-0" />
                <span>Already deployed on-chain</span>
              </div>
              <button
                onClick={() => {
                  const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
                  if (selectedFile && wallet.address) {
                    const contractName = selectedFile.name.replace('.clar', '');
                    setInteractContractHash(`${wallet.address}.${contractName}`);
                    document.getElementById('interaction-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-[9px] font-bold underline hover:no-underline"
              >
                INTERACT
              </button>
            </div>
          )}
          <Button
            onClick={handleDeploy}
            disabled={deploying || !wallet.connected || clarityFiles.length === 0 || checkingDeployment}
            className={`w-full h-11 font-bold uppercase tracking-widest text-xs transition-all ${wallet.connected ? 'shadow-[4px_4px_0_0_rgba(255,107,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(255,107,0,0.4)]' : ''
              } ${isAlreadyDeployed ? 'opacity-80' : ''}`}
            variant="primary"
          >
            {checkingDeployment ? 'Checking...' : deploying ? 'Broadcasting...' : isAlreadyDeployed ? 'Redeploy' : 'Deploy'}
          </Button>
        </div>

        {/* Deployed Contracts List */}
        <section className="pt-4 border-t border-caspier-border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-caspier-muted uppercase tracking-tight">Activity History</h3>
            {deployedContracts.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[9px] text-caspier-muted hover:text-caspier-red font-bold uppercase"
              >
                Clear
              </button>
            )}
          </div>
          {deployedContracts.length === 0 ? (
            <div className="text-caspier-muted text-[11px] italic text-center py-4 bg-caspier-dark/30 rounded border border-dashed border-caspier-border">
              No recent deployments
            </div>
          ) : (
            <div className="space-y-2">
              {deployedContracts.map(contract => (
                <div key={contract.id} className="p-2.5 bg-caspier-black border border-caspier-border rounded-sm text-[11px] group hover:border-labstx-orange transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-caspier-text font-bold truncate pr-2">{contract.name}</span>
                    <button
                      onClick={() => setInteractContractHash(contract.contractHash)}
                      className="text-[9px] text-labstx-orange hover:underline font-bold"
                    >
                      Use
                    </button>
                    <span className={`text-[9px] px-1 rounded-px uppercase font-black ${contract.network === 'mainnet' ? 'bg-green-900/40 text-green-400' : 'bg-labstx-orange/20 text-labstx-orange'
                      }`}>
                      {contract.network}
                    </span>
                  </div>
                  <div className="text-caspier-muted space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="opacity-50">TXID:</span>
                      <a
                        href={contract.network === 'mainnet'
                          ? `https://explorer.stacks.co/txid/${contract.deployHash}?chain=mainnet`
                          : `https://explorer.stacks.co/txid/${contract.deployHash}?chain=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-labstx-orange hover:underline truncate ml-2"
                      >
                        {contract.deployHash.substring(0, 12)}...
                      </a>
                    </div>
                    <div className="truncate opacity-80">
                      {contract.contractHash}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Interact with Contract */}
        <section id="interaction-section" className="pt-6 border-t border-caspier-border space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange animate-pulse" />
            <h3 className="text-[10px] font-bold text-caspier-text uppercase tracking-widest">Interact with Contract</h3>
          </div>

          <div>
            <label className="text-[9px] font-bold text-caspier-muted mb-2 block uppercase tracking-tight">Contract Hash</label>
            <div className="space-y-2">
              <select
                value={interactContractHash}
                onChange={(e) => setInteractContractHash(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm transition-colors"
              >
                <option value="">Select deployed contract...</option>
                {deployedContracts.map(c => (
                  <option key={c.id} value={c.contractHash}>{c.name} ({c.contractHash.substring(0, 6)}...)</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or paste contract hash here..."
                value={interactContractHash}
                onChange={(e) => setInteractContractHash(e.target.value)}
                className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {contractInterface && (
              <div className="bg-caspier-dark/50 border border-caspier-border rounded p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-caspier-border pb-2">
                  <h4 className="text-[10px] font-black text-labstx-orange uppercase tracking-widest">Available Functions</h4>
                  <span className="text-[8px] text-caspier-muted px-1.5 py-0.5 bg-caspier-black rounded border border-caspier-border uppercase">Found on-chain</span>
                </div>

                <div className="space-y-4">
                  {/* Public Functions (State Changing) */}
                  {contractInterface.functions.filter((f: any) => f.access === 'public').length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-caspier-muted mb-2 uppercase opacity-60">Write Operations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contractInterface.functions
                          .filter((f: any) => f.access === 'public')
                          .map((f: any) => (
                            <button
                              key={f.name}
                              onClick={() => setEntryPoint(f.name)}
                              className={`px-2 py-1 text-[10px] font-mono border rounded transition-all ${entryPoint === f.name
                                ? 'bg-labstx-orange text-white border-labstx-orange'
                                : 'bg-caspier-black text-caspier-text border-caspier-border hover:border-labstx-orange'
                                }`}
                            >
                              {f.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Read-Only Functions */}
                  {contractInterface.functions.filter((f: any) => f.access === 'read_only').length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-caspier-muted mb-2 uppercase opacity-60">Read Operations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contractInterface.functions
                          .filter((f: any) => f.access === 'read_only')
                          .map((f: any) => (
                            <button
                              key={f.name}
                              onClick={() => {
                                setEntryPoint(f.name);
                                setKeyName(f.name); // Also set for state query
                              }}
                              className={`px-2 py-1 text-[10px] font-mono border rounded transition-all ${(entryPoint === f.name || keyName === f.name)
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-caspier-black text-caspier-text border-caspier-border hover:border-green-500'
                                }`}
                            >
                              {f.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Entry Point</label>
              <input
                type="text"
                placeholder="e.g., increment, get_count"
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Arguments (JSON)</label>
              <textarea
                placeholder="{}"
                value={argumentsJson}
                onChange={(e) => setArgumentsJson(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono h-20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCallContract}
                className="w-full text-[10px] font-black uppercase tracking-widest py-2.5 bg-labstx-orange text-white border-labstx-orange hover:shadow-neobrutal-sm active:shadow-none translate-x-[-1px] translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
                variant="primary"
              >
                Call Contract
              </Button>
              <p className="text-[9px] text-caspier-muted text-center italic">Results will appear in the terminal below</p>
            </div>
          </div>

          <div className="bg-caspier-black/30 border border-caspier-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-caspier-muted uppercase tracking-tighter">Query State (Free Read)</h4>
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>

            <div>
              <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Key Name</label>
              <input
                type="text"
                placeholder="count"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleQueryState}
                className="w-full text-[10px] font-black uppercase tracking-widest py-2 bg-caspier-dark border-caspier-border text-caspier-text hover:border-labstx-orange transition-all"
                variant="secondary"
              >
                Query State
              </Button>
              <p className="text-[8px] text-caspier-muted text-center leading-tight">No gas required - reads state directly from chain</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DeployPanel;
