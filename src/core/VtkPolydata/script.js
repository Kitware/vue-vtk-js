import { debounce } from 'vtk.js/Sources/macro';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';

import { toTypedArray } from '../../utils';

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
  name: 'VtkPolydata',
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
      default: 'manual',
    },
  },
  computed: {
    cellTypedArray() {
      return this.points && this.points.length > 196608
        ? Uint32Array
        : Uint16Array;
    },
  },
  watch: {
    points(v) {
      this.updatePoints(v);
    },
    verts(v) {
      this.updateVerts(v);
    },
    lines(v) {
      this.updateLines(v);
    },
    polys(v) {
      this.updatePolys(v);
    },
    strips(v) {
      this.updateStrips(v);
    },
    connectivity() {
      this.updatePolyData();
    },
  },
  beforeCreate() {
    this.polydata = vtkPolyData.newInstance();
    this.updatePolyData = debounce(() => {
      if (this.connectivity !== 'manual') {
        const nbPoints = this.points.length / 3;
        switch (this.connectivity) {
          case 'points':
            {
              const values = new Uint32Array(nbPoints + 1);
              values[0] = nbPoints;
              for (let i = 0; i < nbPoints; i++) {
                values[i + 1] = i;
              }
              this.polydata.getVerts().setData(values);
            }
            break;
          case 'triangles':
            {
              const values = new Uint32Array(nbPoints + nbPoints / 3);
              let offset = 0;
              for (let i = 0; i < nbPoints; i += 3) {
                values[offset++] = 3;
                values[offset++] = i + 0;
                values[offset++] = i + 1;
                values[offset++] = i + 2;
              }
              this.polydata.getPolys().setData(values);
            }
            break;
          case 'strips':
            {
              const values = new Uint32Array(nbPoints + 1);
              values[0] = nbPoints;
              for (let i = 0; i < nbPoints; i++) {
                values[i + 1] = i;
              }
              this.polydata.getStrips().setData(values);
            }
            break;
          default:
          // do nothing for manual or anything else...
        }
      }

      // Update polydata
      this.polydata.modified();
      if (this.representation) {
        this.representation.dataChanged();
      }
    }, 1);
  },
  mounted() {
    if (this.points) {
      this.updatePoints(this.points);
    }
    if (this.verts) {
      this.updateVerts(this.verts);
    }
    if (this.lines) {
      this.updateLines(this.lines);
    }
    if (this.polys) {
      this.updatePolys(this.polys);
    }
    if (this.strips) {
      this.updateStrips(this.strips);
    }
    this.downstream.setInputData(this.polydata);
  },
  beforeUnmount() {
    this.polydata.delete();
    this.polydata = null;
  },
  methods: {
    updatePoints(v) {
      const typedArray = toTypedArray(v, Float64Array);
      this.polydata.getPoints().setData(typedArray, 3);
      this.updatePolyData();
    },
    updateVerts(v) {
      const typedArray = toTypedArray(v, this.cellTypedArray);
      this.polydata.getVerts().setData(typedArray);
      this.updatePolyData();
    },
    updateLines(v) {
      const typedArray = toTypedArray(v, this.cellTypedArray);
      this.polydata.getLines().setData(typedArray);
      this.updatePolyData();
    },
    updatePolys(v) {
      const typedArray = toTypedArray(v, this.cellTypedArray);
      this.polydata.getPolys().setData(typedArray);
      this.updatePolyData();
    },
    updateStrips(v) {
      const typedArray = toTypedArray(v, this.cellTypedArray);
      this.polydata.getStrips().setData(typedArray);
      this.updatePolyData();
    },
  },
  inject: ['view', 'representation', 'downstream'],
  provide() {
    return {
      dataset: this.polydata,
    };
  },
};
