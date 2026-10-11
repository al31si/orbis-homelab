export function parseSdkExports(source: string): string[];

export function shimSource(options: {
  globalKey: 'react' | 'jsxRuntime' | 'sdk';
  names: readonly string[];
  withDefault: boolean;
}): string;

export function generateShims(options: {
  sdkSource: string;
  reactExports: readonly string[];
  jsxRuntimeExports: readonly string[];
}): Record<
  'react.js' | 'jsx-runtime.js' | 'orbis-sdk-client.js' | 'belvedere-sdk-client.js',
  string
>;
