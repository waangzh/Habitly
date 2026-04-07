/**
 * 习惯卡片组件
 * 展示单个习惯项目及其打卡状态
 */

Component({
  properties: {
    project: Object,
  },

  methods: {
    /** 触发打卡事件 */
    onCheck() {
      this.triggerEvent('check', { projectId: this.properties.project.projectId });
    },
  },
});
