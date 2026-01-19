/**
 * Runtime Library
 * Utilities for executing AI-generated applications
 */

export {
  bundleCode,
  validateCode,
  estimateComplexity,
  type BundleOptions,
  type BundleResult,
} from './code-bundler';

export {
  BUNDLE_CONFIG,
  BLOCKED_PACKAGES,
  analyzeImports,
  getAllPackages,
  getBundleUrl,
  getGlobalNamespace,
  isPackageAllowed,
  isPackageBlocked,
  getAlwaysLoadedBundles,
  getLazyLoadedBundles,
  type BundleName,
  type BundleInfo,
  type DependencyManifest,
} from './dependency-bundle';

export {
  bundleAppCode,
  validateTypeScript,
  quickSyntaxCheck,
  type ServerBundleResult,
  type ServerBundleOptions,
  type BundleError,
} from './server-bundler';

export {
  RuntimeErrorMonitor,
  runtimeErrorMonitor,
  SANDBOX_ERROR_REPORTER_SCRIPT,
  type SandboxErrorEvent,
  type RuntimeErrorCallback,
} from './runtime-error-monitor';
