export default {
  env: {
    NODE_ENV: '"development"',
  },
  defineConstants: {
    // 开发时指向本地 API；真机调试改成局域网 IP
    TARO_APP_API: '"http://127.0.0.1:3000"',
  },
  mini: {},
  h5: {},
}
