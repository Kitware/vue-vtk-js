export default {
  name: 'VtkCellData',
  computed: {
    fields() {
      return this.dataset.getCellData();
    },
  },
  inject: ['dataset'],
  provide() {
    return {
      fields: this.fields,
    };
  },
};
