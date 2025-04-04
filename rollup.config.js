import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

const packageJson = require('./package.json');

const getPlugins = (tsconfig) => [
  peerDepsExternal(),
  resolve(),
  commonjs(),
  typescript({ tsconfig }),
  postcss({
    extensions: ['.css'],
    minimize: true,
    inject: true,
    extract: false,
  }),
  terser(),
];
const external = [...Object.keys(packageJson.peerDependencies || {})];

export default [
  // React bundle
  {
    input: 'src/react/index.ts',
    output: [
      {
        file: 'dist/react/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/react/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: getPlugins('./tsconfig.react.json'),
    external,
  },
  // Vanilla bundle
  {
    input: 'src/vanilla/index.ts',
    output: [
      {
        file: 'dist/vanilla/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/vanilla/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: getPlugins('./tsconfig.vanilla.json'),
    external,
  },
  // Vanilla bundle for browser script tag
  {
    input: 'src/vanilla/index.ts',
    output: [
      {
        file: 'dist/index.browser.js',
        format: 'iife',
        name: 'dynamiq',
        sourcemap: true,
        globals: {
          marked: 'marked',
        },
      },
    ],
    plugins: [
      resolve({
        browser: true,
      }),
      ...getPlugins('./tsconfig.vanilla.json'),
    ],
    external: [],
  },
];
