export default {
  name: 'VtkFieldData',
  computed: {
    fields() {
      return this.dataset.getFieldData();
    },
  },
  inject: ['dataset'],
  provide() {
    return {
      fields: this.fields,
    };
  },
};
