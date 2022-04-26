// ----------------------------------------------------------------------------
// vtk.js Rendering stack
// ----------------------------------------------------------------------------

import { debounce } from 'vtk.js/Sources/macro';

import vtkSynchronizableRenderWindow from 'vtk.js/Sources/Rendering/Misc/SynchronizableRenderWindow';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
// import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkInteractorStyleManipulator from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator';

// Style modes
import vtkMouseCameraTrackballMultiRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballMultiRotateManipulator';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseCameraTrackballRollManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRollManipulator';
import vtkMouseCameraTrackballRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkMouseCameraTrackballZoomManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomManipulator';
import vtkMouseCameraTrackballZoomToMouseManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomToMouseManipulator';
import vtkGestureCameraManipulator from 'vtk.js/Sources/Interaction/Manipulators/GestureCameraManipulator';
import vtkMouseBoxSelectorManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseBoxSelectorManipulator';

// ----------------------------------------------------------------------------
// Helper constants
// ----------------------------------------------------------------------------

const CAMERA_PROPS = [
  'focalPoint',
  'parallelProjection',
  'parallelScale',
  'position',
  'viewAngle',
  'viewUp',
];

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
  name: 'VtkSyncView',
  props: {
    camera: {
      type: Object,
      default: null,
    },
    interactorEvents: {
      type: Array,
      default: () => ['EndAnimation'],
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
    wsClient: {
      type: Object,
    },
    contextName: {
      type: String,
      default: 'LocalRenderingContext',
    },
    viewState: {
      type: Object,
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    camera(v) {
      this.setCamera(v);
    },
    interactorSettings(v) {
      assignManipulators(this.style, v);
    },
    synchContextName() {
      if (this.synchCtx) {
        this.synchCtx.emptyCachedInstances();
        this.synchCtx.emptyCachedArrays();
      }

      this.synchCtx = vtkSynchronizableRenderWindow.getSynchronizerContext(
        this.contextName
      );
      this.synchCtx.setFetchArrayFunction(this.getArray);
    },
    viewState(remoteState) {
      this.updateViewState(remoteState);
    },
    ready(r) {
      this.$emit('onReady', r);
    },
  },
  data() {
    return {
      mtime: 0,
      count: 0,
    };
  },
  computed: {
    ready() {
      return this.count < 1;
    },
    client() {
      return this.wsClient || this.trame?.client;
    },
  },
  created() {
    const { interactorSettings } = this;

    const complete = () => {
      this.count -= 1;
    };
    const busyWrap = async (promise) => {
      this.count += 1;
      const result = await promise;
      setTimeout(complete, 1);
      return result;
    };

    // Implement getArray
    this.getArray = (hash, binary = true) => {
      this.$nextTick(this.render);
      if (this.client) {
        if (this.client.getRemote().SyncView) {
          return busyWrap(
            this.client.getRemote().SyncView.getArray(hash, binary)
          );
        }
        const session = this.client?.getConnection()?.getSession();
        if (session) {
          return busyWrap(
            session.call('viewport.geometry.array.get', [hash, binary])
          );
        }
      }
      return Promise.resolve(null);
    };

    // Create sync context
    this.synchCtx = vtkSynchronizableRenderWindow.getSynchronizerContext(
      this.contextName
    );
    this.synchCtx.setFetchArrayFunction(this.getArray);

    // Create vtk.js view
    this.renderWindow = vtkSynchronizableRenderWindow.newInstance({
      synchronizerContext: this.synchCtx,
    });

    this.openglRenderWindow = vtkOpenGLRenderWindow.newInstance({
      cursor: 'default',
    });
    this.renderWindow.addView(this.openglRenderWindow);

    this.interactor = vtkRenderWindowInteractor.newInstance();
    this.interactor.setView(this.openglRenderWindow);
    this.interactor.initialize();

    // Attach listeners
    this.subscriptions = [];
    this.interactorEvents.forEach((name) => {
      const key = `on${name}`;
      this.subscriptions.push(this.interactor[key]((e) => this.$emit(name, e)));
    });

    // Interactor style
    this.style = vtkInteractorStyleManipulator.newInstance();
    this.interactor.setInteractorStyle(this.style);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.onResize());

    // expose helper methods
    this.render = debounce(() => {
      if (this.renderer) {
        this.renderer.resetCameraClippingRange();
      }
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

    this.onBoxSelectChange = ({ container, selection }) => {
      if (!this.boxSelection || !container) {
        return;
      }
      // Share the selection with the rest of the world
      const { width, height } = container.getBoundingClientRect();
      this.$emit('BoxSelection', {
        selection,
        mode: 'local',
        size: [width, height],
        camera: this.getCamera(),
      });
    };

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

    if (this.viewState) {
      this.updateViewState(this.viewState);
    }
  },
  beforeUnmount() {
    // Clear any pending render...
    this.render.cancel();

    while (this.subscriptions.length) {
      this.subscriptions.pop().unsubscribe();
    }

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
    setSynchronizedViewId(newId) {
      // Remove renderers from previous remote view
      const renderers = this.renderWindow.getRenderersByReference();
      while (renderers.length) {
        renderers.pop();
      }
      this.renderWindow.setSynchronizedViewId(newId);
    },
    async updateViewState(remoteState) {
      // console.time('updateViewState');
      this.renderWindow.getInteractor().setEnableRender(false);

      this.$emit('beforeSceneLoaded');
      // Fo debug
      // console.log(JSON.stringify(remoteState, null, 2));

      // Force to process provided state
      this.mtime = Math.max(this.mtime, remoteState.mtime) + 1;
      this.count = 1;
      // eslint-disable-next-line
      remoteState.mtime = this.mtime;
      const progress = this.renderWindow.synchronize(remoteState);

      // Bind camera as soon as possible
      if (progress) {
        if (this.renderWindow.getRenderersByReference().length) {
          [this.renderer] = this.renderWindow.getRenderersByReference();
          this.activeCamera = this.renderer.getActiveCamera();
        }
        if (
          remoteState.extra &&
          remoteState.extra.camera &&
          this.activeCamera
        ) {
          this.synchCtx.registerInstance(
            remoteState.extra.camera,
            this.activeCamera
          );
        }
      }

      const success = await progress;
      if (success) {
        if (remoteState.extra) {
          if (remoteState.extra.camera) {
            this.remoteCamera = this.synchCtx.getInstance(
              remoteState.extra.camera
            );
            if (this.remoteCamera) {
              this.style.setCenterOfRotation(this.remoteCamera.getFocalPoint());
            }
          }

          if (remoteState.extra.centerOfRotation) {
            this.style.setCenterOfRotation(remoteState.extra.centerOfRotation);
          }

          if (remoteState.extra.resetCamera) {
            this.resetCamera();
          }
        }

        this.$nextTick(this.render);
        this.$emit('viewStateChange', remoteState);
        this.count -= 1;
        this.$emit('afterSceneLoaded');

        // console.timeEnd('updateViewState');
        this.renderWindow.getInteractor().setEnableRender(true);
      }
    },
    resize() {
      this.onResize();
    },
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
      if (this.renderer) {
        this.renderer.resetCamera();
        this.style.setCenterOfRotation(
          this.renderer.getActiveCamera().getFocalPoint()
        );
        this.$nextTick(this.render);
        this.$emit('resetCamera');
      }
    },
    getCamera() {
      const centerOfRotation = this.style.getCenterOfRotation();
      this.activeCamera = this.interactor
        .getCurrentRenderer()
        .getActiveCamera();
      return {
        centerOfRotation,
        ...this.activeCamera.get(
          'position',
          'focalPoint',
          'viewUp',
          'parallelProjection',
          'parallelScale',
          'viewAngle'
        ),
      };
    },
    setCamera(props) {
      if (this.activeCamera) {
        const cameraProps = {};
        CAMERA_PROPS.forEach((name) => {
          if (props[name]) {
            cameraProps[name] = props[name];
          }
        });
        this.activeCamera.set(cameraProps);

        if (props.centerOfRotation) {
          this.style.setCenterOfRotation(props.centerOfRotation);
        }
        this.$nextTick(this.render);
      }
    },
  },
  provide() {
    return {
      view: this,
    };
  },
};
