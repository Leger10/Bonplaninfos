import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';
import selectionModePlugin from './plugins/selection-mode/vite-plugin-selection-mode.js';

const isDev = process.env.NODE_ENV !== 'production';

// ... (tes constantes configHorizons restent inchangées)
const configHorizonsViteErrorHandler = `...`; 
const configHorizonsRuntimeErrorHandler = `...`;
const configHorizonsConsoleErrroHandler = `...`;
const configWindowFetchMonkeyPatch = `...`;
const configNavigationHandler = `...`;

const addTransformIndexHtml = {
    name: 'add-transform-index-html',
    transformIndexHtml(html) {
        const tags = [
            {
                tag: 'script',
                attrs: { type: 'module' },
                children: configHorizonsRuntimeErrorHandler,
                injectTo: 'head',
            },
            {
                tag: 'script',
                attrs: { type: 'module' },
                children: configHorizonsViteErrorHandler,
                injectTo: 'head',
            },
            {
                tag: 'script',
                attrs: {type: 'module'},
                children: configHorizonsConsoleErrroHandler,
                injectTo: 'head',
            },
            {
                tag: 'script',
                attrs: { type: 'module' },
                children: configWindowFetchMonkeyPatch,
                injectTo: 'head',
            },
            {
                tag: 'script',
                attrs: { type: 'module' },
                children: configNavigationHandler,
                injectTo: 'head',
            },
        ];

        if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
            tags.push(
                {
                    tag: 'script',
                    attrs: {
                        src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
                        'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
                    },
                    injectTo: 'head',
                }
            );
        }

        return { html, tags };
    },
};

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
    if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
        return;
    }
    loggerError(msg, options);
}

export default defineConfig({
    customLogger: logger,
    plugins: [
        ...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin(), selectionModePlugin()] : []),
        react(),
        addTransformIndexHtml
    ],
    // AJOUT : Optimisation pour Supabase
    optimizeDeps: {
        include: ['@supabase/supabase-js', '@supabase/storage-js', '@supabase/postgrest-js']
    },
    server: {
        cors: true,
        headers: {
            'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        allowedHosts: true,
    },
    resolve: {
        extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // AJOUT : Gestion des modules CommonJS pour éviter l'erreur de résolution
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true
        },
        rollupOptions: {
            external: [
                '@babel/parser',
                '@babel/traverse',
                '@babel/generator',
                '@babel/types'
            ]
        }
    }
});