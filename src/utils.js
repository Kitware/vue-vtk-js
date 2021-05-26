import Base64 from 'vtk.js/Sources/Common/Core/Base64';

const NUMPY_DTYPES = {
  int32: Int32Array,
  int16: Int16Array,
  int8: Int8Array,
  uint32: Uint32Array,
  uint16: Uint16Array,
  uint8: Uint8Array,
  float32: Float32Array,
  float64: Float64Array,
};

export function printInfo(typedArray) {
  let min = typedArray[0];
  let max = typedArray[0];
  for (let i = 0; i < typedArray.length; i++) {
    const v = typedArray[i];
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  console.log('data Range', min, max);
  return typedArray;
}

export function toTypedArray(values, TypedArray) {
  if (!values) {
    return null;
  }

  if (Array.isArray(values)) {
    return TypedArray.from(values);
  }

  if (values.dtype) {
    const { bvals, dtype } = values;
    const arrayBuffer = Base64.toArrayBuffer(bvals);
    return new NUMPY_DTYPES[dtype](arrayBuffer);
  }

  return values;
}
