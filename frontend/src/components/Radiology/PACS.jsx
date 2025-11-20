import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Clock, Eye, FileText, Monitor, Camera, AlertCircle, CheckCircle, 
  Calendar, User, ChevronDown, ChevronUp, SortAsc, SortDesc, Pause, Play, Flag, 
  X, Users, TrendingUp, Activity, BarChart3, PieChart, ArrowUp, ArrowDown,
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize, Minimize, Move, Square,
  Circle, Ruler, MousePointer, Save, Download, Share, Settings, Info,
  ChevronLeft, ChevronRight, SkipBack, SkipForward, Volume2, VolumeX,
  Contrast, Sun, Sliders, Grid3X3, Layout, Layers, Target
} from 'lucide-react';
// Import the radiology header component
import RadiologyHeader from './header';
import { getPACSStudies, getPACSStudyDetails, getPACSSeries, getPACSImages, getPACSStats, savePACSAnnotations, getPACSAnnotations } from '../../services/radiologyService';

const PACSViewer = () => {
  const [currentStudy, setCurrentStudy] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [activeTool, setActiveTool] = useState('pointer');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [layout, setLayout] = useState('single'); // single, quad, compare
  const [measurements, setMeasurements] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const viewerRef = useRef(null);

  // API data state
  const [pacsStudies, setPacsStudies] = useState([]);
  const [pacsStats, setPacsStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    modality: 'all',
    bodyPart: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    size: 50,
    total: 0
  });

  // Fetch PACS data from API
  useEffect(() => {
    let mounted = true;
    const fetchPACSData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [studiesData, statsData] = await Promise.all([
          getPACSStudies({
            modality: filters.modality === 'all' ? undefined : filters.modality,
            bodyPart: filters.bodyPart === 'all' ? undefined : filters.bodyPart,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            search: filters.search || undefined,
            page: pagination.page,
            size: pagination.size
          }),
          getPACSStats()
        ]);
        
        if (mounted) {
          setPacsStudies(studiesData.items || []);
          setPacsStats(statsData);
          setPagination(prev => ({
            ...prev,
            total: studiesData.total || 0
          }));
          
          // Set first study as current if available
          if (studiesData.items && studiesData.items.length > 0) {
            setCurrentStudy(studiesData.items[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching PACS data:', err);
        if (mounted) {
          setError(err.message);
          setPacsStudies([]);
          setPacsStats({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPACSData();
    return () => { mounted = false };
  }, [filters, pagination.page, pagination.size]);

  // Mock study data for fallback
  const mockStudy = {
    id: 'RAD-001',
    accessionNumber: 'ACC2025001',
    patientName: 'Smith, John',
    patientId: 'P-12345',
    mrn: 'MRN001234',
    age: 45,
    gender: 'M',
    dob: '1980-03-15',
    studyDate: '2025-06-29T09:00:00',
    modality: 'CT',
    bodyPart: 'Chest',
    studyDescription: 'CT Chest W/O Contrast',
    indication: 'Chest pain, rule out pulmonary embolism',
    series: [
      {
        id: 'S001',
        seriesNumber: 1,
        description: 'Axial Images',
        imageCount: 156,
        sliceThickness: '1.25mm',
        images: Array.from({ length: 156 }, (_, i) => ({
          id: `IMG-${i + 1}`,
          instanceNumber: i + 1,
          position: `${i * 1.25}mm`,
          acquisitionTime: '09:15:30'
        }))
      },
      {
        id: 'S002',
        seriesNumber: 2,
        description: 'Coronal Reconstruction',
        imageCount: 89,
        sliceThickness: '2.5mm',
        images: Array.from({ length: 89 }, (_, i) => ({
          id: `COR-${i + 1}`,
          instanceNumber: i + 1,
          position: `${i * 2.5}mm`,
          acquisitionTime: '09:16:45'
        }))
      },
      {
        id: 'S003',
        seriesNumber: 3,
        description: 'Sagittal Reconstruction',
        imageCount: 67,
        sliceThickness: '2.5mm',
        images: Array.from({ length: 67 }, (_, i) => ({
          id: `SAG-${i + 1}`,
          instanceNumber: i + 1,
          position: `${i * 2.5}mm`,
          acquisitionTime: '09:17:20'
        }))
      }
    ]
  };

  // Use currentStudy from API data or fallback to mock
  const study = currentStudy || mockStudy;

  // PACS Tools
  const tools = [
    { id: 'pointer', name: 'Pointer', icon: MousePointer },
    { id: 'zoom', name: 'Zoom', icon: ZoomIn },
    { id: 'pan', name: 'Pan', icon: Move },
    { id: 'windowing', name: 'Windowing', icon: Contrast },
    { id: 'measure', name: 'Measure', icon: Ruler },
    { id: 'angle', name: 'Angle', icon: Target },
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'circle', name: 'Circle', icon: Circle }
  ];

  // Window/Level presets for CT
  const windowPresets = [
    { name: 'Lung', center: -600, width: 1600 },
    { name: 'Mediastinum', center: 50, width: 350 },
    { name: 'Bone', center: 300, width: 1500 },
    { name: 'Soft Tissue', center: 40, width: 400 },
    { name: 'Brain', center: 40, width: 80 },
    { name: 'Liver', center: 60, width: 160 }
  ];

  // Tool functions
  const handleZoom = (direction) => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 25, 500));
    } else {
      setZoomLevel(prev => Math.max(prev - 25, 25));
    }
  };

  const handleRotate = (direction) => {
    setRotation(prev => direction === 'cw' ? prev + 90 : prev - 90);
  };

  const resetView = () => {
    setZoomLevel(100);
    setRotation(0);
    setBrightness(0);
    setContrast(0);
  };

  const handleImageNavigation = (direction) => {
    const currentSeriesData = study?.series[currentSeries];
    if (!currentSeriesData) return;

    if (direction === 'next') {
      setCurrentImage(prev => Math.min(prev + 1, currentSeriesData.imageCount - 1));
    } else {
      setCurrentImage(prev => Math.max(prev - 1, 0));
    }
  };

  const handleStudySelect = async (studyId) => {
    try {
      const studyData = await getPACSStudyDetails(studyId);
      if (studyData) {
        setCurrentStudy(studyData);
        setCurrentSeries(0);
        setCurrentImage(0);
      }
    } catch (err) {
      console.error('Error loading study details:', err);
    }
  };

  const handleSaveAnnotations = async () => {
    if (!study || !study.series[currentSeries]) return;
    
    try {
      const currentSeriesData = study.series[currentSeries];
      const currentImageData = currentSeriesData.images[currentImage];
      
      await savePACSAnnotations(
        study.id,
        currentSeriesData.id,
        currentImageData.id,
        { measurements, annotations }
      );
      
      console.log('Annotations saved successfully');
    } catch (err) {
      console.error('Error saving annotations:', err);
    }
  };

  const handleLoadAnnotations = async () => {
    if (!study || !study.series[currentSeries]) return;
    
    try {
      const currentSeriesData = study.series[currentSeries];
      const currentImageData = currentSeriesData.images[currentImage];
      
      const annotationsData = await getPACSAnnotations(
        study.id,
        currentSeriesData.id,
        currentImageData.id
      );
      
      if (annotationsData && annotationsData.length > 0) {
        setAnnotations(annotationsData);
      }
    } catch (err) {
      console.error('Error loading annotations:', err);
    }
  };

  const handleSeriesChange = (seriesIndex) => {
    setCurrentSeries(seriesIndex);
    setCurrentImage(0);
  };

  const handlePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Header Component
  const PACSHeader = () => (
    <div className="bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-blue-400" />
            <span className="font-semibold">PACS Viewer</span>
          </div>
          {study && (
            <div className="text-sm">
              <span className="text-gray-300">{study.patientName}</span>
              <span className="mx-2">•</span>
              <span className="text-gray-300">{study.studyDescription}</span>
              <span className="mx-2">•</span>
              <span className="text-gray-400">{study.accessionNumber}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-700 rounded">
              <Save className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded">
              <Share className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <button className="p-2 hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Study Selection and Filtering */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search studies..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="bg-gray-800 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        
        <select
          value={filters.modality}
          onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
          className="bg-gray-800 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Modalities</option>
          <option value="CT">CT</option>
          <option value="MRI">MRI</option>
          <option value="XR">X-Ray</option>
          <option value="US">Ultrasound</option>
        </select>
        
        <select
          value={filters.bodyPart}
          onChange={(e) => setFilters(prev => ({ ...prev, bodyPart: e.target.value }))}
          className="bg-gray-800 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Body Parts</option>
          <option value="Head">Head</option>
          <option value="Chest">Chest</option>
          <option value="Abdomen">Abdomen</option>
          <option value="Pelvis">Pelvis</option>
          <option value="Extremities">Extremities</option>
        </select>
        
        <div className="text-sm text-gray-400">
          {pacsStudies.length} studies loaded
        </div>
      </div>
    </div>
  );

  // Toolbar Component
  const Toolbar = () => (
    <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
      <div className="flex items-center space-x-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${
              activeTool === tool.id ? 'bg-blue-600' : ''
            }`}
            title={tool.name}
          >
            <tool.icon className="w-4 h-4" />
          </button>
        ))}
        
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
        <button
          onClick={() => handleZoom('in')}
          className="p-2 hover:bg-gray-700 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 hover:bg-gray-700 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
        <button
          onClick={() => handleRotate('ccw')}
          className="p-2 hover:bg-gray-700 rounded"
          title="Rotate Left"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleRotate('cw')}
          className="p-2 hover:bg-gray-700 rounded"
          title="Rotate Right"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
        <button
          onClick={resetView}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          Reset
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-300">Layout:</span>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            <option value="single">Single</option>
            <option value="quad">Quad</option>
            <option value="compare">Compare</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-300">Zoom:</span>
          <span className="text-xs text-white min-w-12">{zoomLevel}%</span>
        </div>
      </div>
    </div>
  );

  // Series Panel Component
  const SeriesPanel = () => (
    <div className="bg-gray-100 border-r border-gray-300 w-80 flex flex-col">
      {/* Studies List */}
      <div className="p-3 bg-gray-200 border-b border-gray-300">
        <h3 className="font-semibold text-gray-800">Studies</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {pacsStudies.map((studyItem) => (
          <div
            key={studyItem.id}
            onClick={() => handleStudySelect(studyItem.id)}
            className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${
              study?.id === studyItem.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="font-medium text-gray-900 text-sm">
              {studyItem.patientName}
            </div>
            <div className="text-xs text-gray-600">{studyItem.studyDescription}</div>
            <div className="text-xs text-gray-500 mt-1">
              {studyItem.modality} • {studyItem.bodyPart} • {studyItem.accessionNumber}
            </div>
          </div>
        ))}
      </div>
      
      {/* Series List */}
      {study && (
        <>
          <div className="p-3 bg-gray-200 border-b border-gray-300 border-t border-gray-300">
            <h3 className="font-semibold text-gray-800">Series</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {study.series.map((series, index) => (
              <div
                key={series.id}
                onClick={() => handleSeriesChange(index)}
                className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${
                  currentSeries === index ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="font-medium text-gray-900">
                  Series {series.seriesNumber}
                </div>
                <div className="text-sm text-gray-600">{series.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {series.imageCount} images • {series.sliceThickness}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Thumbnails */}
      <div className="border-t border-gray-300 p-2">
        <div className="text-xs text-gray-600 mb-2">Thumbnails</div>
        <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
          {currentStudy?.series[currentSeries]?.images.slice(0, 20).map((image, index) => (
            <div
              key={image.id}
              onClick={() => setCurrentImage(index)}
              className={`aspect-square bg-gray-300 rounded cursor-pointer border-2 ${
                currentImage === index ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Window/Level Panel Component
  const WindowLevelPanel = () => (
    <div className="bg-gray-100 border-l border-gray-300 w-64 flex flex-col">
      <div className="p-3 bg-gray-200 border-b border-gray-300">
        <h3 className="font-semibold text-gray-800">Window/Level</h3>
      </div>
      
      <div className="p-3 space-y-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Presets</label>
          <div className="space-y-1">
            {windowPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setWindowCenter(preset.center);
                  setWindowWidth(preset.width);
                }}
                className="w-full text-left px-2 py-1 text-xs bg-white hover:bg-blue-50 rounded border"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Window Center: {windowCenter}
          </label>
          <input
            type="range"
            min="-1000"
            max="1000"
            value={windowCenter}
            onChange={(e) => setWindowCenter(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Window Width: {windowWidth}
          </label>
          <input
            type="range"
            min="1"
            max="2000"
            value={windowWidth}
            onChange={(e) => setWindowWidth(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Brightness: {brightness}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Contrast: {contrast}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="p-3 border-t border-gray-300">
        <h4 className="font-medium text-gray-800 mb-2">Overlays</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showMeasurements}
              onChange={(e) => setShowMeasurements(e.target.checked)}
              className="mr-2"
            />
            <span className="text-xs">Measurements</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showAnnotations}
              onChange={(e) => setShowAnnotations(e.target.checked)}
              className="mr-2"
            />
            <span className="text-xs">Annotations</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="mr-2"
            />
            <span className="text-xs">Grid</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInfo}
              onChange={(e) => setShowInfo(e.target.checked)}
              className="mr-2"
            />
            <span className="text-xs">Image Info</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Image Controls Component
  const ImageControls = () => (
    <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => handleImageNavigation('prev')}
          className="p-2 hover:bg-gray-700 rounded"
          disabled={currentImage === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayback}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
        
        <button
          onClick={() => handleImageNavigation('next')}
          className="p-2 hover:bg-gray-700 rounded"
          disabled={currentImage === (currentStudy?.series[currentSeries]?.imageCount - 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-xs">
          Image {currentImage + 1} of {currentStudy?.series[currentSeries]?.imageCount}
        </div>
        
        <div className="text-xs text-gray-300">
          Series {currentStudy?.series[currentSeries]?.seriesNumber}
        </div>
      </div>
    </div>
  );

  const ViewerCanvas = () => (
    <div className="flex-1 bg-black relative overflow-hidden">
      <iframe
        src={`http://localhost:3001/viewer?StudyInstanceUID=1.2.840.113619.2.55.3.2831164352.781.1591788880.467`}
        className="w-full h-full border-none"
        title="OHIF DICOM Viewer"
      />
    </div>
  );

  // Main Component Return
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <RadiologyHeader />
      <PACSHeader />
      <Toolbar />
      
      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PACS data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center mb-4">
              <X className="w-5 h-5 text-red-500 mr-2" />
              <h3 className="text-sm font-medium text-red-800">Error loading PACS data</h3>
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Main PACS Interface */}
      {!loading && !error && (
        <div className="flex-1 flex overflow-hidden">
          <SeriesPanel />
          
          <div className="flex-1 flex flex-col">
            <ViewerCanvas />
            <ImageControls />
          </div>
          
          <WindowLevelPanel />
        </div>
      )}
    </div>
  );
};

export default PACSViewer;