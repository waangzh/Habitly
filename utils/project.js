/**
 * 项目工具函数
 * 提供项目卡片数据构建等通用功能
 */

const service = require('../services/habitService');

/** 格式化开始日期标签 */
function formatStartedLabel(dateText) {
  if (!dateText) {
    return 'Since today';
  }

  const [year, month, day] = dateText.split('-');
  return `Since ${month} ${day}, ${year}`;
}

/** 获取目标类型标签 */
function getTargetLabel(project) {
  if (project.targetType === 'forever') {
    return '永远';
  }

  if (project.targetValue) {
    return `${project.targetValue}天`;
  }

  return '长期';
}

/** 构建项目卡片视图数据 */
function buildProjectCard(project) {
  const detail = service.getProjectDetail(project.projectId);
  const stats = detail ? detail.stats : { monthCheckins: 0, currentStreak: 0 };

  return {
    ...project,
    cardStats: {
      monthCheckins: stats.monthCheckins || 0,
      currentStreak: stats.currentStreak || 0,
      targetLabel: getTargetLabel(project),
      startedLabel: formatStartedLabel(project.startDate),
    },
  };
}

module.exports = {
  buildProjectCard,
  formatStartedLabel,
  getTargetLabel,
};
