import React from 'react'
import { Eye, Flag } from 'lucide-react'
import { getModalityIcon, getPriorityColor, getReadingStatusColor, getTimeAgo } from './studyUtils'

const StudyListItem = ({ study, expandedId, onToggleExpand, onSelect }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${study.criticalFlag ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex flex-col items-center space-y-2">
            {study.criticalFlag && (
              <Flag className="w-5 h-5 text-red-500" />
            )}
            <div className="flex items-center space-x-1">
              {getModalityIcon(study.modality)}
              <span className="text-xs font-medium text-gray-600">{study.modality}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg">{study.patientName}</h3>
              <span className="text-sm text-gray-500">({study.age}{study.gender})</span>
              <span className="text-sm text-gray-400">MRN: {study.mrn}</span>
            </div>

            <p className="text-gray-700 font-medium mb-1">{study.studyDescription}</p>
            <p className="text-gray-600 text-sm mb-2">{study.indication}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Acc: {study.accessionNumber}</span>
              <span>{getTimeAgo(study.studyDate)}</span>
              <span>{study.imageCount} images</span>
              <span>{study.studySize}</span>
              {study.priorStudies > 0 && (
                <span className="text-blue-600">{study.priorStudies} prior studies</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-lg text-sm border ${getPriorityColor(study.priority)}`}>
              {study.priority}
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm border ${getReadingStatusColor(study.readingStatus)}`}>
              {study.readingStatus}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleExpand(expandedId === study.id ? null : study.id)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
            >
              {expandedId === study.id ? 'Less' : 'More'}
            </button>
            <button
              onClick={() => onSelect(study)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>Read</span>
            </button>
          </div>
        </div>
      </div>

      {expandedId === study.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Clinical Details</h4>
              <div className="space-y-1 text-gray-600">
                <div>Ordering Physician: {study.orderingPhysician}</div>
                <div>Location: {study.location}</div>
                <div>Protocol: {study.protocolName}</div>
                {study.contrast && <div className="text-yellow-600">Contrast: Yes</div>}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
              <div className="space-y-1 text-gray-600">
                <div>Room: {study.room}</div>
                <div>Technologist: {study.technologist}</div>
                <div>Series: {study.seriesCount}</div>
                <div>Est. Read Time: {study.estimatedReadTime}</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Workflow</h4>
              <div className="space-y-1 text-gray-600">
                <div>TAT Goal: {study.turnaroundTime}</div>
                {study.assignedRadiologist && (
                  <div>Assigned: {study.assignedRadiologist}</div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {study.tags?.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {study.preliminaryFindings && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-1">Preliminary Findings</h4>
              <p className="text-purple-800 text-sm">{study.preliminaryFindings}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StudyListItem





