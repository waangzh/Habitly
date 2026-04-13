const { getStorage } = require('../utils/storage');

const BASE_URL = 'http://127.0.0.1:3000/api/v1';

function joinUrl(path) {
  if (!path) {
    return BASE_URL;
  }
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function rawRequest(options) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
  } = options || {};

  return new Promise((resolve, reject) => {
    wx.request({
      url: joinUrl(url),
      method,
      data,
      header,
      success(response) {
        const payload = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && payload.code === 0) {
          resolve(payload.data);
          return;
        }

        reject({
          code: payload.code || response.statusCode || 50000,
          message: payload.message || '请求失败',
          response,
        });
      },
      fail(error) {
        reject({
          code: 50000,
          message: '网络连接不稳定，请稍后再试',
          error,
        });
      },
    });
  });
}

async function publicRequest(options) {
  return rawRequest(options);
}

async function request(options, retried) {
  const authService = require('./authService');
  const session = await authService.ensureSession();
  const accessToken = session && session.accessToken
    ? session.accessToken
    : getStorage('habit-auth-session', {}).accessToken;

  try {
    return await rawRequest({
      ...options,
      header: {
        ...(options && options.header ? options.header : {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    if (error && error.code === 40101 && !retried) {
      await authService.refreshSession();
      return request(options, true);
    }
    throw error;
  }
}

module.exports = {
  BASE_URL,
  publicRequest,
  rawRequest,
  request,
};
