Component({
  properties: {
    items: { type: Array, value: [] },
    selectedDate: String,
  },
  methods: {
    onSelect(event) {
      this.triggerEvent('select', { date: event.currentTarget.dataset.date });
    },
  },
});
