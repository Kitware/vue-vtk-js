import { inject, provide } from "vue";

export default {
  setup() {
    const dataset = inject("dataset");
    provide("fields", dataset?.getFieldData());
  },
  template: '<div class="vtk-field-data"><slot></slot></div>',
};
