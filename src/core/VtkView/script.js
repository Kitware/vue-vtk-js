// ----------------------------------------------------------------------------
// vtk.js Rendering stack
// ----------------------------------------------------------------------------

import { debounce } from 'vtk.js/Sources/macro';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkInteractorStyleManipulator from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator';

import vtkBoundingBox from 'vtk.js/Sources/Common/DataModel/BoundingBox';
import vtkCubeAxesActor from 'vtk.js/Sources/Rendering/Core/CubeAxesActor';

// Style modes
import vtkMouseCameraTrackballMultiRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballMultiRotateManipulator';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseCameraTrackballRollManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRollManipulator';
import vtkMouseCameraTrackballRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkMouseCameraTrackballZoomManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomManipulator';
import vtkMouseCameraTrackballZoomToMouseManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomToMouseManipulator';
import vtkGestureCameraManipulator from 'vtk.js/Sources/Interaction/Manipulators/GestureCameraManipulator';
import vtkMouseBoxSelectorManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseBoxSelectorManipulator';

// Picking handling
import vtkOpenGLHardwareSelector from 'vtk.js/Sources/Rendering/OpenGL/HardwareSelector';
import { FieldAssociations } from 'vtk.js/Sources/Common/DataModel/DataSet/Constants';

// ----------------------------------------------------------------------------
// Helper constants
// ----------------------------------------------------------------------------

const manipulatorFactory = {
  None: null,
  Pan: vtkMouseCameraTrackballPanManipulator,
  Zoom: vtkMouseCameraTrackballZoomManipulator,
  Roll: vtkMouseCameraTrackballRollManipulator,
  Rotate: vtkMouseCameraTrackballRotateManipulator,
  MultiRotate: vtkMouseCameraTrackballMultiRotateManipulator,
  ZoomToMouse: vtkMouseCameraTrackballZoomToMouseManipulator,
  Select: vtkMouseBoxSelectorManipulator,
};

function assignManipulators(style, settings, view) {
  style.removeAllMouseManipulators();
  settings.forEach((item) => {
    const klass = manipulatorFactory[item.action];
    if (klass) {
      const { button, shift, control, alt, scrollEnabled, dragEnabled } = item;
      const manipulator = klass.newInstance();
      manipulator.setButton(button);
      manipulator.setShift(!!shift);
      manipulator.setControl(!!control);
      manipulator.setAlt(!!alt);
      if (scrollEnabled !== undefined) {
        manipulator.setScrollEnabled(scrollEnabled);
      }
      if (dragEnabled !== undefined) {
        manipulator.setDragEnabled(dragEnabled);
      }
      style.addMouseManipulator(manipulator);
      if (manipulator.onBoxSelectChange && view.onBoxSelectChange) {
        manipulator.onBoxSelectChange(view.onBoxSelectChange);
      }
    }
  });

  // Always add gesture
  style.addGestureManipulator(vtkGestureCameraManipulator.newInstance());
}

