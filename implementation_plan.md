# Improve ClarityLSP Service

The goal is to enhance the `services/clarityLsp.ts` to be a functional replica of the native Clarity LSP in VSCode, providing features like rich completion, hover documentation, signature help, and Go to Definition. We will focus exclusively on `.clar` files as per user clarification.

## User Review Required

> [!IMPORTANT]
> The "Go to Definition" feature will be implemented as a local scan of the current contract. For "External" contract calls, a full cross-file resolution is not included in this simple version unless you provide a way to access other files in the workspace.

## Proposed Changes

### [Component Name] services

#### [MODIFY] [clarityLsp.ts](file:///c:/Users/USER/Desktop/LabSTX/IDE/services/clarityLsp.ts)

1.  **Sync Reference Data**: Update all keywords, types, and builtins to match the `clarity-lsp` source.
2.  **Add `getHover`**: Returns documentation for Clarity builtins and keywords.
3.  **Add `getDefinitions`**: Scans the contract for user-defined functions/symbols and returns their location.
4.  **Add `getSignatureHelp`**: Provides parameter hints while typing.

### [Component Name] components/Editor

#### [MODIFY] [CodeEditor.tsx](file:///c:/Users/USER/Desktop/LabSTX/IDE/components/Editor/CodeEditor.tsx)

1.  **Register Providers**: Register providers for `DefinitionProvider`, `HoverProvider`, and `SignatureHelpProvider`.
2.  **Ensure Strict Matching**: Ensure Clarity features ONLY apply to `clarity` language files.

## Open Questions

> [!QUESTION]
> Do you want Go to Definition to support cross-file navigation? If so, I'll need to know how to resolve contract names (e.g. `.my-contract`) to file paths in your workspace.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
- **Definition**: F12 on a function name to jump to its definition.
- **Hover**: Hover over a keyword (e.g. `var-get`) to see help.
- **Completion**: Verify snippets work as intended.
- **Diagnostics**: Ensure bracket matching remains functional.
