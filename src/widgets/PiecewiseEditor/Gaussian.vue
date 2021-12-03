<script>
export default {
  name: 'Gaussian',
  props: {
    gaussian: {
      type: Object,
    },
    lineOpacity: {
      type: [String, Number],
      default: 1,
    },
    controlSize: {
      type: [String, Number],
      default: 10,
    },
    boundsStyle: {
      type: Object,
      default: () => ({
        stroke: 'none',
        fill: 'white',
        opacity: 0.25,
      }),
    },
    widthControlStyle: {
      type: Object,
      default: () => ({
        stroke: 'red',
        'stroke-width': 2,
        fill: 'white',
      }),
    },
    heightControlStyle: {
      type: Object,
      default: () => ({
        stroke: 'red',
        'stroke-width': 2,
        fill: 'white',
      }),
    },
    biasLineStyle: {
      type: Object,
      default: () => ({
        stroke: 'blue',
        'stroke-width': 4,
        opacity: 0.5,
      }),
    },
    biasControlStyle: {
      type: Object,
      default: () => ({
        stroke: 'red',
        'stroke-width': 2,
        fill: 'white',
      }),
    },
    gaussianStyle: {
      type: Object,
      default: () => ({
        fill: 'none',
        stroke: 'black',
        'stroke-width': 2,
      }),
    },
    clipPath: {
      type: String,
      default: '',
    },
  },
  computed: {
    boundsRectProps() {
      return { ...this.gaussian.controls.bounds, ...this.boundsStyle };
    },
    leftWidthProps() {
      return {
        ...this.gaussian.controls.leftWidth,
        ...this.widthControlStyle,
        height: this.controlSize,
        y: this.gaussian.controls.leftWidth.y - this.controlSize,
      };
    },
    rightWidthProps() {
      return {
        ...this.gaussian.controls.rightWidth,
        ...this.widthControlStyle,
        height: this.controlSize,
        y: this.gaussian.controls.leftWidth.y - this.controlSize,
      };
    },
    heightProps() {
      return {
        ...this.gaussian.controls.height,
        ...this.heightControlStyle,
        height: this.controlSize,
      };
    },
    xBiasLineProps() {
      return {
        x1: this.gaussian.controls.bias.position[0],
        y1: this.gaussian.controls.bounds.y + this.controlSize,
        x2: this.gaussian.controls.bias.position[0],
        y2:
          this.gaussian.controls.bounds.y +
          this.gaussian.controls.bounds.height -
          this.controlSize,
        ...this.biasLineStyle,
      };
    },
    yBiasLineProps() {
      const y = this.controlSize + this.gaussian.controls.bias.position[1];
      return {
        x1: this.gaussian.controls.bounds.x,
        y1: y,
        x2:
          this.gaussian.controls.bounds.x + this.gaussian.controls.bounds.width,
        y2: y,
        ...this.biasLineStyle,
      };
    },
    biasControlProps() {
      return {
        cx: this.gaussian.controls.bias.center[0],
        cy: this.gaussian.controls.bias.center[1] - this.controlSize,
        r: this.controlSize,
        ...this.biasControlStyle,
      };
    },
    gaussianProps() {
      return {
        points: this.gaussian.points,
        ...this.gaussianStyle,
      };
    },
  },
};
</script>

<template>
  <g :clip-path="clipPath">
    <rect
      v-bind="boundsRectProps"
      v-if="gaussian.controls"
      @mousedown="$emit('mousedown:background', $event)"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
      @dblclick="$emit('dblclick:background', $event)"
    />
    <rect
      v-bind="leftWidthProps"
      v-if="gaussian.controls"
      @mousedown="$emit('mousedown:width-left', $event)"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <rect
      v-bind="rightWidthProps"
      v-if="gaussian.controls"
      @mousedown="$emit('mousedown:width-right', $event)"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <rect
      v-bind="heightProps"
      v-if="gaussian.controls"
      @mousedown="$emit('mousedown:height', $event)"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <line
      v-bind="xBiasLineProps"
      v-if="gaussian.controls"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <line
      v-bind="yBiasLineProps"
      v-if="gaussian.controls"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <circle
      v-bind="biasControlProps"
      v-if="gaussian.controls"
      @mousedown="$emit('mousedown:bias', $event)"
      @dblclick="$emit('dblclick:bias', $event)"
      @mouseover="$emit('mouseover:background', $event)"
      @mouseout="$emit('mouseout:background', $event)"
    />
    <polyline v-bind="gaussianProps" :opacity="lineOpacity" />
  </g>
</template>
