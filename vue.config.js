const vtkChainWebpack = require('vtk.js/Utilities/config/chainWebpack');

module.exports = {
  configureWebpack: {
    output: {
      libraryExport: 'default'
    }
  },
  chainWebpack: (config) => {
    // Add vtk.js rules
    vtkChainWebpack(config);
  },
};