export default {
  name: 'VtkView',
  props: {
    background: {
      type: Array,
      default: () => [0.2, 0.3, 0.4],
    },
    camera: {
      type: Object,
      default: () => {},
    },
    interactorSettings: {
      type: Array,
      default: () => [
        {
          button: 1,
          action: 'Rotate',
        },
        {
          button: 2,
          action: 'Pan',
        },
        {
          button: 3,
          action: 'Zoom',
          scrollEnabled: true,
        },
        {
          button: 1,
          action: 'Pan',
          alt: true,
        },
        {
          button: 1,
          action: 'Zoom',
          control: true,
        },
        {
          button: 1,
          action: 'Select',
          shift: true,
        },
        {
          button: 1,
          action: 'Roll',
          alt: true,
          shift: true,
        },
      ],
    },
    pickingModes: {
      type: Array,
      default: () => [],
    },
    showCubeAxes: {
      type: Boolean,
      default: false,
    },
    cubeAxesStyle: {
      type: Object,
      default: () => ({}),
    },
  },
  watch: {
    background(v) {
      this.renderer.setBackground(v);
      this.$nextTick(this.render);
    },
    camera(v) {
      this.activeCamera.set(v);
      this.$nextTick(this.render);
    },
    interactorSettings(v) {
      assignManipulators(this.style, v, this);
    },
    showCubeAxes(v) {
      this.cubeAxes.setVisibility(v);
      this.$nextTick(this.render);
    },
    cubeAxesStyle(style) {
      this.cubeAxes.set(style);
      this.$nextTick(this.render);
    },
  },
  created() {
    const { background, interactorSettings } = this;

    // Create vtk.js view
    this.renderWindow = vtkRenderWindow.newInstance();
    this.renderer = vtkRenderer.newInstance({ background });
    this.renderWindow.addRenderer(this.renderer);

    this.activeCamera = this.renderer.getActiveCamera();
    this.activeCamera.set(this.camera);

    this.openglRenderWindow = vtkOpenGLRenderWindow.newInstance({
      cursor: 'default',
    });
    this.renderWindow.addView(this.openglRenderWindow);

    this.interactor = vtkRenderWindowInteractor.newInstance();
    this.interactor.setView(this.openglRenderWindow);
    this.interactor.initialize();

    // Interactor style
    this.style = vtkInteractorStyleManipulator.newInstance();
    this.interactor.setInteractorStyle(this.style);

    // Picking handler
    this.selector = vtkOpenGLHardwareSelector.newInstance({
      captureZValues: true,
    });
    this.selector.setFieldAssociation(
      FieldAssociations.FIELD_ASSOCIATION_POINTS
    );
    this.selector.attach(this.openglRenderWindow, this.renderer);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.onResize());

    // expose helper methods
    this.render = debounce(() => {
      this.renderer.resetCameraClippingRange();
      this.renderWindow.render();
    }, 1);

    // Internal functions
    this.hasFocus = false;
    this.handleKey = (e) => {
      if (!this.hasFocus) {
        return;
      }
      switch (e.code) {
        case 'KeyR':
          this.resetCamera();
          break;
        default:
          // console.log(e.code);
          break;
      }
    };
    this.onEnter = () => {
      this.hasFocus = true;
    };
    this.onLeave = () => {
      this.hasFocus = false;
    };

    // Cube axes
    this.cubeAxes = vtkCubeAxesActor.newInstance({
      dataBounds: [-1, 1, -1, 1, -1, 1],
      visibility: false,
    });
    this.cubeAxes.setVisibility(false);
    this.cubeAxes
      .getActors()
      .forEach(({ setVisibility }) => setVisibility(false));

    this.cubeAxes.setCamera(this.activeCamera);
    this.renderer.addActor(this.cubeAxes);

    const bbox = vtkBoundingBox.newInstance({ bounds: [0, 0, 0, 0, 0, 0] });
    this.updateCubeBounds = () => {
      bbox.reset();
      const { props } = this.renderer.get('props');
      for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        if (
          prop.getVisibility() &&
          prop.getUseBounds() &&
          prop !== this.cubeAxes
        ) {
          bbox.addBounds(...prop.getBounds());
        }
      }
      this.cubeAxes.setDataBounds(bbox.getBounds());
    };
    this.debouncedCubeBounds = debounce(this.updateCubeBounds, 50);

    this.subscriptions = [];
    this.subscriptions.push(
      this.renderer.onEvent(({ type, renderer }) => {
        if (renderer && type === 'ComputeVisiblePropBoundsEvent') {
          this.debouncedCubeBounds();
        }
      })
    );

    // Handle picking
    const click = ({ x, y }) => {
      if (!this.pickingModes.includes('click')) {
        return;
      }
      const selection = this.pick(x, y, x, y);
      this.$emit('click', selection[0]);
    };

    this.debouncedHover = debounce(({ x, y }) => {
      if (!this.pickingModes.includes('hover')) {
        return;
      }
      const selection = this.pick(x, y, x, y);

      // Guard against trigger of empty selection
      if (this.lastSelection.length === 0 && selection.length === 0) {
        return;
      }
      this.lastSelection = selection;

      // Share the selection with the rest of the world
      this.$emit('hover', selection[0]);
    }, 10);

    const select = ({ selection }) => {
      if (!this.pickingModes.includes('select')) {
        return;
      }
      const [x1, x2, y1, y2] = selection;
      const pickResult = this.pick(x1, y1, x2, y2);

      // Share the selection with the rest of the world
      this.$emit('select', pickResult);
    };

    this.onClick = (e) => click(this.getScreenEventPositionFor(e));
    this.onMouseMove = (e) =>
      this.debouncedHover(this.getScreenEventPositionFor(e));
    this.lastSelection = [];

    this.onBoxSelectChange = select;

    // Configure interaction once 'this' is fully setup
    assignManipulators(this.style, interactorSettings, this);
  },
  mounted() {
    const container = this.$refs.vtkContainer;
    this.openglRenderWindow.setContainer(container);
    this.interactor.bindEvents(container);
    this.onResize();
    this.resizeObserver.observe(container);
    document.addEventListener('keyup', this.handleKey);
    this.resetCamera();

    // Give a chance for the first layout to properly reset the camera
    this.resetCameraTimeout = setTimeout(() => this.resetCamera(), 100);
  },
  beforeUnmount() {
    // Clear any pending action
    if (this.debouncedCubeBounds) {
      this.debouncedCubeBounds.cancel();
    }
    if (this.debouncedHover) {
      this.debouncedHover.cancel();
    }
    if (this.render) {
      this.render.cancel();
    }
    clearTimeout(this.resetCameraTimeout);

    // Remove key listener
    document.removeEventListener('keyup', this.handleKey);

    // Stop size listening
    this.resizeObserver.disconnect();
    this.resizeObserver = null;

    // Detatch from DOM
    this.interactor.unbindEvents();
    this.openglRenderWindow.setContainer(null);

    // Free memory
    this.renderWindow.removeRenderer(this.renderer);
    this.renderWindow.removeView(this.openglRenderWindow);

    this.interactor.delete();
    this.interactor = null;

    this.renderer.delete();
    this.renderer = null;

    this.renderWindow.delete();
    this.renderWindow = null;

    this.openglRenderWindow.delete();
    this.openglRenderWindow = null;
  },
  methods: {
    onResize() {
      const container = this.$refs.vtkContainer;
      if (container) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const { width, height } = container.getBoundingClientRect();

        this.openglRenderWindow.setSize(
          Math.floor(Math.max(width * devicePixelRatio, 10)),
          Math.floor(Math.max(height * devicePixelRatio, 10))
        );
        this.$nextTick(this.render);
        this.$emit('resize');
      }
    },
    resetCamera() {
      this.renderer.resetCamera();
      this.style.setCenterOfRotation(
        this.renderer.getActiveCamera().getFocalPoint()
      );
      this.render();
    },
    getScreenEventPositionFor(source) {
      const bounds = this.$refs.vtkContainer.getBoundingClientRect();
      const [canvasWidth, canvasHeight] = this.openglRenderWindow.getSize();
      const scaleX = canvasWidth / bounds.width;
      const scaleY = canvasHeight / bounds.height;
      const position = {
        x: scaleX * (source.clientX - bounds.left),
        y: scaleY * (bounds.height - source.clientY + bounds.top),
        z: 0,
      };
      return position;
    },
    pick(x1, y1, x2, y2) {
      this.selector.setArea(x1, y1, x2, y2);
      this.previousSelectedData = null;
      if (this.selector.captureBuffers()) {
        this.selections = this.selector.generateSelection(x1, y1, x2, y2) || [];
        if (x1 !== x2 || y1 !== y2) {
          const frustrum = [
            // near lower-left
            Array.from(
              this.openglRenderWindow.displayToWorld(x1, y1, 0, this.renderer)
            ),
            // far lower-left
            Array.from(
              this.openglRenderWindow.displayToWorld(x1, y1, 1, this.renderer)
            ),
            // near upper-left
            Array.from(
              this.openglRenderWindow.displayToWorld(x1, y2, 0, this.renderer)
            ),
            // far upper-left
            Array.from(
              this.openglRenderWindow.displayToWorld(x1, y2, 1, this.renderer)
            ),
            // near lower-right
            Array.from(
              this.openglRenderWindow.displayToWorld(x2, y1, 0, this.renderer)
            ),
            // far lower-right
            Array.from(
              this.openglRenderWindow.displayToWorld(x2, y1, 1, this.renderer)
            ),
            // near upper-right
            Array.from(
              this.openglRenderWindow.displayToWorld(x2, y2, 0, this.renderer)
            ),
            // far upper-right
            Array.from(
              this.openglRenderWindow.displayToWorld(x2, y2, 1, this.renderer)
            ),
          ];
          const representationIds = [];
          this.selections.forEach((v) => {
            const { prop } = v.getProperties();
            const { representationId } = prop.get('representationId');
            if (representationId) {
              representationIds.push(representationId);
            }
          });
          return { frustrum, representationIds };
        }
        const ray = [
          Array.from(
            this.openglRenderWindow.displayToWorld(x1, y1, 0, this.renderer)
          ),
          Array.from(
            this.openglRenderWindow.displayToWorld(x1, y1, 1, this.renderer)
          ),
        ];
        return this.selections.map((v) => {
          const { prop, compositeID, displayPosition } = v.getProperties();

          return {
            worldPosition: Array.from(
              this.openglRenderWindow.displayToWorld(
                displayPosition[0],
                displayPosition[1],
                displayPosition[2],
                this.renderer
              )
            ),
            displayPosition,
            compositeID, // Not yet useful unless GlyphRepresentation
            ...prop.get('representationId'),
            ray,
          };
        });
      }
      return [];
    },
  },
  provide() {
    return {
      view: this,
    };
  },
};
