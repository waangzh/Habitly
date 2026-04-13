/**
 * 首页
 * 展示今日习惯列表、打卡与 AI 建议
 */

const aiService = require('../../services/aiService');
const service = require('../../services/habitService');
const { formatDate, formatDisplayDate, parseDate } = require('../../utils/date');
const { getSyncStatusText } = require('../../store/ui');

function getDefaultCoachState() {
  return {
    visible: false,
    projectId: '',
    projectTitle: '',
    date: '',
    stage: 'entry',
    loading: false,
    question: '',
    hint: '',
    answer: '',
    reflection: '',
    suggestion: '',
  };
}

function flattenHistory(groups) {
  return (groups || []).reduce((list, group) => list.concat(group.items || []), []);
}

function buildHomeNudgePayload(homeData, activeProjects, historyItems) {
  const focusProject = homeData.projects.find((item) => !item.checked) || homeData.projects[0];
  const topStreakProject = (activeProjects || [])
    .slice()
    .sort((first, second) => (second.stats.currentStreak || 0) - (first.stats.currentStreak || 0))[0];
  const recentBoundary = parseDate(homeData.selectedDate);
  recentBoundary.setDate(recentBoundary.getDate() - 13);

  const recentItems = (historyItems || []).filter((item) => parseDate(item.date) >= recentBoundary);
  const scoreItems = recentItems.filter((item) => Number(item.scoreValue || 0) > 0);
  const lowEnergyCount = recentItems.filter((item) => item.moodValue === '有点累').length;
  const averageScore = scoreItems.length
    ? Math.round((scoreItems.reduce((sum, item) => sum + Number(item.scoreValue || 0), 0) / scoreItems.length) * 10) / 10
    : 0;

  const payload = {
    selectedDate: homeData.selectedDate,
    projectCount: homeData.projects.length,
    completedCount: homeData.completedCount,
    pendingCount: homeData.pendingCount,
    recentCheckins: recentItems.length,
  };

  if (focusProject) {
    payload.focusProject = {
      title: focusProject.title,
      currentStreak: focusProject.stats.currentStreak || 0,
    };
  }

  if (topStreakProject) {
    payload.topStreakProject = {
      title: topStreakProject.title,
      currentStreak: topStreakProject.stats.currentStreak || 0,
    };
  }

  if (lowEnergyCount) {
    payload.lowEnergyCount = lowEnergyCount;
  }

  if (averageScore) {
    payload.averageScore = averageScore;
  }

  return payload;
}

