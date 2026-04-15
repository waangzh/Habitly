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

  async handleDelete(projectId) {
    try {
      await service.deleteProject(projectId);
      wx.showToast({ title: '项目已删除', icon: 'success' });
      await this.loadProjects();
    } catch (error) {
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
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

  handleMore(event) {
    const projectId = event.detail.projectId;

    wx.showActionSheet({
      itemList: ['编辑项目', '暂停项目', '删除项目'],
      success: (result) => {
        if (result.tapIndex === 0) {
          this.handleEdit({ detail: { projectId } });
          return;
        }

        if (result.tapIndex === 1) {
          this.handlePause({ detail: { projectId } });
          return;
        }

        if (result.tapIndex === 2) {
          wx.showModal({
            title: '删除项目',
            content: '删除后，项目列表和首页将不再显示这个项目，但历史记录会保留。确定删除吗？',
            confirmColor: '#ff5e67',
            success: (modalResult) => {
              if (modalResult.confirm) {
                this.handleDelete(projectId);
              }
            },
          });
        }
      },
    });
  },
});
