/**
 * UI 状态管理
 * 提供界面相关的状态文本转换
 */

/**
 * 获取同步状态文本
 * @param {string} syncStatus - 同步状态值
 * @returns {string} 状态文本
 */
function getSyncStatusText(syncStatus) {
  if (syncStatus === 'failed') {
    return '同步稍后重试';
  }

  if (syncStatus === 'pending') {
    return '正在整理你的进度';
  }

  return '刚刚同步完成';
}

module.exports = {
  getSyncStatusText,
};
