import VtkPolydata from "./VtkPolydata";
import VtkCellData from "./VtkCellData";
import VtkPointData from "./VtkPointData";
import VtkDataArray from "./VtkDataArray";

export default {
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
  template: `
    <vtk-polydata v-if="state" v-bind="state.mesh">
      <vtk-point-data>
        <vtk-data-array
          v-if="state.field && state.field.location == 'PointData'"
          registration="setScalars"
          v-bind="state.field"
        />
        <vtk-data-array
          v-if="state.pointArrays"
          v-for="array, idx in state.pointArrays"
          :key="array.name"
          v-bind="array"
        />
      </vtk-point-data>
      <vtk-cell-data>
        <vtk-data-array
          v-if="state.field && state.field.location == 'CellData'"
          registration="setScalars"
          v-bind="state.field"
        />
        <vtk-data-array
          v-if="state.cellArrays"
          v-for="array, idx in state.cellArrays"
          :key="array.name"
          v-bind="array"
        />
      </vtk-cell-data>
    </vtk-polydata>
  `,
};
