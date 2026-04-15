/**
 * 成就页
 * 展示用户成就徽章和统计数据
 */

const service = require('../../services/habitService');

function getWindowWidth() {
  try {
    const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : {};
    return windowInfo.windowWidth || 375;
  } catch (error) {
    return 375;
  }
}

const windowWidth = getWindowWidth();
const RATIO = windowWidth / 750;
const CHART_HEIGHT_RPX = 240;
const CANVAS_HEIGHT_RPX = 260;
const CHART_STEP_RPX = 96;
const AXIS_SEGMENT_COUNT = 4;
const VISIBLE_WEEKS = 6;
const CHART_TOP_PADDING_RPX = 24;
const POINT_HIT_SIZE_RPX = 56;

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

function getNiceAxisStep(maxValue, segmentCount) {
  const safeMax = Math.max(1, maxValue);
  const rawStep = Math.max(1, Math.ceil(safeMax / segmentCount));
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceSteps = [1, 2, 3, 4, 5, 6, 8, 10];
  const step = niceSteps.find((item) => normalized <= item) || 10;

  return step * magnitude;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultSelectedWeek(weekly, selectedWeek) {
  if (selectedWeek) {
    return selectedWeek;
  }

  if (weekly.currentWeek) {
    return weekly.currentWeek;
  }

  const series = weekly.series || [];
  return series.length ? series[series.length - 1].week : 0;
}

function buildChartModel(weekly, selectedWeek) {
  const scaleBase = Math.max(8, weekly.maxCount || 0);
  const axisStep = getNiceAxisStep(scaleBase, AXIS_SEGMENT_COUNT);
  const scaleMax = axisStep * AXIS_SEGMENT_COUNT;
  const series = weekly.series || [];
  const resolvedSelectedWeek = getDefaultSelectedWeek(weekly, selectedWeek);
  const chartWidth = Math.max(720, (series.length - 1) * CHART_STEP_RPX + 120);
  const scrollLeft = Math.max(0, (Math.max(0, resolvedSelectedWeek - VISIBLE_WEEKS)) * CHART_STEP_RPX);
  const axisValues = Array.from({ length: AXIS_SEGMENT_COUNT + 1 }, (_, index) => index * axisStep);
  const axisWidth = Math.max(36, String(scaleMax).length * 24 + 8);
  const plotHeight = CHART_HEIGHT_RPX - CHART_TOP_PADDING_RPX;

  return {
    year: weekly.year,
    currentWeek: weekly.currentWeek,
    selectedWeek: resolvedSelectedWeek,
    chartWidth: `${chartWidth}rpx`,
    chartWidthRpx: chartWidth,
    canvasHeightRpx: CANVAS_HEIGHT_RPX,
    canvasWidthPx: Math.round(rpxToPx(chartWidth)),
    canvasHeightPx: Math.round(rpxToPx(CANVAS_HEIGHT_RPX)),
    chartInnerHeightPx: rpxToPx(CHART_HEIGHT_RPX),
    axisWidth: `${axisWidth}rpx`,
    scrollLeft,
    axisValues: axisValues.map((value) => ({
      value,
      bottom: `${(value / scaleMax) * plotHeight}rpx`,
    })),
    points: series.map((item, index) => ({
      week: item.week,
      count: item.count,
      left: `${60 + index * CHART_STEP_RPX}rpx`,
      top: `${CHART_TOP_PADDING_RPX + (1 - item.count / scaleMax) * plotHeight}rpx`,
      hitSize: `${POINT_HIT_SIZE_RPX}rpx`,
      x: rpxToPx(60 + index * CHART_STEP_RPX),
      y: rpxToPx(CHART_TOP_PADDING_RPX + (1 - item.count / scaleMax) * plotHeight),
      active: item.week === weekly.currentWeek,
      selected: item.week === resolvedSelectedWeek,
    })),
    labels: series.map((item, index) => ({
      week: item.week,
      left: `${60 + index * CHART_STEP_RPX}rpx`,
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

  updateSelectedWeek(week) {
    const chart = this.data.weeklyChart;
    if (!chart || !week || chart.selectedWeek === week) {
      return;
    }

    const weeklyChart = {
      ...chart,
      selectedWeek: week,
      points: chart.points.map((item) => ({
        ...item,
        selected: item.week === week,
      })),
    };

    this.setData({ weeklyChart }, () => {
      this.scheduleDrawWeeklyChart();
    });
  },

  handlePointTap(event) {
    const week = Number(event.currentTarget.dataset.week);
    if (!week) {
      return;
    }

    this.updateSelectedWeek(week);
  },

  handleChartTap(event) {
    const chart = this.data.weeklyChart;
    if (!chart || !chart.points.length) {
      return;
    }

    const detail = event.detail || {};
    const tapX = Number(detail.x);
    const tapY = Number(detail.y);
    if (Number.isNaN(tapX) || Number.isNaN(tapY)) {
      return;
    }

    const threshold = rpxToPx(POINT_HIT_SIZE_RPX / 2);
    let nearestPoint = null;
    let nearestDistance = Infinity;

    chart.points.forEach((point) => {
      const distance = Math.hypot(point.x - tapX, point.y - tapY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = point;
      }
    });

    if (nearestPoint && nearestDistance <= threshold) {
      this.updateSelectedWeek(nearestPoint.week);
    }
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
    const plotLeft = points.length ? points[0].x : 0;
    const plotRight = points.length > 1 ? points[points.length - 1].x : width;

    ctx.clearRect(0, 0, width, height);

    chart.axisValues.forEach((item) => {
      const bottom = Number(item.bottom.replace('rpx', ''));
      const y = baselineY - rpxToPx(bottom);

      ctx.beginPath();
      ctx.setStrokeStyle('rgba(145, 196, 255, 0.18)');
      ctx.setLineWidth(1);
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
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
      const isHighlighted = point.selected;

      ctx.beginPath();
      ctx.setFillStyle(point.selected ? '#4baef8' : '#56b6ff');
      ctx.arc(point.x, point.y, rpxToPx(isHighlighted ? 10 : 8), 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.setStrokeStyle('#ffffff');
      ctx.setLineWidth(rpxToPx(4));
      ctx.arc(point.x, point.y, rpxToPx(isHighlighted ? 10 : 8), 0, Math.PI * 2);
      ctx.stroke();
    });

    const selectedPoint = points.find((item) => item.selected) || points.find((item) => item.active) || points[points.length - 1];
    if (selectedPoint) {
      const countText = String(selectedPoint.count);
      const bubbleWidth = Math.max(rpxToPx(56), rpxToPx(28 + countText.length * 18));
      const bubbleHeight = rpxToPx(42);
      const bubbleX = clamp(selectedPoint.x - bubbleWidth / 2, 0, width - bubbleWidth);
      const bubbleY = clamp(selectedPoint.y - rpxToPx(60), rpxToPx(8), baselineY - bubbleHeight - rpxToPx(12));

      ctx.setFillStyle('#4baef8');
      drawRoundRectPath(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, rpxToPx(22));
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(selectedPoint.x - rpxToPx(8), bubbleY + bubbleHeight - rpxToPx(2));
      ctx.lineTo(selectedPoint.x + rpxToPx(8), bubbleY + bubbleHeight - rpxToPx(2));
      ctx.lineTo(selectedPoint.x, bubbleY + bubbleHeight + rpxToPx(10));
      ctx.closePath();
      ctx.setFillStyle('#4baef8');
      ctx.fill();

      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(rpxToPx(24));
      ctx.setTextAlign('center');
      ctx.setTextBaseline('middle');
      ctx.fillText(countText, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
    }

    ctx.draw();
  },
});
