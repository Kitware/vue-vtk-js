// Ensure vtk.js classes available for Algorithm and Reader
import './AvailableClasses';
import components from './components';

import SmartConnect from 'wslink/src/SmartConnect';
import WSLinkClient from 'vtk.js/Sources/IO/Core/WSLinkClient';
WSLinkClient.setSmartConnectClass(SmartConnect);

export const vtkWSLinkClient = WSLinkClient;

export default {
  install(Vue) {
    Object.keys(components).forEach((name) => {
      Vue.component(name, components[name]);
    });
  },
};
