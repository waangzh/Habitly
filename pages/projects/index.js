/**
 * 项目列表页
 * 展示所有进行中的习惯项目
 */

const service = require('../../services/habitService');
const { buildProjectCard } = require('../../utils/project');

Page({
  data: {
    projects: [],
    pausedCount: 0,
  },

  onShow() {
    this.loadProjects();
  },

  /** 加载项目列表 */
  loadProjects() {
    this.setData({
      projects: service.getProjects('active').map(buildProjectCard),
      pausedCount: service.getProjects('paused').length,
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/project-form/index' });
  },

  goPaused() {
    wx.navigateTo({ url: '/pages/paused-projects/index' });
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

  handlePause(event) {
    service.updateProjectStatus(event.detail.projectId, 'paused');
    wx.showToast({ title: '项目已暂停', icon: 'success' });
    this.loadProjects();
  },
});
