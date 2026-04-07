/**
 * 日期工具函数
 * 提供日期格式化、解析和周范围计算
 */

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 数字补零 */
function pad(value) {
  return `${value}`.padStart(2, '0');
}

/** 日期格式化为 YYYY-MM-DD */
function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 解析日期字符串为 Date 对象 */
function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** 格式化月份标签 (YYYY 年 M 月) */
function formatMonthLabel(dateString) {
  const date = parseDate(dateString);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

/** 获取指定日期所在周的所有日期 */
function getWeekRange(dateString) {
  const current = parseDate(dateString);
  const weekday = current.getDay();
  const start = new Date(current);
  start.setDate(current.getDate() - weekday);

  return Array.from({ length: 7 }).map((_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return {
      date: formatDate(item),
      day: WEEK_LABELS[item.getDay()],
      dayNumber: item.getDate(),
      isToday: formatDate(item) === formatDate(new Date()),
    };
  });
}

/** 获取星期几 */
function getWeekday(dateString) {
  return WEEK_LABELS[parseDate(dateString).getDay()];
}

/** 格式化显示日期 (M 月 D 日 周X) */
function formatDisplayDate(dateString) {
  const date = parseDate(dateString);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 周${WEEK_LABELS[date.getDay()]}`;
}

/** 获取当前周的简化日期列表 (用于周报表) */
function getWeekDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: formatDate(date),
      label: WEEK_LABELS[date.getDay()],
      dayNumber: date.getDate(),
    };
  });
}

module.exports = {
  formatDate,
  formatDisplayDate,
  formatMonthLabel,
  getWeekRange,
  getWeekday,
  getWeekDays,
  pad,
  parseDate,
};
