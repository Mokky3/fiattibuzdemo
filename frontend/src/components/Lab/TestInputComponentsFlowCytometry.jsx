import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

// Lymphocyte Subset Panel (CD4 / CD8) Component
export const LymphocyteSubsetPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (numValue < low) return 'low';
      if (numValue > high) return 'high';
      return 'normal';
    }

    return 'normal';
  };

  const handleParameterChange = (paramIndex, field, value) => {
    if (onParameterChange) {
      onParameterChange(index, paramIndex, field, value);
    } else {
      const updatedParams = test.parameters?.map((param, pIdx) => 
        pIdx === paramIndex ? { ...param, [field]: value } : param
      ) || [];
      onTestChange(index, 'parameters', updatedParams);
    }

    // Auto-calculate CD4/CD8 Ratio if CD4A and CD8A are both present
    if (field === 'resultValue' && (test.parameters?.[paramIndex]?.code === 'CD4A' || test.parameters?.[paramIndex]?.code === 'CD8A')) {
      const cd4Param = test.parameters?.find(p => p.code === 'CD4A');
      const cd8Param = test.parameters?.find(p => p.code === 'CD8A');
      const cd4RatioParam = test.parameters?.find(p => p.code === 'CD4R');
      
      if (cd4Param && cd8Param && cd4RatioParam) {
        const cd4Value = parseFloat(cd4Param.code === 'CD4A' && field === 'resultValue' ? value : cd4Param.resultValue);
        const cd8Value = parseFloat(cd8Param.code === 'CD8A' && field === 'resultValue' ? value : cd8Param.resultValue);
        
        if (!isNaN(cd4Value) && !isNaN(cd8Value) && cd8Value > 0) {
          const ratio = (cd4Value / cd8Value).toFixed(2);
          const ratioIndex = test.parameters?.findIndex(p => p.code === 'CD4R');
          if (ratioIndex !== undefined && ratioIndex >= 0) {
            const updatedParams = test.parameters.map((param, pIdx) => {
              if (pIdx === paramIndex) {
                return { ...param, [field]: value };
              }
              if (pIdx === ratioIndex) {
                return { ...param, resultValue: ratio };
              }
              return param;
            });
            onTestChange(index, 'parameters', updatedParams);
            return;
          }
        }
      }
    }
  };

  // Recalculate ratio when parameters change
  React.useEffect(() => {
    const cd4Param = test.parameters?.find(p => p.code === 'CD4A');
    const cd8Param = test.parameters?.find(p => p.code === 'CD8A');
    const cd4RatioParam = test.parameters?.find(p => p.code === 'CD4R');
    
    if (cd4Param && cd8Param && cd4RatioParam) {
      const cd4Value = parseFloat(cd4Param.resultValue);
      const cd8Value = parseFloat(cd8Param.resultValue);
      
      if (!isNaN(cd4Value) && !isNaN(cd8Value) && cd8Value > 0) {
        const ratio = (cd4Value / cd8Value).toFixed(2);
        if (cd4RatioParam.resultValue !== ratio) {
          const ratioIndex = test.parameters?.findIndex(p => p.code === 'CD4R');
          if (ratioIndex !== undefined && ratioIndex >= 0) {
            const updatedParams = test.parameters.map((param, pIdx) => 
              pIdx === ratioIndex ? { ...param, resultValue: ratio } : param
            );
            onTestChange(index, 'parameters', updatedParams);
          }
        }
      }
    }
  }, [test.parameters, index, onTestChange]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              let refRange = param.ref || '';
              if (param.code === 'CD4A') {
                refRange = '500–1500 cells/µL';
              } else if (param.code === 'CD4R') {
                refRange = '1.0–3.0';
              }
              
              const abnormality = param.resultValue && refRange
                ? calculateAbnormality(param.resultValue, refRange)
                : 'normal';
              
              const isAutoCalculated = param.code === 'CD4R';
              
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {param.name}
                    {isAutoCalculated && <span className="ml-1 text-xs text-gray-500">(auto)</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={param.resultValue || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = refRange ? calculateAbnormality(newValue, refRange) : 'normal';
                        handleParameterChange(pIdx, 'resultValue', newValue);
                        handleParameterChange(pIdx, 'abnormalityType', newAbnormality);
                        handleParameterChange(pIdx, 'isAbnormal', newAbnormality !== 'normal');
                      }}
                      disabled={isAutoCalculated}
                      className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] ${
                        isAutoCalculated ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Enter value"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.unit}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{refRange || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      abnormality === 'normal' ? 'bg-green-100 text-green-800' :
                      abnormality === 'high' ? 'bg-yellow-100 text-yellow-800' :
                      abnormality === 'low' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {abnormality === 'normal' ? 'N' : abnormality === 'high' ? 'H' : 'L'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interpretation
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter interpretation..."
        ></textarea>
      </div>
    </div>
  );
};

