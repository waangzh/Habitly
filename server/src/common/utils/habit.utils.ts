import { createHash } from 'crypto';
import dayjs from 'dayjs';

export const ALL_SCHEDULE_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WORKDAY_DAYS = [1, 2, 3, 4, 5];
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
export const WEEKDAY_LABEL_MAP: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

export function formatDate(input: string | Date | dayjs.Dayjs): string {
  return dayjs(input).format('YYYY-MM-DD');
}

export function formatMonthLabel(dateText: string): string {
  return dayjs(dateText).format('YYYY 年 M 月');
}

export function getWeekday(dateText: string): string {
  return WEEK_LABELS[dayjs(dateText).day()];
}

export function getWeekRange(dateText: string) {
  const current = dayjs(dateText);
  const start = current.subtract(current.day(), 'day');

  return Array.from({ length: 7 }).map((_, index) => {
    const item = start.add(index, 'day');
    return {
      date: item.format('YYYY-MM-DD'),
      day: WEEK_LABELS[item.day()],
      dayNumber: item.date(),
      isToday: item.format('YYYY-MM-DD') === formatDate(new Date()),
    };
  });
}

export function getCurrentMonthKey(): string {
  return dayjs().format('YYYY-MM');
}

export function normalizeReminderTimes(reminderTimes: string[] | null | undefined): string[] {
  if (!Array.isArray(reminderTimes)) {
    return [];
  }

  const normalized = reminderTimes
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
      if (!match) {
        return item;
      }
      return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
    });

  return normalized.filter((item, index) => normalized.indexOf(item) === index);
}

export function normalizeScheduleType(scheduleType?: string): 'daily' | 'weekly-custom' {
  return scheduleType === 'weekly-custom' ? 'weekly-custom' : 'daily';
}

export function normalizeScheduleDays(scheduleDays?: number[] | null): number[] {
  const normalized = Array.isArray(scheduleDays)
    ? scheduleDays.map((item) => Number(item)).filter((item) => item >= 0 && item <= 6)
    : [];

  const unique: number[] = [];
  WEEKDAY_ORDER.forEach((day) => {
    if (normalized.includes(day) && !unique.includes(day)) {
      unique.push(day);
    }
  });

  return unique.length ? unique : [...ALL_SCHEDULE_DAYS];
}

export function formatScheduleText(scheduleType: string, scheduleDays: number[]): string {
  if (scheduleType !== 'weekly-custom' || scheduleDays.length === ALL_SCHEDULE_DAYS.length) {
    return '每天';
  }

  const ordered = WEEKDAY_ORDER.filter((day) => scheduleDays.includes(day));
  const joined = ordered.join(',');

  if (joined === '1,2,3,4,5') {
    return '工作日';
  }

  if (joined === '6,0') {
    return '周末';
  }

  return ordered.map((day) => WEEKDAY_LABEL_MAP[day]).join('、');
}

export function shouldShowOnDate(
  project: { status: string; scheduleType: string; scheduleDays: number[] },
  dateText: string,
): boolean {
  if (project.status !== 'active') {
    return false;
  }

  if (project.scheduleType === 'daily' || project.scheduleDays.length === ALL_SCHEDULE_DAYS.length) {
    return true;
  }

  return project.scheduleDays.includes(dayjs(dateText).day());
}

export function calculateCompletionRate(totalCheckins: number, expectedCount: number): number {
  if (!expectedCount) {
    return 0;
  }
  return Math.min(100, Math.round((totalCheckins / expectedCount) * 100));
}

export function calculateStreakStats(dateTexts: string[]) {
  const sorted = [...dateTexts].sort((a, b) => a.localeCompare(b));
  let currentStreak = 0;
  let longestStreak = 0;
  let lastDate = '';

  sorted.forEach((item) => {
    if (!lastDate) {
      currentStreak = 1;
      longestStreak = 1;
      lastDate = item;
      return;
    }

    const distance = dayjs(item).diff(dayjs(lastDate), 'day');
    currentStreak = distance === 1 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    lastDate = item;
  });

  return {
    currentStreak,
    longestStreak,
    lastCheckinDate: sorted.length ? sorted[sorted.length - 1] : '',
  };
}

export function getWeekOfYear(input: string | Date): number {
  const date = dayjs(input).startOf('day');
  const yearStart = dayjs(`${date.year()}-01-01`).startOf('day');
  const dayOffset = date.diff(yearStart, 'day');
  return Math.floor((dayOffset + yearStart.day()) / 7) + 1;
}

export function getCurrentYearWeekCount(year: number): number {
  return getWeekOfYear(`${year}-12-31`);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

const DURATION_UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function parseDurationToSeconds(raw: string): number {
  const match = raw.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return Number(raw) || 0;
  }
  return Number(match[1]) * DURATION_UNIT_TO_SECONDS[match[2].toLowerCase()];
}

export function mapCheckinToResponse(record: {
  id: string | number;
  projectId: string | number;
  checkinDate: string;
  status: string;
  checkedAt: Date;
  moodValue: string;
  scoreValue: number;
  metricValue: number;
  metricUnit: string;
  note?: string;
}) {
  return {
    recordId: Number(record.id),
    projectId: Number(record.projectId),
    date: record.checkinDate,
    status: record.status,
    checkedAt: record.checkedAt.toISOString(),
    moodValue: record.moodValue,
    scoreValue: record.scoreValue,
    metricValue: record.metricValue,
    metricUnit: record.metricUnit,
    note: record.note,
  };
}
