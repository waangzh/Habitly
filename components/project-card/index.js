/**
 * 项目卡片组件
 * 展示项目摘要信息，支持暂停/恢复等操作
 */

Component({
  properties: {
    project: Object,
    paused: { type: Boolean, value: false },
  },

  methods: {
    onDetail() {
      this.triggerEvent('detail', { projectId: this.properties.project.projectId });
    },

    onEdit() {
      this.triggerEvent('edit', { projectId: this.properties.project.projectId });
    },

    onAction() {
      this.triggerEvent('action', { projectId: this.properties.project.projectId });
    },

    onMore() {
      this.triggerEvent('more', { projectId: this.properties.project.projectId });
    },
  },
});
