function getStorage(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function setStorage(key, value) {
  wx.setStorageSync(key, value);
}

module.exports = {
  getStorage,
  setStorage,
};
