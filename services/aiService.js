const { getStorage, setStorage } = require('../utils/storage');
const { request } = require('./http');

const CACHE_KEY = 'habit-ai-cache';

function getCacheMap() {
  return getStorage(CACHE_KEY, {}) || {};
}

function saveCacheMap(cacheMap) {
  setStorage(CACHE_KEY, cacheMap);
}

function readCache(key) {
  const cacheMap = getCacheMap();
  const item = cacheMap[key];
  if (!item) {
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    delete cacheMap[key];
    saveCacheMap(cacheMap);
    return null;
  }

  return item.data;
}

function writeCache(key, data, ttlMs) {
  const cacheMap = getCacheMap();
  cacheMap[key] = {
    data,
    expiresAt: Date.now() + ttlMs,
  };
  saveCacheMap(cacheMap);
  return data;
}

function homeNudgeFallback(payload) {
  if (!payload.projectCount) {
    return {
      tone: 'gentle',
      message: '今天先别急着铺太满，先定下一个最想开始的小习惯。',
      suggestionTag: '先定一个小目标',
    };
  }

  if (!payload.pendingCount) {
    return {
      tone: 'celebrate',
      message: '今天这一页已经被你照顾得很稳了，收下这份轻轻的成就感。',
      suggestionTag: '今天做得很好',
    };
  }

  if (!payload.completedCount) {
    return {
      tone: 'recover',
      message: '先完成最轻的那一件，让今天慢慢重新接上节奏。',
      suggestionTag: '先做最轻的一步',
    };
  }

  return {
    tone: 'steady',
    message: `已经完成 ${payload.completedCount} 件了，接下来只盯住下一件就好。`,
    suggestionTag: '继续下一件',
  };
}

function reportInsightFallback(payload) {
  return {
    summary: payload.currentStreak >= 3
      ? '这段时间已经开始有稳定感了，不再只是偶尔做到一下。'
      : '你已经在给这件事留位置了，节奏正在一点点长出来。',
    blockerHypothesis: payload.lowEnergyCount
      ? '最近更像是状态起伏在拉扯你，而不是你不想继续。'
      : '现在更需要的是守住节奏，而不是一下把目标拉得更满。',
    nextStep: payload.reminderEnabled && payload.reminderTimes && payload.reminderTimes.length
      ? `先守住 ${payload.reminderTimes[0]} 这个提醒点，连续完成 2 次。`
      : '先把开始动作再缩小一点，让自己更容易接上。',
  };
}

function projectDraftFallback() {
  return {
    title: '小坚持',
    slogan: '先把步子放小一点，习惯就更容易长出来。',
    reminderTimes: ['21:30'],
    moodEnabled: true,
    scoreEnabled: false,
    metricEnabled: false,
    metricUnit: '',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    icon: '🌱',
    colorTheme: 'blue',
  };
}

function checkinCoachFallback() {
  return {
    question: '今天这次完成，最帮到你的那个小动作是什么？',
    hint: '不用写很多，抓住一个最具体的动作就够了。',
  };
}

function checkinReflectionFallback(answer) {
  return {
    reflection: answer
      ? `你刚刚提到的「${answer}」很可能就是这次最值得保留的启动线索。`
      : '你愿意停下来回看一下，这本身就在帮习惯慢慢长出来。',
    suggestion: '下次开始前，先把这个小动作轻轻提醒自己一遍。',
  };
}

async function withCache(key, ttlMs, fallback, executor) {
  const cached = readCache(key);
  if (cached) {
    return cached;
  }

  try {
    const data = await executor();
    return writeCache(key, data, ttlMs);
  } catch (error) {
    return fallback;
  }
}

async function getHomeNudge(payload) {
  const key = `home:${payload.selectedDate}`;
  return withCache(key, 24 * 60 * 60 * 1000, homeNudgeFallback(payload), async () => {
    return request({
      url: '/ai/home-nudge',
      method: 'POST',
      data: payload,
    });
  });
}

async function getReportInsight(payload) {
  const scopeKey = payload.scope === 'project' ? payload.projectId || payload.title : 'all';
  const key = `report:${payload.periodType}:${payload.periodKey}:${payload.scope}:${scopeKey}`;
  return withCache(key, 7 * 24 * 60 * 60 * 1000, reportInsightFallback(payload), async () => {
    return request({
      url: '/ai/report-insight',
      method: 'POST',
      data: payload,
    });
  });
}

async function getProjectDraft(payload) {
  const key = `draft:${payload.prompt}`;
  return withCache(key, 24 * 60 * 60 * 1000, projectDraftFallback(), async () => {
    return request({
      url: '/ai/project-draft',
      method: 'POST',
      data: payload,
    });
  });
}

async function getCheckinCoach(payload) {
  try {
    return await request({
      url: '/ai/checkin-coach',
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    return checkinCoachFallback();
  }
}

async function replyCheckinCoach(payload) {
  try {
    return await request({
      url: '/ai/checkin-reflection',
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    return checkinReflectionFallback(payload.answer);
  }
}

module.exports = {
  getCheckinCoach,
  getHomeNudge,
  getProjectDraft,
  getReportInsight,
  replyCheckinCoach,
};
