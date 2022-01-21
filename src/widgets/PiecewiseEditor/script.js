import Gaussian from './Gaussian';

const CTRL_POINT_TO_STR = ({ x, y }) => `${x},${y}`;
const NOT = (exclude) => (v) => v !== exclude;

const XY = new Float64Array(2);

const NO_TRANSFORM = {
  translation: [0, 0],
  scale: [1, 1],
};

function linearInterpolation(begin, end, x) {
  return x * (end - begin) + begin;
}

function applyTransform(view, transform, x, y) {
  const { translation, scale } = transform;
  const { begin, end, size } = view;
  XY[0] =
    scale[0] * (x - begin[0]) * (size[0] / (end[0] - begin[0])) -
    scale[0] * translation[0];
  XY[1] =
    scale[1] * (y - begin[1]) * (size[1] / (end[1] - begin[1])) -
    scale[1] * translation[1];
  return XY;
}

function transformEvent(container, e, view, transform, padding) {
  const { left, top } = container.getBoundingClientRect();
  const { clientX, clientY } = e;
  const { translation, scale } = transform;
  const { begin, end, size } = view;
  XY[0] = clamp(
    linearInterpolation(
      begin[0],
      end[0],
      (clientX - left - padding) / size[0] / scale[0] + translation[0] / size[0]
    ),
    Math.min(begin[0], end[0]),
    Math.max(begin[0], end[0])
  );
  XY[1] = clamp(
    linearInterpolation(
      begin[1],
      end[1],
      (clientY - top - padding) / size[1] / scale[1] + translation[1] / size[1]
    ),
    Math.min(begin[1], end[1]),
    Math.max(begin[1], end[1])
  );

  return XY;
}

function toXY(e) {
  return [e.screenX, e.screenY];
}

function toModifiers(e) {
  return { alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey };
}

function isOutside(value, min, max, tolerance) {
  return value + tolerance < 0 || value - tolerance > max;
}

