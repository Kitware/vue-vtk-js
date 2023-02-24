import {
  toRefs,
  inject,
  provide,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";

import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import { TYPED_ARRAYS, debounce } from "@kitware/vtk.js/macro";
import { toTypedArray } from "../utils";

export default {
  props: {
    name: {
      type: String,
      default: "scalars",
    },
    registration: {
      type: String,
      default: "addArray",
    },
    type: {
      type: String,
      default: "Float32Array",
    },
    values: {
      type: [
        Array,
        Object,
        Uint8Array,
        Uint16Array,
        Uint32Array,
        Int8Array,
        Int16Array,
        Int32Array,
        Float32Array,
        Float64Array,
      ],
    },
    numberOfComponents: {
      type: Number,
      default: 1,
    },
  },
  setup(props) {
    const dataset = inject("dataset");
    const fields = inject("fields");
    const representation = inject("representation");
    const array = vtkDataArray.newInstance({ empty: true });

    const updateArrayValues = debounce(() => {
      const klass = TYPED_ARRAYS[props.type];
      array.setData(
        toTypedArray(props.values, klass),
        props.numberOfComponents
      );

      if (dataset) {
        dataset.modified();
      }

      if (representation) {
        representation.dataChanged();
      }
    }, 1);

    const { name, type, values, numberOfComponents } = toRefs(props);
    watch(name, array.setName);
    watch(type, updateArrayValues);
    watch(values, updateArrayValues);
    watch(numberOfComponents, updateArrayValues);

    onMounted(() => {
      if (fields) {
        fields[props.registration](array);
      }
      if (props.name) {
        array.setName(props.name);
      }
      if (props.values && (props.values.bvals || props.values.length)) {
        updateArrayValues();
      }
    });

    onBeforeUnmount(() => {
      if (fields) {
        fields.removeArray(array);
      }
      array.delete();
    });

    provide("array", array);
  },
  template: '<div class="vtk-data-array" :name="name" />',
};
