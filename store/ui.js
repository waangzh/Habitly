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
