import macro from 'vtk.js/Sources/macro';

const SHARED_INSTANCES = {};

function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, initialValues);

  // Inheritance
  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 1, 1);

  // TrivialProducer
  model.classHierarchy.push('vtkTrivialProducer');

  publicAPI.requestData = (inputs, outputs) => {
    outputs.length = inputs.length;
    for (let i = 0; i < inputs.length; i++) {
      outputs[i] = inputs[i];
    }
  };
}

const newInstance = macro.newInstance(extend, 'vtkTrivialProducer');

export default {
  name: 'VtkShareDataset',

  props: {
    port: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      default: 'share',
    },
  },
  created() {
    this.getTrivialProducer = () => {
      let trivialProducer = SHARED_INSTANCES[this.name];
      if (!trivialProducer) {
        trivialProducer = newInstance();
        SHARED_INSTANCES[this.name] = trivialProducer;
      }
      return trivialProducer;
    };
  },
  mounted() {
    this.downstream.setInputConnection(
      this.getTrivialProducer().getOutputPort(),
      this.port
    );
  },
  updated() {
    this.downstream.setInputConnection(
      this.getTrivialProducer().getOutputPort(),
      this.port
    );
  },
  inject: ['downstream'],
  provide() {
    return {
      downstream: this.getTrivialProducer,
    };
  },
};
