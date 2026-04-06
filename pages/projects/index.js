const service = require('../../services/habitService');

function formatStartedLabel(dateText) {
  if (!dateText) {
    return 'Since today';
  }

  const [year, month, day] = dateText.split('-');
  return `Since ${month} ${day}, ${year}`;
}

function getTargetLabel(project) {
  if (project.targetType === 'forever') {
    return '\u6c38\u8fdc';
  }

  if (project.targetValue) {
    return `${project.targetValue}\u5929`;
  }

  return '\u957f\u671f';
}

function buildProjectCard(project) {
  const detail = service.getProjectDetail(project.projectId);
  const stats = detail ? detail.stats : { monthCheckins: 0, currentStreak: 0 };

  return {
    ...project,
    cardStats: {
      monthCheckins: stats.monthCheckins || 0,
      currentStreak: stats.currentStreak || 0,
      targetLabel: getTargetLabel(project),
      startedLabel: formatStartedLabel(project.startDate),
    },
  };
}

Page({
  data: {
    projects: [],
    pausedCount: 0,
  },

  onShow() {
    this.loadProjects();
  },

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
    wx.showToast({ title: '\u9879\u76ee\u5df2\u6682\u505c', icon: 'success' });
    this.loadProjects();
  },
});
