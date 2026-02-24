import { CompilationResult, ContractMetadata, EntryPoint, EntryPointArg } from '../../types';

/**
 * Rust WASM Compiler Service
 * Note: Full Rust compilation in browser requires WebAssembly-based rustc.
 * This is a simulation that would need to be replaced with actual WASM-based compiler.
 */
export class RustCompiler {
  static async compile(
    sourceCode: string,
    contractName: string,
    optimize: boolean = true
  ): Promise<CompilationResult> {
    try {
      console.log(`Compiling Rust contract: ${contractName}...`);

      // Create FormData with source code
      const formData = new FormData();
      const blob = new Blob([sourceCode], { type: 'text/plain' });
      formData.append('source', blob, 'lib.rs');

      // In production (Vercel), use /api/compile proxy to avoid mixed content errors
      // In development, use direct GCP URL if available
      const isDev = import.meta.env.DEV;
      const compilerUrl = import.meta.env.VITE_COMPILER_SERVICE_URL;

      let endpoint: string;
      if (isDev && compilerUrl) {
        // Development: direct GCP access
        const cleanUrl = compilerUrl.replace(/\/$/, '');
        endpoint = `${cleanUrl}/compile`;
        console.log('Using direct GCP compiler:', endpoint);
      } else if (import.meta.env.PROD) {
        // Production (Vercel): use serverless proxy to avoid mixed content
        endpoint = '/api/compile';
        console.log('Using Vercel API proxy:', endpoint);
      } else {
        // Fallback to mock if no URL in dev
        console.warn('No compiler URL configured, using mock compilation');
        return this.compileMock(sourceCode, contractName, optimize);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          errors: [errorData.error || 'Compilation failed', errorData.details || ''].filter(Boolean)
        };
      }

      // Get WASM binary
      const wasmBlob = await response.blob();
      const wasmArrayBuffer = await wasmBlob.arrayBuffer();
      const wasm = new Uint8Array(wasmArrayBuffer);

      // Extract entry points from source code
      const entryPoints = this.extractEntryPoints(sourceCode);

      // Convert to base64
      const wasmBase64 = btoa(String.fromCharCode(...wasm));

      console.log(`✓ Compilation successful! WASM size: ${wasm.length} bytes`);

      return {
        success: true,
        wasm,
        wasmBase64,
        warnings: [],
        metadata: {
          entryPoints,
          contractType: 'rust',
          contractPackage: contractName
        }
      };
    } catch (error: any) {
      console.error('Compilation error:', error);
      return {
        success: false,
        errors: [error.message || 'Failed to connect to compilation service']
      };
    }
  }

  /**
   * Fallback mock compilation for when remote service is unavailable
   */
  private static async compileMock(
    sourceCode: string,
    contractName: string,
    optimize: boolean = true
  ): Promise<CompilationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required Casper imports
    if (!sourceCode.includes('casper_contract') && !sourceCode.includes('casper-types')) {
      warnings.push('Missing Casper contract dependencies. Ensure Cargo.toml includes casper-contract and casper-types.');
    }

    // Check for #[no_mangle] and call() function or entry points
    const hasNoMangleCall = sourceCode.includes('#[no_mangle]') &&
      (sourceCode.includes('pub extern "C" fn call()') || sourceCode.includes('fn call()'));
    const hasEntryPoints = sourceCode.includes('EntryPoints::new()') || sourceCode.includes('EntryPoint::new');

    if (!hasNoMangleCall && !hasEntryPoints) {
      errors.push('Contract must have either a #[no_mangle] pub extern "C" fn call() entry point or define EntryPoints');
    }

    if (!sourceCode.includes('#![no_std]')) {
      warnings.push('Consider adding #![no_std] for WASM compilation');
    }

    if (!sourceCode.includes('#![no_main]')) {
      warnings.push('Consider adding #![no_main] for contract entry points');
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings
      };
    }

    const entryPoints = this.extractEntryPoints(sourceCode);
    const mockWasm = this.generateMockWasm(contractName);

    return {
      success: true,
      wasm: mockWasm,
      wasmBase64: btoa(String.fromCharCode(...mockWasm)),
      warnings: [...warnings, '⚠️ Using mock compilation - configure VITE_COMPILER_SERVICE_URL for real compilation'],
      metadata: {
        entryPoints,
        contractType: 'rust',
        contractPackage: contractName
      }
    };
  }

  private static extractEntryPoints(sourceCode: string): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];

    // Look for #[no_mangle] pub extern "C" fn patterns with better regex
    const entryPointRegex = /#\[no_mangle\]\s+pub\s+extern\s+"C"\s+fn\s+(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = entryPointRegex.exec(sourceCode)) !== null) {
      const name = match[1];
      const paramsStr = match[2] || '';

      // Parse parameters
      const args: EntryPointArg[] = [];
      if (paramsStr.trim()) {
        const params = paramsStr.split(',').map(p => p.trim());
        for (const param of params) {
          const paramMatch = param.match(/(\w+):\s*(\w+)/);
          if (paramMatch) {
            args.push({
              name: paramMatch[1],
              type: paramMatch[2]
            });
          }
        }
      }

      // Try to find return type
      let ret = 'Unit';
      const returnTypeMatch = sourceCode.match(new RegExp(`fn\\s+${name}\\s*\\([^)]*\\)\\s*->\\s*(\\w+)`));
      if (returnTypeMatch) {
        ret = returnTypeMatch[1];
      }

      entryPoints.push({
        name,
        args,
        access: 'Public',
        ret
      });
    }

    // Default entry point (call function)
    if (sourceCode.includes('fn call()') || sourceCode.includes('pub extern "C" fn call()')) {
      // Check if call() has parameters
      const callMatch = sourceCode.match(/fn\s+call\s*\(([^)]*)\)/);
      const args: EntryPointArg[] = [];

      if (callMatch && callMatch[1].trim()) {
        const params = callMatch[1].split(',').map(p => p.trim());
        for (const param of params) {
          const paramMatch = param.match(/(\w+):\s*(\w+)/);
          if (paramMatch) {
            args.push({
              name: paramMatch[1],
              type: paramMatch[2]
            });
          }
        }
      }

      // Check for runtime args in call() function
      const runtimeArgRegex = /runtime::get_named_arg\s*\(\s*"([^"]+)"\s*\)/g;
      let argMatch;
      while ((argMatch = runtimeArgRegex.exec(sourceCode)) !== null) {
        const argName = argMatch[1];
        if (!args.find(a => a.name === argName)) {
          args.push({
            name: argName,
            type: 'String' // Default type, could be improved
          });
        }
      }

      entryPoints.push({
        name: 'call',
        args,
        access: 'Public',
        ret: 'Unit'
      });
    }

    // Also look for EntryPoints::new() patterns to extract defined entry points
    const entryPointsNewRegex = /EntryPoint::new\s*\(\s*"([^"]+)"\s*,\s*\[([^\]]*)\]\s*,\s*(\w+)\s*,\s*EntryPointAccess::(\w+)/g;
    let epMatch;
    while ((epMatch = entryPointsNewRegex.exec(sourceCode)) !== null) {
      const epName = epMatch[1];
      const epArgsStr = epMatch[2] || '';
      const epRet = epMatch[3];
      const epAccess = epMatch[4] === 'Public' ? 'Public' : 'Group';

      const epArgs: EntryPointArg[] = [];
      if (epArgsStr.trim()) {
        // Parse Parameter::new() patterns
        const paramRegex = /Parameter::new\s*\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(epArgsStr)) !== null) {
          epArgs.push({
            name: paramMatch[1],
            type: paramMatch[2]
          });
        }
      }

      // Only add if not already present
      if (!entryPoints.find(ep => ep.name === epName)) {
        entryPoints.push({
          name: epName,
          args: epArgs,
          access: epAccess,
          ret: epRet
        });
      }
    }

    return entryPoints;
  }

  private static generateMockWasm(contractName: string): Uint8Array {
    // Generate a minimal valid WASM module header
    // This is a placeholder - real compilation would produce actual WASM
    const wasmHeader = [
      0x00, 0x61, 0x73, 0x6d, // WASM magic number
      0x01, 0x00, 0x00, 0x00, // WASM version
    ];

    // Add some mock data
    const mockData = new TextEncoder().encode(`Casper Contract: ${contractName}`);

    return new Uint8Array([...wasmHeader, ...mockData]);
  }
}

