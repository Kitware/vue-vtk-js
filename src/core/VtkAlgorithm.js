import { ref, inject, provide, onMounted, onBeforeUnmount, watch } from "vue";
import vtk from "@kitware/vtk.js/vtk";

export default {
  props: {
    port: {
      type: Number,
      default: 0,
    },
    vtkClass: {
      type: String,
      default: "vtkConeSource",
    },
    state: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const algo = ref(null);
    const downstream = inject("downstream");
    const representation = inject("representation");
    provide("downstream", algo);

    onMounted(() => {
      algo.value = vtk({ vtkClass: props.vtkClass, ...props.state });
      downstream.value.setInputConnection(
        algo.value.getOutputPort(),
        props.port
      );
    });

    onBeforeUnmount(() => {
      if (algo.value) {
        algo.value.delete();
        algo.value = null;
      }
    });

    watch(
      () => props.vtkClass,
      (newClassName) => {
        algo.value = vtk({ vtkClass: newClassName, ...props.state });
        downstream.setInputConnection(algo.value.getOutputPort(), props.port);
      }
    );

    watch(
      () => props.state,
      (newProps) => {
        algo.value.set(newProps);
        if (representation) {
          representation.dataChanged();
        }
      }
    );
  },
  template: '<div :class="`vtk-algorithm-${vtkClass}`"><slot></slot></div>',
};
