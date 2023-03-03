import { debounce } from "@kitware/vtk.js/macro";

import vtkSynchronizableRenderWindow from "@kitware/vtk.js/Rendering/Misc/SynchronizableRenderWindow";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkInteractorStyleManipulator from "@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator";

import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkCubeAxesActor from "@kitware/vtk.js/Rendering/Core/CubeAxesActor";

// Style modes
import vtkMouseCameraTrackballMultiRotateManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballMultiRotateManipulator";
import vtkMouseCameraTrackballPanManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballPanManipulator";
import vtkMouseCameraTrackballRollManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRollManipulator";
import vtkMouseCameraTrackballRotateManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator";
import vtkMouseCameraTrackballZoomManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomManipulator";
import vtkMouseCameraTrackballZoomToMouseManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomToMouseManipulator";
import vtkGestureCameraManipulator from "@kitware/vtk.js/Interaction/Manipulators/GestureCameraManipulator";
import vtkMouseBoxSelectorManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseBoxSelectorManipulator";

// Picking handling
import vtkOpenGLHardwareSelector from "@kitware/vtk.js/Rendering/OpenGL/HardwareSelector";
import { FieldAssociations } from "@kitware/vtk.js/Common/DataModel/DataSet/Constants";

// ----------------------------------------------------------------------------
// Helper constants
// ----------------------------------------------------------------------------

export const CAMERA_PROPS = [
  "focalPoint",
  "parallelProjection",
  "parallelScale",
  "position",
  "viewAngle",
  "viewUp",
];

export const manipulatorFactory = {
  None: null,
  Pan: vtkMouseCameraTrackballPanManipulator,
  Zoom: vtkMouseCameraTrackballZoomManipulator,
  Roll: vtkMouseCameraTrackballRollManipulator,
  Rotate: vtkMouseCameraTrackballRotateManipulator,
  MultiRotate: vtkMouseCameraTrackballMultiRotateManipulator,
  ZoomToMouse: vtkMouseCameraTrackballZoomToMouseManipulator,
  Select: vtkMouseBoxSelectorManipulator,
};

export function assignManipulators(style, settings, onBoxSelectChange) {
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
      if (manipulator.onBoxSelectChange && onBoxSelectChange) {
        manipulator.onBoxSelectChange(onBoxSelectChange);
      }
    }
  });

  // Always add gesture
  style.addGestureManipulator(vtkGestureCameraManipulator.newInstance());
}

class BusyHandler {
  constructor(readyRef) {
    this.readyRef = readyRef;
    this.count = 0;
    this.start = () => {
      this.count++;
      if (this.readyRef.value) {
        this.readyRef.value = false;
      }
    };
    this.stop = () => {
      this.count--;
      if (this.count === 0) {
        this.readyRef.value = true;
      }
    };
    this.reset = () => (this.count = 0);
  }

  async wrap(promise) {
    this.start();
    try {
      await promise;
    } finally {
      setTimeout(this.stop, 1);
    }
    return promise;
  }
}

export class LocalView {
  constructor(ctxName, getArray, events, vueCtx) {
    this.vueCtx = vueCtx;
    this.container = null;
    this.rwId = 0;
    this.mtime = 0;
    this.busy = new BusyHandler(vueCtx.ready);
    this.renderer = null;
    this.activeCamera = null;
    this.subscriptions = [];
    this.ctx = vtkSynchronizableRenderWindow.getSynchronizerContext(ctxName);
    this.ctx.setFetchArrayFunction((hash, binary = true) => {
      this.render();
      return this.busy.wrap(getArray(hash, binary));
    });

    // VTK
    this.renderWindow = vtkSynchronizableRenderWindow.newInstance({
      synchronizerContext: this.ctx,
    });
    this.openglRenderWindow = vtkOpenGLRenderWindow.newInstance({
      cursor: "default",
    });
    this.renderWindow.addView(this.openglRenderWindow);
    this.interactor = vtkRenderWindowInteractor.newInstance();
    this.interactor.setView(this.openglRenderWindow);
    this.interactor.initialize();

    // Listeners
    events.forEach((name) => {
      const key = `on${name}`;
      this.subscriptions.push(
        this.interactor[key]((e) => this.vueCtx.emit(name, e))
      );
    });

    this.style = vtkInteractorStyleManipulator.newInstance();
    this.interactor.setInteractorStyle(this.style);

    // Create debounced methods
    this.render = debounce(() => {
      if (this.renderer) {
        this.renderer.resetCameraClippingRange();
      }
      this.renderWindow.render();
    }, 0);
  }

  setContainer(container) {
    this.container = container;
    this.openglRenderWindow.setContainer(container);
    this.interactor.bindEvents(container);
    this.resize();

    this.resetCamera();
  }

