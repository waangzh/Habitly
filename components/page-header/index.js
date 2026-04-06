Component({
  properties: {
    title: String,
    leftText: { type: String, value: '' },
    rightText: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
  },
  methods: {
    onBack() {
      this.triggerEvent('back');
    },
    onLeftTap() {
      this.triggerEvent('lefttap');
    },
    onRightTap() {
      this.triggerEvent('righttap');
    },
  },
});
