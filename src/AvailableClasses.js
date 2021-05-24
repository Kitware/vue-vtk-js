// List classes that we want to have available
// => this is required because of tree shacking

// Rendering profiles
import 'vtk.js/Sources/Rendering/OpenGL/Profiles/Geometry';
import 'vtk.js/Sources/Rendering/OpenGL/Profiles/Glyph';
import 'vtk.js/Sources/Rendering/OpenGL/Profiles/Molecule';

// Data access helper
import 'vtk.js/Sources/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import 'vtk.js/Sources/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

// Sources
import 'vtk.js/Sources/Filters/Sources/ConcentricCylinderSource';
import 'vtk.js/Sources/Filters/Sources/ConeSource';
import 'vtk.js/Sources/Filters/Sources/CubeSource';
import 'vtk.js/Sources/Filters/Sources/CylinderSource';
import 'vtk.js/Sources/Filters/Sources/LineSource';
import 'vtk.js/Sources/Filters/Sources/PlaneSource';
import 'vtk.js/Sources/Filters/Sources/PointSource';
import 'vtk.js/Sources/Filters/Sources/SphereSource';

// Filters
import 'vtk.js/Sources/Filters/General/WarpScalar';
import 'vtk.js/Sources/Filters/General/TubeFilter';

// Readers
import 'vtk.js/Sources/IO/Geometry/PLYReader';
import 'vtk.js/Sources/IO/Geometry/STLReader';
import 'vtk.js/Sources/IO/Misc/ElevationReader';
import 'vtk.js/Sources/IO/Misc/OBJReader';
// bring pdb definition (big)
import 'vtk.js/Sources/IO/Misc/PDBReader';
// bring zip (big++)
import 'vtk.js/Sources/IO/XML/XMLImageDataReader';
import 'vtk.js/Sources/IO/XML/XMLPolyDataReader';
