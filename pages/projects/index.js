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

  async onShow() {
    await this.loadProjects();
  },

  async loadProjects() {
    try {
      const [activeProjects, pausedProjects] = await Promise.all([
        service.getProjects('active'),
        service.getProjects('paused'),
      ]);

      this.setData({
        projects: activeProjects.map(buildProjectCard),
        pausedCount: pausedProjects.length,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '项目加载失败',
        icon: 'none',
      });
    }
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

  async handlePause(event) {
    try {
      await service.updateProjectStatus(event.detail.projectId, 'paused');
      wx.showToast({ title: '项目已暂停', icon: 'success' });
      await this.loadProjects();
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },
});
