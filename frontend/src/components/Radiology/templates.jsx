import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Copy, Trash2, FileText, Monitor, Camera, Eye, Star, Clock, User, ChevronDown, ChevronUp, X, Save } from 'lucide-react';
import RadiologyHeader from './header';

const RadiologyTemplates = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    modality: 'all',
    category: 'all',
    author: 'all'
  });

  // Mock templates data
  const [templates, setTemplates] = useState([
    {
      id: 'TPL-001',
      name: 'Normal Chest CT',
      modality: 'CT',
      bodyPart: 'Chest',
      category: 'Normal',
      description: 'Template for normal chest CT findings',
      author: 'Dr. Anderson',
      createdDate: '2025-06-15',
      lastModified: '2025-06-20',
      usageCount: 45,
      isPrivate: false,
      isFavorite: true,
      content: {
        findings: 'The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The mediastinal structures appear normal. No enlarged lymph nodes are identified. The heart size is within normal limits.',
        impression: 'Normal chest CT.',
        recommendations: 'No further imaging required at this time.'
      },
      tags: ['chest', 'normal', 'routine']
    },
    {
      id: 'TPL-002',
      name: 'Brain MRI - Normal',
      modality: 'MRI',
      bodyPart: 'Brain',
      category: 'Normal',
      description: 'Standard template for normal brain MRI',
      author: 'Dr. Wilson',
      createdDate: '2025-06-10',
      lastModified: '2025-06-18',
      usageCount: 32,
      isPrivate: false,
      isFavorite: false,
      content: {
        findings: 'The brain parenchyma demonstrates normal signal intensity on all sequences. No evidence of acute infarct, hemorrhage, or mass lesion. The ventricular system is normal in size and configuration. No abnormal enhancement is seen.',
        impression: 'Normal brain MRI.',
        recommendations: 'Clinical correlation recommended.'
      },
      tags: ['brain', 'mri', 'normal']
    },
    {
      id: 'TPL-003',
      name: 'Pneumonia - Chest X-Ray',
      modality: 'XR',
      bodyPart: 'Chest',
      category: 'Pathology',
      description: 'Template for pneumonia findings on chest X-ray',
      author: 'Dr. Brown',
      createdDate: '2025-06-12',
      lastModified: '2025-06-22',
      usageCount: 28,
      isPrivate: false,
      isFavorite: true,
      content: {
        findings: 'There is [location] consolidation consistent with pneumonia. The remainder of the lungs are clear. No pleural effusion or pneumothorax. Heart size is normal.',
        impression: '[Location] pneumonia.',
        recommendations: 'Clinical correlation and appropriate antibiotic therapy. Follow-up chest imaging in 4-6 weeks to document resolution.'
      },
      tags: ['pneumonia', 'chest', 'xray', 'infection']
    },
    {
      id: 'TPL-004',
      name: 'Abdominal US - Normal',
      modality: 'US',
      bodyPart: 'Abdomen',
      category: 'Normal',
      description: 'Normal abdominal ultrasound template',
      author: 'Dr. Davis',
      createdDate: '2025-06-08',
      lastModified: '2025-06-15',
      usageCount: 22,
      isPrivate: true,
      isFavorite: false,
      content: {
        findings: 'The liver demonstrates normal size, echogenicity, and contour. No focal lesions identified. The gallbladder is normal without stones or wall thickening. The kidneys are normal in size and echogenicity bilaterally.',
        impression: 'Normal abdominal ultrasound.',
        recommendations: 'No further imaging required.'
      },
      tags: ['abdomen', 'ultrasound', 'normal']
    },
    {
      id: 'TPL-005',
      name: 'Fracture - General',
      modality: 'XR',
      bodyPart: 'Various',
      category: 'Pathology',
      description: 'General template for fracture descriptions',
      author: 'Dr. Anderson',
      createdDate: '2025-06-05',
      lastModified: '2025-06-19',
      usageCount: 18,
      isPrivate: false,
      isFavorite: false,
      content: {
        findings: 'There is a [type] fracture of the [bone/location]. [Additional details about displacement, angulation, etc.]. No other acute osseous abnormalities identified.',
        impression: '[Type] fracture of [location].',
        recommendations: 'Orthopedic consultation recommended. Follow-up imaging as clinically indicated.'
      },
      tags: ['fracture', 'trauma', 'bone']
    }
  ]);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    modality: '',
    bodyPart: '',
    category: 'Normal',
    description: '',
    findings: '',
    impression: '',
    recommendations: '',
    isPrivate: false
  });

  const getModalityIcon = (modality) => {
    switch (modality) {
      case 'CT': return <Monitor className="w-4 h-4 text-blue-600" />;
      case 'MRI': return <Monitor className="w-4 h-4 text-purple-600" />;
      case 'XR': return <Camera className="w-4 h-4 text-gray-600" />;
      case 'US': return <Eye className="w-4 h-4 text-green-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Normal': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pathology': return 'bg-red-100 text-red-800 border-red-200';
      case 'Emergency': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pediatric': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'favorites' && template.isFavorite) ||
                      (activeTab === 'my_templates' && template.author === 'Dr. Anderson') ||
                      template.category.toLowerCase() === activeTab;
    
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilters = (filters.modality === 'all' || template.modality === filters.modality) &&
                          (filters.category === 'all' || template.category === filters.category);
    
    return matchesTab && matchesSearch && matchesFilters;
  });

  const toggleFavorite = (templateId) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, isFavorite: !template.isFavorite }
        : template
    ));
  };

  const duplicateTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: `TPL-${String(templates.length + 1).padStart(3, '0')}`,
      name: `${template.name} (Copy)`,
      author: 'Dr. Anderson',
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      usageCount: 0,
      isPrivate: true
    };
    setTemplates(prev => [...prev, newTemplate]);
  };

  const TemplateCard = ({ template }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex items-center space-x-1">
            {getModalityIcon(template.modality)}
            <span className="text-sm font-medium text-gray-600">{template.modality}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              {template.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
              {template.isPrivate && <User className="w-4 h-4 text-gray-400" />}
            </div>
            <p className="text-gray-600 text-sm mb-2">{template.description}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{template.bodyPart}</span>
              <span>Used {template.usageCount} times</span>
              <span>by {template.author}</span>
              <span>Modified {template.lastModified}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs border ${getCategoryColor(template.category)}`}>
            {template.category}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex flex-wrap gap-1 flex-1">
          {template.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleFavorite(template.id)}
            className={`p-1 rounded hover:bg-gray-100 ${template.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
          >
            <Star className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => duplicateTemplate(template)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedTemplate(template)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
          >
            <Edit className="w-3 h-3" />
            <span>Use</span>
          </button>
        </div>
      </div>
    </div>
  );

  const TemplateModal = ({ template }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getModalityIcon(template.modality)}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
                <p className="text-gray-600">{template.description}</p>
              </div>
            </div>
            <button onClick={() => setSelectedTemplate(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Template Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modality:</span>
                  <span className="font-medium">{template.modality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Body Part:</span>
                  <span className="font-medium">{template.bodyPart}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className={`px-2 py-1 rounded text-xs border ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Author:</span>
                  <span className="font-medium">{template.author}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Usage Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Times Used:</span>
                  <span className="font-medium">{template.usageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{template.createdDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modified:</span>
                  <span className="font-medium">{template.lastModified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Visibility:</span>
                  <span className="font-medium">{template.isPrivate ? 'Private' : 'Public'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white text-gray-700 rounded-full text-xs border">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Findings</h3>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-800 whitespace-pre-wrap">{template.content.findings}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Impression</h3>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-800 whitespace-pre-wrap">{template.content.impression}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-800 whitespace-pre-wrap">{template.content.recommendations}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => toggleFavorite(template.id)}
              className={`px-4 py-2 rounded-lg border flex items-center space-x-2 ${
                template.isFavorite 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Star className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
              <span>{template.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
            </button>
            <button
              onClick={() => duplicateTemplate(template)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit Template</span>
            </button>
            <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Use in Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const CreateTemplateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Create New Template</h2>
            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Normal Chest CT"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newTemplate.modality}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, modality: e.target.value }))}
                >
                  <option value="">Select Modality</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="XR">X-Ray</option>
                  <option value="US">Ultrasound</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Chest, Brain, Abdomen"
                  value={newTemplate.bodyPart}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, bodyPart: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Normal">Normal</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Pediatric">Pediatric</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Brief description of when to use this template"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows="4"
                placeholder="Describe the radiological findings..."
                value={newTemplate.findings}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, findings: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impression</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows="2"
                placeholder="Clinical impression..."
                value={newTemplate.impression}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, impression: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows="2"
                placeholder="Clinical recommendations..."
                value={newTemplate.recommendations}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, recommendations: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newTemplate.isPrivate}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Make this template private</span>
              </label>
            </div>
          </form>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle template creation
                setShowCreateModal(false);
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <RadiologyHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
              <p className="text-gray-600">Manage and organize radiology report templates</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: templates.length },
                  { key: 'favorites', label: 'Favorites', count: templates.filter(t => t.isFavorite).length },
                  { key: 'my_templates', label: 'My Templates', count: templates.filter(t => t.author === 'Dr. Anderson').length },
                  { key: 'normal', label: 'Normal', count: templates.filter(t => t.category === 'Normal').length },
                  { key: 'pathology', label: 'Pathology', count: templates.filter(t => t.category === 'Pathology').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Template</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates by name, description, or tags..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.modality}
                  onChange={(e) => setFilters(prev => ({ ...prev, modality: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Modalities</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="XR">X-Ray</option>
                  <option value="US">Ultrasound</option>
                </select>
                
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Normal">Normal</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Pediatric">Pediatric</option>
                </select>
                
                <select
                  value={filters.author}
                  onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Authors</option>
                  <option value="Dr. Anderson">Dr. Anderson</option>
                  <option value="Dr. Wilson">Dr. Wilson</option>
                  <option value="Dr. Brown">Dr. Brown</option>
                  <option value="Dr. Davis">Dr. Davis</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Templates</p>
                <p className="text-3xl font-bold text-blue-600">{templates.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">My Templates</p>
                <p className="text-3xl font-bold text-teal-600">
                  {templates.filter(t => t.author === 'Dr. Anderson').length}
                </p>
              </div>
              <User className="w-8 h-8 text-teal-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Favorites</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {templates.filter(t => t.isFavorite).length}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Most Used</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.max(...templates.map(t => t.usageCount))}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'all' ? 'All Templates' : 
               activeTab === 'favorites' ? 'Favorite Templates' :
               activeTab === 'my_templates' ? 'My Templates' :
               `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Templates`}
            </h2>
            <span className="text-gray-500 text-sm">
              {filteredTemplates.length} of {templates.length} templates
            </span>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No templates found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTemplate && <TemplateModal template={selectedTemplate} />}
      {showCreateModal && <CreateTemplateModal />}
    </div>
  );
};

export default RadiologyTemplates;