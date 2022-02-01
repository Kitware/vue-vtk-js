import vtkRemoteView from 'vtk.js/Sources/Rendering/Misc/RemoteView';
import vtkMouseBoxSelectorManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseBoxSelectorManipulator';
import vtkInteractorStyleManipulator from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator';

export default {
  name: 'VtkRemoteView',
  props: {
    id: {
      type: String,
      default: '-1',
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
      default: () => ['EndAnimation'],
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
  data() {
    return {
      connected: false,
    };
  },
  created() {
    if (!this.wsClient) {
      throw new Error('VtkRemoteView can not be created without a wsClient');
    }

    const viewStream = this.wsClient.getImageStream().createViewStream(this.id);

    this.view = vtkRemoteView.newInstance({
      rpcWheelEvent: 'viewport.mouse.zoom.wheel',
      viewStream,
    });
    if (this.interactiveRatio) {
      this.view.setInteractiveRatio(Number(this.interactiveRatio));
    }
    if (this.interactiveQuality) {
      this.view.setInteractiveQuality(Number(this.interactiveQuality));
    }
    if (this.stillRatio) {
      this.view.setStillRatio(Number(this.stillRatio));
    }
    if (this.stillQuality) {
      this.view.setStillQuality(Number(this.stillQuality));
    }

    // Bind remote view method to component
    this.resize = this.view.resize;
    this.render = this.view.render;
    this.resetCamera = this.view.resetCamera;
    // -- set
    this.setInteractiveQuality = this.view.setInteractiveQuality;
    this.setInteractiveRatio = this.view.setInteractiveRatio;
    this.setStillQuality = this.view.setStillQuality;
    this.setStillRatio = this.view.setStillRatio;
    // -- get
    this.getInteractiveQuality = this.view.getInteractiveQuality;
    this.getInteractiveRatio = this.view.getInteractiveRatio;
    this.getStillQuality = this.view.getStillQuality;
    this.getStillRatio = this.view.getStillRatio;

    // Attach listeners
    const interactor = this.view.getInteractor();
    this.subscriptions = [];
    this.interactorEvents.forEach((name) => {
      const key = `on${name}`;
      this.subscriptions.push(interactor[key]((e) => this.$emit(key, e)));
    });

    // Box selection
    this.interactorManipulator = vtkInteractorStyleManipulator.newInstance({
      enabled: this.boxSelection,
    });
    this.interactorBoxSelection = vtkMouseBoxSelectorManipulator.newInstance({
      button: 1,
    });
    this.interactorManipulator.addMouseManipulator(this.interactorBoxSelection);
    this.subscriptions.push(
      this.interactorBoxSelection.onBoxSelectChange(
        ({ container, selection }) => {
          if (container) {
            const { width, height } = container.getBoundingClientRect();
            this.$emit('BoxSelection', {
              selection,
              size: [width, height],
              mode: 'remote',
            });
          }
        }
      )
    );
    this.interactorManipulator.setInteractor(interactor);
  },
  mounted() {
    const container = this.$refs.vtkContainer;
    this.view.setContainer(container);
    this.interactorBoxSelection.setContainer(container);

    const session = this.wsClient.getConnection().getSession();
    this.view.setSession(session);
    this.view.setViewId(this.id);
    this.view.resize();
    this.connected = true;

    // Resize handling
    this.resizeObserver = new ResizeObserver(this.view.resize);
    this.resizeObserver.observe(this.$refs.vtkContainer);

    this.view.render();
  },
  watch: {
    id(id) {
      if (this.connected) {
        this.view.setViewId(id);
        this.view.resize();
      }
    },
    visible(v) {
      if (v) {
        const view = this.view.getCanvasView();
        const [w, h] = view.getSize();
        view.setSize(w + 2, h + 2); // make sure we force a resize
        this.$nextTick(this.view.resize);
      }
    },
    enablePicking(value) {
      this.view.getInteractorStyle().setSendMouseMove(value);
    },
    interactiveRatio(value) {
      this.view.setInteractiveRatio(Number(value));
    },
    interactiveQuality(value) {
      this.view.setInteractiveQuality(Number(value));
    },
    stillRatio(value) {
      this.view.setStillRatio(Number(value));
    },
    stillQuality(value) {
      this.view.setStillQuality(Number(value));
    },
    boxSelection(v) {
      this.interactorManipulator.setEnabled(v);
    },
  },
  methods: {
    resize() {
      this.view.resize();
    },
  },
  beforeDestroy() {
    // Stop size listening
    this.resizeObserver.disconnect();
    this.resizeObserver = null;

    while (this.subscriptions.length) {
      this.subscriptions.pop().unsubscribe();
    }
    this.interactorManipulator.setEnabled(false);
    this.interactorManipulator.delete();
    this.interactorManipulator = null;
    this.interactorBoxSelection.delete();
    this.interactorBoxSelection = null;
    this.view.delete();
    this.view = null;
  },
};
