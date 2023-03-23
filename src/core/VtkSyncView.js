import {
  ref,
  inject,
  provide,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";

import { LocalView, enableResetCamera } from "./localview";

export default {
  props: {
    camera: {
      type: Object,
      default: null,
    },
    interactorEvents: {
      type: Array,
      default: () => ["EndAnimation"],
    },
    interactorSettings: {
      type: Array,
      default: () => [
        {
          button: 1,
          action: "Rotate",
        },
        {
          button: 2,
          action: "Pan",
        },
        {
          button: 3,
          action: "Zoom",
          scrollEnabled: true,
        },
        {
          button: 1,
          action: "Pan",
          alt: true,
        },
        {
          button: 1,
          action: "Zoom",
          control: true,
        },
        {
          button: 1,
          action: "Select",
          shift: true,
        },
        {
          button: 1,
          action: "Roll",
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
      default: "LocalRenderingContext",
    },
    viewState: {
      // Only used at mount time
      type: Object,
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "resetCamera",
    "beforeSceneLoaded",
    "afterSceneLoaded",
    "viewStateChange",
    "onReady",
    "resize",
    "onImageCapture",
    //
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
    const trame = inject("trame");
    const ready = ref(false);
    const vtkContainer = ref(null);
    let idChanged = false;

    const client = computed(() => {
      return props.wsClient || trame?.client;
    });

    // Come up with a getArray implementation
    let getArray = () => Promise.resolve(null);
    const session = client.value?.getConnection()?.getSession();
    if (session) {
      getArray = (hash, binary) =>
        session.call("viewport.geometry.array.get", [hash, binary]);
    }
    if (client.value.getRemote()?.SyncView?.getArray) {
      getArray = client.value.getRemote()?.SyncView?.getArray;
    }

    // Create VTK stuff
    const view = new LocalView(
      props.contextName,
      getArray,
      props.interactorEvents,
      { emit, nextTick, ready }
    );
    view.updateStyle(props.interactorSettings, onBoxSelectChange);
    const { onEnter, onLeave, onKeyUp } = enableResetCamera(view);
    const resizeObserver = new ResizeObserver(() => view.resize());

    function onBoxSelectChange({ container, selection }) {
      if (!props.boxSelection || !container) {
        return;
      }
      // Share the selection with the rest of the world
      emit("BoxSelection", {
        selection,
        mode: "local",
        size: view.openglRenderWindow.getSize(),
        camera: view.getCamera(),
      });
    }

    watch(ready, (v) => {
      emit("onReady", v);
    });

    watch(
      () => props.interactorSettings,
      () => view.updateStyle(props.interactorSettings, onBoxSelectChange)
    );
    watch(
      () => props.viewState,
      ({ id }) => {
        if (id === idChanged) {
          idChanged = false;
          view.updateViewState(props.viewState);
        }
      }
    );

    let wsSubscription = null;
    onMounted(() => {
      const container = vtkContainer.value;
      view.setContainer(container);
      resizeObserver.observe(container);
      document.addEventListener("keyup", onKeyUp);

      if (props.viewState) {
        view.rwId = props.viewState.id;
        view.updateViewState(props.viewState);
      }

      wsSubscription = client.value
        .getConnection()
        .getSession()
        .subscribe("trame.vtk.delta", ([deltaState]) => {
          if (deltaState.id === view.rwId) {
            view.updateViewState(deltaState);
          }
        });
    });

    onBeforeUnmount(() => {
      view.beforeDelete();

      if (wsSubscription && client.value) {
        client.value
          .getConnection()
          .getSession()
          .unsubscribe(wsSubscription);
        wsSubscription = null;
      }

      document.removeEventListener("keyup", onKeyUp);
      // Stop size listening
      resizeObserver.disconnect();
    });

    provide("view", view);

    const captureImage = async (format = "image/png", opts = {}) => {
      const img = await view.captureImage(format, opts);
      const response = await fetch(img);
      const blob = await response.blob();
      emit("onImageCapture", blob);
      return blob;
    };
    const resetCamera = () => view.resetCamera();
    const getCamera = () => view.getCamera();
    const setCamera = (v) => view.setCamera(v);
    const setSynchronizedViewId = (v) => {
      idChanged = v;
      if (typeof props.viewState.id === "number") {
        idChanged = Number(idChanged);
      }
      view.setSynchronizedViewId(idChanged);
    };
    const resize = () => view.resize();
    return {
      vtkContainer,
      onEnter,
      onLeave,
      resetCamera,
      getCamera,
      setCamera,
      setSynchronizedViewId,
      resize,
      captureImage,
    };
  },
  template: `
        <div
            style="position:relative;width:100%;height:100%;"
            @mouseenter="onEnter"
            @mouseleave="onLeave"
        >
            <div
              ref="vtkContainer"
              style="position:absolute;width:100%;height:100%;overflow:hidden;"
            />
            <slot style="display: none;"></slot>
        </div>
    `,
};
