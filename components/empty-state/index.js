/**
 * 空状态组件
 * 展示无数据时的提示信息和操作按钮
 */

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
