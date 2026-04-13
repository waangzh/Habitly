const { getStorage, setStorage } = require('../utils/storage');
const { publicRequest } = require('./http');

const SESSION_KEY = 'habit-auth-session';

const DEFAULT_USER = {
  userId: '',
  nickname: 'Habitly 用户',
  avatarUrl: '',
  bio: '把每一次小坚持，都变成看得见的成长。',
  coverTheme: 'sky',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
  vipStatus: 'free',
};

let initPromise = null;
let refreshPromise = null;

function getAppSafe() {
  return typeof getApp === 'function' ? getApp() : null;
}

function isDevelopmentEnv() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.envVersion !== 'release';
  } catch (error) {
    return true;
  }
}

function getSession() {
  return getStorage(SESSION_KEY, null);
}

function applyUser(user, syncStatus) {
  const app = getAppSafe();
  if (!app || !app.globalData) {
    return;
  }

  app.globalData.user = {
    ...DEFAULT_USER,
    ...(app.globalData.user || {}),
    ...(user || {}),
    syncStatus: syncStatus || 'ok',
  };
}

function saveSession(session, syncStatus) {
  setStorage(SESSION_KEY, session);
  applyUser(session ? session.user : null, syncStatus || 'ok');
  return session;
}

function clearSession(syncStatus) {
  setStorage(SESSION_KEY, null);
  applyUser(DEFAULT_USER, syncStatus || 'failed');
}

async function devLogin() {
  const data = await publicRequest({
    url: '/auth/dev-login',
    method: 'POST',
    data: {},
  });

  return saveSession(data, 'ok');
}

async function refreshSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = getSession();
    applyUser(session ? session.user : null, 'pending');

    if (session && session.refreshToken) {
      try {
        const data = await publicRequest({
          url: '/auth/refresh',
          method: 'POST',
          data: {
            refreshToken: session.refreshToken,
          },
        });
        return saveSession(data, 'ok');
      } catch (error) {
        if (!isDevelopmentEnv()) {
          clearSession('failed');
          throw error;
        }
      }
    }

    try {
      return await devLogin();
    } catch (error) {
      clearSession('failed');
      throw error;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function initSession() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const session = getSession();
    if (session && session.accessToken) {
      applyUser(session.user, 'ok');
      return session;
    }

    applyUser(DEFAULT_USER, 'pending');
    try {
      return await devLogin();
    } catch (error) {
      clearSession('failed');
      throw error;
    }
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

async function ensureSession() {
  const session = getSession();
  if (session && session.accessToken) {
    applyUser(session.user, 'ok');
    return session;
  }
  return initSession();
}

module.exports = {
  DEFAULT_USER,
  SESSION_KEY,
  applyUser,
  clearSession,
  devLogin,
  ensureSession,
  getSession,
  initSession,
  refreshSession,
  saveSession,
};
