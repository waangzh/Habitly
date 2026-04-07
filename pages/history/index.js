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

  onShow() {
    this.setData({
      groups: service.getHistoryGrouped().map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          displayDate: formatDisplayDate(item.date),
          checkedTime: item.checkedAt.slice(11, 16),
        })),
      })),
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
