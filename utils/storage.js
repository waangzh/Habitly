/**
 * 本地存储工具函数
 * 封装微信小程序同步存储 API
 */

/**
 * 获取存储数据
 * @param {string} key - 存储键名
 * @param {*} fallback - 默认值
 * @returns {*} 存储值或默认值
 */
function getStorage(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

/**
 * 设置存储数据
 * @param {string} key - 存储键名
 * @param {*} value - 存储值
 */
function setStorage(key, value) {
  wx.setStorageSync(key, value);
}

module.exports = {
  getStorage,
  setStorage,
};
