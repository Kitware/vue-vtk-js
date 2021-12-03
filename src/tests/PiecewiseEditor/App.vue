<template>
  <div id="app">
    <div style="padding: 50px; height: 400px;">
      <piecewise-editor v-model="pwData" @opacities="opacities = $event" />
      <!-- <svg viewBox="0 0 1024 100">
        <circle
          v-for="(y, idx) in opacities"
          :key="idx"
          :cx="idx"
          :cy="(1 - y) * 100"
          r="0.5"
        />
      </svg> -->
    </div>
  </div>
</template>

<script>
import PiecewiseEditor from '../../widgets/PiecewiseEditor';

export default {
  name: 'App',
  components: {
    PiecewiseEditor,
  },
  // watch: {
  //   pwData(v) {
  //     console.log('update', JSON.stringify(v, null, 2));
  //   },
  // },
  data() {
    return {
      opacities: [],
      pwData: {
        points: [
          0, // x
          0, // y
          0.1, // x
          1,
          0.2, // x
          0.5,
          0.3, // x
          0.1,
          0.5, // x
          0.75,
          1, // x
          1,
        ],
        gaussians: [
          {
            position: 0.5,
            xBias: 0,
            yBias: 0,
            height: 1,
            width: 0.1,
          },
          {
            position: 0.25,
            xBias: 0.2,
            yBias: 1,
            height: 1,
            width: 0.1,
          },
          {
            position: 0.75,
            xBias: -0.1,
            yBias: 0.5,
            height: 1,
            width: 0.1,
          },
          {
            position: 0.85,
            xBias: -0.2,
            yBias: 0.5,
            height: 1,
            width: 0.1,
          },
        ],
      },
    };
  },
  methods: {
    onOpacities(o) {
      console.log(o);
    },
  },
};
</script>
