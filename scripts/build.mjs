import esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.es.js',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  target: 'es2020',
  logLevel: 'info',
});

// The design system ships plain CSS (tokens + component classes), not CSS-in-JS.
cpSync('src/styles.css', 'dist/styles.css');

console.log('✓ built dist/index.es.js + dist/styles.css');