  setSynchronizedViewId(newId) {
    // Remove renderers from previous remote view
    const renderers = this.renderWindow.getRenderersByReference();
    while (renderers.length) {
      renderers.pop();
    }
    this.renderWindow.setSynchronizedViewId(newId);
    this.rwId = newId;
  }

  async updateViewState(remoteState) {
    // console.time('updateViewState');
    this.renderWindow.getInteractor().setEnableRender(false);

    this.vueCtx.emit("beforeSceneLoaded");
    // Fo debug
    // console.log(JSON.stringify(remoteState, null, 2));

    // Force to process provided state
    this.mtime = Math.max(this.mtime, remoteState.mtime) + 1;
    this.busy.reset();
    this.busy.start();
    remoteState.mtime = this.mtime;
    const progress = this.renderWindow.synchronize(remoteState);

    // Bind camera as soon as possible
    if (progress) {
      if (this.renderWindow.getRenderersByReference().length) {
        [this.renderer] = this.renderWindow.getRenderersByReference();
        this.activeCamera = this.renderer.getActiveCamera();
      }
      if (remoteState.extra && remoteState.extra.camera && this.activeCamera) {
        this.ctx.registerInstance(remoteState.extra.camera, this.activeCamera);
      }
    }

    const success = await progress;
    if (success) {
      if (remoteState.extra) {
        if (remoteState.extra.camera) {
          this.remoteCamera = this.ctx.getInstance(remoteState.extra.camera);
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

      this.vueCtx.nextTick(this.render);
      this.vueCtx.emit("viewStateChange", remoteState);
      this.busy.stop();
      this.vueCtx.emit("afterSceneLoaded");

      // console.timeEnd('updateViewState');
      this.renderWindow.getInteractor().setEnableRender(true);
    }
  }

  resize() {
    if (this.container) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const { width, height } = this.container.getBoundingClientRect();

      this.openglRenderWindow.setSize(
        Math.floor(Math.max(width * devicePixelRatio, 10)),
        Math.floor(Math.max(height * devicePixelRatio, 10))
      );
      this.vueCtx.nextTick(this.render);
      this.vueCtx.emit("resize");
    }
  }

  resetCamera() {
    if (this.renderer) {
      this.renderer.resetCamera();
      this.style.setCenterOfRotation(
        this.renderer.getActiveCamera().getFocalPoint()
      );
      this.vueCtx.nextTick(this.render);
      this.vueCtx.emit("resetCamera");
    }
  }

  getCamera() {
    const centerOfRotation = this.style.getCenterOfRotation();
    this.activeCamera = this.interactor.getCurrentRenderer().getActiveCamera();
    return {
      centerOfRotation,
      ...this.activeCamera.get(
        "position",
        "focalPoint",
        "viewUp",
        "parallelProjection",
        "parallelScale",
        "viewAngle"
      ),
    };
  }

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
      this.vueCtx.nextTick(this.render);
    }
  }

  updateStyle(settings, onBoxSelectChange) {
    assignManipulators(this.style, settings, onBoxSelectChange);
  }

  beforeDelete() {
    this.render.cancel();

    while (this.subscriptions.length) {
      this.subscriptions.pop().unsubscribe();
    }

    // Detatch from DOM
    this.interactor.unbindEvents();
    this.openglRenderWindow.setContainer(null);

    // Free memory
    this.renderWindow.removeRenderer(this.renderer);
    this.renderWindow.removeView(this.openglRenderWindow);

    this.interactor.delete();
    this.interactor = null;

    // this.renderer.delete(); // not ours to delete...
    this.renderer = null;

    this.renderWindow.delete();
    this.renderWindow = null;

    this.openglRenderWindow.delete();
    this.openglRenderWindow = null;
  }
}

export function enableResetCamera(view) {
  let hasFocus = false;

  function onEnter() {
    hasFocus = true;
  }
  function onLeave() {
    hasFocus = false;
  }
  function onKeyUp(e) {
    if (!hasFocus) {
      return;
    }
    switch (e.code) {
      case "KeyR":
        view.resetCamera();
        break;
      default:
        // console.log(e.code);
        break;
    }
  }

  return { onEnter, onLeave, onKeyUp };
}

