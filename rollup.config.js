import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'

import pkg from './package.json'

const deps = Object.keys(pkg.peerDependencies)
const external = (id) => {
  return !!deps.find((dep) => dep === id || id.startsWith(`${dep}/`))
}
const plugins = ({ isUmd, isModule, isCommonJS, isProd }) => [
  resolve(), // so Rollup can find `ms`
  commonjs(), // so Rollup can convert `ms` to an ES module
  typescript({
    abortOnError: false,
    tsconfig: `./tsconfig.json`,
    tsconfigOverride: {
      module: isCommonJS ? 'CommonJS' : isModule ? 'esnext' : 'umd',
    },
    // COMPAT: Without this flag sometimes the declarations are not updated.
    clean: true,
    check: false,
    // Increase to 3 if having issues with types
    verbosity: 1,
    useTsconfigDeclarationDir: false,
  }),
  babel({
    include: [`./src/**`],
    extensions: ['.js', '.ts', '.tsx'],
    babelHelpers: 'runtime',
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        isUmd
          ? { modules: false }
          : {
              exclude: [
                '@babel/plugin-transform-regenerator',
                '@babel/transform-async-to-generator',
              ],
              modules: false,
              targets: {
                esmodules: isModule,
              },
            },
      ],
      '@babel/preset-react',
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        isUmd
          ? {}
          : {
              regenerator: false,
              useESModules: isModule,
            },
      ],
      '@babel/plugin-proposal-class-properties',
    ],
  }),
  isUmd && isProd && terser(),
]

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.ts',
    output: {
      name: 'sequencer',
      file: pkg.umd,
      format: 'umd',
      exports: 'named',
      globals: external,
    },
    plugins: plugins({ isUmd: true }),
  },
  {
    input: 'src/index.ts',
    output: {
      name: 'sequencer',
      file: pkg.umdMin,
      format: 'umd',
      exports: 'named',
      globals: external,
    },
    plugins: plugins({ isUmd: true, isProd: true }),
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/index.ts',
    external,
    output: [{ file: pkg.module, format: 'es', sourcemap: true }],
    plugins: plugins({ isModule: true }),
  },
  {
    input: 'src/index.ts',
    external,
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
      },
    ],
    plugins: plugins({ isCommonJS: true }),
  },
]
