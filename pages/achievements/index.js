/**
 * 成就页
 * 展示用户成就徽章和统计数据
 */

const service = require('../../services/habitService');

const { windowWidth } = wx.getSystemInfoSync();
const RATIO = windowWidth / 750;

function rpxToPx(value) {
  return value * RATIO;
}

function drawRoundRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.arc(x + width - safeRadius, y + safeRadius, safeRadius, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.arc(x + width - safeRadius, y + height - safeRadius, safeRadius, 0, Math.PI / 2);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.arc(x + safeRadius, y + height - safeRadius, safeRadius, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + safeRadius);
  ctx.arc(x + safeRadius, y + safeRadius, safeRadius, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

function buildChartModel(weekly) {
  const chartHeight = 240;
  const axisValues = [0, 2, 4, 6, 8];
  const scaleMax = Math.max(8, weekly.maxCount || 0);
  const series = weekly.series || [];
  const step = 96;
  const visibleWeeks = 6;
  const chartWidth = Math.max(720, (series.length - 1) * step + 120);
  const scrollLeft = Math.max(0, (Math.max(0, weekly.currentWeek - visibleWeeks)) * step);
  const canvasHeight = 260;

  return {
    year: weekly.year,
    currentWeek: weekly.currentWeek,
    chartWidth: `${chartWidth}rpx`,
    chartWidthRpx: chartWidth,
    canvasHeightRpx: canvasHeight,
    canvasWidthPx: Math.round(rpxToPx(chartWidth)),
    canvasHeightPx: Math.round(rpxToPx(canvasHeight)),
    chartInnerHeightPx: rpxToPx(chartHeight),
    scrollLeft,
    axisValues: axisValues.map((value) => ({
      value,
      bottom: `${(value / scaleMax) * chartHeight}rpx`,
    })),
    points: series.map((item, index) => ({
      week: item.week,
      count: item.count,
      left: `${60 + index * step}rpx`,
      x: rpxToPx(60 + index * step),
      y: rpxToPx(chartHeight - (item.count / scaleMax) * chartHeight),
      active: item.week === weekly.currentWeek,
    })),
    labels: series.map((item, index) => ({
      week: item.week,
      left: `${60 + index * step}rpx`,
    })),
  };
}

Page({
  data: {
    summary: null,
    weeklyChart: null,
    selectedYear: new Date().getFullYear(),
    summaryYear: new Date().getFullYear(),
  },

  drawTimer: null,

  async onShow() {
    try {
      const summary = await service.getAchievementSummary();
      this.setData({ summary });
      await this.loadWeeklyChart(this.data.selectedYear);
    } catch (error) {
      wx.showToast({
        title: error.message || '成就页加载失败',
        icon: 'none',
      });
    }
  },

  onHide() {
    this.clearDrawTimer();
  },

  onUnload() {
    this.clearDrawTimer();
  },

  async loadWeeklyChart(year) {
    const weekly = await service.getWeeklyCheckinSeries(year);
    const weeklyChart = buildChartModel(weekly);

    this.setData({
      selectedYear: year,
      weeklyChart,
    }, () => {
      this.scheduleDrawWeeklyChart();
    });
  },

  async handlePrevYear() {
    await this.loadWeeklyChart(this.data.selectedYear - 1);
  },

  async handleNextYear() {
    if (this.data.selectedYear >= this.data.summaryYear) {
      return;
    }

    await this.loadWeeklyChart(this.data.selectedYear + 1);
  },

  clearDrawTimer() {
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
      this.drawTimer = null;
    }
  },

  scheduleDrawWeeklyChart() {
    this.clearDrawTimer();
    this.drawWeeklyChart();

    this.drawTimer = setTimeout(() => {
      this.drawWeeklyChart();
      this.drawTimer = null;
    }, 60);
  },

  drawWeeklyChart() {
    const chart = this.data.weeklyChart;
    if (!chart || !chart.points.length) {
      return;
    }

    const ctx = wx.createCanvasContext('weeklyTrend', this);
    const width = chart.canvasWidthPx;
    const height = chart.canvasHeightPx;
    const innerHeight = chart.chartInnerHeightPx;
    const baselineY = innerHeight;
    const points = chart.points;

    ctx.clearRect(0, 0, width, height);

    chart.axisValues.forEach((item) => {
      const bottom = Number(item.bottom.replace('rpx', ''));
      const y = rpxToPx(240 - bottom);
      ctx.beginPath();
      ctx.setStrokeStyle('rgba(145, 196, 255, 0.18)');
      ctx.setLineWidth(1);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, baselineY);
    ctx.lineTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const controlX = (current.x + next.x) / 2;
      ctx.quadraticCurveTo(controlX, current.y, next.x, next.y);
    }
    ctx.lineTo(points[points.length - 1].x, baselineY);
    ctx.closePath();
    ctx.setFillStyle('rgba(101, 186, 255, 0.16)');
    ctx.fill();

    ctx.beginPath();
    ctx.setStrokeStyle('#94d1ff');
    ctx.setLineWidth(rpxToPx(8));
    ctx.setLineCap('round');
    ctx.setLineJoin('round');
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const controlX = (current.x + next.x) / 2;
      ctx.quadraticCurveTo(controlX, current.y, next.x, next.y);
    }
    ctx.stroke();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.setFillStyle(point.active ? '#4baef8' : '#56b6ff');
      ctx.arc(point.x, point.y, rpxToPx(point.active ? 10 : 8), 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.setStrokeStyle('#ffffff');
      ctx.setLineWidth(rpxToPx(4));
      ctx.arc(point.x, point.y, rpxToPx(point.active ? 10 : 8), 0, Math.PI * 2);
      ctx.stroke();
    });

    const activePoint = points.find((item) => item.active);
    if (activePoint && activePoint.count) {
      const bubbleWidth = rpxToPx(56);
      const bubbleHeight = rpxToPx(42);
      const bubbleX = activePoint.x - bubbleWidth / 2;
      const bubbleY = activePoint.y - rpxToPx(60);

      ctx.setFillStyle('#4baef8');
      drawRoundRectPath(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, rpxToPx(22));
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(activePoint.x - rpxToPx(8), bubbleY + bubbleHeight - rpxToPx(2));
      ctx.lineTo(activePoint.x + rpxToPx(8), bubbleY + bubbleHeight - rpxToPx(2));
      ctx.lineTo(activePoint.x, bubbleY + bubbleHeight + rpxToPx(10));
      ctx.closePath();
      ctx.setFillStyle('#4baef8');
      ctx.fill();

      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(rpxToPx(24));
      ctx.setTextAlign('center');
      ctx.setTextBaseline('middle');
      ctx.fillText(String(activePoint.count), activePoint.x, bubbleY + bubbleHeight / 2);
    }

    ctx.draw();
  },
});
