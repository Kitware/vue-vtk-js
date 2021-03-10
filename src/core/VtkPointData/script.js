export default {
  name: 'VtkPointData',
  computed: {
    fields() {
      return this.dataset.getPointData();
    },
  },
  inject: ['dataset'],
  provide() {
    return {
      fields: this.fields,
    };
  },
};
