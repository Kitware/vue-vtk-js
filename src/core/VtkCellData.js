import { inject, provide } from "vue";

export default {
  setup() {
    const dataset = inject("dataset");
    provide("fields", dataset?.getCellData());
  },
  template: '<div class="vtk-cell-data"><slot></slot></div>',
};
