import { nodeResolve } from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import externals from 'rollup-plugin-node-externals';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'index.ts',
  plugins: [
    externals(),
    nodeResolve(),
    postcss({ extract: true }),
    esbuild({ target: 'es2020', jsx: 'automatic' }),
  ],
  output: [
    { file: 'dist/esm/index.mjs', format: 'esm' },
    { file: 'dist/cjs/index.cjs', format: 'cjs' },
  ],
};
