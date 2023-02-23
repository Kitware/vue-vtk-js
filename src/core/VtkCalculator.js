import {
  ref,
  inject,
  provide,
  onMounted,
  onBeforeUnmount,
  onUpdated,
} from "vue";

import vtkCalculator from "@kitware/vtk.js/Filters/General/Calculator";
import vtkDataSet from "@kitware/vtk.js/Common/DataModel/DataSet";

const { FieldDataTypes } = vtkDataSet;

export default {
  props: {
    port: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      default: "scalars",
    },
    location: {
      type: String,
      default: "POINT",
    },
    arrays: {
      type: Array,
      default: () => [],
    },
    formula: {
      type: Function,
      default: (xyz) => xyz[0],
    },
  },
  setup(props) {
    const calculator = ref(vtkCalculator.newInstance());
    const downstream = inject("downstream");
    provide("downstream", calculator);

    onMounted(() => {
      calculator.value.setFormulaSimple(
        FieldDataTypes[props.location],
        props.arrays,
        props.name,
        props.formula
      );

      downstream.value.setInputConnection(
        calculator.value.getOutputPort(),
        props.port
      );
    });

    onBeforeUnmount(() => {
      if (calculator.value) {
        calculator.value.delete();
        calculator.value = null;
      }
    });

    onUpdated(() => {
      calculator.value.setFormulaSimple(
        FieldDataTypes[props.location],
        props.arrays,
        props.name,
        props.formula
      );
    });
  },
  template: '<div class="vtk-calculator"><slot></slot></div>',
};
