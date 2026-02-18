import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Clock, Eye, FileText, Monitor, Camera, AlertCircle, CheckCircle, 
  Calendar, User, ChevronDown, ChevronUp, SortAsc, SortDesc, Pause, Play, Flag, 
  X, Users, TrendingUp, Activity, BarChart3, PieChart, ArrowUp, ArrowDown,
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize, Minimize, Move, Square,
  Circle, Ruler, MousePointer, Save, Download, Share, Settings, Info,
  ChevronLeft, ChevronRight, SkipBack, SkipForward, Volume2, VolumeX,
  Contrast, Sun, Sliders, Grid3X3, Layout, Layers, Target, ArrowLeft
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
// Import the radiology header component
import RadiologyHeader from './header';
import { getPACSStudies, getPACSStudyDetails, getPACSSeries, getPACSImages, getPACSStats, savePACSAnnotations, getPACSAnnotations } from '../../services/radiologyService';

// OHIF Base URL - should be configured in .env file as VITE_OHIF_URL
// Default to localhost:3000 if not set
const getOHIFBaseURL = () => {
  const envUrl = import.meta.env.VITE_OHIF_URL;
  if (envUrl) {
    // Ensure it ends with a slash
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  // Default fallback
  return 'http://localhost:3000/';
};

const PACSViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ohifBaseUrl = getOHIFBaseURL();
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
  const [selectedStudyInstanceUID, setSelectedStudyInstanceUID] = useState(null);
  const [ohifUrl, setOhifUrl] = useState(ohifBaseUrl);
  const [ohifError, setOhifError] = useState(null);
  const [loadingOhifStudy, setLoadingOhifStudy] = useState(false);
  const [iframeLoadError, setIframeLoadError] = useState(false);
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

  // Initialize OHIF URL on component mount and handle studyInstanceUID from navigation
  useEffect(() => {
    // Check if studyInstanceUID or orthancStudyId was passed via navigation state
    const state = location.state;
    setLoadingOhifStudy(false);
    setIframeLoadError(false);
    setOhifError(null);
    
    if (state) {
      const studyInstanceUID = state.studyInstanceUID;
      const orthancStudyId = state.orthancStudyId;
      
      // Use studyInstanceUID if available (preferred - comes from database)
      if (studyInstanceUID) {
        setSelectedStudyInstanceUID(studyInstanceUID);
        setLoadingOhifStudy(true);
        // OHIF URL format: <baseUrl>viewer?StudyInstanceUIDs=<uid>
        // Use encodeURIComponent to properly encode the UID
        // OHIF base URL should end with a slash, so we don't add another one
        const encodedUID = encodeURIComponent(studyInstanceUID);
        const viewerUrl = `${ohifBaseUrl}viewer?StudyInstanceUIDs=${encodedUID}`;
        
        // Set the URL directly - don't try to verify accessibility (CORS blocks it)
        setOhifUrl(viewerUrl);
        console.log('Opening OHIF with StudyInstanceUID:', studyInstanceUID);
        console.log('OHIF Base URL:', ohifBaseUrl);
        console.log('OHIF Viewer URL:', viewerUrl);
        
        // Set a timeout to clear loading state
        const timeoutId = setTimeout(() => {
          setLoadingOhifStudy(false);
        }, 3000);
        
        return () => clearTimeout(timeoutId);
      } else if (orthancStudyId) {
        // Fallback: if we only have orthancStudyId, we can't verify it from frontend due to CORS
        // Just try to use it directly (some OHIF configs might support this)
        // Note: This is less reliable than using StudyInstanceUID
        console.warn('Using Orthanc study ID directly - StudyInstanceUID preferred');
        const encodedId = encodeURIComponent(orthancStudyId);
        setOhifUrl(`${ohifBaseUrl}viewer?studyId=${encodedId}`);
      } else {
        // No study specified, show study list
        setOhifUrl(ohifBaseUrl);
      }
    } else {
      // Set initial OHIF URL to show study list
      setOhifUrl(ohifBaseUrl);
    }
  }, [location.state, ohifBaseUrl]);

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

  // Fetch StudyInstanceUID from Orthanc for a study
  const fetchStudyInstanceUIDFromOrthanc = async (studyId) => {
    try {
      // Query Orthanc for studies
      const response = await fetch('http://localhost:8042/studies');
      const studyIds = await response.json();
      
      if (!studyIds || studyIds.length === 0) {
        return null;
      }
      
      // If studyId matches an Orthanc study ID directly, use it
      if (studyIds.includes(studyId)) {
        // Get the StudyInstanceUID from the study metadata
        try {
          const studyInfo = await fetch(`http://localhost:8042/studies/${studyId}`);
          const studyData = await studyInfo.json();
          // Orthanc returns StudyInstanceUID in MainDicomTags
          return studyData.MainDicomTags?.StudyInstanceUID || studyId;
        } catch (e) {
          console.warn('Error fetching study metadata:', e);
          return studyId; // Fallback to using the ID directly
        }
      }
      
      // Try to match by accession number or other identifier
      for (const orthancStudyId of studyIds) {
        try {
          const studyInfo = await fetch(`http://localhost:8042/studies/${orthancStudyId}`);
          const studyData = await studyInfo.json();
          
          // Match by accession number, patient ID, or study description
          const accessionNumber = studyData.MainDicomTags?.AccessionNumber;
          const patientId = studyData.MainDicomTags?.PatientID;
          
          if (accessionNumber === studyId || patientId === studyId) {
            return studyData.MainDicomTags?.StudyInstanceUID || orthancStudyId;
          }
        } catch (e) {
          console.warn('Error fetching study info:', e);
        }
      }
      
      // If no match found, use the first study's StudyInstanceUID
      try {
        const firstStudyInfo = await fetch(`http://localhost:8042/studies/${studyIds[0]}`);
        const firstStudyData = await firstStudyInfo.json();
        return firstStudyData.MainDicomTags?.StudyInstanceUID || studyIds[0];
      } catch (e) {
        return studyIds[0]; // Fallback
      }
    } catch (err) {
      console.error('Error fetching StudyInstanceUID from Orthanc:', err);
    }
    return null;
  };

  const handleStudySelect = async (studyId) => {
    try {
      const studyData = await getPACSStudyDetails(studyId);
      if (studyData) {
        setCurrentStudy(studyData);
        setCurrentSeries(0);
        setCurrentImage(0);
        
        // Try to fetch StudyInstanceUID from Orthanc
        const studyInstanceUID = await fetchStudyInstanceUIDFromOrthanc(studyId);
        if (studyInstanceUID) {
          setSelectedStudyInstanceUID(studyInstanceUID);
          // Update OHIF URL to open the specific study
          setOhifUrl(`http://localhost:3000/viewer?StudyInstanceUIDs=${studyInstanceUID}`);
        } else {
          // If no StudyInstanceUID found, just show the study list
          setSelectedStudyInstanceUID(null);
          setOhifUrl('http://localhost:3000');
        }
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

  const ViewerCanvas = () => {
    return (
      <div className="flex-1 bg-black relative overflow-hidden">
        {ohifUrl ? (
          <iframe
            key={ohifUrl} // Force re-render when URL changes
            src={ohifUrl}
            className="w-full h-full border-none"
            title="OHIF DICOM Viewer"
            allow="camera; microphone; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-lg font-semibold mb-2">OHIF Viewer Not Available</p>
              <p className="text-sm text-gray-400">
                Please ensure OHIF is running on http://localhost:3000
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleBack = () => {
    // Navigate to studies page (main radiology page)
    navigate('/radiology/studies');
  };

  // Main Component Return - Only OHIF Viewer with Navbar
  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <RadiologyHeader />
      <div className="flex-1 relative">
        {ohifUrl ? (
          <>
            {/* Back button overlay - positioned at top left of OHIF viewer */}
            <button
              onClick={handleBack}
              className="absolute top-2 left-2 z-20 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <iframe
              key={ohifUrl}
              ref={viewerRef}
              src={ohifUrl}
              className="w-full h-full border-none"
              title="OHIF DICOM Viewer"
              allow="camera; microphone; fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              onLoad={() => {
                // Clear loading state
                setLoadingOhifStudy(false);
                
                // Try to detect if we got a 404 by checking the iframe after a short delay
                // Note: This may not work due to CORS, but we'll try
                setTimeout(() => {
                  try {
                    const iframe = viewerRef.current;
                    if (iframe && iframe.contentWindow) {
                      // Check if we can access the iframe's location (may fail due to CORS)
                      try {
                        const iframeUrl = iframe.contentWindow.location.href;
                        if (iframeUrl.includes('404') || iframeUrl.includes('not-found')) {
                          setOhifError('OHIF returned a 404 error. The /viewer route may not be configured.');
                          setIframeLoadError(true);
                        } else {
                          // If we can access it and it doesn't have 404, assume success
                          setOhifError(null);
                          setIframeLoadError(false);
                        }
                      } catch (e) {
                        // CORS blocked - can't check, but iframe loaded so assume it's OK
                        // User will see 404 in console if it exists
                        console.log('Cannot check iframe content (CORS), but iframe loaded');
                        setOhifError(null);
                        setIframeLoadError(false);
                      }
                    }
                  } catch (e) {
                    // Can't access iframe - that's OK, just log it
                    console.log('Could not check iframe status:', e);
                    setOhifError(null);
                    setIframeLoadError(false);
                  }
                }, 1000);
              }}
              onError={() => {
                // This may not fire for iframes, but we'll try
                console.error('OHIF iframe failed to load');
                setIframeLoadError(true);
                setLoadingOhifStudy(false);
                setOhifError('Failed to load OHIF viewer. Please check if OHIF is running and accessible.');
              }}
            />
            {/* Show a note if trying to open a specific study */}
            {selectedStudyInstanceUID && !ohifError && !iframeLoadError && (
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-10 max-w-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Opening study in OHIF</p>
                    <p className="text-xs text-blue-200 mt-1 truncate">
                      {selectedStudyInstanceUID}
                    </p>
                    {loadingOhifStudy && (
                      <p className="text-xs text-blue-300 mt-1">
                        If you see a 404 error in the console, OHIF may not be configured correctly.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudyInstanceUID(null);
                      setOhifError(null);
                      setIframeLoadError(false);
                      setOhifUrl(ohifBaseUrl);
                    }}
                    className="ml-2 text-blue-200 hover:text-white"
                    title="Close and return to study list"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {/* Show loading indicator when opening a specific study */}
            {loadingOhifStudy && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-10 max-w-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <p>Loading study in OHIF...</p>
                </div>
              </div>
            )}
            
            {/* Show error message if OHIF fails to load or returns 404 */}
            {(ohifError || iframeLoadError) && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-10 max-w-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Failed to load study in OHIF (404 Error)</p>
                    <p className="text-xs text-red-200 mb-3">
                      OHIF returned a 404 error. This usually means:
                    </p>
                    <ul className="text-xs text-red-200 mb-3 list-disc list-inside space-y-1">
                      <li>OHIF is not running on {ohifBaseUrl}</li>
                      <li>OHIF is not configured with the /viewer route</li>
                      <li>OHIF is not connected to Orthanc as a DICOMweb server</li>
                      <li>The study is not accessible via OHIF's configured PACS</li>
                    </ul>
                    <div className="text-xs text-red-100 mb-3 p-2 bg-red-700 rounded">
                      <p className="font-medium mb-1">URL being used:</p>
                      <code className="break-all">{ohifUrl}</code>
                    </div>
                    <div className="text-xs text-red-200 mb-3">
                      <p className="font-medium mb-1">To fix this:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Ensure OHIF is running on port 3000 (or update VITE_OHIF_URL in .env)</li>
                        <li>Configure OHIF to connect to Orthanc at http://localhost:8042</li>
                        <li>Enable DICOMweb plugin in Orthanc</li>
                        <li>Verify the study exists in Orthanc</li>
                      </ol>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setOhifError(null);
                          setIframeLoadError(false);
                          setSelectedStudyInstanceUID(null);
                          setOhifUrl(ohifBaseUrl);
                        }}
                        className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs"
                      >
                        Open Study List
                      </button>
                      <button
                        onClick={() => {
                          setOhifError(null);
                          setIframeLoadError(false);
                          // Retry with the same URL
                          const currentUrl = ohifUrl;
                          setOhifUrl('');
                          setTimeout(() => setOhifUrl(currentUrl), 100);
                        }}
                        className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => {
                          // Try alternative URL format without /viewer
                          const altUrl = `${ohifBaseUrl}?StudyInstanceUIDs=${encodeURIComponent(selectedStudyInstanceUID || '')}`;
                          setOhifUrl(altUrl);
                          console.log('Trying alternative URL format:', altUrl);
                        }}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs"
                      >
                        Try Alternative URL
                      </button>
                      <button
                        onClick={() => {
                          window.open(ohifUrl, '_blank');
                        }}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs"
                      >
                        Open in New Tab
                      </button>
                      <button
                        onClick={() => {
                          window.open(ohifBaseUrl, '_blank');
                        }}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-800 rounded text-xs"
                      >
                        Test OHIF Base URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-lg font-semibold mb-2">OHIF Viewer Not Available</p>
              <p className="text-sm text-gray-400 mb-2">
                Please ensure OHIF is running and accessible at:
              </p>
              <p className="text-sm text-blue-400 font-mono mb-4">
                {ohifBaseUrl}
              </p>
              <p className="text-xs text-gray-500">
                Configure VITE_OHIF_URL in your .env file if OHIF is on a different host/port
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PACSViewer;