// ----------------------------------------------------------------------------
// vtk.js Rendering stack
// ----------------------------------------------------------------------------

import { debounce } from 'vtk.js/Sources/macro';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkInteractorStyleManipulator from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator';

// Style modes
import vtkMouseCameraTrackballMultiRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballMultiRotateManipulator';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseCameraTrackballRollManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRollManipulator';
import vtkMouseCameraTrackballRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkMouseCameraTrackballZoomManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomManipulator';
import vtkMouseCameraTrackballZoomToMouseManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomToMouseManipulator';
import vtkGestureCameraManipulator from 'vtk.js/Sources/Interaction/Manipulators/GestureCameraManipulator';

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
};

function assignManipulators(style, settings) {
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
          shift: true,
        },
        {
          button: 1,
          action: 'Zoom',
          alt: true,
        },
        {
          button: 1,
          action: 'ZoomToMouse',
          control: true,
        },
        {
          button: 1,
          action: 'Roll',
          alt: true,
          shift: true,
        },
      ],
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
      assignManipulators(this.style, v);
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
    assignManipulators(this.style, interactorSettings);

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
  },
  mounted() {
    const container = this.$refs.vtkContainer;
    this.openglRenderWindow.setContainer(container);
    this.interactor.bindEvents(container);
    this.onResize();
    this.resizeObserver.observe(container);
    document.addEventListener('keyup', this.handleKey);
    this.resetCamera();
  },
  beforeUnmout() {
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
        const { width, height } = container.getBoundingClientRect();

        this.openglRenderWindow.setSize(
          Math.max(width, 10),
          Math.max(height, 10)
        );
        this.renderWindow.render();
      }
    },
    resetCamera() {
      this.renderer.resetCamera();
      this.style.setCenterOfRotation(
        this.renderer.getActiveCamera().getFocalPoint()
      );
      this.render();
    },
  },
  provide() {
    return {
      view: this,
    };
  },
};
