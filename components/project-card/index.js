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
  },
});
