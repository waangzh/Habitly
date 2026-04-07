/**
 * 首页
 * 展示今日习惯列表和打卡功能
 */

const service = require('../../services/habitService');
const { formatDate, formatDisplayDate } = require('../../utils/date');
const { getSyncStatusText } = require('../../store/ui');

Page({
  data: {
    loading: true,
    selectedDate: formatDate(new Date()),
    weekDays: [],
    projects: [],
    completedCount: 0,
    pendingCount: 0,
    syncText: '刚刚同步完成',
    displayDate: '',
    showExtraSheet: false,
    currentExtraProject: null,
    extraForm: {
      moodValue: '开心',
      scoreValue: 5,
      metricValue: '',
    },
    moodOptions: ['开心', '平静', '专注', '有点累'],
  },

  onShow() {
    this.loadHomeData(this.data.selectedDate);
  },

  /** 加载首页数据 */
  loadHomeData(date) {
    const homeData = service.getHomeData(date);
    const app = getApp();
    this.setData({
      loading: false,
      selectedDate: homeData.selectedDate,
      weekDays: homeData.weekDays,
      projects: homeData.projects,
      completedCount: homeData.completedCount,
      pendingCount: homeData.pendingCount,
      syncText: getSyncStatusText(app.globalData.user.syncStatus),
      displayDate: formatDisplayDate(homeData.selectedDate),
    });
  },

  /** 选择日期 */
  handleSelectDate(event) {
    this.loadHomeData(event.detail.date);
  },

  /** 打卡/取消打卡 */
  handleCheckin(event) {
    const targetProject = this.data.projects.find((item) => item.projectId === event.detail.projectId);
    const result = service.toggleCheckin({
      projectId: event.detail.projectId,
      date: this.data.selectedDate,
    });

    // 打卡成功且项目开启了附加信息，弹出输入面板
    if (result.checked && targetProject && (targetProject.moodEnabled || targetProject.scoreEnabled || targetProject.metricEnabled)) {
      this.setData({
        showExtraSheet: true,
        currentExtraProject: targetProject,
        extraForm: {
          moodValue: '开心',
          scoreValue: 5,
          metricValue: '',
        },
      });
    }

    wx.showToast({
      title: result.checked ? '今天也有在变好' : '已恢复为未打卡',
      icon: 'success',
    });

    this.loadHomeData(this.data.selectedDate);
  },

  /** 选择心情 */
  chooseMood(event) {
    this.setData({
      'extraForm.moodValue': event.currentTarget.dataset.value,
    });
  },

  /** 输入附加信息 */
  handleExtraInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`extraForm.${field}`]: event.detail.value,
    });
  },

  /** 关闭附加信息面板 */
  closeExtraSheet() {
    this.setData({
      showExtraSheet: false,
      currentExtraProject: null,
    });
  },

  /** 保存附加信息 */
  saveExtraSheet() {
    const project = this.data.currentExtraProject;
    if (!project) {
      return;
    }

    service.saveCheckinExtras({
      projectId: project.projectId,
      date: this.data.selectedDate,
      moodValue: project.moodEnabled ? this.data.extraForm.moodValue : '',
      scoreValue: project.scoreEnabled ? Number(this.data.extraForm.scoreValue || 0) : 0,
      metricValue: project.metricEnabled ? Number(this.data.extraForm.metricValue || 0) : 0,
      metricUnit: project.metricEnabled ? (project.metricUnit || '次') : '',
    });

    this.setData({
      showExtraSheet: false,
      currentExtraProject: null,
    });

    wx.showToast({
      title: '附加记录已保存',
      icon: 'success',
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/project-form/index' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/index' });
  },
});
