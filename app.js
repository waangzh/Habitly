/**
 * Habitly - 习惯养成小程序
 * 帮助用户建立和追踪日常习惯
 */

const authService = require('./services/authService');

App({
  globalData: {
    user: {
      ...authService.DEFAULT_USER,
      syncStatus: 'pending',
    },
    authReady: null,
  },

  onLaunch() {
    this.globalData.authReady = authService.initSession().catch(() => null);
  },
});
