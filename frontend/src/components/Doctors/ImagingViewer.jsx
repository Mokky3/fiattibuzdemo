import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { X, AlertCircle, Loader2, Monitor, ArrowLeft } from 'lucide-react';

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
 * Doctor Imaging Viewer Component
 * Opens OHIF viewer directly for a specific study
 * Usage: /doctor/pacs with navigation state { studyInstanceUID, orthancStudyId }
 */
const ImagingViewer = () => {
  const { studyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const ohifBaseUrl = getOHIFBaseURL();
  const [ohifUrl, setOhifUrl] = useState(ohifBaseUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudyInstanceUID, setSelectedStudyInstanceUID] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    // Check if studyInstanceUID or orthancStudyId was passed via navigation state
    const state = location.state;
    setLoading(false);
    
    if (state) {
      const studyInstanceUID = state.studyInstanceUID;
      const orthancStudyId = state.orthancStudyId;
      const patientIdFromState = state.patientId;
      
      // Store patient ID for navigation back
      if (patientIdFromState) {
        setPatientId(patientIdFromState);
      }
      
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
        setOhifUrl(ohifBaseUrl);
        setLoading(false);
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
        setOhifUrl(ohifBaseUrl);
        setLoading(false);
      }
    }
  }, [location.state, ohifBaseUrl]);

  const handleClose = () => {
    // Navigate to patient page if patientId is available, otherwise go back
    if (patientId) {
      navigate('/doctor/patient');
    } else {
      navigate(-1); // Fallback: go back to previous page
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <Header />
      <div className="flex-1 relative">
        {ohifUrl ? (
          <>
            {/* Back button overlay - positioned at top left of OHIF viewer */}
            <button
              onClick={handleClose}
              className="absolute top-2 left-2 z-20 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
              title="Go back to patient page"
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
                        onClick={() => {
                          setError(null);
                          setOhifUrl(ohifBaseUrl);
                        }}
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
};

export default ImagingViewer;


