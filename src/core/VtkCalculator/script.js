import vtkCalculator from 'vtk.js/Sources/Filters/General/Calculator';
import vtkDataSet from 'vtk.js/Sources/Common/DataModel/DataSet';

const { FieldDataTypes } = vtkDataSet;

export default {
  name: 'VtkCalculator',
  props: {
    port: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      default: 'scalars',
    },
    location: {
      type: String,
      default: 'POINT',
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
  beforeCreate() {
    this.calculator = vtkCalculator.newInstance();
  },
  mounted() {
    const { name, arrays, location, formula } = this;
    this.calculator.setFormulaSimple(
      FieldDataTypes[location],
      arrays,
      name,
      formula
    );

    this.downstream.setInputConnection(
      this.calculator.getOutputPort(),
      this.port
    );
  },
  beforeUnmount() {
    this.calculator.delete();
    this.calculator = null;
  },
  updated() {
    const { name, arrays, location, formula } = this;
    this.calculator.setFormulaSimple(
      FieldDataTypes[location],
      arrays,
      name,
      formula
    );
  },
  inject: ['view', 'representation', 'downstream'],
  provide() {
    return {
      downstream: this.calculator,
    };
  },
};
