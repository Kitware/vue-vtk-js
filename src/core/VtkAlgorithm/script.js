import vtk from 'vtk.js/Sources/vtk';

export default {
  name: 'VtkAlgorithm',
  props: {
    port: {
      type: Number,
      default: 0,
    },
    vtkClass: {
      type: String,
      default: 'vtkConeSource',
    },
    state: {
      type: Object,
      default: () => ({}),
    },
  },
  beforeCreate() {
    this.algo = null;
  },
  mounted() {
    const { vtkClass, state } = this;
    this.algo = vtk({ vtkClass, ...state });
    this.downstream.setInputConnection(this.algo.getOutputPort(), this.port);
  },
  beforeUnmount() {
    this.algo.delete();
    this.algo = null;
  },
  watch: {
    vtkClass(newClassName) {
      this.algo = vtk({ vtkClass: newClassName, ...this.state });
      this.downstream.setInputConnection(this.algo.getOutputPort(), this.port);
    },
    state(newProps) {
      this.algo.set(newProps);
      if (this.representation) {
        this.representation.dataChanged();
      }
    },
  },
  inject: ['view', 'representation', 'downstream'],
  provide() {
    return {
      downstream: this.algo,
    };
  },
};
