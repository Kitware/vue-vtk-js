# vue-vtk-js

Vue.js based declarative vtk.js visualization pipeline.
In other words this project allow you to leverage vtk.js using Vue component syntax to describe your 3D scene. Kind of like X3dom with the X3D format except that here we leverage Vue components that could be extended to build your own tools.

## Usage

Simple example of a geometric dataset render into a view.

```
<vtk-view>
  <vtk-geometry-representation>
    <vtk-polydata
      :points="[0,0,0,0,1,0,1,0,0]"
      :polys="[3,0,1,2]"
    >
      <vtk-point-data>
        <vtk-data-array
          registration="setScalars"
          name="temperature"
          :values="[0, 0.5, 1]"
        />
      </vtk-point-data>
    </vtk-polydata>
  </vtk-geometry-representation>
</vtk-view>
```

## Building library

`npm run build:debug` for development package or `npm run build` for optimized bundle.

## Using library inside your Vue application

```
<script>
  import { VtkView, VtkGeometryRepresentation, VtkReader } from 'vue-vtk-js';

  export default {
    name: 'Example',
    props: {
      url: {
        type: String,
        default: '',
      }
    },
    components: {
      VtkView,
      VtkGeometryRepresentation,
      VtkReader,
    },
  }
</script>

<template>
  <vtk-view>
    <vtk-geometry-representation>
      <vtk-reader vtkClass="vtkOBJReader" :url="url" />
    </vtk-geometry-representation>
  </vtk-view>
</template>
```

or use the registration

```
import Vue from 'vue';
import App from './App.vue';
import { registerComponents } from 'vue-vtk-js';

// Add vue-vtk-js components to Vue
registerComponents(Vue);

new Vue({
  render: (h) => h(App),
}).$mount('#app');
```

Where __App__ could be just a template like below

```
<vtk-view>
  <vtk-geometry-representation>
    <vtk-reader vtkClass="vtkOBJReader" :url="url" />
  </vtk-geometry-representation>
</vtk-view>
```
