const { formatDate, formatMonthLabel, getWeekRange, getWeekday, parseDate } = require('../utils/date');
const { getStorage, setStorage } = require('../utils/storage');

const PROJECTS_KEY = 'habit-projects';
const CHECKINS_KEY = 'habit-checkins';

const DEFAULT_ICONS = ['🏃', '📝', '📚', '💊', '🧘', '🎸', '🌱', '🎯', '🍎', '☀️'];
const THEME_MAP = {
  blue: { start: '#7cb5ff', end: '#5a8fff' },
  green: { start: '#82d8ae', end: '#56c28d' },
  orange: { start: '#ffc57b', end: '#ff9f64' },
};

function now() {
  return new Date().toISOString();
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createMockProjects() {
  const today = formatDate(new Date());
  return [
    {
      projectId: generateId('project'),
      userId: 'local-user',
      title: '运动',
      icon: '🏃',
      slogan: '一点点坚持，也会长成力量。',
      colorTheme: 'blue',
      status: 'active',
      scheduleType: 'daily',
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      targetType: 'forever',
      targetValue: 0,
      startDate: today,
      reminderEnabled: true,
      reminderTimes: ['08:00'],
      moodEnabled: true,
      scoreEnabled: false,
      metricEnabled: false,
      metricUnit: '',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      projectId: generateId('project'),
      userId: 'local-user',
      title: '写代码',
      icon: '📝',
      slogan: '今天也把想法写成作品。',
      colorTheme: 'green',
      status: 'active',
      scheduleType: 'daily',
      scheduleDays: [1, 2, 3, 4, 5, 6],
      targetType: 'forever',
      targetValue: 0,
      startDate: today,
      reminderEnabled: true,
      reminderTimes: ['21:30'],
      moodEnabled: false,
      scoreEnabled: true,
      metricEnabled: true,
      metricUnit: '次',
      createdAt: now(),
      updatedAt: now(),
    },
  ];
}

function ensureProjects() {
  const projects = getStorage(PROJECTS_KEY, null);
  if (projects && projects.length) {
    return projects;
  }

  const initialProjects = createMockProjects();
  setStorage(PROJECTS_KEY, initialProjects);
  return initialProjects;
}

function ensureCheckins() {
  return getStorage(CHECKINS_KEY, []);
}

function resetDemoData() {
  const projects = createMockProjects();
  setStorage(PROJECTS_KEY, projects);
  setStorage(CHECKINS_KEY, []);
  return projects;
}

function saveProjects(projects) {
  setStorage(PROJECTS_KEY, projects);
}

function saveCheckins(checkins) {
  setStorage(CHECKINS_KEY, checkins);
}

function normalizeProject(project) {
  return {
    ...project,
    reminderTimes: project.reminderTimes || [],
    colorSet: THEME_MAP[project.colorTheme] || THEME_MAP.blue,
    metricUnit: project.metricUnit || '',
  };
}

function getProjects(status) {
  const projects = ensureProjects().map(normalizeProject);
  return status ? projects.filter((item) => item.status === status) : projects;
}

function calculateStats(projectId) {
  const checkins = ensureCheckins()
    .filter((item) => item.projectId === projectId && item.status === 'done')
    .sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let longestStreak = 0;
  let lastDate = '';

  checkins.forEach((item) => {
    if (!lastDate) {
      currentStreak = 1;
      longestStreak = 1;
      lastDate = item.date;
      return;
    }

    const current = parseDate(item.date);
    const previous = parseDate(lastDate);
    const distance = Math.round((current - previous) / 86400000);
    currentStreak = distance === 1 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    lastDate = item.date;
  });

  const currentMonth = formatDate(new Date()).slice(0, 7);
  const monthCheckins = checkins.filter((item) => item.date.startsWith(currentMonth)).length;

  return {
    projectId,
    totalCheckins: checkins.length,
    currentStreak,
    longestStreak,
    monthCheckins,
    completionRate: 100,
    lastCheckinDate: checkins.length ? checkins[checkins.length - 1].date : '',
  };
}

function getProjectById(projectId) {
  return getProjects().find((item) => item.projectId === projectId);
}

function shouldShowOnDate(project, date) {
  if (project.status !== 'active') {
    return false;
  }

  if (project.scheduleType === 'daily') {
    return true;
  }

  return project.scheduleDays.includes(parseDate(date).getDay());
}

function getHomeData(date) {
  const selectedDate = date || formatDate(new Date());
  const checkins = ensureCheckins();
  const projects = getProjects('active').filter((item) => shouldShowOnDate(item, selectedDate));
  const mappedProjects = projects.map((item) => {
    const record = checkins.find((entry) => entry.projectId === item.projectId && entry.date === selectedDate);
    return {
      ...item,
      stats: calculateStats(item.projectId),
      checked: !!record,
      record,
    };
  });

  const completedCount = mappedProjects.filter((item) => item.checked).length;

  return {
    selectedDate,
    weekDays: getWeekRange(selectedDate),
    projects: mappedProjects,
    completedCount,
    pendingCount: mappedProjects.length - completedCount,
  };
}

function createProject(payload) {
  const projects = ensureProjects();
  const project = normalizeProject({
    projectId: generateId('project'),
    userId: 'local-user',
    title: payload.title,
    icon: payload.icon || DEFAULT_ICONS[0],
    slogan: payload.slogan || '',
    colorTheme: payload.colorTheme || 'blue',
    status: 'active',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    targetType: 'forever',
    targetValue: 0,
    startDate: payload.startDate,
    reminderEnabled: !!payload.reminderEnabled,
    reminderTimes: payload.reminderTimes || [],
    moodEnabled: !!payload.moodEnabled,
    scoreEnabled: !!payload.scoreEnabled,
    metricEnabled: !!payload.metricEnabled,
    metricUnit: payload.metricUnit || '',
    createdAt: now(),
    updatedAt: now(),
  });

  projects.unshift(project);
  saveProjects(projects);
  return project;
}

function updateProject(projectId, payload) {
  const projects = ensureProjects().map((item) => {
    if (item.projectId !== projectId) {
      return item;
    }

    return { ...item, ...payload, updatedAt: now() };
  });

  saveProjects(projects);
  return getProjectById(projectId);
}

function updateProjectStatus(projectId, status) {
  return updateProject(projectId, { status });
}

function submitCheckin(payload) {
  const checkins = ensureCheckins();
  const existingIndex = checkins.findIndex(
    (item) => item.projectId === payload.projectId && item.date === payload.date
  );

  const record = {
    recordId: existingIndex > -1 ? checkins[existingIndex].recordId : generateId('record'),
    userId: 'local-user',
    projectId: payload.projectId,
    date: payload.date,
    status: 'done',
    checkedAt: now(),
    moodValue: payload.moodValue || '',
    scoreValue: payload.scoreValue || 0,
    metricValue: payload.metricValue || 0,
    metricUnit: payload.metricUnit || '',
    createdAt: existingIndex > -1 ? checkins[existingIndex].createdAt : now(),
    updatedAt: now(),
  };

  if (existingIndex > -1) {
    checkins.splice(existingIndex, 1, record);
  } else {
    checkins.unshift(record);
  }

  saveCheckins(checkins);
  return record;
}

function toggleCheckin(payload) {
  const checkins = ensureCheckins();
  const existingIndex = checkins.findIndex(
    (item) => item.projectId === payload.projectId && item.date === payload.date
  );

  if (existingIndex > -1) {
    checkins.splice(existingIndex, 1);
    saveCheckins(checkins);
    return { checked: false };
  }

  submitCheckin(payload);
  return { checked: true };
}

function getHistoryGrouped() {
  const projects = getProjects();
  const checkins = ensureCheckins()
    .filter((item) => item.status === 'done')
    .sort((a, b) => b.date.localeCompare(a.date) || b.checkedAt.localeCompare(a.checkedAt));

  const projectMap = projects.reduce((map, item) => {
    map[item.projectId] = item;
    return map;
  }, {});

  const grouped = {};

  checkins.forEach((item) => {
    const month = formatMonthLabel(item.date);
    if (!grouped[month]) {
      grouped[month] = [];
    }

    grouped[month].push({
      ...item,
      title: projectMap[item.projectId] ? projectMap[item.projectId].title : '已删除项目',
      icon: projectMap[item.projectId] ? projectMap[item.projectId].icon : '🌤️',
      weekday: getWeekday(item.date),
    });
  });

  return Object.keys(grouped).map((key) => ({
    month: key,
    items: grouped[key],
  }));
}

function getProjectRecords(projectId) {
  return ensureCheckins()
    .filter((item) => item.projectId === projectId && item.status === 'done')
    .sort((a, b) => b.date.localeCompare(a.date) || b.checkedAt.localeCompare(a.checkedAt));
}

function getProjectDetail(projectId) {
  const project = getProjectById(projectId);
  if (!project) {
    return null;
  }

  const stats = calculateStats(projectId);
  const records = getProjectRecords(projectId).slice(0, 20);
  const monthMap = {};

  records.forEach((item) => {
    monthMap[item.date.slice(0, 7)] = (monthMap[item.date.slice(0, 7)] || 0) + 1;
  });

  return {
    project,
    stats,
    records,
    rewards: [
      {
        rewardId: `reward_${projectId}_3`,
        title: '连续 3 天的小奖励',
        conditionText: '连续完成 3 天后奖励自己一次喜欢的放松时间',
        reached: stats.currentStreak >= 3,
      },
      {
        rewardId: `reward_${projectId}_10`,
        title: '累计 10 次里程碑',
        conditionText: '累计完成 10 次后安排一次更正式的庆祝',
        reached: stats.totalCheckins >= 10,
      },
    ],
    monthSummary: Object.keys(monthMap).map((key) => ({
      month: key,
      count: monthMap[key],
    })),
  };
}

function saveCheckinExtras(payload) {
  const checkins = ensureCheckins();
  const existingIndex = checkins.findIndex(
    (item) => item.projectId === payload.projectId && item.date === payload.date
  );

  if (existingIndex === -1) {
    return null;
  }

  const updated = {
    ...checkins[existingIndex],
    moodValue: payload.moodValue || '',
    scoreValue: payload.scoreValue || 0,
    metricValue: payload.metricValue || 0,
    metricUnit: payload.metricUnit || '',
    updatedAt: now(),
  };

  checkins.splice(existingIndex, 1, updated);
  saveCheckins(checkins);
  return updated;
}

function getReportCard(periodType) {
  const projects = getProjects('active');
  const checkins = ensureCheckins().filter((item) => item.status === 'done');
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}`;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartText = formatDate(weekStart);

  const weekRecords = checkins.filter((item) => item.date >= weekStartText);
  const monthRecords = checkins.filter((item) => item.date.startsWith(currentMonthKey));
  const scopedRecords = periodType === 'week' ? weekRecords : monthRecords;

  return {
    periodType,
    totalProjects: projects.length,
    totalCheckins: scopedRecords.length,
    completionRate: projects.length ? Math.round((scopedRecords.length / projects.length) * 100) : 0,
    streakSummary: projects.reduce((sum, item) => sum + calculateStats(item.projectId).currentStreak, 0),
    projectSummaries: projects.map((item) => {
      const stats = calculateStats(item.projectId);
      const projectRecords = scopedRecords.filter((record) => record.projectId === item.projectId);
      const metricRecords = projectRecords.filter((record) => record.metricValue);
      const totalMetric = metricRecords.reduce((sum, record) => sum + Number(record.metricValue || 0), 0);

      return {
        projectId: item.projectId,
        title: item.title,
        icon: item.icon,
        totalCheckins: projectRecords.length,
        currentStreak: stats.currentStreak,
        metricTotal: totalMetric,
        metricUnit: metricRecords[0] ? metricRecords[0].metricUnit : '',
      };
    }),
  };
}

function getWeekOfYear(input) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);

  const yearStart = new Date(date.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const dayOffset = Math.floor((date - yearStart) / 86400000);
  return Math.floor((dayOffset + yearStart.getDay()) / 7) + 1;
}

function getCurrentYearWeekCount(year) {
  return getWeekOfYear(new Date(year, 11, 31));
}

function getWeeklyCheckinSeries(targetYear) {
  const records = ensureCheckins().filter((item) => item.status === 'done');
  const currentYear = targetYear || new Date().getFullYear();
  const totalWeeks = getCurrentYearWeekCount(currentYear);
  const currentWeek = currentYear === new Date().getFullYear() ? getWeekOfYear(new Date()) : totalWeeks;
  const weekMap = {};

  records.forEach((item) => {
    const date = parseDate(item.date);
    if (date.getFullYear() !== currentYear) {
      return;
    }

    const week = getWeekOfYear(date);
    weekMap[week] = (weekMap[week] || 0) + 1;
  });

  const series = [];

  for (let week = 1; week <= currentWeek; week += 1) {
    series.push({
      week,
      count: weekMap[week] || 0,
    });
  }

  const maxCount = series.reduce((max, item) => Math.max(max, item.count), 0);

  return {
    year: currentYear,
    totalWeeks,
    currentWeek,
    series,
    maxCount,
  };
}

function getAchievementSummary() {
  const projects = getProjects('active');
  const checkins = ensureCheckins().filter((item) => item.status === 'done');
  const streaks = projects.map((item) => calculateStats(item.projectId).currentStreak);
  const longestStreak = streaks.length ? Math.max(...streaks) : 0;
  const currentMonthKey = formatDate(new Date()).slice(0, 7);
  const monthCheckins = checkins.filter((item) => item.date.startsWith(currentMonthKey)).length;

  const badges = [
    {
      badgeId: 'first-checkin',
      name: '第一次出发',
      description: '完成第一次打卡',
      unlocked: checkins.length >= 1,
      icon: '🌟',
    },
    {
      badgeId: 'three-streak',
      name: '稳稳连胜',
      description: '连续完成 3 天',
      unlocked: longestStreak >= 3,
      icon: '🔥',
    },
    {
      badgeId: 'ten-checkins',
      name: '节奏建立中',
      description: '累计完成 10 次',
      unlocked: checkins.length >= 10,
      icon: '🏅',
    },
    {
      badgeId: 'three-projects',
      name: '多线成长',
      description: '拥有 3 个进行中的项目',
      unlocked: projects.length >= 3,
      icon: '🌱',
    },
  ];

  return {
    totalCheckins: checkins.length,
    activeProjects: projects.length,
    longestStreak,
    monthCheckins,
    nextBadge: badges.find((item) => !item.unlocked) || null,
    unlockedCount: badges.filter((item) => item.unlocked).length,
    recentBadges: badges.filter((item) => item.unlocked).slice(0, 2),
    badges,
  };
}

function getMoreOverview() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const user = app && app.globalData ? app.globalData.user : null;

  return {
    nickname: user ? user.nickname : '坚持计划',
    syncStatus: user ? user.syncStatus : 'ok',
    reminderHint: '提醒优先使用站内提醒，后续会接入订阅消息。',
    sections: [
      { key: 'sync', title: '同步状态', desc: '当前数据保存在本地，后续会接入云端同步。', action: 'noop' },
      { key: 'report', title: '查看成绩单', desc: '快速进入周报和月报汇总页。', action: 'report' },
      { key: 'history', title: '查看历史记录', desc: '回看你每一次完成留下的轨迹。', action: 'history' },
      { key: 'reset', title: '重置演示数据', desc: '清空当前本地数据并恢复默认演示项目。', action: 'reset' },
    ],
  };
}

module.exports = {
  DEFAULT_ICONS,
  createProject,
  getAchievementSummary,
  getHistoryGrouped,
  getHomeData,
  getMoreOverview,
  getProjectDetail,
  getProjectById,
  getProjects,
  getReportCard,
  getWeeklyCheckinSeries,
  resetDemoData,
  saveCheckinExtras,
  submitCheckin,
  toggleCheckin,
  updateProject,
  updateProjectStatus,
};
