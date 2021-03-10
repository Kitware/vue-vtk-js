import { debounce } from 'vtk.js/Sources/macro';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';

export default {
  name: 'VtkPolydata',
  props: {
    port: {
      type: Number,
      default: 0,
    },
    points: {
      type: Array,
      default: () => [],
    },
    verts: {
      type: Array,
      default: () => [],
    },
    lines: {
      type: Array,
      default: () => [],
    },
    polys: {
      type: Array,
      default: () => [],
    },
    strips: {
      type: Array,
      default: () => [],
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
    if (this.points.length) {
      this.updatePoints(this.points);
    }
    if (this.verts.length) {
      this.updateVerts(this.verts);
    }
    if (this.lines.length) {
      this.updateLines(this.lines);
    }
    if (this.polys.length) {
      this.updatePolys(this.polys);
    }
    if (this.strips.length) {
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
      const typedArray = Array.isArray(v) ? Float64Array.from(v) : v;
      this.polydata.getPoints().setData(typedArray, 3);
      this.updatePolyData();
    },
    updateVerts(v) {
      const typedArray = Array.isArray(v) ? this.cellTypedArray.from(v) : v;
      this.polydata.getVerts().setData(typedArray);
      this.updatePolyData();
    },
    updateLines(v) {
      const typedArray = Array.isArray(v) ? this.cellTypedArray.from(v) : v;
      this.polydata.getLines().setData(typedArray);
      this.updatePolyData();
    },
    updatePolys(v) {
      const typedArray = Array.isArray(v) ? this.cellTypedArray.from(v) : v;
      this.polydata.getPolys().setData(typedArray);
      this.updatePolyData();
    },
    updateStrips(v) {
      const typedArray = Array.isArray(v) ? this.cellTypedArray.from(v) : v;
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
