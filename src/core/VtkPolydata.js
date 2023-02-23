import {
  toRefs,
  inject,
  provide,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";

import { debounce } from "@kitware/vtk.js/macro";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";

import { toTypedArray } from "../utils";

const POINTS_TYPES = [Array, Float32Array, Float64Array, Object];
const CELLS_TYPES = [
  Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Object,
];

export default {
  props: {
    port: {
      type: Number,
      default: 0,
    },
    points: {
      type: POINTS_TYPES,
    },
    verts: {
      type: CELLS_TYPES,
    },
    lines: {
      type: CELLS_TYPES,
    },
    polys: {
      type: CELLS_TYPES,
    },
    strips: {
      type: CELLS_TYPES,
    },
    connectivity: {
      type: String,
      default: "manual",
    },
  },
  setup(props) {
    const cellTypedArray = computed(() =>
      props.points && props.points.length > 196608 ? Uint32Array : Uint16Array
    );
    const downstream = inject("downstream");
    const representation = inject("representation");
    const polydata = vtkPolyData.newInstance();
    const updatePolyData = debounce(() => {
      if (props.connectivity !== "manual") {
        const nbPoints = props.points.length / 3;
        switch (props.connectivity) {
          case "points":
            {
              const values = new Uint32Array(nbPoints + 1);
              values[0] = nbPoints;
              for (let i = 0; i < nbPoints; i++) {
                values[i + 1] = i;
              }
              polydata.getVerts().setData(values);
            }
            break;
          case "triangles":
            {
              const values = new Uint32Array(nbPoints + nbPoints / 3);
              let offset = 0;
              for (let i = 0; i < nbPoints; i += 3) {
                values[offset++] = 3;
                values[offset++] = i + 0;
                values[offset++] = i + 1;
                values[offset++] = i + 2;
              }
              polydata.getPolys().setData(values);
            }
            break;
          case "strips":
            {
              const values = new Uint32Array(nbPoints + 1);
              values[0] = nbPoints;
              for (let i = 0; i < nbPoints; i++) {
                values[i + 1] = i;
              }
              polydata.getStrips().setData(values);
            }
            break;
          default:
          // do nothing for manual or anything else...
        }
      }

      // Update polydata
      polydata.modified();
      if (representation) {
        representation.dataChanged();
      }
    }, 1);

    function updateArray(values, getterName, arrayType, numberOfComponents) {
      const array = toTypedArray(values, arrayType);
      if (array) {
        polydata[getterName]().setData(array, numberOfComponents || 1);
        updatePolyData();
      }
    }

    const { points, verts, lines, polys, strips } = toRefs(props);
    watch(points, (v) => updateArray(v, "getPoints", Float64Array, 3));
    watch(verts, (v) => updateArray(v, "getVerts", cellTypedArray.value));
    watch(lines, (v) => updateArray(v, "getLines", cellTypedArray.value));
    watch(polys, (v) => updateArray(v, "getPolys", cellTypedArray.value));
    watch(strips, (v) => updateArray(v, "getStrips", cellTypedArray.value));
    watch(downstream, () => {
      if (downstream.value) {
        downstream.value.setInputData(polydata, props.port);
      }
    });

    onMounted(() => {
      updateArray(props.points, "getPoints", Float64Array, 3);
      updateArray(props.verts, "getVerts", cellTypedArray.value);
      updateArray(props.lines, "getLines", cellTypedArray.value);
      updateArray(props.polys, "getPolys", cellTypedArray.value);
      updateArray(props.strips, "getStrips", cellTypedArray.value);
      if (downstream.value) {
        downstream.value.setInputData(polydata, props.port);
      }
    });

    onBeforeUnmount(() => {
      polydata.delete();
    });

    provide("dataset", polydata);
  },
  template: '<div class="vtk-polydata"><slot></slot></div>',
};
