import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      proxy: {
        '/ide-api/clarity': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/auth': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/github': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/project': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/git': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/ai': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ide-api/stats': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // RPC proxy endpoint - handled by Vite middleware in dev, Vercel serverless in prod
        '/ide-api/rpc': {
          target: 'https://node.testnet.casper.network',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/ide-api\/rpc/, '/rpc'),
          configure: (proxy) => {
            proxy.on('error', (err) => console.log('[RPC Proxy] Error:', err.message));
            proxy.on('proxyReq', () => console.log('[RPC Proxy] Request to Casper testnet'));
          },
        },
        '/casper-rpc': {
          target: 'https://rpc.testnet.casperlabs.io',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/casper-rpc/, ''),
        },
        '/casper-node-rpc': {
          target: 'https://node-clarity-testnet.make.services',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/casper-node-rpc/, ''),
        },
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      wasm(),
      topLevelAwait()
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.CHAINGPT_API_KEY': JSON.stringify(env.CHAINGPT_API_KEY),
      'process.env.AI_PROVIDER': JSON.stringify(env.AI_PROVIDER || 'chaingpt'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'casper-sdk': ['casper-js-sdk'],
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
