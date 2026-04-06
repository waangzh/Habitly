Component({
  properties: {
    title: String,
    desc: String,
    buttonText: String,
  },
  methods: {
    onTap() {
      this.triggerEvent('action');
    },
  },
});
