export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/ticket/index',
    'pages/blindbox/index',
    'pages/coupons/index',
    'pages/checkin/index',
    'pages/points/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0369a1',
    navigationBarTitleText: '文旅消费券',
    navigationBarTextStyle: 'white',
  },
  permission: {
    'scope.userLocation': {
      desc: '用于景区/商圈打卡校验',
    },
  },
  requiredPrivateInfos: ['getLocation'],
})
