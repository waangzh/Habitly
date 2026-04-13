import {
  calculateStreakStats,
  formatScheduleText,
  normalizeScheduleDays,
  shouldShowOnDate,
} from './habit.utils';

describe('habit.utils', () => {
  it('会按固定顺序归一化周期日', () => {
    expect(normalizeScheduleDays([5, 1, 1, 0, 3])).toEqual([1, 3, 5, 0]);
  });

  it('能输出工作日文案', () => {
    expect(formatScheduleText('weekly-custom', [1, 2, 3, 4, 5])).toBe('工作日');
  });

  it('能正确计算连续天数', () => {
    expect(calculateStreakStats(['2026-04-01', '2026-04-02', '2026-04-04'])).toEqual({
      currentStreak: 1,
      longestStreak: 2,
      lastCheckinDate: '2026-04-04',
    });
  });

  it('暂停项目不会出现在首页', () => {
    expect(
      shouldShowOnDate(
        {
          status: 'paused',
          scheduleType: 'daily',
          scheduleDays: [0, 1, 2, 3, 4, 5, 6],
        },
        '2026-04-12',
      ),
    ).toBe(false);
  });
});