// Leukemia/Lymphoma Immunophenotyping Component
export const LeukemiaLymphomaImmunophenotypingInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const markerGroups = {
    'T-cell Markers': ['CD2', 'CD3', 'CD5', 'CD7', 'CD4', 'CD8'],
    'B-cell Markers': ['CD19', 'CD20', 'CD22', 'CD79a', 'Kappa', 'Lambda'],
    'Myeloid Markers': ['CD13', 'CD33', 'CD117', 'MPO'],
    'Stem Cell Markers': ['CD34', 'CD38'],
    'Blast Markers': ['CD34', 'CD117', 'HLA-DR'],
    'NK Cell Markers': ['CD16', 'CD56']
  };

  const intensityOptions = ['Positive', 'Negative', 'Dim', 'Bright', 'Partial'];

  const addMarker = (markerName = '') => {
    const newMarker = {
      id: Date.now(),
      markerName: markerName,
      intensity: '',
      percentPositive: '',
      notes: ''
    };
    
    const currentMarkers = test.markers || [];
    onTestChange(index, 'markers', [...currentMarkers, newMarker]);
  };

  const removeMarker = (markerId) => {
    const currentMarkers = test.markers || [];
    onTestChange(index, 'markers', currentMarkers.filter(m => m.id !== markerId));
  };

  const updateMarker = (markerId, field, value) => {
    const currentMarkers = test.markers || [];
    onTestChange(index, 'markers', currentMarkers.map(m => 
      m.id === markerId ? { ...m, [field]: value } : m
    ));
  };

  const addMarkerGroup = (groupName) => {
    const markers = markerGroups[groupName] || [];
    markers.forEach(markerName => {
      // Check if marker already exists
      const exists = (test.markers || []).some(m => m.markerName === markerName);
      if (!exists) {
        addMarker(markerName);
      }
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Add Marker Groups
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(markerGroups).map(groupName => (
              <button
                key={groupName}
                onClick={() => addMarkerGroup(groupName)}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 border border-blue-200"
              >
                {groupName}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Markers
            </label>
            <button
              onClick={() => addMarker()}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200"
            >
              <Plus className="w-4 h-4" />
              Add Marker
            </button>
          </div>

          <div className="space-y-3">
            {(test.markers || []).map((marker) => (
              <div key={marker.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Marker Name
                      </label>
                      <input
                        type="text"
                        value={marker.markerName || ''}
                        onChange={(e) => updateMarker(marker.id, 'markerName', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="e.g., CD3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Intensity
                      </label>
                      <select
                        value={marker.intensity || ''}
                        onChange={(e) => updateMarker(marker.id, 'intensity', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        {intensityOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        % Positive
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={marker.percentPositive || ''}
                        onChange={(e) => updateMarker(marker.id, 'percentPositive', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="0-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={marker.notes || ''}
                        onChange={(e) => updateMarker(marker.id, 'notes', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeMarker(marker.id)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Panel Interpretation
          </label>
          <textarea
            value={test.finalInterpretation || ''}
            onChange={(e) => onTestChange(index, 'finalInterpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="5"
            placeholder="Enter diagnosis, WHO classification, immunophenotypic description..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// HLA-B27 by Flow Cytometry Component
export const HLAB27FlowCytometryInput = ({ test, index, onRemove, onTestChange, patient }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HLA-B27 Result
          </label>
          <select
            value={test.result || ''}
            onChange={(e) => onTestChange(index, 'result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              % Positive Cells
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max="100"
              value={test.percentPositive || ''}
              onChange={(e) => onTestChange(index, 'percentPositive', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mean Fluorescence Intensity (optional)
            </label>
            <input
              type="number"
              step="any"
              value={test.meanFluorescenceIntensity || ''}
              onChange={(e) => onTestChange(index, 'meanFluorescenceIntensity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter MFI"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Control Check
          </label>
          <select
            value={test.controlCheck || ''}
            onChange={(e) => onTestChange(index, 'controlCheck', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Stem Cell Enumeration (CD34 Count) Component
export const StemCellEnumerationInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (numValue < low) return 'low';
      if (numValue > high) return 'high';
      return 'normal';
    }

    return 'normal';
  };

  const handleParameterChange = (paramIndex, field, value) => {
    if (onParameterChange) {
      onParameterChange(index, paramIndex, field, value);
    } else {
      const updatedParams = test.parameters?.map((param, pIdx) => 
        pIdx === paramIndex ? { ...param, [field]: value } : param
      ) || [];
      onTestChange(index, 'parameters', updatedParams);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const abnormality = param.resultValue && param.ref
                ? calculateAbnormality(param.resultValue, param.ref)
                : 'normal';
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={param.resultValue || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = param.ref ? calculateAbnormality(newValue, param.ref) : 'normal';
                        handleParameterChange(pIdx, 'resultValue', newValue);
                        handleParameterChange(pIdx, 'abnormalityType', newAbnormality);
                        handleParameterChange(pIdx, 'isAbnormal', newAbnormality !== 'normal');
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      placeholder="Enter value"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.unit}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.ref || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      abnormality === 'normal' ? 'bg-green-100 text-green-800' :
                      abnormality === 'high' ? 'bg-yellow-100 text-yellow-800' :
                      abnormality === 'low' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {abnormality === 'normal' ? 'N' : abnormality === 'high' ? 'H' : 'L'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interpretation
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter interpretation..."
        ></textarea>
      </div>
    </div>
  );
};

// Minimal Residual Disease (MRD) Component
export const MinimalResidualDiseaseInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const diseaseTypes = ['ALL', 'AML', 'CLL', 'Multiple Myeloma'];
  const commonMarkers = ['CD34', 'CD10', 'CD19', 'CD22', 'CD33', 'CD45', 'CD117', 'CD38', 'CD138', 'CD56'];

  const toggleMarker = (marker) => {
    const currentMarkers = test.markersUsed || [];
    if (currentMarkers.includes(marker)) {
      onTestChange(index, 'markersUsed', currentMarkers.filter(m => m !== marker));
    } else {
      onTestChange(index, 'markersUsed', [...currentMarkers, marker]);
    }
  };

  const calculateMRDResult = () => {
    const mrdPercent = parseFloat(test.mrdPercent);
    const threshold = parseFloat(test.positivityThreshold || '0.01');
    
    if (!isNaN(mrdPercent)) {
      return mrdPercent >= threshold ? 'MRD Positive' : 'MRD Negative';
    }
    return '';
  };

  React.useEffect(() => {
    const result = calculateMRDResult();
    if (result && test.result !== result) {
      onTestChange(index, 'result', result);
    }
  }, [test.mrdPercent, test.positivityThreshold]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Disease Type
          </label>
          <select
            value={test.diseaseType || ''}
            onChange={(e) => onTestChange(index, 'diseaseType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            {diseaseTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MRD %
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={test.mrdPercent || ''}
              onChange={(e) => onTestChange(index, 'mrdPercent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Positivity Threshold (default: 0.01%)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={test.positivityThreshold || '0.01'}
              onChange={(e) => onTestChange(index, 'positivityThreshold', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Result (auto-calculated)
          </label>
          <input
            type="text"
            value={calculateMRDResult() || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Markers Used (multi-select)
          </label>
          <div className="flex flex-wrap gap-2">
            {commonMarkers.map(marker => (
              <button
                key={marker}
                type="button"
                onClick={() => toggleMarker(marker)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  (test.markersUsed || []).includes(marker)
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {marker}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Selected: {(test.markersUsed || []).join(', ') || 'None'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Paroxysmal Nocturnal Hemoglobinuria (PNH Panel) Component
export const PNHPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const handleParameterChange = (paramIndex, field, value) => {
    if (onParameterChange) {
      onParameterChange(index, paramIndex, field, value);
    } else {
      const updatedParams = test.parameters?.map((param, pIdx) => 
        pIdx === paramIndex ? { ...param, [field]: value } : param
      ) || [];
      onTestChange(index, 'parameters', updatedParams);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700">{test.testName}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const isQualitative = param.code === 'FLAER';
              
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                  <td className="px-3 py-2">
                    {isQualitative ? (
                      <select
                        value={param.resultValue || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'resultValue', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={param.resultValue || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'resultValue', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="Enter value"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.unit || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interpretation
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter interpretation..."
        ></textarea>
      </div>
    </div>
  );
};

