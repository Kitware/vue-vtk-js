import VtkPolydata from '../VtkPolydata';
import VtkCellData from '../VtkCellData';
import VtkPointData from '../VtkPointData';
import VtkDataArray from '../VtkDataArray';

export default {
  name: 'VtkMesh',
  props: {
    port: {
      type: Number,
      default: 0,
    },
    state: {
      type: Object,
    },
  },
  components: {
    VtkPolydata,
    VtkCellData,
    VtkPointData,
    VtkDataArray,
  },
};
