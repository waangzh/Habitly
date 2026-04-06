Component({
  properties: {
    project: Object,
  },
  methods: {
    onCheck() {
      this.triggerEvent('check', { projectId: this.properties.project.projectId });
    },
  },
});
