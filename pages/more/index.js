/**
 * 更多页
 * 用户设置和个人信息管理
 */

const service = require('../../services/habitService');
const { getSyncStatusText } = require('../../store/ui');
const { getStorage, setStorage } = require('../../utils/storage');

const USER_PROFILE_KEY = 'habit-user-profile';

/** 背景主题选项 */
const COVER_OPTIONS = [
  { key: 'sky', name: '晴空蓝' },
  { key: 'mint', name: '薄荷绿' },
  { key: 'peach', name: '蜜桃橙' },
];
const DEFAULT_AVATAR_LABEL = '默认';

/** 获取用户资料 */
function getUserProfile(overview) {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalUser = app && app.globalData ? app.globalData.user || {} : {};

  return {
    nickname: 'Habitly 用户',
    avatarUrl: '',
    bio: '把每一次小坚持，都变成看得见的成长。',
    coverTheme: 'sky',
    ...overview,
    ...globalUser,
    ...getStorage(USER_PROFILE_KEY, {}),
  };
}

/** 构建用户视图数据 */
function buildUserViewModel(overview, syncText, profile) {
  const projects = service.getProjects();
  const achievement = service.getAchievementSummary();
  const historyGroups = service.getHistoryGrouped();
  const uniqueDays = new Set();

  historyGroups.forEach((group) => {
    (group.items || []).forEach((item) => {
      if (item.date) {
        uniqueDays.add(item.date);
      }
    });
  });

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
    quickStats: [
      { key: 'days', value: String(uniqueDays.size), label: '记录天数' },
      { key: 'focus', value: String(projects.filter((item) => item.status === 'active').length), label: '进行项目' },
      { key: 'streak', value: String(achievement.longestStreak || 0), label: '最长连续' },
    ],
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
          { key: 'privacy', title: '隐私与数据', desc: '管理本地数据、导出和授权设置', action: 'noop' },
          { key: 'reset', title: '重置演示数据', desc: '清空当前演示项目与记录，重新体验流程', action: 'reset' },
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

Page({
  data: {
    overview: null,
    syncText: '',
    userView: null,
    draftProfile: null,
    editingSection: '',
  },

  onShow() {
    this.refreshView();
  },

  /** 刷新视图数据 */
  refreshView() {
    const overview = service.getMoreOverview();
    const syncText = getSyncStatusText(overview.syncStatus);
    const profile = getUserProfile(overview);

    this.setData({
      overview,
      syncText,
      draftProfile: profile,
      userView: buildUserViewModel(overview, syncText, profile),
    });
  },

  /** 处理设置项点击 */
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
        userView: buildUserViewModel(this.data.overview, this.data.syncText, this.data.draftProfile),
      });
      return;
    }

    if (action === 'reset') {
      wx.showModal({
        title: '重置演示数据',
        content: '会清空当前的项目与打卡记录，但不会删除你的个人资料。确认继续吗？',
        success: (result) => {
          if (!result.confirm) {
            return;
          }

          service.resetDemoData();
          this.refreshView();
          wx.showToast({
            title: '演示数据已重置',
            icon: 'success',
          });
        },
      });
      return;
    }

    wx.showToast({
      title: '这个入口下一阶段补齐',
      icon: 'none',
    });
  },

  /** 昵称输入 */
  handleNicknameInput(event) {
    this.updateDraftProfile({ nickname: (event.detail.value || '').slice(0, 20) });
  },

  /** 简介输入 */
  handleBioInput(event) {
    this.updateDraftProfile({ bio: (event.detail.value || '').slice(0, 40) });
  },

  /** 昵称失焦时去除空格 */
  handleNicknameBlur(event) {
    this.updateDraftProfile({ nickname: (event.detail.value || '').trim().slice(0, 20) });
  },

  /** 选择头像 */
  handleChooseAvatar(event) {
    const { avatarUrl } = event.detail || {};
    if (!avatarUrl) {
      return;
    }

    this.updateDraftProfile({ avatarUrl });
  },

  /** 选择背景主题 */
  chooseCover(event) {
    this.updateDraftProfile({ coverTheme: event.currentTarget.dataset.value });
  },

  /** 更新草稿资料 */
  updateDraftProfile(patch) {
    const draftProfile = {
      ...this.data.draftProfile,
      ...patch,
    };

    this.setData({
      draftProfile,
      userView: buildUserViewModel(this.data.overview, this.data.syncText, draftProfile),
    });
  },

  /** 保存个人资料 */
  saveProfile() {
    const draftProfile = {
      ...this.data.draftProfile,
      nickname: (this.data.draftProfile.nickname || '').trim(),
      bio: (this.data.draftProfile.bio || '').trim(),
      avatarUrl: this.data.draftProfile.avatarUrl || '',
    };

    if (!draftProfile.nickname) {
      wx.showToast({
        title: '请先填写昵称',
        icon: 'none',
      });
      return;
    }

    const app = typeof getApp === 'function' ? getApp() : null;
    if (app && app.globalData) {
      app.globalData.user = {
        ...app.globalData.user,
        ...draftProfile,
        updatedAt: new Date().toISOString(),
      };
      setStorage(USER_PROFILE_KEY, app.globalData.user);
    } else {
      setStorage(USER_PROFILE_KEY, draftProfile);
    }

    this.setData({ editingSection: '' });
    this.refreshView();
    wx.showToast({
      title: '个人信息已保存',
      icon: 'success',
    });
  },
});
