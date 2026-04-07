/**
 * 项目卡片组件
 * 展示项目摘要信息，支持暂停/恢复操作
 */

Component({
  properties: {
    project: Object,
    paused: { type: Boolean, value: false },
  },

  methods: {
    /** 点击卡片，跳转详情 */
    onDetail() {
      this.triggerEvent('detail', { projectId: this.properties.project.projectId });
    },

    /** 点击编辑 */
    onEdit() {
      this.triggerEvent('edit', { projectId: this.properties.project.projectId });
    },

    /** 点击操作按钮 (暂停/恢复) */
    onAction() {
      this.triggerEvent('action', { projectId: this.properties.project.projectId });
    },
  },
});