export class ClientView {
  constructor(background, pickingModes, interactorSettings, events, vueCtx) {
    this.vueCtx = vueCtx;
    this.pickingModes = pickingModes;
    this.renderWindow = vtkRenderWindow.newInstance();
    this.renderer = vtkRenderer.newInstance({ background });
    this.renderWindow.addRenderer(this.renderer);

    this.activeCamera = this.renderer.getActiveCamera();
    this.activeCamera.set(this.camera);

    this.openglRenderWindow = vtkOpenGLRenderWindow.newInstance({
      cursor: "default",
    });
    this.renderWindow.addView(this.openglRenderWindow);

    this.interactor = vtkRenderWindowInteractor.newInstance();
    this.interactor.setView(this.openglRenderWindow);
    this.interactor.initialize();

    // Attach listeners
    this.subscriptions = [];
    events.forEach((name) => {
      const key = `on${name}`;
      this.subscriptions.push(
        this.interactor[key]((e) => this.vueCtx.emit(name, e))
      );
    });

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

    // expose helper methods
    this.render = debounce(() => {
      this.renderer.resetCameraClippingRange();
      this.renderWindow.render();
    }, 1);

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
      const { props } = this.renderer.get("props");
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

    // Listeners
    this.subscriptions = [];
    this.subscriptions.push(
      this.renderer.onEvent(({ type, renderer }) => {
        if (renderer && type === "ComputeVisiblePropBoundsEvent") {
          this.debouncedCubeBounds();
        }
      })
    );

    // Handle picking
    const click = ({ x, y }) => {
      if (!this.pickingModes.includes("click")) {
        return;
      }
      const selection = this.pick(x, y, x, y);
      this.vueCtx.emit("click", selection[0]);
    };

    this.debouncedHover = debounce(({ x, y }) => {
      if (!this.pickingModes.includes("hover")) {
        return;
      }
      const selection = this.pick(x, y, x, y);

      // Guard against trigger of empty selection
      if (this.lastSelection.length === 0 && selection.length === 0) {
        return;
      }
      this.lastSelection = selection;

      // Share the selection with the rest of the world
      this.vueCtx.emit("hover", selection[0]);
    }, 10);

    const select = ({ selection }) => {
      if (!this.pickingModes.includes("select")) {
        return;
      }
      const [x1, x2, y1, y2] = selection;
      const pickResult = this.pick(x1, y1, x2, y2);

      // Share the selection with the rest of the world
      this.vueCtx.emit("select", pickResult);
    };

    this.onClick = (e) => click(this.getScreenEventPositionFor(e));
    this.onMouseMove = (e) =>
      this.debouncedHover(this.getScreenEventPositionFor(e));
    this.lastSelection = [];

    this.onBoxSelectChange = select;
    this.updateStyle(interactorSettings);
  }

  setContainer(container) {
    this.container = container;
    this.openglRenderWindow.setContainer(container);
    this.interactor.bindEvents(container);
    this.resize();
    this.resetCamera();

    // Give a chance for the first layout to properly reset the camera
    this.resetCameraTimeout = setTimeout(() => this.resetCamera(), 100);
  }

  resize() {
    if (this.container) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const { width, height } = this.container.getBoundingClientRect();

      this.openglRenderWindow.setSize(
        Math.floor(Math.max(width * devicePixelRatio, 10)),
        Math.floor(Math.max(height * devicePixelRatio, 10))
      );
      this.vueCtx.nextTick(this.render);
      this.vueCtx.emit("resize");
    }
  }

  resetCamera() {
    if (this.renderer) {
      this.renderer.resetCamera();
      this.style.setCenterOfRotation(
        this.renderer.getActiveCamera().getFocalPoint()
      );
      this.vueCtx.nextTick(this.render);
      this.vueCtx.emit("resetCamera");
    }
  }

  getCamera() {
    const centerOfRotation = this.style.getCenterOfRotation();
    this.activeCamera = this.interactor.getCurrentRenderer().getActiveCamera();
    return {
      centerOfRotation,
      ...this.activeCamera.get(
        "position",
        "focalPoint",
        "viewUp",
        "parallelProjection",
        "parallelScale",
        "viewAngle"
      ),
    };
  }

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
      this.vueCtx.nextTick(this.render);
    }
  }

  updateStyle(settings) {
    assignManipulators(this.style, settings, this.onBoxSelectChange);
  }

  getScreenEventPositionFor(source) {
    if (!this.container) {
      return;
    }
    const bounds = this.container.getBoundingClientRect();
    const [canvasWidth, canvasHeight] = this.openglRenderWindow.getSize();
    const scaleX = canvasWidth / bounds.width;
    const scaleY = canvasHeight / bounds.height;
    const position = {
      x: scaleX * (source.clientX - bounds.left),
      y: scaleY * (bounds.height - source.clientY + bounds.top),
      z: 0,
    };
    return position;
  }

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
          const { representationId } = prop.get("representationId");
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
          ...prop.get("representationId"),
          ray,
        };
      });
    }
    return [];
  }

  beforeDelete() {
    while (this.subscriptions.length) {
      this.subscriptions.pop().unsubscribe();
    }

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
  }
}
