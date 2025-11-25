import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { 
  Monitor, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle, 
  Loader2,
  Eye,
  X,
  ArrowLeft
} from 'lucide-react';
import { patientImagingAPI } from '../../services/apiService';
import { handlePatientAuthError } from '../../utils/patientAuth';

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

/**
 * Patient Imaging Component
 * Opens OHIF viewer directly for a specific study or shows study list
 * Usage: /patient/pacs with navigation state { studyInstanceUID, orthancStudyId }
 */
const Imaging = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ohifBaseUrl = getOHIFBaseURL();
  const [ohifUrl, setOhifUrl] = useState(ohifBaseUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudyInstanceUID, setSelectedStudyInstanceUID] = useState(null);
  const [studies, setStudies] = useState([]);
  const [showStudyList, setShowStudyList] = useState(false);
  const viewerRef = useRef(null);

  useEffect(() => {
    // Check if studyInstanceUID or orthancStudyId was passed via navigation state
    const state = location.state;
    setLoading(false);
    
    if (state) {
      const studyInstanceUID = state.studyInstanceUID;
      const orthancStudyId = state.orthancStudyId;
      
      // Use studyInstanceUID if available (preferred - comes from database)
      if (studyInstanceUID) {
        setSelectedStudyInstanceUID(studyInstanceUID);
        setLoading(true);
        // OHIF URL format: <baseUrl>viewer?StudyInstanceUIDs=<uid>
        const encodedUID = encodeURIComponent(studyInstanceUID);
        const viewerUrl = `${ohifBaseUrl}viewer?StudyInstanceUIDs=${encodedUID}`;
        setOhifUrl(viewerUrl);
        console.log('Opening OHIF with StudyInstanceUID:', studyInstanceUID);
        
        // Set a timeout to clear loading state
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 3000);
        
        return () => clearTimeout(timeoutId);
      } else if (orthancStudyId) {
        // Fallback: if we only have orthancStudyId, try to use it
        console.warn('Using Orthanc study ID directly - StudyInstanceUID preferred');
        const encodedId = encodeURIComponent(orthancStudyId);
        setOhifUrl(`${ohifBaseUrl}viewer?studyId=${encodedId}`);
        setLoading(false);
      } else {
        // No study specified, show study list
        setShowStudyList(true);
        loadStudies();
      }
    } else {
      // Check URL params as fallback
      const urlParams = new URLSearchParams(window.location.search);
      const studyInstanceUID = urlParams.get('StudyInstanceUID') || urlParams.get('study_instance_uid');
      
      if (studyInstanceUID) {
        setSelectedStudyInstanceUID(studyInstanceUID);
        const encodedUID = encodeURIComponent(studyInstanceUID);
        const viewerUrl = `${ohifBaseUrl}viewer?StudyInstanceUIDs=${encodedUID}`;
        setOhifUrl(viewerUrl);
        setLoading(true);
        setTimeout(() => setLoading(false), 3000);
      } else {
        // Set initial OHIF URL to show study list
        setShowStudyList(true);
        loadStudies();
      }
    }
  }, [location.state, ohifBaseUrl]);

  const loadStudies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await patientImagingAPI.listStudies();
      const studiesData = response?.studies || [];
      setStudies(studiesData);
    } catch (err) {
      if (handlePatientAuthError(err)) {
        return; // Redirected, exit early
      }
      console.error('Error loading imaging studies:', err);
      setError(err.message || 'Failed to load imaging studies');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudy = (study) => {
    const studyInstanceUID = study.study_instance_uid || study.studyInstanceUID;
    if (studyInstanceUID) {
      const encodedUID = encodeURIComponent(studyInstanceUID);
      const viewerUrl = `${ohifBaseUrl}viewer?StudyInstanceUIDs=${encodedUID}`;
      setOhifUrl(viewerUrl);
      setSelectedStudyInstanceUID(studyInstanceUID);
      setShowStudyList(false);
      setLoading(true);
      setTimeout(() => setLoading(false), 3000);
    }
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  const handleBackToList = () => {
    setShowStudyList(true);
    setOhifUrl(ohifBaseUrl);
    setSelectedStudyInstanceUID(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      // DICOM date format is YYYYMMDD
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // If showing study list, render the list view
  if (showStudyList && !selectedStudyInstanceUID) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Monitor className="w-8 h-8 text-teal-600" />
              <h1 className="text-3xl font-bold text-gray-900">Medical Imaging</h1>
            </div>
            <p className="text-gray-600 mt-2">
              View your DICOM medical imaging studies (CT scans, X-rays, MRIs, etc.)
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
                <p className="text-gray-600">Loading imaging studies...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <h3 className="text-sm font-medium text-red-800">Error loading studies</h3>
              </div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={loadStudies}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Studies List */}
          {!loading && !error && (
            <>
              {studies.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No imaging studies found</h3>
                  <p className="text-gray-600">
                    You don't have any medical imaging studies available at this time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {studies.map((study) => (
                    <div
                      key={study.study_id || study.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <Monitor className="w-6 h-6 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {study.study_description || 'Imaging Study'}
                            </h3>
                            {study.modality && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                {study.modality}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {study.study_date && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{formatDate(study.study_date)}</span>
                          </div>
                        )}
                        
                        {study.accession_number && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FileText className="w-4 h-4 mr-2" />
                            <span>Accession: {study.accession_number}</span>
                          </div>
                        )}

                        {study.series_count > 0 && (
                          <div className="text-sm text-gray-600">
                            {study.series_count} series, {study.instance_count} images
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleViewStudy(study)}
                        className="w-full mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center justify-center space-x-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Study</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Show OHIF viewer
  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <Navbar />
      <div className="flex-1 relative">
        {ohifUrl ? (
          <>
            {/* Back button overlay - positioned at top left of OHIF viewer */}
            <button
              onClick={handleClose}
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
                setLoading(false);
                console.log('OHIF iframe loaded');
              }}
              onError={() => {
                setError('Failed to load OHIF viewer');
                setLoading(false);
              }}
            />
            {/* Show loading indicator when opening a specific study */}
            {loading && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-10 max-w-md">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>Loading study in OHIF...</p>
                </div>
              </div>
            )}
            
            {/* Show error message if OHIF fails to load */}
            {error && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-10 max-w-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Failed to load study in OHIF</p>
                    <p className="text-xs text-red-200 mb-3">{error}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleBackToList}
                        className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs"
                      >
                        Open Study List
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-800 rounded text-xs"
                      >
                        Go Back
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
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Monitor className="w-8 h-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Medical Imaging</h1>
          </div>
          <p className="text-gray-600 mt-2">
            View your DICOM medical imaging studies (CT scans, X-rays, MRIs, etc.)
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading imaging studies...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <h3 className="text-sm font-medium text-red-800">Error loading studies</h3>
            </div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={loadStudies}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Studies List */}
        {!loading && !error && (
          <>
            {studies.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No imaging studies found</h3>
                <p className="text-gray-600">
                  You don't have any medical imaging studies available at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studies.map((study) => (
                  <div
                    key={study.study_id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <Monitor className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {study.study_description || 'Imaging Study'}
                          </h3>
                          {study.modality && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                              {study.modality}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {study.study_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(study.study_date)}</span>
                        </div>
                      )}
                      
                      {study.accession_number && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          <span>Accession: {study.accession_number}</span>
                        </div>
                      )}

                      {study.series_count > 0 && (
                        <div className="text-sm text-gray-600">
                          {study.series_count} series, {study.instance_count} images
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewStudy(study)}
                      className="w-full mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Study</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Imaging;

