/**
 * 更多页
 * 用户设置和个人信息管理
 */

const service = require('../../services/habitService');
const { getSyncStatusText } = require('../../store/ui');

const COVER_OPTIONS = [
  { key: 'sky', name: '晴空蓝' },
  { key: 'mint', name: '薄荷绿' },
  { key: 'peach', name: '蜜桃粉' },
];
const DEFAULT_AVATAR_LABEL = '默认';

function getUserProfile(overview, profile) {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalUser = app && app.globalData ? app.globalData.user || {} : {};

  return {
    nickname: 'Habitly 用户',
    avatarUrl: '',
    bio: '把每一次小坚持，都变成看得见的成长。',
    coverTheme: 'sky',
    ...overview,
    ...profile,
    ...globalUser,
  };
}

function buildUserViewModel(overview, syncText, profile, quickStats) {
  return {
    hero: {
      avatarLabel: DEFAULT_AVATAR_LABEL,
      avatarUrl: profile.avatarUrl || '',
      nickname: profile.nickname || 'Habitly 用户',
      bio: profile.bio || '把每一次小坚持，都变成看得见的成长。',
      syncText,
      coverTag: COVER_OPTIONS.find((item) => item.key === profile.coverTheme)?.name || '温柔陪伴',
      coverTheme: profile.coverTheme || 'sky',
    },
    quickStats,
    settingGroups: [
      {
        key: 'account',
        title: '个人信息',
        items: [
          { key: 'profile', title: '编辑资料', desc: '头像、昵称、简介都可以在这里修改', action: 'profile' },
          { key: 'background', title: '背景主题', desc: '切换喜欢的柔和背景风格', action: 'background' },
          { key: 'reminder', title: '提醒偏好', desc: overview.reminderHint, action: 'noop' },
        ],
      },
      {
        key: 'records',
        title: '我的记录',
        items: [
          { key: 'history', title: '历史记录', desc: '回看每天的打卡内容与节奏变化', action: 'history' },
          { key: 'report', title: '成绩单', desc: '查看周报、月报和项目表现', action: 'report' },
          { key: 'sync', title: '同步状态', desc: syncText, action: 'noop' },
        ],
      },
      {
        key: 'support',
        title: '更多设置',
        items: [
          { key: 'notifications', title: '通知与订阅', desc: '预留微信通知和站内提醒入口', action: 'noop' },
          { key: 'privacy', title: '隐私与数据', desc: '管理本地缓存与授权相关设置', action: 'noop' },
          { key: 'seed', title: '开发演示数据', desc: '当前只保留开发提示，不在前端直接执行 seed', action: 'seed' },
        ],
      },
    ],
    editor: {
      nickname: profile.nickname || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      avatarLabel: DEFAULT_AVATAR_LABEL,
      coverTheme: profile.coverTheme || 'sky',
      coverOptions: COVER_OPTIONS.map((item) => ({
        ...item,
        active: item.key === (profile.coverTheme || 'sky'),
      })),
    },
  };
}

function collectQuickStats(projects, achievement, historyGroups) {
  const uniqueDays = new Set();

  (historyGroups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      if (item.date) {
        uniqueDays.add(item.date);
      }
    });
  });

  return [
    { key: 'days', value: String(uniqueDays.size), label: '记录天数' },
    { key: 'focus', value: String((projects || []).length), label: '进行项目' },
    { key: 'streak', value: String((achievement && achievement.longestStreak) || 0), label: '最长连续' },
  ];
}

Page({
  data: {
    overview: null,
    syncText: '',
    quickStats: [],
    userView: null,
    draftProfile: null,
    editingSection: '',
  },

  async onShow() {
    await this.refreshView();
  },

  async refreshView() {
    try {
      const [overview, profile, projects, achievement, historyGroups] = await Promise.all([
        service.getMoreOverview(),
        service.getProfile(),
        service.getProjects('active'),
        service.getAchievementSummary(),
        service.getHistoryGrouped(),
      ]);
      const app = getApp();
      const syncText = getSyncStatusText((app.globalData.user || {}).syncStatus || overview.syncStatus);
      const mergedProfile = getUserProfile(overview, profile);
      const quickStats = collectQuickStats(projects, achievement, historyGroups);

      this.setData({
        overview,
        syncText,
        quickStats,
        draftProfile: mergedProfile,
        userView: buildUserViewModel(overview, syncText, mergedProfile, quickStats),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '更多页加载失败',
        icon: 'none',
      });
    }
  },

  handleAction(event) {
    const action = event.currentTarget.dataset.action;

    if (action === 'history') {
      wx.navigateTo({ url: '/pages/history/index' });
      return;
    }

    if (action === 'report') {
      wx.navigateTo({ url: '/pages/report-card/index' });
      return;
    }

    if (action === 'profile' || action === 'background') {
      this.setData({
        editingSection: this.data.editingSection === action ? '' : action,
        userView: buildUserViewModel(this.data.overview, this.data.syncText, this.data.draftProfile, this.data.quickStats),
      });
      return;
    }

    if (action === 'seed') {
      wx.showModal({
        title: '开发演示数据',
        content: '后端文档里没有开放前端直接执行 seed 的接口。需要重置演示数据时，请在服务端开发环境处理。',
        showCancel: false,
      });
      return;
    }

    wx.showToast({
      title: '这个入口下一阶段补齐',
      icon: 'none',
    });
  },

  handleNicknameInput(event) {
    this.updateDraftProfile({ nickname: (event.detail.value || '').slice(0, 20) });
  },

  handleBioInput(event) {
    this.updateDraftProfile({ bio: (event.detail.value || '').slice(0, 40) });
  },

  handleNicknameBlur(event) {
    this.updateDraftProfile({ nickname: (event.detail.value || '').trim().slice(0, 20) });
  },

  handleChooseAvatar(event) {
    const { avatarUrl } = event.detail || {};
    if (!avatarUrl) {
      return;
    }

    this.updateDraftProfile({ avatarUrl });
  },

  chooseCover(event) {
    this.updateDraftProfile({ coverTheme: event.currentTarget.dataset.value });
  },

  updateDraftProfile(patch) {
    const draftProfile = {
      ...this.data.draftProfile,
      ...patch,
    };

    this.setData({
      draftProfile,
      userView: buildUserViewModel(this.data.overview, this.data.syncText, draftProfile, this.data.quickStats),
    });
  },

  async saveProfile() {
    const draftProfile = {
      nickname: (this.data.draftProfile.nickname || '').trim(),
      bio: (this.data.draftProfile.bio || '').trim(),
      avatarUrl: this.data.draftProfile.avatarUrl || '',
      coverTheme: this.data.draftProfile.coverTheme || 'sky',
    };

    if (!draftProfile.nickname) {
      wx.showToast({
        title: '请先填写昵称',
        icon: 'none',
      });
      return;
    }

    try {
      const profile = await service.updateProfile(draftProfile);
      const app = getApp();
      app.globalData.user = {
        ...(app.globalData.user || {}),
        ...profile,
      };

      this.setData({ editingSection: '' });
      await this.refreshView();
      wx.showToast({
        title: '个人信息已保存',
        icon: 'success',
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      });
    }
  },
});
