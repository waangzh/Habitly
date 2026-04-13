/**
 * 成绩单页
 * 展示周报、月报和 AI 洞察
 */

const aiService = require('../../services/aiService');
const service = require('../../services/habitService');
const { formatDate, getWeekDays, pad, parseDate } = require('../../utils/date');

function flattenHistory(groups) {
  return (groups || []).reduce((list, group) => list.concat(group.items || []), []);
}

function getCurrentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

function getCurrentWeekStart() {
  return getWeekDays()[0].key;
}

function filterRecordsByPeriod(records, periodType, projectId) {
  const today = new Date();
  const currentMonthKey = getCurrentMonthKey();
  const weekStart = parseDate(getCurrentWeekStart());

  return (records || []).filter((item) => {
    if (projectId && String(item.projectId) !== String(projectId)) {
      return false;
    }

    if (periodType === 'month') {
      return String(item.date || '').startsWith(currentMonthKey);
    }

    return parseDate(item.date) >= weekStart && parseDate(item.date) <= today;
  });
}

function buildWeekMatrix(projectSummaries, records) {
  const weekDays = getWeekDays();

  return (projectSummaries || []).map((summary) => {
    const recordMap = {};
    (records || []).forEach((item) => {
      if (String(item.projectId) === String(summary.projectId)) {
        recordMap[item.date] = item;
      }
    });

    return {
      ...summary,
      days: weekDays.map((day) => ({
        ...day,
        done: !!recordMap[day.key],
      })),
    };
  });
}

function buildMonthInsights(projectSummaries) {
  return (projectSummaries || []).map((summary) => {
    const percent = Math.min(100, summary.totalCheckins * 12);
    let trendText = '刚开始建立自己的节奏';
    if (summary.currentStreak >= 7) {
      trendText = '状态很稳，继续保持';
    } else if (summary.currentStreak >= 3) {
      trendText = '最近进入了稳定上升期';
    } else if (summary.totalCheckins > 0) {
      trendText = '已经有起色，继续往前';
    }

    return {
      ...summary,
      percent,
      trendText,
    };
  });
}