function cloneTransform(obj) {
  return {
    translation: obj.translation.slice(),
    scale: obj.scale.slice(),
  };
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export default {
  name: 'VtkPiecewiseEditor',
  components: {
    Gaussian,
  },
  props: {
    // points/gaussians
    value: {
      type: Object,
      default() {
        return {
          points: [0, 0, 1, 1],
          gaussians: [],
        };
      },
    },
    // Prevent from over zooming
    maxZoom: {
      type: [String, Number],
      default: 5,
    },
    // side control size
    padding: {
      type: [String, Number],
      default: 20,
    },
    // ui styles
    contentRectangleStyle: {
      type: Object,
      default: () => ({
        stroke: 'black',
        'stroke-width': '1',
        fill: 'white',
      }),
    },
    resultOpacityLineStyle: {
      type: Object,
      default: () => ({
        stroke: '#1565C0',
        'stroke-width': 3,
        fill: 'none',
      }),
    },
    insideZoomStyle: {
      type: Object,
      default: () => ({
        stroke: 'none',
        fill: '#666',
        opacity: 0.1,
      }),
    },
    gaussianOpacityStyle: {
      type: Object,
      default: () => ({
        lineOpacity: 0.1,
        controlSize: 10,
        boundsStyle: {
          stroke: 'none',
          fill: 'white',
          opacity: 0.25,
        },
        widthControlStyle: {
          stroke: 'red',
          'stroke-width': 2,
          fill: 'white',
        },
        heightControlStyle: {
          stroke: 'red',
          'stroke-width': 2,
          fill: 'white',
        },
        biasLineStyle: {
          stroke: '#1565C0',
          'stroke-width': 2,
          opacity: 0.5,
        },
        gaussianStyle: {
          fill: 'none',
          stroke: 'black',
          'stroke-width': 1,
        },
      }),
    },
    activeGaussianOpacityStyle: {
      type: Object,
      default: () => ({
        lineOpacity: 1,
        controlSize: 10,
        boundsStyle: {
          stroke: 'none',
          fill: 'white',
          opacity: 0.25,
        },
        widthControlStyle: {
          stroke: 'red',
          'stroke-width': 2,
          fill: 'white',
        },
        heightControlStyle: {
          stroke: 'red',
          'stroke-width': 2,
          fill: 'white',
        },
        biasLineStyle: {
          stroke: '#1565C0',
          'stroke-width': 2,
          opacity: 0.5,
        },
        gaussianStyle: {
          fill: 'none',
          stroke: '#1565C0',
          'stroke-width': 3,
        },
      }),
    },
    activeLinearOpacityStyle: {
      type: Object,
      default: () => ({
        stroke: '#1565C0',
        opacity: 1,
        'stroke-width': 3,
        fill: 'none',
      }),
    },
    linearOpacityStyle: {
      type: Object,
      default: () => ({
        stroke: 'black',
        opacity: 0.1,
        'stroke-width': 2,
        fill: 'none',
      }),
    },
    linearOpacityControlStyle: {
      type: Object,
      default: () => ({
        stroke: '#1565C0',
        'stroke-width': 2,
        fill: 'white',
        r: 5,
      }),
    },
    activeLinearOpacityControlStyle: {
      type: Object,
      default: () => ({
        stroke: 'red',
        'stroke-width': 2,
        fill: 'white',
        r: 5,
      }),
    },
    zoomControlStyle: {
      type: Object,
      default: () => ({
        stroke: 'black',
        'stroke-width': 1,
        fill: '#BBDEFB',
      }),
    },
  },
  data() {
    return {
      // view setup
      view: {
        begin: [0, 1],
        end: [1, 0],
        size: [200, 100], // width, height
      },
      // zoom transform capturing x/y | translation/scale
      zoomTransform: {
        translation: [0, 0],
        scale: [1, 1],
      },
      // Handle drag action
      dragStart: null,
      dragMousePosition: [0, 0],
      selectedPoints: [],
      hoverPolyline: false,
      activeGaussian: -1,
    };
  },
  watch: {
    padding() {
      this.updateViewSize();
    },
    height() {
      this.updateViewSize();
    },
    value() {
      this.$emit('opacities', this.transferFunction);
    },
  },
  computed: {
    points: {
      get() {
        return this.value?.points;
      },
      set(v) {
        this.$emit('input', {
          gaussians: this.gaussians,
          points: v,
        });
      },
    },
    gaussians: {
      get() {
        return this.value?.gaussians;
      },
      set(v) {
        this.$emit('input', {
          gaussians: v,
          points: this.points,
        });
      },
    },
    windowGaussianPositions() {
      const toViewX = (x) =>
        applyTransform(this.view, this.zoomTransform, x, 0)[0];
      return this.gaussians.map((g, idx) => ({ x: toViewX(g.position), idx }));
    },
    zoomWindow() {
      const [x, y] = this.zoomTransform.translation;
      const width = this.view.size[0] / this.zoomTransform.scale[0];
      const height = this.view.size[1] / this.zoomTransform.scale[1];
      return { x, y, width, height };
    },
    containerStyle() {
      return {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
      };
    },
    svgStyle() {
      return {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
      };
    },
    viewBox() {
      return `${-this.padding} ${-this.padding} ${
        this.view.size[0] + 2 * this.padding
      } ${this.view.size[1] + 2 * this.padding}`;
    },
    polylinePoints() {
      return this.controlPoints.map(CTRL_POINT_TO_STR).join(' ');
    },
    zoomedPolylinePoints() {
      return this.zoomedControlPoints.map(CTRL_POINT_TO_STR).join(' ');
    },
    controlPoints() {
      const ctrlPoints = [];
      for (let i = 0; i < this.points.length; i += 2) {
        const [x, y] = applyTransform(
          this.view,
          NO_TRANSFORM,
          this.points[i],
          this.points[i + 1]
        );
        ctrlPoints.push({ x, y });
      }
      return ctrlPoints;
    },
    zoomedControlPoints() {
      const ctrlPoints = [];
      for (let i = 0; i < this.points.length; i += 2) {
        const [x, y] = applyTransform(
          this.view,
          this.zoomTransform,
          this.points[i],
          this.points[i + 1]
        );
        ctrlPoints.push({ x, y });
      }
      return ctrlPoints;
    },
    transferFunction() {
      const sampling = 1024;
      const delta = 1 / sampling;
      const result = new Float64Array(sampling + 1);

      // Gather gaussian opacities
      for (let i = 0; i < this.gaussians.length; i++) {
        const g = this.gaussians[i];
        const minX = g.position - g.width;
        const maxX = g.position + g.width;
        const gSampling = Math.floor(1 + (maxX - minX) / delta);
        const gValues = this.gaussianSampling(g, gSampling);

        const offset = Math.floor(gValues[0].x / delta);
        for (let j = 1; j < gValues.length; j++) {
          const { y } = gValues[j];
          if (result[j + offset] < y) {
            result[j + offset] = y;
          }
        }
      }

      // Include linear points
      if (this.points.length) {
        const dx = delta;
        let srcIdx = 0;
        let dy =
          (this.points[srcIdx + 3] - this.points[srcIdx + 1]) /
          (this.points[srcIdx + 2] - this.points[srcIdx]);
        let dstIdx = 0;
        let x = 0;
        let opacity = this.points[srcIdx + 1];
        let nextX = this.points[srcIdx + 2];
        let nextY = this.points[srcIdx + 3];

        while (dstIdx < result.length) {
          if (x > nextX) {
            srcIdx += 2;
            dy =
              (this.points[srcIdx + 3] - this.points[srcIdx + 1]) /
              (this.points[srcIdx + 2] - this.points[srcIdx]);
            if (nextX - x < dx / 2) {
              opacity = nextY;
            } else if (Number.isFinite(dy)) {
              opacity = nextY + (nextX - x) * dy;
            }
            nextX = this.points[srcIdx + 2];
            nextY = this.points[srcIdx + 3];
          }

          if (result[dstIdx] < opacity) {
            result[dstIdx] = opacity;
          }

          dstIdx += 1;
          x += dx;
          opacity += dx * dy;
        }
      }

      return result;
    },
    transferFunctionPoints() {
      const values = this.transferFunction;
      const delta = 1 / (values.length - 1);
      const viewCoordinates = [];
      let x, y;
      for (let i = 0; i < values.length; i++) {
        [x, y] = applyTransform(
          this.view,
          this.zoomTransform,
          i * delta,
          values[i]
        );
        viewCoordinates.push({ x, y });
      }
      return viewCoordinates.map(CTRL_POINT_TO_STR).join(' ');
    },
  },
  created() {
    this.gaussianFinderConnected = false;
    this.documentDragUpdate = null;

    this.onMouseRelease = (e) => {
      this.dragStart = null;
      document.removeEventListener('mousemove', this.documentMouseMove);
      document.removeEventListener('mouseup', this.onMouseRelease);
      if (!this.deselectGaussianIfOutside(e)) {
        this.findToActivateGaussian(e);
      }
    };

    this.onMouseDrag = (e) => {
      this.dragMousePosition = toXY(e);
      this.documentDragUpdate();
    };

    this.findToActivateGaussian = ({ layerX }) => {
      if (this.dragStart) {
        return;
      }

      let minDistance = 100000;
      let activeIdx = -1;

      for (let i = 0; i < this.windowGaussianPositions.length; i++) {
        const { x, idx } = this.windowGaussianPositions[i];
        const distance = Math.abs(x - layerX + this.padding);
        if (distance < minDistance) {
          minDistance = distance;
          activeIdx = idx;
        }
      }

      if (this.activeGaussian !== activeIdx) {
        this.activeGaussian = activeIdx;
      }
    };
    this.$emit('opacities', this.transferFunction);
  },
  mounted() {
    this.updateViewSize();
  },
  methods: {
    attachGaussianFinder() {
      if (this.dragStart || this.gaussianFinderConnected) {
        return;
      }
      this.gaussianFinderConnected = true;
      document.addEventListener('mousemove', this.findToActivateGaussian);
    },
    detachGaussianFinder(e, forceDeselect = false) {
      document.removeEventListener('mousemove', this.findToActivateGaussian);
      this.gaussianFinderConnected = false;
      if (!this.dragStart) {
        this.deselectGaussianIfOutside(e);
        if (forceDeselect) {
          this.activeGaussian = -1;
        }
      }
    },
    deselectGaussianIfOutside({ layerX, layerY }) {
      const { size } = this.view;
      const tolerance = 1;
      if (
        layerX < this.padding + tolerance ||
        layerX > size[0] + this.padding - tolerance ||
        layerY < this.padding + tolerance ||
        layerY > size[1] + this.padding - tolerance
      ) {
        this.activeGaussian = -1;
        return true;
      }
      return false;
    },
    onPolyline(e) {
      this.hoverPolyline = true;
      this.detachGaussianFinder(e, true);
    },
    offPolyline(e) {
      if (this.dragStart) {
        return;
      }

      this.hoverPolyline = false;
      this.attachGaussianFinder(e);
    },
    deleteControlPoint(index) {
      if (index && index < this.points.length / 2 - 1) {
        this.points = this.points.filter(
          (v, idx) => idx !== 2 * index && idx !== 2 * index + 1
        );
      }
    },
    addControlPoint(e) {
      const xy = transformEvent(
        this.$el,
        e,
        this.view,
        this.zoomTransform,
        this.padding
      );
      const newPoints = [];
      let xyPending = true;
      for (let i = 0; i < this.points.length; i += 2) {
        const x = this.points[i];
        if (xyPending && xy[0] < x) {
          newPoints.push(xy[0]);
          newPoints.push(xy[1]);
          xyPending = false;
        }
        newPoints.push(x);
        newPoints.push(this.points[i + 1]);
      }
      this.points = newPoints;
    },
    dblClick(e) {
      // TODO
      // - add gaussian
      // - (alt) delete gaussian
      if (e.altKey && this.activeGaussian !== -1) {
        this.gaussians = this.gaussians.filter(
          (v, i) => i !== this.activeGaussian
        );
        this.activeGaussian = -1;
      } else {
        const xy = transformEvent(
          this.$el,
          e,
          this.view,
          this.zoomTransform,
          this.padding
        );
        this.activeGaussian = this.gaussians.length;
        this.gaussians = this.gaussians.concat({
          position: xy[0],
          xBias: 0,
          yBias: 0,
          height: 1,
          width: 0.1,
        });
      }
    },
    startDrag(updateFn) {
      this.documentDragUpdate = updateFn;
      document.addEventListener('mousemove', this.onMouseDrag);
      document.addEventListener('mouseup', this.onMouseRelease);
    },
    updateViewSize() {
      const { width, height } = this.$el.getBoundingClientRect();
      this.view = {
        ...this.view,
        size: [width - 2 * this.padding, height - 2 * this.padding],
      };
    },
    isControlPointInside(controlPoint) {
      const tolerance = 2;
      const xyMin = 0;
      const [xMax, yMax] = this.view.size;
      return !(
        isOutside(controlPoint.x, xyMin, xMax, tolerance) ||
        isOutside(controlPoint.y, xyMin, yMax, tolerance)
      );
    },
    toggleSelection(index) {
      if (this.selectedPoints.includes(index)) {
        this.selectedPoints = this.selectedPoints.filter(NOT(index));
      } else {
        this.selectedPoints.push(index);
      }
    },
    resetZoomTransform(axis) {
      if (axis > -1 && axis < 2) {
        const newTransform = cloneTransform(this.zoomTransform);
        newTransform.translation[axis] = 0;
        newTransform.scale[axis] = 1;
        this.zoomTransform = newTransform;
      } else {
        // reset all
        this.zoomTransform = {
          translation: [0, 0],
          scale: [1, 1],
        };
      }
    },
    startZoom(axis, mouseEvent, lockZoom = false) {
      this.dragStart = {
        axis,
        lockZoom,
        zoomTransform: cloneTransform(this.zoomTransform),
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };
      this.startDrag(this.updateZoom);
    },
    updateZoom() {
      if (!this.dragStart) {
        return;
      }

      const { axis, zoomTransform, mousePosition, lockZoom } = this.dragStart;
      const { size } = this.view;
      const oppositeAxis = axis ? 0 : 1;
      const direction = axis ? -1 : 1;

      const scale = lockZoom
        ? zoomTransform.scale[axis]
        : clamp(
            (zoomTransform.scale[axis] *
              (size[oppositeAxis] +
                direction *
                  (mousePosition[oppositeAxis] -
                    this.dragMousePosition[oppositeAxis]))) /
              size[oppositeAxis],
            1,
            Number(this.maxZoom)
          );

      const translation = clamp(
        zoomTransform.translation[axis] +
          (this.dragMousePosition[axis] - mousePosition[axis]),
        0,
        (size[axis] * (scale - 1)) / scale
      );

      const newZoomTransform = cloneTransform(this.zoomTransform);
      newZoomTransform.translation[axis] = translation;
      newZoomTransform.scale[axis] = scale;
      this.zoomTransform = newZoomTransform;
    },
    startControlPointDrag(controlPointIndex, mouseEvent) {
      this.dragStart = {
        cIdx: controlPointIndex,
        startXY: [
          this.points[controlPointIndex * 2],
          this.points[controlPointIndex * 2 + 1],
        ],
        xRange: [
          this.points[controlPointIndex * 2 - 2],
          this.points[controlPointIndex * 2 + 2],
        ],
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };

      this.startDrag(this.updateControlPointDrag);
    },
    updateControlPointDrag() {
      if (!this.dragStart) {
        return;
      }

      const { cIdx, startXY, xRange, mousePosition } = this.dragStart;
      const {
        begin,
        end,
        size: [width, height],
      } = this.view;
      const xScale = (end[0] - begin[0]) / width / this.zoomTransform.scale[0];
      const yScale = (end[1] - begin[1]) / height / this.zoomTransform.scale[1];
      const dx = xScale * (this.dragMousePosition[0] - mousePosition[0]);
      const dy = yScale * (this.dragMousePosition[1] - mousePosition[1]);
      const newPoints = this.points.slice();
      if (xRange[0] !== undefined && xRange[1] !== undefined) {
        // Only update X when not on a side
        if (xRange[0] < startXY[0] + dx && startXY[0] + dx < xRange[1]) {
          newPoints[2 * cIdx] = startXY[0] + dx;
        } else if (startXY[0] + dx < xRange[0]) {
          newPoints[2 * cIdx] = xRange[0];
        } else if (startXY[0] + dx > xRange[1]) {
          newPoints[2 * cIdx] = xRange[1];
        }
      }
      newPoints[2 * cIdx + 1] = clamp(startXY[1] + dy, 0, 1);
      this.points = newPoints;

      // Update selection if need be
      if (this.selectedPoints.length !== 1 || this.selectedPoints[0] !== cIdx) {
        this.selectedPoints = [cIdx];
      }
    },
    isActiveGaussian(gaussian) {
      return this.gaussians.indexOf(gaussian) === this.activeGaussian;
    },
    toGaussianProps(gaussian) {
      return {
        points: this.gaussianPoints(gaussian),
        controls: this.isActiveGaussian(gaussian)
          ? this.gaussianControls(gaussian)
          : false,
      };
    },
    gaussianControls({ position, xBias, yBias, width, height }) {
      const controlSize = this.activeGaussianOpacityStyle.controlSize;
      const [biasCenterX, biasCenterY] = applyTransform(
        this.view,
        this.zoomTransform,
        position,
        0
      );
      const [xBiasPos, yBiasMax] = applyTransform(
        this.view,
        this.zoomTransform,
        position + xBias * width,
        height
      );
      const [minX, minY] = applyTransform(
        this.view,
        this.zoomTransform,
        position - width,
        0
      );
      const [maxX, maxY] = applyTransform(
        this.view,
        this.zoomTransform,
        position + width,
        height
      );
      const yBiasPos =
        biasCenterY -
        2 * this.activeGaussianOpacityStyle.controlSize +
        yBias *
          0.5 *
          (yBiasMax -
            biasCenterY +
            2 * this.activeGaussianOpacityStyle.controlSize);
      return {
        controlSize,
        bounds: {
          x: minX,
          y: maxY,
          width: maxX - minX,
          height: minY - maxY,
        },
        bias: {
          center: [biasCenterX, biasCenterY],
          position: [xBiasPos, yBiasPos],
        },
        height: {
          x: minX,
          y: maxY,
          width: maxX - minX,
          height: controlSize,
        },
        leftWidth: {
          x: minX,
          y: minY,
          width: 0.5 * (maxX - minX),
          height: controlSize,
        },
        rightWidth: {
          x: 0.5 * (minX + maxX),
          y: minY - controlSize,
          width: 0.5 * (maxX - minX),
          height: controlSize,
        },
      };
    },
    gaussianSampling(
      { position, xBias, yBias, width, height },
      sampling = 100
    ) {
      const x1 = new Float32Array(sampling);
      const h = new Float32Array(sampling);

      // x-in
      const xStep = (2 * width) / (sampling - 1);
      if (Math.abs(xBias) === width) {
        for (let i = 0; i < sampling; i++) {
          x1[i] = (i * xStep - width) / width;
        }
      } else {
        const posScale = 1 / (width - xBias);
        const negScale = 1 / (width + xBias);
        for (let i = 0; i < sampling; i++) {
          x1[i] = i * xStep - width;
          if (x1[i] > xBias && posScale !== Number.Infinity) {
            x1[i] -= xBias;
            x1[i] *= posScale;
          } else if (negScale !== Number.Infinity) {
            x1[i] -= xBias;
            x1[i] *= negScale;
          }
        }
      }

      // y-out
      const zero = Math.exp(-4);
      if (yBias < 1) {
        for (let i = 0; i < sampling; i++) {
          const ha = Math.exp(-(4 * x1[i] * x1[i]));
          const hb = 1.0 - x1[i] * x1[i];
          h[i] = yBias * hb + (1 - yBias) * ha;
          h[i] -= zero;
          h[i] *= height;
        }
      } else {
        for (let i = 0; i < sampling; i++) {
          const hb = 1.0 - x1[i] * x1[i];
          h[i] = (2 - yBias) * hb + (yBias - 1);
          h[i] -= zero;
          h[i] *= height;
        }
      }

      const polyline = [];
      for (let i = 0; i < sampling; i++) {
        polyline.push({ x: position - width + i * xStep, y: h[i] });
      }
      polyline.unshift({ x: polyline[0].x, y: 0 });
      polyline.push({ x: polyline[sampling].x, y: 0 });
      return polyline;
    },
    gaussianPoints(gaussian) {
      const values = this.gaussianSampling(gaussian, 100);
      const viewCoordinates = [];
      let x, y;
      for (let i = 0; i < values.length; i++) {
        [x, y] = applyTransform(
          this.view,
          this.zoomTransform,
          values[i].x,
          values[i].y
        );
        viewCoordinates.push({ x, y });
      }
      return viewCoordinates.map(CTRL_POINT_TO_STR).join(' ');
    },
    startGaussianPositionDrag(index, mouseEvent) {
      this.dragStart = {
        gaussian: index,
        position: this.gaussians[index].position,
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };
      this.startDrag(this.updateGaussianPosition);
    },
    updateGaussianPosition() {
      if (!this.dragStart) {
        return;
      }

      const { gaussian, position, mousePosition } = this.dragStart;
      const { begin, end, size } = this.view;
      const xScale =
        (end[0] - begin[0]) / size[0] / this.zoomTransform.scale[0];
      const dx = xScale * (this.dragMousePosition[0] - mousePosition[0]);
      const newGaussians = this.gaussians.slice();
      newGaussians[gaussian].position = clamp(position + dx, 0, 1);
      this.gaussians = newGaussians;
    },
    startGaussianBiasDrag(index, mouseEvent) {
      this.dragStart = {
        gaussian: index,
        xBias: this.gaussians[index].xBias,
        yBias: this.gaussians[index].yBias,
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };
      this.startDrag(this.updateGaussianBias);
    },
    updateGaussianBias() {
      if (!this.dragStart) {
        return;
      }

      const { gaussian, xBias, yBias, mousePosition } = this.dragStart;
      const { begin, end, size } = this.view;
      const { width, height } = this.gaussians[gaussian];
      const xScale =
        (end[0] - begin[0]) / width / size[0] / this.zoomTransform.scale[0];
      const yScale =
        -2 /
        height /
        (size[1] - 2 * this.activeGaussianOpacityStyle.controlSize) /
        this.zoomTransform.scale[1];
      const dx = xScale * (this.dragMousePosition[0] - mousePosition[0]);
      const dy = yScale * (this.dragMousePosition[1] - mousePosition[1]);
      const newGaussians = this.gaussians.slice();
      newGaussians[gaussian].xBias = clamp(xBias + dx, -1, 1);
      newGaussians[gaussian].yBias = clamp(yBias + dy, 0, 2);
      this.gaussians = newGaussians;
    },
    resetGaussianBias(index) {
      const newGaussians = this.gaussians.slice();
      newGaussians[index].xBias = 0;
      newGaussians[index].yBias = 0;
      if (newGaussians[index].height < 0.001) {
        newGaussians[index].height = 1;
      }
      this.gaussians = newGaussians;
    },
    startGaussianHeightDrag(index, mouseEvent) {
      this.dragStart = {
        gaussian: index,
        height: this.gaussians[index].height,
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };
      this.startDrag(this.updateGaussianHeight);
    },
    updateGaussianHeight() {
      if (!this.dragStart) {
        return;
      }
      const { gaussian, height, mousePosition } = this.dragStart;
      const { size } = this.view;
      const yScale =
        1 /
        (2 * this.activeGaussianOpacityStyle.controlSize - size[1]) /
        this.zoomTransform.scale[1];
      const dy = yScale * (this.dragMousePosition[1] - mousePosition[1]);
      const newGaussians = this.gaussians.slice();
      // Prevent the height control to collapse over width controls
      const minValue =
        (2 * this.activeGaussianOpacityStyle.controlSize) / size[1];
      newGaussians[gaussian].height = clamp(height + dy, minValue, 1);
      this.gaussians = newGaussians;
    },
    startGaussianWidthDrag(index, mouseEvent, direction = 1) {
      this.dragStart = {
        gaussian: index,
        direction,
        width: this.gaussians[index].width,
        mousePosition: toXY(mouseEvent),
        modifiers: toModifiers(mouseEvent),
      };
      this.startDrag(this.updateGaussianWidth);
    },
    updateGaussianWidth() {
      if (!this.dragStart) {
        return;
      }
      const { gaussian, width, direction, mousePosition } = this.dragStart;
      const { begin, end, size } = this.view;
      const xScale =
        (end[0] - begin[0]) / size[0] / this.zoomTransform.scale[0];
      const dx = xScale * (this.dragMousePosition[0] - mousePosition[0]);
      const newGaussians = this.gaussians.slice();
      newGaussians[gaussian].width = clamp(width + direction * dx, 0.01, 1);
      this.gaussians = newGaussians;
    },
  },
};
