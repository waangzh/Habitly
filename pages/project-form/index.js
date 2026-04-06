const service = require('../../services/habitService');
const { formatDate } = require('../../utils/date');

const COLOR_THEMES = [
  { key: 'blue', label: '晴空蓝' },
  { key: 'green', label: '薄荷绿' },
  { key: 'orange', label: '暖橙色' },
];

const FREQUENCIES = ['每天', '工作日', '周日'];
const HOURS = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0'));

Page({
  data: {
    projectId: '',
    isEdit: false,
    icons: service.DEFAULT_ICONS,
    colorThemes: COLOR_THEMES,
    frequencyOptions: FREQUENCIES,
    hourOptions: HOURS,
    minuteOptions: MINUTES,
    showReminderPicker: false,
    pickerValue: [0, 8, 0],
    form: {
      title: '',
      icon: '🏃',
      slogan: '',
      colorTheme: 'blue',
      startDate: formatDate(new Date()),
      reminderEnabled: true,
      reminderTimes: ['每天 08:00'],
      moodEnabled: false,
      scoreEnabled: false,
      metricEnabled: false,
    },
  },

  onLoad(options) {
    if (!options.projectId) {
      return;
    }

    const project = service.getProjectById(options.projectId);
    if (!project) {
      return;
    }

    this.setData({
      projectId: options.projectId,
      isEdit: true,
      form: {
        title: project.title,
        icon: project.icon,
        slogan: project.slogan,
        colorTheme: project.colorTheme,
        startDate: project.startDate,
        reminderEnabled: project.reminderEnabled,
        reminderTimes: (project.reminderTimes || []).length ? project.reminderTimes : ['每天 08:00'],
        moodEnabled: project.moodEnabled,
        scoreEnabled: project.scoreEnabled,
        metricEnabled: project.metricEnabled,
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  noop() {},

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },

  handleSwitch(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },

  chooseIcon(event) {
    this.setData({
      'form.icon': event.currentTarget.dataset.icon,
    });
  },

  chooseTheme(event) {
    this.setData({
      'form.colorTheme': event.currentTarget.dataset.theme,
    });
  },

  openReminderPicker() {
    this.setData({
      showReminderPicker: true,
    });
  },

  closeReminderPicker() {
    this.setData({
      showReminderPicker: false,
    });
  },

  handlePickerChange(event) {
    this.setData({
      pickerValue: event.detail.value,
    });
  },

  confirmReminderPicker() {
    const [frequencyIndex, hourIndex, minuteIndex] = this.data.pickerValue;
    const timeText = `${this.data.frequencyOptions[frequencyIndex]} ${this.data.hourOptions[hourIndex]}:${this.data.minuteOptions[minuteIndex]}`;
    const reminderTimes = [...this.data.form.reminderTimes];

    if (!reminderTimes.includes(timeText)) {
      reminderTimes.push(timeText);
    }

    this.setData({
      showReminderPicker: false,
      'form.reminderTimes': reminderTimes,
    });
  },

  removeReminder(event) {
    const index = event.currentTarget.dataset.index;
    this.setData({
      'form.reminderTimes': this.data.form.reminderTimes.filter((_, current) => current !== index),
    });
  },

  submit() {
    const form = this.data.form;
    if (!form.title.trim()) {
      wx.showToast({
        title: '先写下项目名称',
        icon: 'none',
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      icon: form.icon,
      slogan: form.slogan.trim(),
      colorTheme: form.colorTheme,
      startDate: form.startDate,
      reminderEnabled: form.reminderEnabled,
      reminderTimes: form.reminderEnabled ? form.reminderTimes : [],
      moodEnabled: form.moodEnabled,
      scoreEnabled: form.scoreEnabled,
      metricEnabled: form.metricEnabled,
    };

    if (this.data.isEdit) {
      service.updateProject(this.data.projectId, payload);
    } else {
      service.createProject(payload);
    }

    wx.showToast({
      title: this.data.isEdit ? '项目已更新' : '项目创建成功',
      icon: 'success',
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 320);
  },
});