Page({
  data: {
    loading: true,
    selectedDate: formatDate(new Date()),
    weekDays: [],
    projects: [],
    completedCount: 0,
    pendingCount: 0,
    syncText: '正在整理你的进度',
    displayDate: '',
    showExtraSheet: false,
    currentExtraProject: null,
    currentExtraRecordId: '',
    extraForm: {
      moodValue: '开心',
      scoreValue: 5,
      metricValue: '',
    },
    moodOptions: ['开心', '平静', '专注', '有点累'],
    homeNudge: {
      tone: 'steady',
      message: '今天先照顾好眼前这一件，小小往前也算数。',
      suggestionTag: '慢慢来，也在前进',
    },
    coachState: getDefaultCoachState(),
  },

  async onShow() {
    await this.loadHomeData(this.data.selectedDate);
  },

  async loadHomeData(date) {
    this.setData({ loading: true });

    try {
      const [homeData, activeProjects, historyGroups] = await Promise.all([
        service.getHomeData(date),
        service.getProjects('active'),
        service.getHistoryGrouped(),
      ]);
      const app = getApp();
      const historyItems = flattenHistory(historyGroups);

      this.setData({
        loading: false,
        selectedDate: homeData.selectedDate,
        weekDays: homeData.weekDays,
        projects: homeData.projects,
        completedCount: homeData.completedCount,
        pendingCount: homeData.pendingCount,
        syncText: getSyncStatusText((app.globalData.user || {}).syncStatus),
        displayDate: formatDisplayDate(homeData.selectedDate),
      });

      const homeNudge = await aiService.getHomeNudge(
        buildHomeNudgePayload(homeData, activeProjects, historyItems),
      );

      this.setData({ homeNudge });
    } catch (error) {
      this.setData({
        loading: false,
        syncText: '同步稍后重试',
      });
      wx.showToast({
        title: error.message || '首页加载失败',
        icon: 'none',
      });
    }
  },

  async handleSelectDate(event) {
    await this.loadHomeData(event.detail.date);
  },

  async handleCheckin(event) {
    const targetProject = this.data.projects.find((item) => item.projectId === event.detail.projectId);
    if (!targetProject) {
      return;
    }

    try {
      const result = await service.toggleCheckin({
        projectId: targetProject.projectId,
        date: this.data.selectedDate,
        checked: !!targetProject.checked,
      });

      wx.showToast({
        title: result.checked ? '今天也有在变好' : '已恢复为未打卡',
        icon: 'success',
      });

      await this.loadHomeData(this.data.selectedDate);

      if (!result.checked) {
        return;
      }

      if (targetProject.moodEnabled || targetProject.scoreEnabled || targetProject.metricEnabled) {
        this.setData({
          showExtraSheet: true,
          currentExtraProject: targetProject,
          currentExtraRecordId: result.record.recordId,
          extraForm: {
            moodValue: '开心',
            scoreValue: 5,
            metricValue: '',
          },
        });
        return;
      }

      this.promptCoach(targetProject);
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none',
      });
    }
  },

  chooseMood(event) {
    this.setData({
      'extraForm.moodValue': event.currentTarget.dataset.value,
    });
  },

  handleExtraInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`extraForm.${field}`]: event.detail.value,
    });
  },

  closeExtraSheet() {
    this.setData({
      showExtraSheet: false,
      currentExtraProject: null,
      currentExtraRecordId: '',
    });
  },

  async saveExtraSheet() {
    const project = this.data.currentExtraProject;
    if (!project || !this.data.currentExtraRecordId) {
      return;
    }

    try {
      await service.saveCheckinExtras({
        recordId: this.data.currentExtraRecordId,
        moodValue: project.moodEnabled ? this.data.extraForm.moodValue : '',
        scoreValue: project.scoreEnabled ? Number(this.data.extraForm.scoreValue || 0) : 0,
        metricValue: project.metricEnabled ? Number(this.data.extraForm.metricValue || 0) : 0,
        metricUnit: project.metricEnabled ? (project.metricUnit || '') : '',
      });

      this.setData({
        showExtraSheet: false,
        currentExtraProject: null,
        currentExtraRecordId: '',
      });

      wx.showToast({
        title: '附加记录已保存',
        icon: 'success',
      });

      await this.loadHomeData(this.data.selectedDate);
      this.promptCoach(project);
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      });
    }
  },

  promptCoach(project) {
    this.setData({
      coachState: {
        ...getDefaultCoachState(),
        visible: true,
        projectId: project.projectId,
        projectTitle: project.title,
        date: this.data.selectedDate,
      },
    });
  },

  closeCoachSheet() {
    this.setData({
      coachState: getDefaultCoachState(),
    });
  },

  async startCoach() {
    const coachState = this.data.coachState;
    if (!coachState.projectId) {
      return;
    }

    this.setData({
      'coachState.loading': true,
    });

    const result = await aiService.getCheckinCoach({
      projectId: Number(coachState.projectId),
      date: coachState.date,
    });

    this.setData({
      'coachState.loading': false,
      'coachState.stage': 'question',
      'coachState.question': result.question,
      'coachState.hint': result.hint,
    });
  },

  handleCoachAnswerInput(event) {
    this.setData({
      'coachState.answer': event.detail.value,
    });
  },

  async submitCoachAnswer() {
    const coachState = this.data.coachState;
    if (!coachState.answer.trim()) {
      wx.showToast({
        title: '先写下一句小记录',
        icon: 'none',
      });
      return;
    }

    this.setData({
      'coachState.loading': true,
    });

    const result = await aiService.replyCheckinCoach({
      projectId: Number(coachState.projectId),
      date: coachState.date,
      question: coachState.question,
      answer: coachState.answer.trim(),
    });

    this.setData({
      'coachState.loading': false,
      'coachState.stage': 'result',
      'coachState.reflection': result.reflection,
      'coachState.suggestion': result.suggestion,
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/project-form/index' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/index' });
  },

  noop() {},
});
