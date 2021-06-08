import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import { TYPED_ARRAYS, debounce } from 'vtk.js/Sources/macro';

import { toTypedArray } from '../../utils';

export default {
  name: 'VtkDataArray',
  props: {
    name: {
      type: String,
      default: 'scalars',
    },
    registration: {
      type: String,
      default: 'addArray',
    },
    type: {
      type: String,
      default: 'Float32Array',
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
  watch: {
    name(v) {
      this.array.setName(v);
    },
    type() {
      this.updateArrayValues();
    },
    values() {
      this.updateArrayValues();
    },
    numberOfComponents() {
      this.updateArrayValues();
    },
    fields(newField, oldField) {
      oldField.removeArray(this.array);
      newField[this.registration](this.array);
    },
  },
  beforeCreate() {
    this.array = vtkDataArray.newInstance({ empty: true });
    this.updateArrayValues = debounce(() => {
      const { type, values, numberOfComponents } = this;
      const klass = TYPED_ARRAYS[type];
      this.array.setData(toTypedArray(values, klass), numberOfComponents);

      if (this.dataset) {
        this.dataset.modified();
      }

      if (this.representation) {
        this.representation.dataChanged();
      }
    }, 1);
  },
  mounted() {
    if (this.fields) {
      this.fields[this.registration](this.array);
    }
    if (this.name) {
      this.array.setName(this.name);
    }
    if (this.values && (this.values.bvals || this.values.length)) {
      this.updateArrayValues();
    }
  },
  beforeDestroy() {
    this.fields.removeArray(this.array);
    this.array.delete();
    this.array = null;
  },
  inject: ['representation', 'dataset', 'fields'],
  provide() {
    return {
      array: this.array,
    };
  },
};
