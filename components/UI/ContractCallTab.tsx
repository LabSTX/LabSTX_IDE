import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { StacksWalletService } from '../../services/stacks/wallet';
import { ProjectSettings, WalletConnection } from '../../types';
import { runExclusively } from '../../services/stacks/simnet';
import {
  uintCV, intCV, principalCV, trueCV, falseCV, noneCV, stringUtf8CV, stringAsciiCV, listCV, tupleCV,
  ClarityValue, serializeCV, deserializeCV, cvToValue, ClarityType, bufferCV, someCV,
  cvToHex
} from '@stacks/transactions';
import { bytesToHex, hexToBytes } from '@stacks/common';
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_MOCKNET } from '@stacks/network';
import { PlusIcon, Variable, VariableIcon } from 'lucide-react';
import { getProviders } from 'sats-connect';
import { openContractCall, request } from '@stacks/connect';
import { DEFAULT_SETTINGS } from '@/constants';

interface ContractCallTabProps {
  contractHash: string;
  theme: 'dark' | 'light';
  wallet: WalletConnection;
  activeSimnetAccount?: string;
  network: string;
  deployedContracts?: any[];
  onAddTerminalLine?: (line: any) => void;
  onOpenStxerDebugger?: (txId?: string) => void;
  onImport?: (type: 'contract_id', value: string, network: any) => Promise<void>;
  onAddActivity?: (activity: any) => void;
}

const cvToClarityString = (cv: ClarityValue): string => {
  switch (cv.type) {
    case ClarityType.Int:
      return `i${cv.value.toString()}`;
    case ClarityType.UInt:
      return `u${cv.value.toString()}`;
    case ClarityType.BoolTrue:
      return 'true';
    case ClarityType.BoolFalse:
      return 'false';
    case ClarityType.PrincipalStandard:
    case ClarityType.PrincipalContract:
      return cv.value;
    case ClarityType.OptionalNone:
      return 'none';
    case ClarityType.OptionalSome:
      return `(some ${cvToClarityString(cv.value)})`;
    case ClarityType.ResponseOk:
      return `(ok ${cvToClarityString(cv.value)})`;
    case ClarityType.ResponseErr:
      return `(err ${cvToClarityString(cv.value)})`;
    case ClarityType.StringASCII:
      return `"${cv.value}"`;
    case ClarityType.StringUTF8:
      return `u"${cv.value}"`;
    case ClarityType.List:
      return `(list ${cv.value.map(cvToClarityString).join(' ')})`;
    case ClarityType.Tuple:
      const fields = Object.entries(cv.value)
        .map(([key, val]) => `(${key} ${cvToClarityString(val as ClarityValue)})`)
        .join(' ');
      return `(tuple ${fields})`;
    default:
      return JSON.stringify(cv);
  }
};

const formatClarityType = (type: any): string => {
  if (!type) return 'unknown';
  if (typeof type === 'string') return type;

  if (type.uint128 !== undefined) return 'uint128';
  if (type.int128 !== undefined) return 'int128';
  if (type.bool !== undefined) return 'bool';
  if (type.principal !== undefined) return 'principal';
  if (type.standard_principal !== undefined) return 'principal';
  if (type.contract_principal !== undefined) return 'contract_principal';

  if (type['string-ascii'] !== undefined) {
    return `string-ascii ${type['string-ascii'].length}`;
  }
  if (type['string-utf8'] !== undefined) {
    return `string-utf8 ${type['string-utf8'].length}`;
  }

  if (type.list !== undefined) {
    return `list (${formatClarityType(type.list.type)})`;
  }

  if (type.tuple !== undefined) {
    const fields = type.tuple.map((f: any) => `${f.name}: ${formatClarityType(f.type)}`).join(', ');
    return `tuple (${fields})`;
  }

  if (type.optional !== undefined) {
    return `optional (${formatClarityType(type.optional)})`;
  }

  if (type.response !== undefined) {
    const okType = formatClarityType(type.response.ok);
    const errType = formatClarityType(type.response.error);
    return `response (ok: ${okType}, err: ${errType})`;
  }

  if (type.buffer !== undefined) {
    return `buff ${type.buffer.length}`;
  }

  return typeof type === 'object' ? JSON.stringify(type) : String(type);
};

