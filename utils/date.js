const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatMonthLabel(dateString) {
  const date = parseDate(dateString);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

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

function getWeekday(dateString) {
  return WEEK_LABELS[parseDate(dateString).getDay()];
}

function formatDisplayDate(dateString) {
  const date = parseDate(dateString);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 周${WEEK_LABELS[date.getDay()]}`;
}

module.exports = {
  formatDate,
  formatDisplayDate,
  formatMonthLabel,
  getWeekRange,
  getWeekday,
  parseDate,
};
