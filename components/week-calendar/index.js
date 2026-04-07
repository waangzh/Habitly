/**
 * 周日历组件
 * 展示一周日期，支持日期选择
 */

Component({
  properties: {
    items: { type: Array, value: [] },
    selectedDate: String,
  },

  methods: {
    /** 选择日期 */
    onSelect(event) {
      this.triggerEvent('select', { date: event.currentTarget.dataset.date });
    },
  },
});
