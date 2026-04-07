/**
 * 底部导航栏组件
 * 提供主要页面间的导航切换
 */

Component({
  properties: {
    current: String,
  },

  methods: {
    /** 切换页面 */
    onSwitch(event) {
      const key = event.currentTarget.dataset.key;
      if (key === this.properties.current) {
        return;
      }

      const routeMap = {
        home: '/pages/home/index',
        projects: '/pages/projects/index',
        achievements: '/pages/achievements/index',
        more: '/pages/more/index',
      };

      if (routeMap[key]) {
        wx.redirectTo({ url: routeMap[key] });
        return;
      }

      wx.showToast({
        title: '该页面正在准备中',
        icon: 'none',
      });
    },
  },
});
