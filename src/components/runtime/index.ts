/**
 * Runtime Components
 * Components for executing AI-generated applications
 */

/**
 * @deprecated Use PreviewRuntime instead. IframeSandbox will be removed in a future version.
 * The new PreviewRuntime uses server-side bundling with esbuild instead of client-side Babel.
 */
export { IframeSandbox, type IframeSandboxProps } from './IframeSandbox';

/**
 * New preview runtime with server-side bundling (recommended)
 * Features:
 * - Server-side TypeScript/JSX transpilation via esbuild
 * - Dynamic dependency bundle loading
 * - Better error handling with source context
 * - Debug panel for development
 */
export { PreviewRuntime, type PreviewRuntimeProps } from './PreviewRuntime';

// Shared communication bridge
export { 
  SandboxBridge, 
  validateSandboxMessage, 
  signMessage, 
  verifySignature,
  type SandboxMessage,
  type MessageHandler,
} from './SandboxBridge';
