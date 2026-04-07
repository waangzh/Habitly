/**
 * 成绩单页
 * 展示周报/月报和打卡数据统计
 */

const service = require('../../services/habitService');
const { formatDate, getWeekDays, pad } = require('../../utils/date');

/** 构建周打卡矩阵 (项目 x 星期) */
function buildWeekMatrix(projectSummaries) {
  const weekDays = getWeekDays();

  return projectSummaries.map((summary) => {
    const detail = service.getProjectDetail(summary.projectId);
    const records = detail ? detail.records : [];
    const recordMap = records.reduce((map, item) => {
      map[item.date] = item;
      return map;
    }, {});

    return {
      ...summary,
      days: weekDays.map((day) => ({
        ...day,
        done: !!recordMap[day.key],
      })),
    };
  });
}

/** 构建月度洞察数据 */
function buildMonthInsights(projectSummaries) {
  return projectSummaries.map((summary) => {
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

/** 构建月度热力图 */
function buildMonthHeatmap(projectSummaries) {
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

  projectSummaries.forEach((summary) => {
    const detail = service.getProjectDetail(summary.projectId);
    const records = detail ? detail.records : [];
    records.forEach((record) => {
      const monthKey = `${year}-${pad(month + 1)}`;
      if (!record.date.startsWith(monthKey)) {
        return;
      }
      countMap[record.date] = (countMap[record.date] || 0) + 1;
    });
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

/** 构建单个项目的日历视图 */
function buildSingleProjectCalendar(projectId) {
  if (!projectId) {
    return null;
  }

  const detail = service.getProjectDetail(projectId);
  if (!detail) {
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

  const recordMap = detail.records.reduce((map, item) => {
    map[item.date] = item;
    return map;
  }, {});

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

/** 构建指标趋势数据 (最近7次) */
function buildMetricTrend(projectId) {
  if (!projectId) {
    return null;
  }

  const detail = service.getProjectDetail(projectId);
  if (!detail || !detail.project.metricEnabled) {
    return null;
  }

  const metricRecords = detail.records
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
    unit: item.metricUnit || detail.project.metricUnit || '',
    height: maxValue ? Math.max(18, Math.round((Number(item.metricValue || 0) / maxValue) * 120)) : 18,
  }));

  const totalValue = metricRecords.reduce((sum, item) => sum + Number(item.metricValue || 0), 0);
  const averageValue = Math.round((totalValue / metricRecords.length) * 10) / 10;

  return {
    unit: detail.project.metricUnit || '',
    totalValue,
    averageValue,
    points,
  };
}

Page({
  data: {
    activeTab: 'week',
    report: null,
    projectTitle: '',
    isProjectMode: false,
    weekDays: [],
    weekMatrix: [],
    monthInsights: [],
    monthHeatmap: null,
    singleProjectCalendar: null,
    metricTrend: null,
  },

  onLoad(options) {
    this.projectId = options.projectId || '';
    if (this.projectId) {
      const project = service.getProjectById(this.projectId);
      this.setData({
        projectTitle: project ? project.title : '',
        isProjectMode: true,
      });
    }

    this.loadReport('week');
  },

  /** 加载报表数据 */
  loadReport(periodType) {
    let report = service.getReportCard(periodType);
    if (this.projectId) {
      report = {
        ...report,
        projectSummaries: report.projectSummaries.filter((item) => item.projectId === this.projectId),
      };
    }

    this.setData({
      activeTab: periodType,
      report,
      weekDays: getWeekDays(),
      weekMatrix: buildWeekMatrix(report.projectSummaries),
      monthInsights: buildMonthInsights(report.projectSummaries),
      monthHeatmap: this.projectId ? null : buildMonthHeatmap(report.projectSummaries),
      singleProjectCalendar: buildSingleProjectCalendar(this.projectId),
      metricTrend: buildMetricTrend(this.projectId),
    });
  },

  goBack() {
    wx.navigateBack();
  },

  /** 切换报表类型 */
  switchTab(event) {
    this.loadReport(event.currentTarget.dataset.tab);
  },
});
