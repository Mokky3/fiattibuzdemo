import React from 'react'
import { Monitor, Camera, Eye, FileText } from 'lucide-react'

export const getModalityIcon = (modality) => {
  switch (modality) {
    case 'CT': return <Monitor className="w-4 h-4 text-blue-600" />
    case 'MRI': return <Monitor className="w-4 h-4 text-purple-600" />
    case 'XR': return <Camera className="w-4 h-4 text-gray-600" />
    case 'US': return <Eye className="w-4 h-4 text-green-600" />
    default: return <FileText className="w-4 h-4" />
  }
}

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'STAT': return 'bg-red-100 text-red-800 border-red-200'
    case 'Urgent': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'Routine': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export const getReadingStatusColor = (status) => {
  switch (status) {
    case 'unread': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'reading': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'preliminary': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'final': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export const getTimeAgo = (isoString) => {
  const now = new Date()
  const study = new Date(isoString)
  const diffMs = now.getTime() - study.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffHours > 24) {
    return study.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return `${diffMinutes}m ago`
  }
}





