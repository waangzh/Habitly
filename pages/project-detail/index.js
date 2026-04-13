/**
 * 项目详情页
 * 展示项目详情、统计和 AI 洞察
 */

const aiService = require('../../services/aiService');
const service = require('../../services/habitService');
const { formatDisplayDate, getWeekDays } = require('../../utils/date');

function buildWeeklyInsightPayload(detail) {
  const weekStart = getWeekDays()[0].key;
  const weekRecords = (detail.records || []).filter((item) => item.date >= weekStart);
  const scoreRecords = weekRecords.filter((item) => Number(item.scoreValue || 0) > 0);

  return {
    periodType: 'week',
    periodKey: weekStart,
    scope: 'project',
    title: detail.project.title,
    totalCheckins: weekRecords.length,
    currentStreak: detail.stats.currentStreak || 0,
    averageScore: scoreRecords.length
      ? Math.round((scoreRecords.reduce((sum, item) => sum + Number(item.scoreValue || 0), 0) / scoreRecords.length) * 10) / 10
      : 0,
    lowEnergyCount: weekRecords.filter((item) => item.moodValue === '有点累').length,
    reminderEnabled: !!detail.project.reminderEnabled,
    reminderTimes: detail.project.reminderTimes || [],
    metricEnabled: !!detail.project.metricEnabled,
    metricUnit: detail.project.metricUnit || '',
  };
}

Page({
  data: {
    detail: null,
    aiInsight: null,
  },

  async onLoad(options) {
    this.projectId = options.projectId;
    await this.loadDetail(this.projectId);
  },

  async onShow() {
    if (this.projectId) {
      await this.loadDetail(this.projectId);
    }
  },

  async loadDetail(projectId) {
    try {
      const detail = await service.getProjectDetail(projectId);
      if (!detail) {
        return;
      }

      this.setData({
        detail: {
          ...detail,
          project: {
            ...detail.project,
            displayReminderTimes: (detail.project.reminderTimes || []).join('、'),
          },
          records: (detail.records || []).map((item) => ({
            ...item,
            displayDate: formatDisplayDate(item.date),
            checkedTime: item.checkedAt ? item.checkedAt.slice(11, 16) : '',
          })),
        },
      });

      const aiInsight = await aiService.getReportInsight(buildWeeklyInsightPayload(detail));
      this.setData({ aiInsight });
    } catch (error) {
      wx.showToast({
        title: error.message || '详情加载失败',
        icon: 'none',
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goEdit() {
    wx.navigateTo({
      url: `/pages/project-form/index?projectId=${this.projectId}`,
    });
  },

  async toggleStatus() {
    if (!this.data.detail) {
      return;
    }

    const nextStatus = this.data.detail.project.status === 'active' ? 'paused' : 'active';

    try {
      await service.updateProjectStatus(this.projectId, nextStatus);
      wx.showToast({
        title: nextStatus === 'paused' ? '项目已暂停' : '项目已恢复',
        icon: 'success',
      });
      await this.loadDetail(this.projectId);
    } catch (error) {
      wx.showToast({
        title: error.message || '状态更新失败',
        icon: 'none',
      });
    }
  },

  goReport() {
    wx.navigateTo({
      url: `/pages/report-card/index?projectId=${this.projectId}`,
    });
  },
});
