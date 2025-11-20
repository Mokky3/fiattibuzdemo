import React from 'react'
import { Flag } from 'lucide-react'
import { getModalityIcon, getPriorityColor, getReadingStatusColor, getTimeAgo } from './studyUtils'

const StudyGridItem = ({ study, onSelect }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 ${study.criticalFlag ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getModalityIcon(study.modality)}
          <span className="font-medium text-gray-900">{study.modality}</span>
          {study.criticalFlag && <Flag className="w-4 h-4 text-red-500" />}
        </div>
        <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(study.priority)}`}>
          {study.priority}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{study.patientName}</h3>
      <p className="text-gray-600 text-sm mb-2">{study.studyDescription}</p>
      <p className="text-gray-500 text-xs mb-3 line-clamp-2">{study.indication}</p>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{getTimeAgo(study.studyDate)}</span>
        <span>{study.imageCount} images</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded text-xs border ${getReadingStatusColor(study.readingStatus)}`}>
          {study.readingStatus}
        </span>
        <button
          onClick={() => onSelect(study)}
          className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Read
        </button>
      </div>
    </div>
  )
}

export default StudyGridItem