export const ContractCallTab: React.FC<ContractCallTabProps> = ({
  contractHash,
  theme,
  wallet,
  activeSimnetAccount,
  network,
  deployedContracts = [],
  onAddTerminalLine,
  onOpenStxerDebugger,
  onImport,
  onAddActivity
}) => {
  const [contractInterface, setContractInterface] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entryPoint, setEntryPoint] = useState('');
  const [functionArgs, setFunctionArgs] = useState<Record<string, string>>({});
  const [argumentsJson, setArgumentsJson] = useState('{}');
  const [showJsonInput, setShowJsonInput] = useState(false);

  const [queryValue, setQueryValue] = useState<string | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryMode, setQueryMode] = useState<'json' | 'clarity'>('json');
  const [rawQueryResult, setRawQueryResult] = useState<ClarityValue | null>(null);

  const [callValue, setCallValue] = useState<string | null>(null);
  const [loadingCall, setLoadingCall] = useState(false);
  const [rawCallResult, setRawCallResult] = useState<ClarityValue | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [fetchingTxResult, setFetchingTxResult] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const parts = contractHash.split('.');
  const contractAddress = parts[0];
  const contractName = parts[1];

  const isSimnet = network === 'simnet';

  useEffect(() => {
    const fetchAbi = async () => {
      if (!contractAddress || !contractName) return;

      // Reset interaction states when contract changes
      setEntryPoint('');
      setFunctionArgs({});
      setQueryValue(null);
      setRawQueryResult(null);
      setCallValue(null);
      setRawCallResult(null);
      setCallError(null);
      setTxResult(null);
      setFetchingTxResult(false);
      setLastTxId(null);

      setArgumentsJson('{}');
      setShowJsonInput(false);

      setLoading(true);
      setError(null);

      try {
        if (network === 'simnet') {
          // Resolve from local state
          const localContract = (deployedContracts || []).find(c => c.contractHash === contractHash && c.network === 'simnet' && (c.activityType === 'deploy' || c.entryPoints));
          if (localContract && localContract.entryPoints) {
            // Map our EntryPoint format to the Hiro API format the component expects
            const mappedFunctions = localContract.entryPoints.map((ep: any) => ({
              name: ep.name,
              access: ep.access === 'Public' ? 'public' : (ep.access === 'ReadOnly' ? 'read_only' : 'private'),
              args: ep.args.map((arg: any) => ({
                name: arg.name,
                type: arg.type
              }))
            }));

            setContractInterface({
              functions: mappedFunctions,
              variables: [], // TODO: store these in DeployedContract if needed
              maps: [],
              fungible_tokens: [],
              non_fungible_tokens: []
            });
          } else {
            setError(`Contract ${contractHash} not found in Simnet deployment history.`);
          }
        } else {
          const abi = await StacksWalletService.getContractInterface(contractAddress, contractName, network);
          if (abi) {
            setContractInterface(abi);
          } else {
            setError('Could not find contract interface on chain.');
          }
        }
      } catch (err: any) {
        setError(`Failed to fetch ABI: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAbi();
  }, [contractHash, deployedContracts, network]);

  useEffect(() => {
    if (contractInterface && entryPoint) {
      const func = contractInterface.functions.find((f: any) => f.name === entryPoint);
      if (func && func.args) {
        const initialArgs: Record<string, string> = {};
        // Use recursive function to initialize all nested fields
        const initFieldByType = (path: string, type: any) => {
          if (!type) return;
          if (type.tuple) {
            type.tuple.forEach((f: any) => initFieldByType(`${path}.${f.name}`, f.type));
          } else if (type.optional) {
            initFieldByType(path, type.optional);
          } else {
            initialArgs[path] = '';
          }
        };

        const initFields = (args: any[]) => {
          args.forEach((arg: any) => {
            initFieldByType(arg.name, arg.type);
          });
        };
        initFields(func.args);
        setFunctionArgs(initialArgs);
      } else {
        setFunctionArgs({});
      }
    } else {
      setFunctionArgs({});
    }
  }, [entryPoint, contractInterface]);

  useEffect(() => {
    if (rawQueryResult) {
      if (queryMode === 'json') {
        const humanReadable = cvToValue(rawQueryResult);
        const formatted = typeof humanReadable === 'object'
          ? JSON.stringify(humanReadable, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)
          : String(humanReadable);
        setQueryValue(formatted);
      } else {
        setQueryValue(cvToClarityString(rawQueryResult));
      }
    }
  }, [rawQueryResult, queryMode]);

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

  // Helper to serialize an input string to a ClarityValue based on its expected type
  const serializeByClarityType = (value: string, type: any): ClarityValue => {
    if (!value || value.toLowerCase() === 'none') {
      if (formatClarityType(type).toLowerCase().includes('optional')) return noneCV();
    }

    const typeStr = formatClarityType(type).toLowerCase();

    // Priority 1: Optionals (recursive)
    if (typeStr.includes('optional')) {
      if (value.toLowerCase() === 'none' || !value) return noneCV();
      // Try to find the inner type. This is naive but works for simple case like (optional uint)
      const innerType = typeStr.replace('optional', '').trim().replace(/^\(|\)$/g, '');
      return someCV(serializeByClarityType(value, innerType));
    }

    // Priority 2: Tuples and Lists (JSON)
    if (typeStr.includes('tuple') || typeStr.includes('list')) {
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          return toCV(JSON.parse(value));
        }
      } catch (e) { }
    }

    // Priority 3: Buffers
    if (typeStr.includes('buff')) {
      if (!value || value.trim() === '') {
        return bufferCV(new Uint8Array());
      }

      const isStrictHex = value.startsWith('0x');
      let hex = isStrictHex ? value.slice(2) : value;
      const isHexChars = /^[0-9a-fA-F]*$/.test(hex);

      if (isStrictHex || (isHexChars && hex.length > 0)) {
        // Allow odd-length hex by padding with leading zero (e.g., '1' -> '01')
        if (hex.length % 2 !== 0) {
          hex = '0' + hex;
        }
        try {
          return bufferCV(hexToBytes(hex));
        } catch (e) {
          // If hex parsing fails (unlikely due to regex), fallback to UTF-8
        }
      }
      return bufferCV(new TextEncoder().encode(value));
    }

    // Priority 4: Primitives
    if (typeStr.includes('uint')) return uintCV(value || 0);
    if (typeStr.includes('int')) return intCV(value || 0);
    if (typeStr === 'bool' || typeStr.includes('bool')) {
      return value.toLowerCase() === 'true' ? trueCV() : falseCV();
    }
    if (typeStr.includes('principal')) return principalCV(value);
    if (typeStr.startsWith('string-ascii')) return stringAsciiCV(value);
    if (typeStr.startsWith('string-utf8')) return stringUtf8CV(value);

    return toCV(value);
  }


  // Helper to serialize an input from functionArgs state by its path
  const serializeByPath = (path: string, type: any): ClarityValue => {
    const typeStr = formatClarityType(type).toLowerCase();

    // Handle Optionals
    if (typeStr.includes('optional') || type.optional) {
      const innerType = type.optional || (typeof type === 'object' ? Object.values(type)[0] : null);
      if (!innerType) return noneCV();

      // If it's an optional tuple, check if any of its sub-fields are filled
      if (innerType.tuple) {
        const hasValue = innerType.tuple.some((f: any) => {
          const fieldPath = `${path}.${f.name}`;
          const val = functionArgs[fieldPath];
          return val && val.trim() !== '' && val.toLowerCase() !== 'none';
        });

        if (!hasValue) return noneCV();
        return someCV(serializeByPath(path, innerType));
      }

      // Fallback for simple optionals
      const val = functionArgs[path];
      if (!val || val.toLowerCase() === 'none' || val.trim() === '') return noneCV();
      return someCV(serializeByPath(path, innerType));
    }

    // Handle Tuples (Recursive)
    if (type && typeof type === 'object' && (type.tuple || type.type?.tuple)) {
      const fields = type.tuple || type.type?.tuple;
      const tupleData: Record<string, ClarityValue> = {};
      fields.forEach((field: any) => {
        const fieldPath = `${path}.${field.name}`;
        tupleData[field.name] = serializeByPath(fieldPath, field.type);
      });
      return tupleCV(tupleData);
    }

    // Case for simple types or JSON fallback
    const rawValue = functionArgs[path] || '';
    return serializeByClarityType(rawValue, type);
  };

  const handleCallContract = async () => {
    if (!contractHash || !entryPoint) {
      setCallError('Please select a function to call.');
      return;
    }

    let cvArgs: ClarityValue[] = [];

    if (showJsonInput) {
      try {
        const trimmedJson = argumentsJson.trim();
        if (!trimmedJson || trimmedJson === '{}' || trimmedJson === '[]') {
          cvArgs = [];
        } else {
          const parsed = JSON.parse(trimmedJson);
          if (Array.isArray(parsed)) {
            cvArgs = parsed.map(toCV);
          } else {
            cvArgs = [toCV(parsed)];
          }
        }
      } catch (e) {
        setCallError('Arguments parsing failed, sending empty args');
        console.warn('Arguments parsing failed, sending empty args');
      }
    } else {
      const func = contractInterface?.functions.find((f: any) => f.name === entryPoint);
      if (func && func.args) {
        cvArgs = func.args.map((argDef: any) => {
          return serializeByPath(argDef.name, argDef.type);
        });
      }
    }

    setLoadingCall(true);
    setCallValue(null);
    setRawCallResult(null);
    setCallError(null);
    setTxResult(null);
    setFetchingTxResult(false);

    if (network === 'simnet') {
      try {
        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'command',
            content: `Simulating contract call on Simnet: ${contractHash}::${entryPoint}...`
          });
        }

        const result = await runExclusively(async (simnet) => {
          return simnet.callPublicFn(contractHash, entryPoint, cvArgs, activeSimnetAccount || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
        });

        console.log('[Simnet] Call result:', result);

        if (onAddTerminalLine) {
          const readableResult = cvToClarityString(result.result);
          onAddTerminalLine({
            type: 'result',
            content: `Simnet call returned: ${readableResult}`,
            data: { result: readableResult }
          });
        }
        setRawCallResult(result.result);
        if (onAddActivity) {
          onAddActivity({
            name: `${contractHash.split('.')[1]}::${entryPoint}`,
            contractHash: contractHash,
            deployHash: '', // Simnet doesn't have txId in the same way
            network: network,
            activityType: 'call'
          });
        }
      } catch (err: any) {
        console.error('[Simnet] Call failed:', err);
        if (onAddTerminalLine) {
          const detailedError = err instanceof Error ? (err.stack || err.message) : String(err);
          onAddTerminalLine({
            type: 'error',
            content: `Simnet Call failed: ${detailedError}`
          });
        }
        setCallError(`Simnet Call Error: ${err.message}`);
      } finally {
        setLoadingCall(false);
      }
      return;
    }

    // ✅ CORRECT: Standard JS variable assignment, no hooks inside a function
    let settings = DEFAULT_SETTINGS;
    const saved = localStorage.getItem('labstx_settings');

    if (saved) {
      try {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse settings, using defaults');
      }
    }

    const stxNetwork = settings?.network



    try {
      const callParams: any = {
        contract: `${contractAddress}.${contractName}`,
        functionName: entryPoint.trim(),
        functionArgs: cvArgs.map((arg: any) => cvToHex(arg)),
        network: stxNetwork,
        postConditionMode: 'allow',
      };

      const providers = getProviders();
      const isXverseInstalled = providers.find(p => p.id === 'XverseProviders.BitcoinProvider');
      const isLeatherInstalled = providers.find(p => p.id === 'LeatherProvider');

      let response;

      if (wallet.type === 'leather' && isLeatherInstalled) {
        // Capture the result of the request
        response = await request(
          { provider: (window as any).LeatherProvider || (window as any).StacksProvider },
          'stx_callContract',
          callParams
        );
      }
      else if (wallet.type === 'xverse' && isXverseInstalled) {
        const xverseProvider = (window as any).XverseProviders?.Stacks || (window as any).BitcoinProvider;

        // Capture the result of the request
        response = await request(
          { provider: xverseProvider },
          'stx_callContract',
          callParams
        );
      }

      // --- ADD THIS LOGIC TO CLEAR LOADING ---
      if (response && response.txid) {
        const txId = response.txid;
        setLastTxId(txId);
        console.log("Transaction ID:", txId);
        console.log("Response:", response);
        setCallValue(txId);

        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'success',
            content: `Transaction broadcasted: ${txId}`
          });
        }

        onAddTerminalLine({
          type: 'info',
          content: 'Debug with stxer.xyz',
          data: { action: 'debug', txId: txId }


        });

        // Trigger your result fetcher
        setTimeout(() => {
          handleFetchTxResult(txId);
        }, 2000);

        if (onAddActivity) {
          onAddActivity({
            name: `${contractHash.split('.')[1]}::${entryPoint}`,
            contractHash: contractHash,
            deployHash: txId,
            network: network,
            activityType: 'call'
          });
        }
      }

      // Always turn off loading if we reached this point without an error
      setLoadingCall(false);

    } catch (err: any) {
      console.error("Wallet Interaction Error:", err);
      setCallError(`Interaction Error: ${err.message}`);
      setLoadingCall(false); // Ensure loading stops on user cancellation/rejection
    }
  }

  const handleQueryState = async (funcName: string) => {
    // simplified read-only state query
    if (!contractHash || !funcName) return;

    setLoadingQuery(true);
    try {
      let rawCvArgs: ClarityValue[] = [];

      const func = contractInterface?.functions.find((f: any) => f.name === funcName);
      if (func && func.args) {
        rawCvArgs = func.args.map((argDef: any) => {
          return serializeByPath(argDef.name, argDef.type);
        });
      }

      if (network === 'simnet') {
        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'command',
            content: `Querying read-only state on Simnet: ${contractHash}::${funcName}...`
          });
        }

        const result = await runExclusively(async (simnet) => {
          return simnet.callReadOnlyFn(contractHash, funcName, rawCvArgs, activeSimnetAccount || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
        });

        console.log('[Simnet] Query result:', result);

        setRawQueryResult(result.result);

        if (onAddTerminalLine) {
          const readableResult = result.result ? cvToClarityString(result.result) : 'N/A';
          onAddTerminalLine({
            type: result.result ? 'result' : 'error',
            content: `Simnet query returned: ${readableResult}`
          });
        }
        if (!result.result && (result as any).error) {
          setQueryValue(`Runtime Error: ${(result as any).error}`);
        } else if (onAddActivity) {
          onAddActivity({
            name: `${contractHash.split('.')[1]}::${funcName}`,
            contractHash: contractHash,
            deployHash: '',
            network: network,
            activityType: 'query'
          });
        }
      } else {
        const apiUrl = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
        let cvArgs: string[] = [];

        cvArgs = rawCvArgs.map(cv => {
          const bytes = serializeCV(cv);
          return '0x' + (typeof bytes === 'string' ? bytes : bytesToHex(bytes as Uint8Array));
        });

        const response = await fetch(`${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${funcName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: wallet.address || contractAddress,
            arguments: cvArgs
          })
        });

        const result = await response.json();
        if (result.okay) {
          const hex = result.result.startsWith('0x') ? result.result.slice(2) : result.result;
          const decodedCV = deserializeCV(hexToBytes(hex));
          setRawQueryResult(decodedCV);
          if (onAddActivity) {
            onAddActivity({
              name: `${contractName}::${funcName}`,
              contractHash: `${contractAddress}.${contractName}`,
              deployHash: '',
              network: network,
              activityType: 'query'
            });
          }
        } else {
          setQueryValue(`Error: ${result.cause}`);
          setRawQueryResult(null);
        }
      }
    } catch (err: any) {
      setQueryValue(`Error: ${err.message}`);
      setRawQueryResult(null);
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'error',
          content: `Simnet Query failed: ${err.message}`
        });
      }
    } finally {
      setLoadingQuery(false);
    }
  }

  const handleFetchTxResult = async (txId: string) => {
    if (!txId) return;
    setFetchingTxResult(true);
    setCallError(null);
    try {
      const apiUrl = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
      const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);

      if (response.status === 404) {
        setTxResult('Transaction not found yet. It may still be in the mempool.');
        return;
      }

      const data = await response.json();
      console.log('[HiroAPI] Transaction data:', data);

      if (data.tx_status === 'pending') {
        setTxResult('Transaction is still pending in the mempool...');
      } else if (data.tx_status === 'success') {
        if (data.tx_result && data.tx_result.repr) {
          setTxResult(data.tx_result.repr);
        } else {
          setTxResult('Success (No result representation found)');
        }
      } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
        setTxResult(`Failed: ${data.tx_status}${data.tx_result?.repr ? ` - ${data.tx_result.repr}` : ''}`);
      } else {
        setTxResult(`Status: ${data.tx_status}`);
      }
    } catch (err: any) {
      console.error('[HiroAPI] Failed to fetch tx result:', err);
      setCallError(`Failed to fetch result: ${err.message}`);
    } finally {
      setFetchingTxResult(false);
    }
  };

  const handleImportToWorkspace = async () => {
    if (!onImport || !contractHash) return;
    try {
      await onImport('contract_id', contractHash, network);
    } catch (err: any) {
      console.error('[Import] Failed:', err);
    }
  };


  // Recursive field renderer for complex types
  const renderArgField = (name: string, type: any, path = '') => {
    const currentPath = path ? `${path}.${name}` : name;

    // Handle Optionals first to wrap them in UI
    if (type.optional) {
      return (
        <div key={currentPath} className="space-y-3 pl-4 border-l border-caspier-border/20 ml-1.5 mt-4 first:mt-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] font-black text-caspier-muted uppercase tracking-widest">{name}</div>
            <div className="text-[8px] font-mono text-caspier-muted/60 uppercase border border-caspier-border/30 px-1 rounded">Optional</div>
          </div>
          {renderArgField(name, type.optional, path)}
        </div>
      );
    }

    const isTuple = !!type.tuple;

    if (isTuple) {
      return (
        <div key={currentPath} className="space-y-3 pl-4 border-l border-caspier-border/40 ml-1.5 mt-4 first:mt-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] font-black text-caspier-muted uppercase tracking-widest">{name}</div>
            <div className="text-[8px] font-mono text-caspier-muted/60 uppercase border border-caspier-border/30 px-1 rounded">Tuple</div>
          </div>
          <div className="space-y-4">
            {type.tuple.map((field: any) => (
              <div key={field.name}>
                {renderArgField(field.name, field.type, currentPath)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={currentPath}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-mono text-caspier-text font-medium">{currentPath}</span>
          <span className="text-[9px] font-mono text-caspier-muted italic bg-caspier-black px-1.5 py-0.5 rounded border border-caspier-border">
            {formatClarityType(type)}
          </span>
        </div>
        <input
          type="text"
          placeholder={`Enter value for ${name}...`}
          value={functionArgs[currentPath] || ''}
          onChange={(e) => setFunctionArgs({ ...functionArgs, [currentPath]: e.target.value })}
          className="w-full bg-caspier-black/40 border border-caspier-border text-caspier-text px-3 py-2 text-xs focus:border-labstx-orange outline-none rounded font-mono transition-all"
        />
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-caspier-muted font-mono flex items-center justify-center">Loading ABI for {contractHash}...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 font-mono text-center">{error}</div>;
  }

  const publicFns = contractInterface?.functions?.filter((f: any) => f.access === 'public') || [];
  const readOnlyFns = contractInterface?.functions?.filter((f: any) => f.access === 'read_only') || [];
  const privateFns = contractInterface?.functions?.filter((f: any) => f.access === 'private') || [];
  const allFunctions = [...publicFns, ...readOnlyFns];
  const totalFnsCount = allFunctions.length + privateFns.length;

  const selectedFuncDef = contractInterface?.functions?.find((f: any) => f.name === entryPoint);

  return (
    <div className="h-full flex text-caspier-text bg-caspier-black font-sans">
      {/* LEFT PANEL: Details */}
      <div className="flex-1 max-w-[300px] border-r border-caspier-border bg-caspier-black p-5">
        <h2 className="text-[14px] font-bold text-caspier-text mb-6">Contract details  <span className="text-xs font-medium text-labstx-orange uppercase bg-caspier-black/50 border border-caspier-border px-2 py-1 rounded inline-block ml-2">{network}</span></h2>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-caspier-muted tracking-wide block mb-1">Contract Name</span>
            <span className="text-sm font-medium text-labstx-orange">{contractName}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-caspier-muted tracking-wide block mb-1">Address</span>
            <span className="text-xs font-mono bg-caspier-black/50 border border-caspier-border px-2 py-1 rounded inline-block">
              {contractAddress.substring(0, 8)}...{contractAddress.slice(-8)}
            </span>
          </div>

          <div className="pt-4 border-t border-caspier-border">
            <span className="text-[10px] uppercase font-bold text-caspier-muted tracking-wide block mb-3">Stats</span>
            <ul className="space-y-2 text-xs font-medium text-caspier-muted">
              <li className="flex items-center gap-2 tracking-wide"><span className="text-blue-400  border border-caspier-border px-1.5 py-0.5 rounded-full">fx</span> {totalFnsCount} functions</li>
              <li className="flex items-center gap-2 tracking-wide"><span className="text-purple-400  border border-caspier-border px-1.5 py-0.5 rounded-full"><VariableIcon className='w-3 h-3' /></span> {contractInterface?.variables?.length || 0} variables</li>
              <li className="flex items-center gap-2 tracking-wide"><span className="text-green-400  border border-caspier-border px-1.5 py-0.5 rounded-full">≡</span> {contractInterface?.maps?.length || 0} maps</li>
              <li className="flex items-center gap-2 tracking-wide"><span className="text-yellow-400  border border-caspier-border px-1.5 py-0.5 rounded-full">❐</span> {contractInterface?.fungible_tokens?.length || contractInterface?.non_fungible_tokens?.length || 0} tokens</li>
            </ul>
          </div>

          {network === "simnet" && <div className="pt-4 border-t border-caspier-border">
            <span className="text-[10px] uppercase font-bold text-caspier-muted tracking-wide block mb-3">Note:</span>
            <ul className="space-y-2 text-xs font-medium text-caspier-muted">
              <li className="flex items-center gap-2 tracking-wide">&gt;<span className="px-1.5 py-0.5 rounded-full">This is a <strong className='underline'> Simnet</strong> Contract, so it is not deployed on the blockchain but on the local browser.</span></li>
              <li className="flex items-center gap-2 tracking-wide">&gt;<span className="px-1.5 py-0.5 rounded-full">Some interaction may not work consider deploying to Testnet or Mainnet and try again.</span></li>
            </ul>
          </div>
          }
        </div>
      </div>

      {/* RIGHT PANEL: Functions */}
      <div className="flex-[2] flex flex-col">
        <div className="p-5 border-b border-caspier-border flex items-center justify-between ">
          <h2 className="text-[14px] font-bold text-caspier-test">Available functions</h2>

          <Button
            variant="primary"
            onClick={handleImportToWorkspace}
            disabled={isSimnet || !onImport}
            className="w-fit text-[10px] font-black uppercase py-2 bg-caspier-black hover:bg-caspier-hover text-caspier-text active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            title={isSimnet ? "Importing is only available for on-chain contracts" : "Add this contract to your workspace"}
          >
            <PlusIcon className="w-3 h-3" />
            Add contract to Workspace</Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* List of functions */}
          <div className="flex-1  border-r border-caspier-border overflow-y-auto custom-scrollbar p-3 space-y-1 bg-caspier-black/80">
            {allFunctions.map((fn: any) => {
              const isReadOnly = fn.access === 'read_only';
              return (
                <button
                  type="button"
                  key={fn.name}
                  onClick={(e) => { e.preventDefault(); setEntryPoint(fn.name); setQueryValue(null); }}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors flex items-center justify-between group
                    ${entryPoint === fn.name ? 'bg-labstx-orange/10 text-labstx-orange border border-labstx-orange/30' : 'text-caspier-muted hover:bg-caspier-hover hover:text-caspier-text border border-transparent'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`border border-caspier-border px-1.5 py-0.5 rounded-full text-[10px] ${isReadOnly ? 'text-green-400' : 'text-blue-400'}`}>fx</span>
                    <span className="truncate">{fn.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-tighter ${isReadOnly ? 'bg-green-600/10  border border-green-500/20' : 'bg-blue-500/10  border border-blue-500/20'}`}>
                      {isReadOnly ? 'Read only' : 'Public'}
                    </span>
                    <span className={`text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${entryPoint === fn.name ? 'opacity-100' : ''}`}>→</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Function Execution Form */}
          <div className="flex-[2]  p-5 overflow-y-auto">
            {entryPoint ? (
              <div className="max-w-xl">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-lg font-bold text-caspier-test font-mono">{entryPoint}</h3>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${selectedFuncDef?.access === 'read_only' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>
                    {selectedFuncDef?.access === 'read_only' ? 'Free Read' : 'State Changing'}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-caspier-muted block uppercase tracking-tight">
                      {showJsonInput ? 'Arguments (JSON)' : 'Function Arguments'}
                    </label>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowJsonInput(!showJsonInput); }}
                      className="text-[10px] font-bold text-labstx-orange hover:underline uppercase tracking-tighter"
                    >
                      {showJsonInput ? 'Use Auto-Fields' : 'Use Raw JSON'}
                    </button>
                  </div>

                  {showJsonInput ? (
                    <textarea
                      placeholder="{}"
                      value={argumentsJson}
                      onChange={(e) => setArgumentsJson(e.target.value)}
                      className="w-full bg-caspier-black border border-caspier-border  text-caspier-text px-3 py-3 text-[11px] focus:border-labstx-orange outline-none rounded font-mono h-32 resize-none"
                    />
                  ) : (
                    <div className="space-y-4">
                      {selectedFuncDef?.args?.map((arg: any) => (
                        <div key={arg.name}>
                          {renderArgField(arg.name, arg.type)}
                        </div>
                      ))}
                      {(!selectedFuncDef?.args || selectedFuncDef.args.length === 0) && (
                        <div className="p-4  border border-caspier-border rounded border-dashed text-center">
                          <p className="text-[11px] text-caspier-muted italic">No arguments needed for this function</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    selectedFuncDef?.access === 'read_only' ? handleQueryState(entryPoint) : handleCallContract();
                  }}
                  className="w-full py-3 font-bold uppercase tracking-widest text-[11px]"
                  variant={selectedFuncDef?.access === 'read_only' ? 'secondary' : 'primary'}
                >
                  {selectedFuncDef?.access === 'read_only' ? 'Execute Query' : 'Call Contract'}
                </Button>



                {(loadingQuery || queryValue) && (
                  <div className="mt-6 p-4 border border-caspier-border rounded bg-caspier-black/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-caspier-muted">Query Result</div>
                      <div className="flex bg-[#1B1D22] p-0.5 rounded border border-[#2A2D35]">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setQueryMode('json'); }}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${queryMode === 'json' ? 'bg-labstx-orange text-white' : 'text-caspier-muted hover:text-white'}`}
                        >
                          JSON
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setQueryMode('clarity'); }}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${queryMode === 'clarity' ? 'bg-labstx-orange text-white' : 'text-caspier-muted hover:text-white'}`}
                        >
                          Clarity
                        </button>
                      </div>
                    </div>
                    {loadingQuery ? (
                      <div className="text-xs text-caspier-muted animate-pulse">Running query...</div>
                    ) : (
                      <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">{queryValue}</pre>
                    )}
                  </div>
                )}

                {(loadingCall || callValue || callError || !loadingQuery) && (
                  <div className="mt-4 p-4 border border-caspier-border rounded bg-caspier-black/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-caspier-muted">Call Result</div>
                      {rawCallResult && (
                        <div className="flex bg-[#1B1D22] p-0.5 rounded border border-[#2A2D35]">
                          <button
                            onClick={() => setQueryMode('json')}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${queryMode === 'json' ? 'bg-labstx-orange text-white' : 'text-caspier-muted hover:text-white'}`}
                          >
                            JSON
                          </button>
                          <button
                            onClick={() => setQueryMode('clarity')}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${queryMode === 'clarity' ? 'bg-labstx-orange text-white' : 'text-caspier-muted hover:text-white'}`}
                          >
                            Clarity
                          </button>
                        </div>
                      )}
                    </div>
                    {loadingCall ? (
                      <div className="text-xs text-caspier-muted animate-pulse">Broadcasting transaction...</div>
                    ) : callError ? (
                      <div className="text-xs font-mono text-red-500 whitespace-pre-wrap break-all">{callError}</div>
                    ) : (
                      <div className="space-y-3">
                        {network !== 'simnet' && callValue && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-caspier-muted uppercase font-bold tracking-tighter">Transaction Hash</span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-labstx-orange bg-caspier-black/50 px-2 py-1 rounded border border-caspier-border truncate flex-1">
                                {callValue}
                              </code>
                              <a
                                href={`https://explorer.hiro.so/txid/${callValue}?chain=${network}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-1 bg-caspier-hover text-caspier-text rounded border border-caspier-border hover:bg-caspier-border transition-colors font-bold uppercase"
                              >
                                View in Hiro Explorer
                              </a>
                            </div>

                            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-caspier-border/30">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-caspier-muted uppercase font-bold tracking-tighter">Transaction Result</span>
                                {!fetchingTxResult && (
                                  <button
                                    onClick={() => handleFetchTxResult(callValue)}
                                    className="text-[9px] text-labstx-orange hover:underline uppercase font-bold tracking-widest"
                                  >
                                    {txResult ? 'Refresh' : 'Fetch Result'}
                                  </button>
                                )}
                              </div>
                              {fetchingTxResult ? (
                                <div className="text-[10px] text-caspier-muted animate-pulse italic">Querying Hiro API...</div>
                              ) : txResult ? (
                                <pre className="text-xs font-mono text-green-400 bg-caspier-black/50 px-2 py-1 rounded border border-caspier-border whitespace-pre-wrap break-all">
                                  {txResult}
                                </pre>
                              ) : (
                                <div className="text-[10px] text-caspier-muted italic">Result will be available once the transaction is included in a block.</div>
                              )}
                            </div>
                          </div>
                        )}
                        {network === 'simnet' && callValue && (
                          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">{callValue}</pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-caspier-muted opacity-50">
                <div className="text-[40px] mb-4">←</div>
                <p className="text-sm">Select a function from the left to interact</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
