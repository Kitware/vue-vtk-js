import { inject, provide } from "vue";

export default {
  setup() {
    const dataset = inject("dataset");
    provide("fields", dataset?.getPointData());
  },
  template: '<div class="vtk-point-data"><slot></slot></div>',
};
