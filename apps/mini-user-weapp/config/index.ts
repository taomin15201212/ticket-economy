import { defineConfig, type UserConfigExport } from '@tarojs/cli'

const config: UserConfigExport = {
  projectName: 'mini-user-weapp',
  date: '2026-7-22',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-vue3'],
  defineConstants: {},
  copy: { patterns: [], options: {} },
  framework: 'vue3',
  compiler: 'vite',
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: false },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
}

export default defineConfig(async (merge) => {
  return merge({}, config)
})
