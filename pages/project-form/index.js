/**
 * 项目表单页
 * 创建和编辑习惯项目
 */

const aiService = require('../../services/aiService');
const service = require('../../services/habitService');
const { formatDate } = require('../../utils/date');

const COLOR_THEMES = [
  { key: 'blue', label: '晴空蓝' },
  { key: 'green', label: '薄荷绿' },
  { key: 'orange', label: '暖橙色' },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
];

const HOURS = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0'));

function normalizeReminderTimes(reminderTimes) {
  return (reminderTimes || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeScheduleDays(scheduleType, scheduleDays) {
  if (scheduleType === 'daily') {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const days = Array.from(new Set((scheduleDays || []).map((item) => Number(item))));
  return days.length ? days.sort((a, b) => a - b) : [1, 2, 3, 4, 5];
}

function buildWeekdayOptions(selectedDays) {
  return WEEKDAY_OPTIONS.map((item) => ({
    ...item,
    active: (selectedDays || []).includes(item.value),
  }));
}

function buildFormPatch(currentForm, patch) {
  const nextForm = {
    ...currentForm,
    ...patch,
  };
  const scheduleDays = normalizeScheduleDays(nextForm.scheduleType, nextForm.scheduleDays);
  nextForm.scheduleDays = scheduleDays;

  return {
    form: nextForm,
    weekdayOptionsView: buildWeekdayOptions(scheduleDays),
  };
}

Page({
  data: {
    projectId: '',
    isEdit: false,
    generatingDraft: false,
    icons: service.DEFAULT_ICONS,
    colorThemes: COLOR_THEMES,
    weekdayOptions: WEEKDAY_OPTIONS,
    weekdayOptionsView: buildWeekdayOptions([0, 1, 2, 3, 4, 5, 6]),
    hourOptions: HOURS,
    minuteOptions: MINUTES,
    showReminderPicker: false,
    pickerValue: [8, 0],
    form: {
      title: '',
      icon: '🏃',
      slogan: '',
      colorTheme: 'blue',
      startDate: formatDate(new Date()),
      scheduleType: 'daily',
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      reminderEnabled: true,
      reminderTimes: ['08:00'],
      moodEnabled: false,
      scoreEnabled: false,
      metricEnabled: false,
      metricUnit: '',
      aiPrompt: '',
    },
  },

  async onLoad(options) {
    if (!options.projectId) {
      return;
    }

    try {
      const project = await service.getProjectById(options.projectId);
      if (!project) {
        return;
      }

      this.setData({
        projectId: options.projectId,
        isEdit: true,
        ...buildFormPatch(this.data.form, {
          title: project.title,
          icon: project.icon,
          slogan: project.slogan,
          colorTheme: project.colorTheme,
          startDate: project.startDate,
          scheduleType: project.scheduleType || 'daily',
          scheduleDays: normalizeScheduleDays(project.scheduleType, project.scheduleDays),
          reminderEnabled: project.reminderEnabled,
          reminderTimes: normalizeReminderTimes(project.reminderTimes).length ? normalizeReminderTimes(project.reminderTimes) : ['08:00'],
          moodEnabled: project.moodEnabled,
          scoreEnabled: project.scoreEnabled,
          metricEnabled: project.metricEnabled,
          metricUnit: project.metricUnit || '',
          aiPrompt: '',
        }),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '项目读取失败',
        icon: 'none',
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

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

  chooseScheduleType(event) {
    const scheduleType = event.currentTarget.dataset.value;
    this.setData({
      ...buildFormPatch(this.data.form, {
        scheduleType,
      }),
    });
  },

  toggleScheduleDay(event) {
    if (this.data.form.scheduleType !== 'weekly-custom') {
      return;
    }

    const value = Number(event.currentTarget.dataset.value);
    const exists = this.data.form.scheduleDays.includes(value);
    const nextDays = exists
      ? this.data.form.scheduleDays.filter((item) => item !== value)
      : this.data.form.scheduleDays.concat(value);

    this.setData({
      ...buildFormPatch(this.data.form, {
        scheduleDays: nextDays,
      }),
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
    const [hourIndex, minuteIndex] = this.data.pickerValue;
    const timeText = `${this.data.hourOptions[hourIndex]}:${this.data.minuteOptions[minuteIndex]}`;
    const reminderTimes = [...this.data.form.reminderTimes];

    if (!reminderTimes.includes(timeText)) {
      reminderTimes.push(timeText);
      reminderTimes.sort();
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

  async generateDraft() {
    const prompt = (this.data.form.aiPrompt || '').trim();
    if (!prompt) {
      wx.showToast({
        title: '先写下一句话',
        icon: 'none',
      });
      return;
    }

    this.setData({ generatingDraft: true });

    try {
      const draft = await aiService.getProjectDraft({ prompt });
      this.setData({
        generatingDraft: false,
        ...buildFormPatch(this.data.form, {
          title: draft.title || this.data.form.title,
          icon: draft.icon || this.data.form.icon,
          slogan: draft.slogan || this.data.form.slogan,
          colorTheme: draft.colorTheme || this.data.form.colorTheme,
          scheduleType: draft.scheduleType || this.data.form.scheduleType,
          scheduleDays: draft.scheduleDays || this.data.form.scheduleDays,
          reminderTimes: normalizeReminderTimes(draft.reminderTimes).length ? normalizeReminderTimes(draft.reminderTimes) : this.data.form.reminderTimes,
          moodEnabled: draft.moodEnabled !== undefined ? draft.moodEnabled : this.data.form.moodEnabled,
          scoreEnabled: draft.scoreEnabled !== undefined ? draft.scoreEnabled : this.data.form.scoreEnabled,
          metricEnabled: draft.metricEnabled !== undefined ? draft.metricEnabled : this.data.form.metricEnabled,
          metricUnit: draft.metricUnit !== undefined ? draft.metricUnit : this.data.form.metricUnit,
        }),
      });
      wx.showToast({
        title: '草案已填入表单',
        icon: 'success',
      });
    } catch (error) {
      this.setData({ generatingDraft: false });
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none',
      });
    }
  },

  async deleteProject() {
    if (!this.data.isEdit || !this.data.projectId) {
      return;
    }

    const modalResult = await new Promise((resolve) => {
      wx.showModal({
        title: '删除项目',
        content: '删除后，这个项目将不再出现在首页和项目列表里，但历史记录会继续保留。确定删除吗？',
        confirmColor: '#ff5e67',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      });
    });

    if (!modalResult.confirm) {
      return;
    }

    try {
      await service.deleteProject(this.data.projectId);

      wx.showToast({
        title: '项目已删除',
        icon: 'success',
      });

      setTimeout(() => {
        const pages = getCurrentPages();
        const previousPage = pages[pages.length - 2];
        const delta = previousPage && previousPage.route === 'pages/project-detail/index' ? 2 : 1;

        if (pages.length > delta) {
          wx.navigateBack({ delta });
          return;
        }

        wx.redirectTo({
          url: '/pages/projects/index',
        });
      }, 320);
    } catch (error) {
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none',
      });
    }
  },

  async submit() {
    const form = this.data.form;
    if (!form.title.trim()) {
      wx.showToast({
        title: '先写下项目名称',
        icon: 'none',
      });
      return;
    }

    if (form.scheduleType === 'weekly-custom' && !form.scheduleDays.length) {
      wx.showToast({
        title: '至少选择一天',
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
      scheduleType: form.scheduleType,
      scheduleDays: normalizeScheduleDays(form.scheduleType, form.scheduleDays),
      reminderEnabled: form.reminderEnabled,
      reminderTimes: form.reminderEnabled ? normalizeReminderTimes(form.reminderTimes) : [],
      moodEnabled: form.moodEnabled,
      scoreEnabled: form.scoreEnabled,
      metricEnabled: form.metricEnabled,
      metricUnit: form.metricEnabled ? form.metricUnit.trim() : '',
    };

    try {
      if (this.data.isEdit) {
        await service.updateProject(this.data.projectId, payload);
      } else {
        await service.createProject(payload);
      }

      wx.showToast({
        title: this.data.isEdit ? '项目已更新' : '项目创建成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 320);
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      });
    }
  },

  noop() {},
});
