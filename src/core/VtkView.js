import { ref, provide, nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { ClientView, enableResetCamera } from "./localview";

export default {
  props: {
    background: {
      type: Array,
      default: () => [0.2, 0.3, 0.4],
    },
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
  emits: [
    "resize",
    "resetCamera",
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
    const vtkContainer = ref(null);

    // Create VTK stuff
    const view = new ClientView(
      props.background,
      props.pickingModes,
      props.interactorSettings,
      props.interactorEvents,
      { emit, nextTick }
    );
    const { onEnter, onLeave, onKeyUp } = enableResetCamera(view);
    const resizeObserver = new ResizeObserver(() => view.resize());

    onMounted(() => {
      const container = vtkContainer.value;
      view.setContainer(container);
      resizeObserver.observe(container);
      document.addEventListener("keyup", onKeyUp);
    });

    onBeforeUnmount(() => {
      view.beforeDelete();
      document.removeEventListener("keyup", onKeyUp);
      resizeObserver.disconnect();
    });

    // React to changes on settings
    watch(
      () => props.interactorSettings,
      () => view.updateStyle(props.interactorSettings)
    );
    watch(
      () => props.pickingModes,
      () => (view.pickingModes = props.pickingModes)
    );

    provide("view", view);
    const { onClick, onMouseMove } = view;
    const resetCamera = () => view.resetCamera();
    return {
      vtkContainer,
      onEnter,
      onLeave,
      onClick,
      onMouseMove,
      resetCamera,
    };
  },
  template: `
        <div
          style="position:relative;width:100%;height:100%;"
          @mouseenter="onEnter"
          @mouseleave="onLeave"
          @click="onClick"
          @mousemove="onMouseMove"
        >
          <div
            ref="vtkContainer"
            style="position:absolute;width:100%;height:100%;overflow:hidden;"
          />
          <slot style="display: none;"></slot>
        </div>
      `,
};
