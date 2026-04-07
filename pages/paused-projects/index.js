/**
 * 暂停项目页
 * 展示所有已暂停的习惯项目
 */

const service = require('../../services/habitService');
const { buildProjectCard } = require('../../utils/project');

Page({
  data: {
    projects: [],
  },

  onShow() {
    this.loadProjects();
  },

  /** 加载暂停项目列表 */
  loadProjects() {
    this.setData({
      projects: service.getProjects('paused').map(buildProjectCard),
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/project-detail/index?projectId=${event.detail.projectId}`,
    });
  },

  handleEdit(event) {
    wx.navigateTo({
      url: `/pages/project-form/index?projectId=${event.detail.projectId}`,
    });
  },

  handleResume(event) {
    service.updateProjectStatus(event.detail.projectId, 'active');
    wx.showToast({ title: '项目已恢复', icon: 'success' });
    this.loadProjects();
  },
});
