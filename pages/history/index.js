/**
 * 历史记录页
 * 按月展示所有打卡记录
 */

const service = require('../../services/habitService');
const { formatDisplayDate } = require('../../utils/date');

Page({
  data: {
    groups: [],
  },

  async onShow() {
    try {
      const groups = await service.getHistoryGrouped();
      this.setData({
        groups: groups.map((group) => ({
          ...group,
          items: (group.items || []).map((item) => ({
            ...item,
            displayDate: formatDisplayDate(item.date),
            checkedTime: item.checkedAt ? item.checkedAt.slice(11, 16) : '',
          })),
        })),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '历史加载失败',
        icon: 'none',
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
