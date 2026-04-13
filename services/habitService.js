const { formatDate } = require('../utils/date');
const { request } = require('./http');

const DEFAULT_ICONS = ['🏃', '📝', '📚', '✅', '🌿', '🎯', '🌙', '💧'];

const THEME_MAP = {
  blue: { start: '#7cb5ff', end: '#5a8fff' },
  green: { start: '#82d8ae', end: '#56c28d' },
  orange: { start: '#ffc57b', end: '#ff9f64' },
};

function parseJsonDate(dateText) {
  const [year, month, day] = String(dateText || '').split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
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

function normalizeProject(project) {
  if (!project) {
    return null;
  }

  return {
    ...project,
    reminderTimes: project.reminderTimes || [],
    scheduleDays: project.scheduleDays || [],
    metricUnit: project.metricUnit || '',
    slogan: project.slogan || '',
    colorSet: THEME_MAP[project.colorTheme] || THEME_MAP.blue,
    stats: project.stats || {
      projectId: project.projectId,
      totalCheckins: 0,
      currentStreak: 0,
      longestStreak: 0,
      monthCheckins: 0,
      completionRate: 0,
      lastCheckinDate: '',
    },
  };
}

function normalizeProjects(projects) {
  return (projects || []).map(normalizeProject);
}

function normalizeDetail(detail) {
  if (!detail) {
    return null;
  }

  return {
    ...detail,
    project: normalizeProject(detail.project),
    stats: detail.stats || {},
    records: detail.records || [],
    rewards: detail.rewards || [],
    monthSummary: detail.monthSummary || [],
  };
}

function mapHomeData(homeData) {
  return {
    ...homeData,
    projects: normalizeProjects(homeData.projects),
  };
}

async function getProjects(status) {
  return normalizeProjects(await request({
    url: '/projects',
    method: 'GET',
    data: status ? { status } : undefined,
  }));
}

async function getProjectById(projectId) {
  return normalizeProject(await request({
    url: `/projects/${projectId}`,
    method: 'GET',
  }));
}

async function createProject(payload) {
  return normalizeProject(await request({
    url: '/projects',
    method: 'POST',
    data: payload,
  }));
}

async function updateProject(projectId, payload) {
  return normalizeProject(await request({
    url: `/projects/${projectId}`,
    method: 'PUT',
    data: payload,
  }));
}

async function updateProjectStatus(projectId, status) {
  return normalizeProject(await request({
    url: `/projects/${projectId}/status`,
    method: 'PATCH',
    data: { status },
  }));
}

async function getHomeData(date) {
  return mapHomeData(await request({
    url: '/home',
    method: 'GET',
    data: { date: date || formatDate(new Date()) },
  }));
}

async function toggleCheckin(payload) {
  if (payload.checked) {
    const deleted = await request({
      url: `/checkins/daily?projectId=${payload.projectId}&date=${payload.date}`,
      method: 'DELETE',
    });
    return {
      checked: false,
      deleted: !!deleted.deleted,
    };
  }

  const record = await request({
    url: '/checkins/daily',
    method: 'PUT',
    data: {
      projectId: payload.projectId,
      date: payload.date,
    },
  });

  return {
    checked: true,
    record,
  };
}

async function saveCheckinExtras(payload) {
  return request({
    url: `/checkins/${payload.recordId}/extras`,
    method: 'PATCH',
    data: {
      moodValue: payload.moodValue,
      scoreValue: payload.scoreValue,
      metricValue: payload.metricValue,
      metricUnit: payload.metricUnit,
    },
  });
}

async function getHistoryGrouped(month) {
  return request({
    url: '/history/grouped',
    method: 'GET',
    data: month ? { month } : undefined,
  });
}

async function getProjectDetail(projectId) {
  return normalizeDetail(await request({
    url: `/projects/${projectId}/detail`,
    method: 'GET',
  }));
}

async function getReportCard(periodType, projectId) {
  return request({
    url: '/reports/card',
    method: 'GET',
    data: projectId ? { periodType, projectId } : { periodType },
  });
}

async function getAchievementSummary() {
  return request({
    url: '/achievements/summary',
    method: 'GET',
  });
}

async function getMoreOverview() {
  return request({
    url: '/more/overview',
    method: 'GET',
  });
}

async function updateProfile(payload) {
  return request({
    url: '/me/profile',
    method: 'PUT',
    data: payload,
  });
}

async function getProfile() {
  return request({
    url: '/me/profile',
    method: 'GET',
  });
}

async function getWeeklyCheckinSeries(targetYear) {
  const groups = await getHistoryGrouped();
  const currentYear = targetYear || new Date().getFullYear();
  const totalWeeks = getCurrentYearWeekCount(currentYear);
  const currentWeek = currentYear === new Date().getFullYear() ? getWeekOfYear(new Date()) : totalWeeks;
  const weekMap = {};

  (groups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      const date = parseJsonDate(item.date);
      if (date.getFullYear() !== currentYear) {
        return;
      }
      const week = getWeekOfYear(date);
      weekMap[week] = (weekMap[week] || 0) + 1;
    });
  });

  const series = [];
  for (let week = 1; week <= currentWeek; week += 1) {
    series.push({
      week,
      count: weekMap[week] || 0,
    });
  }

  return {
    year: currentYear,
    totalWeeks,
    currentWeek,
    series,
    maxCount: series.reduce((max, item) => Math.max(max, item.count), 0),
  };
}

function resetDemoData() {
  return Promise.reject(new Error('当前版本已切到后端接口，不再支持前端本地重置演示数据。'));
}

module.exports = {
  DEFAULT_ICONS,
  THEME_MAP,
  createProject,
  getAchievementSummary,
  getHistoryGrouped,
  getHomeData,
  getMoreOverview,
  getProfile,
  getProjectById,
  getProjectDetail,
  getProjects,
  getReportCard,
  getWeeklyCheckinSeries,
  normalizeProject,
  resetDemoData,
  saveCheckinExtras,
  toggleCheckin,
  updateProfile,
  updateProject,
  updateProjectStatus,
};
