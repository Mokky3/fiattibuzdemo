import React from 'react';
import { X } from 'lucide-react';

// Respiratory PCR Panel Component
export const RespiratoryPCRPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pathogen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ct Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Viral Load</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={param.result || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Detected">Detected</option>
                    <option value="Not Detected">Not Detected</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.ctValue || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'ctValue', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Optional"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.viralLoad || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'viralLoad', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Optional"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comments
        </label>
        <textarea
          value={test.comments || ''}
          onChange={(e) => onTestChange(index, 'comments', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter comments..."
        ></textarea>
      </div>
    </div>
  );
};

// Gastrointestinal PCR Panel Component
export const GastrointestinalPCRPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pathogen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ct Value (optional)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={param.result || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Detected">Detected</option>
                    <option value="Not Detected">Not Detected</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.ctValue || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'ctValue', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Optional"
                  />
                </td>
              </tr>
            ))}
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

// Urogenital / STI PCR Panel Component
export const UrogenitalSTIPCRPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pathogen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ct Value (optional)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={param.result || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Detected">Detected</option>
                    <option value="Not Detected">Not Detected</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.ctValue || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'ctValue', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Optional"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comments
        </label>
        <textarea
          value={test.comments || ''}
          onChange={(e) => onTestChange(index, 'comments', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter comments..."
        ></textarea>
      </div>
    </div>
  );
};

// TB / Mycobacteria PCR (GeneXpert) Component
export const TBMycobacteriaPCRInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            MTB Detection
          </label>
          <select
            value={test.mtbDetection || ''}
            onChange={(e) => onTestChange(index, 'mtbDetection', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Detected">Detected</option>
            <option value="Not Detected">Not Detected</option>
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rifampicin Resistance
          </label>
          <select
            value={test.rifampicinResistance || ''}
            onChange={(e) => onTestChange(index, 'rifampicinResistance', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Detected">Detected</option>
            <option value="Not Detected">Not Detected</option>
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semi-Quantitative Level
          </label>
          <select
            value={test.semiQuantitativeLevel || ''}
            onChange={(e) => onTestChange(index, 'semiQuantitativeLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Very Low">Very Low</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ct MTB (optional)
            </label>
            <input
              type="number"
              step="any"
              value={test.ctMTB || ''}
              onChange={(e) => onTestChange(index, 'ctMTB', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter Ct value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ct RIF (optional)
            </label>
            <input
              type="number"
              step="any"
              value={test.ctRIF || ''}
              onChange={(e) => onTestChange(index, 'ctRIF', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter Ct value"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specimen Type
          </label>
          <select
            value={test.specimenType || ''}
            onChange={(e) => onTestChange(index, 'specimenType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Sputum">Sputum</option>
            <option value="BAL">BAL</option>
            <option value="Tissue">Tissue</option>
            <option value="Other">Other</option>
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

// Hepatitis Viral Load Component (HBV DNA or HCV RNA)
export const HepatitisViralLoadInput = ({ test, index, onRemove, onTestChange, patient }) => {
  // Auto-calculate Log10 value
  const calculateLog10 = (value) => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return '';
    return Math.log10(numValue).toFixed(2);
  };

  const log10Value = calculateLog10(test.viralLoad);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Viral Load (IU/mL)
            </label>
            <input
              type="number"
              step="any"
              value={test.viralLoad || ''}
              onChange={(e) => onTestChange(index, 'viralLoad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter viral load"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log10 Value (auto-calculated)
            </label>
            <input
              type="text"
              value={log10Value}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>

        {test.testName?.includes('HCV') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genotype (optional)
            </label>
            <select
              value={test.genotype || ''}
              onChange={(e) => onTestChange(index, 'genotype', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="1a">1a</option>
              <option value="1b">1b</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detection Limit (optional)
          </label>
          <input
            type="text"
            value={test.detectionLimit || ''}
            onChange={(e) => onTestChange(index, 'detectionLimit', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., <20 IU/mL"
          />
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

// HIV Viral Load Component
export const HIVViralLoadInput = ({ test, index, onRemove, onTestChange, patient }) => {
  // Auto-calculate Log10 value
  const calculateLog10 = (value) => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return '';
    return Math.log10(numValue).toFixed(2);
  };

  const log10Value = calculateLog10(test.viralLoad);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HIV RNA Viral Load (copies/mL)
            </label>
            <input
              type="number"
              step="any"
              value={test.viralLoad || ''}
              onChange={(e) => onTestChange(index, 'viralLoad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter viral load"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log10 Viral Load (auto-calculated)
            </label>
            <input
              type="text"
              value={log10Value}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detection Limit
          </label>
          <input
            type="text"
            value={test.detectionLimit || ''}
            onChange={(e) => onTestChange(index, 'detectionLimit', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., <20 copies/mL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={test.comments || ''}
            onChange={(e) => onTestChange(index, 'comments', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// HPV PCR & Genotyping Component
export const HPVPCRGenotypingInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

  // Calculate high-risk summary
  const calculateHighRiskSummary = () => {
    if (!test.parameters) return '';
    const highRiskTypes = test.parameters.filter(p => p.isHighRisk && p.result === 'Detected');
    return highRiskTypes.length > 0 ? 'Positive' : 'Negative';
  };

  const highRiskSummary = calculateHighRiskSummary();

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
        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Genotype</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ct Value (optional)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {test.parameters?.map((param, pIdx) => (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      param.isHighRisk ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {param.isHighRisk ? 'High-risk' : 'Low-risk'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={param.result || ''}
                      onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    >
                      <option value="">Select...</option>
                      <option value="Detected">Detected</option>
                      <option value="Not Detected">Not Detected</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={param.ctValue || ''}
                      onChange={(e) => handleParameterChange(pIdx, 'ctValue', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      placeholder="Optional"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            High-Risk Summary (auto-calculated)
          </label>
          <input
            type="text"
            value={highRiskSummary}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
          />
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

// COVID-19 PCR (Standalone Test) Component
export const COVID19PCRInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            SARS-CoV-2 Result
          </label>
          <select
            value={test.result || ''}
            onChange={(e) => onTestChange(index, 'result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Detected">Detected</option>
            <option value="Not Detected">Not Detected</option>
            <option value="Inconclusive">Inconclusive</option>
          </select>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Ct Values</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N gene
              </label>
              <input
                type="number"
                step="any"
                value={test.ctNGene || ''}
                onChange={(e) => onTestChange(index, 'ctNGene', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter Ct value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ORF1ab
              </label>
              <input
                type="number"
                step="any"
                value={test.ctORF1ab || ''}
                onChange={(e) => onTestChange(index, 'ctORF1ab', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter Ct value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S gene
              </label>
              <input
                type="number"
                step="any"
                value={test.ctSGene || ''}
                onChange={(e) => onTestChange(index, 'ctSGene', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter Ct value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other targets
              </label>
              <input
                type="number"
                step="any"
                value={test.ctOther || ''}
                onChange={(e) => onTestChange(index, 'ctOther', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter Ct value"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specimen Type
          </label>
          <select
            value={test.specimenType || ''}
            onChange={(e) => onTestChange(index, 'specimenType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Nasopharyngeal">Nasopharyngeal</option>
            <option value="Oropharyngeal">Oropharyngeal</option>
            <option value="Saliva">Saliva</option>
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

// Oncology Molecular Panels Component
export const OncologyMolecularPanelsInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mutation</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allele Frequency (%)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={param.result || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Detected">Detected</option>
                    <option value="Not Detected">Not Detected</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={param.variantName || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'variantName', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="If detected"
                    disabled={param.result !== 'Detected'}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.alleleFrequency || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'alleleFrequency', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Optional %"
                    disabled={param.result !== 'Detected'}
                  />
                </td>
              </tr>
            ))}
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