/**
 * AssemblyScript Compiler Service
 * Uses AssemblyScript compiler (can run in browser via WebAssembly)
 */
export class AssemblyScriptCompiler {
  static async compile(
    sourceCode: string,
    contractName: string,
    optimize: boolean = true
  ): Promise<CompilationResult> {
    try {
      console.log(`Compiling AssemblyScript contract: ${contractName}`);

      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!sourceCode.includes('@external')) {
        warnings.push('No @external entry points found. Contract may not be callable.');
      }

      // In production, this would use the AssemblyScript compiler
      // For now, we'll simulate compilation
      const entryPoints = this.extractEntryPoints(sourceCode);

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          warnings
        };
      }

      // Generate mock WASM
      const mockWasm = this.generateMockWasm(contractName);

      return {
        success: true,
        wasm: mockWasm,
        wasmBase64: btoa(String.fromCharCode(...mockWasm)),
        warnings,
        metadata: {
          entryPoints,
          contractType: 'assemblyscript',
          contractPackage: contractName
        }
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Compilation failed']
      };
    }
  }

  private static extractEntryPoints(sourceCode: string): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];

    // Look for @external decorators with function signatures
    const entryPointRegex = /@external\s+export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/g;
    let match;

    while ((match = entryPointRegex.exec(sourceCode)) !== null) {
      const name = match[1];
      const paramsStr = match[2] || '';
      const returnType = match[3] || 'void';

      // Parse parameters
      const args: EntryPointArg[] = [];
      if (paramsStr.trim()) {
        const params = paramsStr.split(',').map(p => p.trim());
        for (const param of params) {
          const paramMatch = param.match(/(\w+):\s*(\w+)/);
          if (paramMatch) {
            args.push({
              name: paramMatch[1],
              type: paramMatch[2]
            });
          }
        }
      }

      entryPoints.push({
        name,
        args,
        access: 'Public',
        ret: returnType
      });
    }

    // Also look for simpler patterns without return type
    const simpleRegex = /@external\s+export\s+function\s+(\w+)\s*\(([^)]*)\)/g;
    let simpleMatch;
    while ((simpleMatch = simpleRegex.exec(sourceCode)) !== null) {
      const name = simpleMatch[1];
      const paramsStr = simpleMatch[2] || '';

      // Skip if already added
      if (entryPoints.find(ep => ep.name === name)) continue;

      const args: EntryPointArg[] = [];
      if (paramsStr.trim()) {
        const params = paramsStr.split(',').map(p => p.trim());
        for (const param of params) {
          const paramMatch = param.match(/(\w+):\s*(\w+)/);
          if (paramMatch) {
            args.push({
              name: paramMatch[1],
              type: paramMatch[2]
            });
          }
        }
      }

      entryPoints.push({
        name,
        args,
        access: 'Public',
        ret: 'void'
      });
    }

    return entryPoints;
  }

  private static generateMockWasm(contractName: string): Uint8Array {
    const wasmHeader = [
      0x00, 0x61, 0x73, 0x6d,
      0x01, 0x00, 0x00, 0x00,
    ];

    const mockData = new TextEncoder().encode(`AssemblyScript Contract: ${contractName}`);

    return new Uint8Array([...wasmHeader, ...mockData]);
  }
}










