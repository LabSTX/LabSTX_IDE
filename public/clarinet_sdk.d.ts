/* tslint:disable */
/* eslint-disable */
export type ClarityVersionString = "Clarity1" | "Clarity2" | "Clarity3"| "Clarity4" | "Clarity5";

export type EpochString =
| "2.0"
| "2.05"
| "2.1"
| "2.2"
| "2.3"
| "2.4"
| "2.5"
| "3.0"
| "3.1"
| "3.2"
| "3.3"
| "3.4";


export type IContractInterface = {
    functions: ContractInterfaceFunction[];
    variables: ContractInterfaceVariable[];
    maps: ContractInterfaceMap[];
    fungible_tokens: ContractInterfaceFungibleTokens[];
    non_fungible_tokens: ContractInterfaceNonFungibleTokens[];
    epoch: StacksEpochId;
    clarity_version: ClarityVersionString;
};

export type StacksEpochId =
| "Epoch10"
| "Epoch20"
| "Epoch2_05"
| "Epoch21"
| "Epoch22"
| "Epoch23"
| "Epoch24"
| "Epoch25"
| "Epoch30"
| "Epoch31"
| "Epoch32"
| "Epoch33"
| "Epoch34";

type Atom = {
    Atom: String;
};

type AtomValue = {
    AtomValue: any;
};

type ContractInterfaceAtomType =
| "none"
| "int128"
| "uint128"
| "bool"
| "principal"
| { buffer: { length: number } }
| { "string-utf8": { length: number } }
| { "string-ascii": { length: number } }
| { tuple: ContractInterfaceTupleEntryType[] }
| { optional: ContractInterfaceAtomType }
| { response: { ok: ContractInterfaceAtomType; error: ContractInterfaceAtomType } }
| { list: { type: ContractInterfaceAtomType; length: number } }
| "trait_reference";

type ContractInterfaceFunction = {
    name: string;
    access: ContractInterfaceFunctionAccess;
    args: ContractInterfaceFunctionArg[];
    outputs: ContractInterfaceFunctionOutput;
};

type ContractInterfaceFunctionAccess = "private" | "public" | "read_only";

type ContractInterfaceFunctionArg = { name: string; type: ContractInterfaceAtomType };

type ContractInterfaceFunctionOutput = { type: ContractInterfaceAtomType };

type ContractInterfaceFungibleTokens = { name: string };

type ContractInterfaceMap = {
    name: string;
    key: ContractInterfaceAtomType;
    value: ContractInterfaceAtomType;
};

type ContractInterfaceNonFungibleTokens = { name: string; type: ContractInterfaceAtomType };

type ContractInterfaceTupleEntryType = { name: string; type: ContractInterfaceAtomType };

type ContractInterfaceVariable = {
    name: string;
    type: ContractInterfaceAtomType;
    access: ContractInterfaceVariableAccess;
};

type ContractInterfaceVariableAccess = "constant" | "variable";

type Expression = {
    expr: ExpressionType;
    id: number;
    span: Span;
};

type ExpressionType = Atom | AtomValue | List | LiteralValue | Field | TraitReference;

type Field = {
    Field: any;
};

type IContractAST = {
    contract_identifier: any;
    pre_expressions: any[];
    expressions: Expression[];
    top_level_expression_sorting: number[];
    referenced_traits: Map<any, any>;
    implemented_traits: any[];
};

type List = {
    List: Expression[];
};

type LiteralValue = {
    LiteralValue: any;
};

type Span = {
    start_line: number;
    start_column: number;
    end_line: number;
    end_column: number;
};

type TraitReference = {
    TraitReference: any;
};


export class CallFnArgs {
    free(): void;
    [Symbol.dispose](): void;
    constructor(contract: string, method: string, args: Uint8Array[], sender: string);
}

export class ContractOptions {
    free(): void;
    [Symbol.dispose](): void;
    constructor(clarity_version?: number | null);
}

export class DeployContractArgs {
    free(): void;
    [Symbol.dispose](): void;
    constructor(name: string, content: string, options: ContractOptions, sender: string);
}

export class SDK {
    free(): void;
    [Symbol.dispose](): void;
    callPrivateFn(args: CallFnArgs): TransactionRes;
    callPublicFn(args: CallFnArgs): TransactionRes;
    callReadOnlyFn(args: CallFnArgs): TransactionRes;
    clearCache(): void;
    collectReport(include_boot_contracts: boolean, boot_contracts_path: string): SessionReport;
    deployContract(args: DeployContractArgs): TransactionRes;
    enablePerformance(cost_field: string): void;
    execute(snippet: string): TransactionRes;
    executeCommand(snippet: string): string;
    generateDeploymentPlan(cwd: string, manifest_path: string): Promise<void>;
    getAccounts(): Map<string, string>;
    getAssetsMap(): Map<string, Map<string, bigint>>;
    getBlockTime(): bigint;
    getContractAST(contract: string): IContractAST;
    getContractSource(contract: string): string | undefined;
    getContractsInterfaces(): Map<string, IContractInterface>;
    getDataVar(contract: string, var_name: string): string;
    getDefaultClarityVersionForCurrentEpoch(): ClarityVersionString;
    static getDefaultEpoch(): EpochString;
    /**
     * Returns the last contract call trace as a string, if available.
     */
    getLastContractCallTrace(): string | undefined;
    getMapEntry(contract: string, map_name: string, map_key: Uint8Array): string;
    initEmptySession(remote_data_settings: any): Promise<void>;
    initSession(cwd: string, manifest_path: string): Promise<void>;
    mineBlock(js_txs: Array<any>): any;
    mineEmptyBlock(): number;
    mineEmptyBlocks(count?: number | null): number;
    mineEmptyBurnBlock(): number;
    mineEmptyBurnBlocks(count?: number | null): number;
    mineEmptyStacksBlock(): number;
    mineEmptyStacksBlocks(count?: number | null): number;
    mintFT(token: string, recipient: string, amount: bigint): string;
    mintSTX(recipient: string, amount: bigint): string;
    constructor(fs_request: Function, options?: SDKOptions | null);
    runSnippet(snippet: string): string;
    setCurrentTestName(test_name: string): void;
    setEpoch(epoch: EpochString): void;
    setLocalAccounts(addresses: string[]): void;
    transferSTX(args: TransferSTXArgs): TransactionRes;
    deployer: string;
    readonly blockHeight: number;
    readonly burnBlockHeight: number;
    readonly currentEpoch: string;
    readonly stacksBlockHeight: number;
}

export class SDKOptions {
    free(): void;
    [Symbol.dispose](): void;
    constructor(track_costs: boolean, track_coverage: boolean, track_performance?: boolean | null);
    trackCosts: boolean;
    trackCoverage: boolean;
    trackPerformance: boolean;
}

export class SessionReport {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    costs: string;
    coverage: string;
}

export class TransactionRes {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    costs: string;
    events: string;
    get performance(): string | undefined;
    set performance(value: string | null | undefined);
    result: string;
}

export class TransferSTXArgs {
    free(): void;
    [Symbol.dispose](): void;
    constructor(amount: bigint, recipient: string, sender: string);
}

export class TxArgs {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
}