function buildMonthHeatmap(records) {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const countMap = {};
  (records || []).forEach((item) => {
    if (!String(item.date || '').startsWith(getCurrentMonthKey())) {
      return;
    }
    countMap[item.date] = (countMap[item.date] || 0) + 1;
  });

  const items = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = formatDate(cursor);
    const count = countMap[key] || 0;
    items.push({
      key,
      dayNumber: cursor.getDate(),
      inMonth: cursor.getMonth() === month,
      level: count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0,
      isToday: key === formatDate(today),
      count,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    monthLabel: `${year} 年 ${month + 1} 月`,
    weekLabels: labels,
    items,
  };
}

function buildSingleProjectCalendar(projectId, records) {
  if (!projectId) {
    return null;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
  const recordMap = {};

  (records || []).forEach((item) => {
    recordMap[item.date] = item;
  });

  const cells = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = formatDate(cursor);
    const record = recordMap[key];
    cells.push({
      key,
      dayNumber: cursor.getDate(),
      inMonth: cursor.getMonth() === month,
      checked: !!record,
      moodValue: record ? record.moodValue : '',
      metricValue: record ? record.metricValue : 0,
      isToday: key === formatDate(today),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    monthLabel: `${year} 年 ${month + 1} 月`,
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    cells,
  };
}

function buildMetricTrend(project, records) {
  if (!project || !project.metricEnabled) {
    return null;
  }

  const metricRecords = (records || [])
    .filter((item) => Number(item.metricValue || 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  if (!metricRecords.length) {
    return null;
  }

  const maxValue = Math.max(...metricRecords.map((item) => Number(item.metricValue || 0)));
  const points = metricRecords.map((item) => ({
    dateLabel: item.date.slice(5),
    value: Number(item.metricValue || 0),
    unit: item.metricUnit || project.metricUnit || '',
    height: maxValue ? Math.max(18, Math.round((Number(item.metricValue || 0) / maxValue) * 120)) : 18,
  }));
  const totalValue = metricRecords.reduce((sum, item) => sum + Number(item.metricValue || 0), 0);

  return {
    unit: project.metricUnit || '',
    totalValue,
    averageValue: Math.round((totalValue / metricRecords.length) * 10) / 10,
    points,
  };
}

function buildInsightPayload(periodType, report, scopedRecords, project) {
  const scoreRecords = scopedRecords.filter((item) => Number(item.scoreValue || 0) > 0);
  const averageScore = scoreRecords.length
    ? Math.round((scoreRecords.reduce((sum, item) => sum + Number(item.scoreValue || 0), 0) / scoreRecords.length) * 10) / 10
    : 0;
  const lowEnergyCount = scopedRecords.filter((item) => item.moodValue === '有点累').length;
  const summary = project && report.projectSummaries[0] ? report.projectSummaries[0] : null;

  const overallStreak = Math.max(0, ...(report.projectSummaries || []).map((item) => item.currentStreak || 0));

  return {
    periodType,
    periodKey: periodType === 'week' ? getCurrentWeekStart() : getCurrentMonthKey(),
    scope: project ? 'project' : 'all',
    title: project ? project.title : '全部项目',
    totalCheckins: report.totalCheckins || 0,
    currentStreak: project ? ((summary && summary.currentStreak) || 0) : overallStreak,
    averageScore,
    lowEnergyCount,
    reminderEnabled: project ? !!project.reminderEnabled : false,
    reminderTimes: project ? (project.reminderTimes || []) : [],
    metricEnabled: project ? !!project.metricEnabled : false,
    metricUnit: project ? (project.metricUnit || '') : '',
  };
}

function buildReportViewData(allRecords, periodType, projectId, report, project) {
  const weekRecords = filterRecordsByPeriod(allRecords, 'week', '');
  const monthRecords = filterRecordsByPeriod(allRecords, 'month', '');
  const projectMonthRecords = filterRecordsByPeriod(allRecords, 'month', projectId || '');
  const scopedRecords = filterRecordsByPeriod(allRecords, periodType, projectId || '');

  return {
    scopedRecords,
    weekMatrix: buildWeekMatrix(report.projectSummaries, weekRecords),
    monthHeatmap: projectId ? null : buildMonthHeatmap(monthRecords),
    singleProjectCalendar: buildSingleProjectCalendar(projectId, projectMonthRecords),
    metricTrend: buildMetricTrend(project, projectMonthRecords),
  };
}

Page({
  data: {
    activeTab: 'week',
    loading: true,
    report: null,
    pageTitle: '成绩单',
    projectTitle: '',
    isProjectMode: false,
    weekDays: [],
    weekMatrix: [],
    monthInsights: [],
    monthHeatmap: null,
    singleProjectCalendar: null,
    metricTrend: null,
    aiInsight: null,
  },

  async onLoad(options) {
    this.projectId = options.projectId || '';
    if (this.projectId) {
      try {
        const project = await service.getProjectById(this.projectId);
        this.setData({
          pageTitle: project ? `${project.title} 成绩单` : '成绩单',
          projectTitle: project ? project.title : '',
          isProjectMode: true,
        });
      } catch (error) {
        wx.showToast({
          title: error.message || '项目读取失败',
          icon: 'none',
        });
      }
    }

    await this.loadReport('week');
  },

  async loadReport(periodType) {
    this.setData({ loading: true });

    try {
      const [report, historyGroups, project] = await Promise.all([
        service.getReportCard(periodType, this.projectId || undefined),
        service.getHistoryGrouped(),
        this.projectId ? service.getProjectById(this.projectId) : Promise.resolve(null),
      ]);
      const allRecords = flattenHistory(historyGroups);
      const viewData = buildReportViewData(allRecords, periodType, this.projectId, report, project);

      this.setData({
        loading: false,
        activeTab: periodType,
        pageTitle: project ? `${project.title} 成绩单` : '成绩单',
        report,
        weekDays: getWeekDays(),
        weekMatrix: viewData.weekMatrix,
        monthInsights: buildMonthInsights(report.projectSummaries),
        monthHeatmap: viewData.monthHeatmap,
        singleProjectCalendar: viewData.singleProjectCalendar,
        metricTrend: viewData.metricTrend,
      });

      const aiInsight = await aiService.getReportInsight(
        buildInsightPayload(periodType, report, viewData.scopedRecords, project),
      );
      this.setData({ aiInsight });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '成绩单加载失败',
        icon: 'none',
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  async switchTab(event) {
    await this.loadReport(event.currentTarget.dataset.tab);
  },
});
