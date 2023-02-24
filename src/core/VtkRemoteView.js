import {
  ref,
  unref,
  inject,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";

import vtkRemoteView from "@kitware/vtk.js/Rendering/Misc/RemoteView";
import vtkMouseBoxSelectorManipulator from "@kitware/vtk.js/Interaction/Manipulators/MouseBoxSelectorManipulator";
import vtkInteractorStyleManipulator from "@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator";

export default {
  props: {
    viewId: {
      type: String,
      default: "-1",
    },
    wsClient: {
      type: Object,
    },
    interactiveRatio: {
      type: [Number, String],
    },
    interactiveQuality: {
      type: [Number, String],
    },
    stillRatio: {
      type: [Number, String],
    },
    stillQuality: {
      type: [Number, String],
    },
    enablePicking: {
      type: Boolean,
      default: false,
    },
    interactorEvents: {
      type: Array,
      default: () => ["EndAnimation"],
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "BoxSelection",
    // https://github.com/Kitware/vtk-js/blob/master/Sources/Rendering/Core/RenderWindowInteractor/index.js#L27-L67
    "StartAnimation",
    "Animation",
    "EndAnimation",
    "PointerEnter",
    "PointerLeave",
    "MouseEnter",
    "MouseLeave",
    "StartMouseMove",
    "MouseMove",
    "EndMouseMove",
    "LeftButtonPress",
    "LeftButtonRelease",
    "MiddleButtonPress",
    "MiddleButtonRelease",
    "RightButtonPress",
    "RightButtonRelease",
    "KeyPress",
    "KeyDown",
    "KeyUp",
    "StartMouseWheel",
    "MouseWheel",
    "EndMouseWheel",
    "StartPinch",
    "Pinch",
    "EndPinch",
    "StartPan",
    "Pan",
    "EndPan",
    "StartRotate",
    "Rotate",
    "EndRotate",
    "Button3D",
    "Move3D",
    "StartPointerLock",
    "EndPointerLock",
    "StartInteraction",
    "Interaction",
    "EndInteraction",
    "AnimationFrameRateUpdate",
  ],
  setup(props, { emit }) {
    const connected = ref(false);
    const vtkContainer = ref(null);
    const trame = inject("trame");
    const client = props.wsClient || trame?.client;
    let resizeObserver = null;

    if (!client) {
      throw new Error("VtkRemoteView can not be created without a wsClient");
    }

    const viewStream = client.getImageStream().createViewStream(props.viewId);
    const view = vtkRemoteView.newInstance({
      rpcWheelEvent: "viewport.mouse.zoom.wheel",
      viewStream,
    });
    if (props.interactiveRatio) {
      view.setInteractiveRatio(Number(props.interactiveRatio));
    }
    if (props.interactiveQuality) {
      view.setInteractiveQuality(Number(props.interactiveQuality));
    }
    if (props.stillRatio) {
      view.setStillRatio(Number(props.stillRatio));
    }
    if (props.stillQuality) {
      view.setStillQuality(Number(props.stillQuality));
    }

    // Bind remote view method to component
    const render = view.render;
    const resetCamera = view.resetCamera;
    // -- set
    const setInteractiveQuality = view.setInteractiveQuality;
    const setInteractiveRatio = view.setInteractiveRatio;
    const setStillQuality = view.setStillQuality;
    const setStillRatio = view.setStillRatio;
    // -- get
    const getInteractiveQuality = view.getInteractiveQuality;
    const getInteractiveRatio = view.getInteractiveRatio;
    const getStillQuality = view.getStillQuality;
    const getStillRatio = view.getStillRatio;

    // Attach listeners
    const interactor = view.getInteractor();
    const subscriptions = [];
    props.interactorEvents.forEach((name) => {
      const key = `on${name}`;
      subscriptions.push(interactor[key]((e) => emit(name, e)));
    });

    // Box selection
    const interactorManipulator = vtkInteractorStyleManipulator.newInstance({
      enabled: props.boxSelection,
    });
    const interactorBoxSelection = vtkMouseBoxSelectorManipulator.newInstance({
      button: 1,
    });
    interactorManipulator.addMouseManipulator(interactorBoxSelection);
    subscriptions.push(
      interactorBoxSelection.onBoxSelectChange(({ container, selection }) => {
        if (container) {
          const { width, height } = container.getBoundingClientRect();
          emit("BoxSelection", {
            selection,
            size: [width, height],
            mode: "remote",
          });
        }
      })
    );
    interactorManipulator.setInteractor(interactor);

    function resize() {
      const canvas = view.getCanvasView();
      const [w, h] = canvas.getSize();
      canvas.setSize(w + 2, h + 2); // make sure we force a resize
      nextTick(view.resize);
    }

    // onMounted
    onMounted(() => {
      const container = unref(vtkContainer);
      console.log("container for view", container);
      view.setContainer(container);
      interactorBoxSelection.setContainer(container);
      interactorBoxSelection.setBoxChangeOnClick(props.enablePicking);

      const session = client.getConnection().getSession();
      view.setSession(session);
      view.setViewId(props.viewId);
      view.resize();
      connected.value = true;

      // Resize handling
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(view.resize);
        resizeObserver.observe(container);
      } else {
        // Old browser sucks...
        window.addEventListener("resize", view.resize);
      }

      view.render();
    });

    // onBeforeUnmout
    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      } else {
        window.removeEventListener("resize", view.resize);
      }

      while (subscriptions.length) {
        subscriptions.pop().unsubscribe();
      }
      interactorManipulator.setEnabled(false);
      interactorManipulator.delete();
      interactorBoxSelection.delete();
      view.delete();
    });

    // watch
    watch(
      () => props.viewId,
      (viewId) => {
        if (connected.value) {
          view.setViewId(unref(viewId));
          view.resize();
        }
      }
    );
    watch(
      () => props.visible,
      (visible) => {
        console.log("remote visible", visible);
        if (unref(visible)) {
          resize();
        }
      }
    );
    watch(
      () => props.enablePicking,
      (value) => {
        view.getInteractorStyle().setSendMouseMove(value);
        interactorBoxSelection.setBoxChangeOnClick(value);
      }
    );
    watch(
      () => props.interactiveRatio,
      (value) => {
        view.setInteractiveRatio(value);
      }
    );
    watch(
      () => props.interactiveQuality,
      (value) => {
        view.setInteractiveQuality(value);
      }
    );
    watch(
      () => props.stillRatio,
      (value) => {
        view.setStillRatio(value);
      }
    );
    watch(
      () => props.stillQuality,
      (value) => {
        view.setStillQuality(value);
      }
    );
    watch(
      () => props.boxSelection,
      (value) => {
        interactorManipulator.setEnabled(value);
      }
    );

    return {
      // data
      connected,
      // ref
      vtkContainer,
      // methods
      render,
      resetCamera,
      resize,
      setInteractiveQuality,
      setInteractiveRatio,
      setStillQuality,
      setStillRatio,
      getInteractiveQuality,
      getInteractiveRatio,
      getStillQuality,
      getStillRatio,
    };
  },
  template: `
    <div style="position:relative;width:100%;height:100%;z-index:0;">
      <div ref="vtkContainer" style="position:absolute;width:100%;height:100%;overflow:hidden;" />
      <slot style="display: none;"></slot>
    </div>
  `,
};
