// List classes that we want to have available
// => this is required because of tree shacking

// Rendering profiles
import "@kitware/vtk.js/Rendering/OpenGL/Profiles/All";

// Data access helper
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper";

// Sources
import "@kitware/vtk.js/Filters/Sources/ConcentricCylinderSource";
import "@kitware/vtk.js/Filters/Sources/ConeSource";
import "@kitware/vtk.js/Filters/Sources/CubeSource";
import "@kitware/vtk.js/Filters/Sources/CylinderSource";
import "@kitware/vtk.js/Filters/Sources/LineSource";
import "@kitware/vtk.js/Filters/Sources/PlaneSource";
import "@kitware/vtk.js/Filters/Sources/PointSource";
import "@kitware/vtk.js/Filters/Sources/SphereSource";

// Filters
import "@kitware/vtk.js/Filters/General/WarpScalar";
import "@kitware/vtk.js/Filters/General/TubeFilter";

// Readers
import "@kitware/vtk.js/IO/Geometry/PLYReader";
import "@kitware/vtk.js/IO/Geometry/STLReader";
import "@kitware/vtk.js/IO/Misc/ElevationReader";
import "@kitware/vtk.js/IO/Misc/OBJReader";
// bring pdb definition (big)
import "@kitware/vtk.js/IO/Misc/PDBReader";
// bring zip (big++)
import "@kitware/vtk.js/IO/XML/XMLImageDataReader";
import "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
