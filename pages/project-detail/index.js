const service = require('../../services/habitService');
const { formatDisplayDate } = require('../../utils/date');

Page({
  data: {
    detail: null,
  },

  onLoad(options) {
    this.projectId = options.projectId;
    this.loadDetail(this.projectId);
  },

  onShow() {
    if (this.projectId) {
      this.loadDetail(this.projectId);
    }
  },

  loadDetail(projectId) {
    const detail = service.getProjectDetail(projectId);
    if (!detail) {
      return;
    }

    this.setData({
      detail: {
        ...detail,
        records: detail.records.map((item) => ({
          ...item,
          displayDate: formatDisplayDate(item.date),
          checkedTime: item.checkedAt.slice(11, 16),
        })),
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goEdit() {
    wx.navigateTo({
      url: `/pages/project-form/index?projectId=${this.projectId}`,
    });
  },

  toggleStatus() {
    if (!this.data.detail) {
      return;
    }

    const nextStatus = this.data.detail.project.status === 'active' ? 'paused' : 'active';
    service.updateProjectStatus(this.projectId, nextStatus);
    wx.showToast({
      title: nextStatus === 'paused' ? '项目已暂停' : '项目已恢复',
      icon: 'success',
    });
    this.loadDetail(this.projectId);
  },

  goReport() {
    wx.navigateTo({
      url: `/pages/report-card/index?projectId=${this.projectId}`,
    });
  },
});
