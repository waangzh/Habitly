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

  async onShow() {
    await this.loadProjects();
  },

  async loadProjects() {
    try {
      const projects = await service.getProjects('paused');
      this.setData({
        projects: projects.map(buildProjectCard),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '项目加载失败',
        icon: 'none',
      });
    }
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

  async handleResume(event) {
    try {
      await service.updateProjectStatus(event.detail.projectId, 'active');
      wx.showToast({ title: '项目已恢复', icon: 'success' });
      await this.loadProjects();
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },
});
