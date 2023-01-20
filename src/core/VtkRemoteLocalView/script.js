import VtkRemoteView from '../VtkRemoteView';
import VtkSyncView from '../VtkSyncView';

const BOTTOM_Z_INDEX = { position: 'absolute !important', left: '-20000px' };
const TOP_Z_INDEX = { position: 'absolute !important', left: 0 };

export default {
  name: 'VtkRemoteLocalView',
  components: {
    VtkRemoteView,
    VtkSyncView,
  },
  props: {
    mode: {
      type: String,
      default: 'local',
    },
    disableAutoSwitch: {
      type: Boolean,
      default: false,
    },
    namespace: {
      type: String,
      default: '',
    },
    refPrefix: {
      type: String,
      default: 'refName',
    },
    viewId: {
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
          shift: true,
        },
        {
          button: 1,
          action: 'Zoom',
          alt: true,
        },
        {
          button: 1,
          action: 'Zoom',
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
    contextName: {
      type: String,
      default: 'LocalRenderingContext',
    },
    enablePicking: {
      type: Boolean,
      default: false,
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
    viewState: {
      // Only used at mount time
      type: Object,
    },
  },
  data() {
    return {
      localRenderingReady: false,
    };
  },
  watch: {
    viewId(viewId) {
      this.$refs[`${this.refPrefix}_localView`].setSynchronizedViewId(viewId);
    },
  },
  computed: {
    computedLocalRenderingReady() {
      return this.disableAutoSwitch || this.localRenderingReady;
    },
    localStyle() {
      const useLocal =
        this.mode === 'local' && this.computedLocalRenderingReady;
      return useLocal ? TOP_Z_INDEX : BOTTOM_Z_INDEX;
    },
    remoteStyle() {
      const useRemote =
        this.mode === 'remote' || !this.computedLocalRenderingReady;
      return useRemote ? TOP_Z_INDEX : BOTTOM_Z_INDEX;
    },
    cameraKey() {
      if (this.namespace) {
        return `${this.namespace}Camera`;
      }
      return 'camera';
    },
  },
  methods: {
    resetCamera() {
      if (this.mode === 'local' && this.computedLocalRenderingReady) {
        return this.$refs[`${this.refPrefix}_localView`].resetCamera();
      }
      return this.$refs[`${this.refPrefix}_remoteView`].resetCamera();
    },
    getCamera() {
      return this.$refs[`${this.refPrefix}_localView`].getCamera();
    },
    setCamera(props) {
      return this.$refs[`${this.refPrefix}_localView`].setCamera(props);
    },
    resize() {
      this.$refs[`${this.refPrefix}_localView`].resize();
      this.$refs[`${this.refPrefix}_remoteView`].resize();
    },
    async trigger(name, args = [], kwargs = {}) {
      return this.trame.trigger(name, args, kwargs);
    },
  },
  inject: ['trame'],
};
