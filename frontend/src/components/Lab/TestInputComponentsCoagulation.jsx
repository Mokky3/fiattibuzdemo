import React from 'react';
import { X } from 'lucide-react';

// Basic Coagulation Panel Component
export const BasicCoagulationPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle special cases like "< 0.5", "> 25", etc.
    if (refRange.trim().startsWith('>')) {
      const threshold = parseFloat(refRange.replace('>', '').trim());
      if (!isNaN(threshold)) {
        return numValue >= threshold ? 'normal' : 'low';
      }
    } else if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue <= threshold ? 'normal' : 'high';
      }
    }

    // Handle ranges like "~ 11–15 sec" or "2.0–4.0"
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

  // Calculate INR from PT
  const calculateINR = () => {
    const ptParam = test.parameters?.find(p => p.code === 'PT');
    const isiParam = test.parameters?.find(p => p.code === 'ISI');
    if (ptParam?.resultValue && isiParam?.resultValue) {
      const pt = parseFloat(ptParam.resultValue);
      const isi = parseFloat(isiParam.resultValue);
      const meanNormalPT = 12; // Typical mean normal PT
      if (!isNaN(pt) && !isNaN(isi) && meanNormalPT > 0) {
        return Math.pow(pt / meanNormalPT, isi).toFixed(2);
      }
    }
    return '';
  };

  const calculatedINR = calculateINR();

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
              // Skip INR if it's auto-calculated
              if (param.code === 'INR' && calculatedINR) {
                return null;
              }
              
              const abnormality = param.resultValue 
                ? calculateAbnormality(param.resultValue, param.ref, patient?.gender)
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
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
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
            {/* INR row if calculated */}
            {calculatedINR && (
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 font-medium">INR (auto-calculated)</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={calculatedINR}
                    disabled
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 font-medium"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">-</td>
                <td className="px-3 py-2 text-sm text-gray-600">0.8–1.2</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    parseFloat(calculatedINR) >= 0.8 && parseFloat(calculatedINR) <= 1.2 ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {parseFloat(calculatedINR) >= 0.8 && parseFloat(calculatedINR) <= 1.2 ? 'N' : 'H'}
                  </span>
                </td>
              </tr>
            )}
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
          rows="4"
          placeholder="Enter interpretation..."
        ></textarea>
      </div>
    </div>
  );
};

// D-Dimer Input Component
export const DDimerInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Reference: < 0.5 μg/mL FEU (normal)
    if (numValue < 0.5) return 'normal';
    return 'high';
  };

  const abnormality = calculateAbnormality(test.resultValue);

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
              D-Dimer Value
            </label>
            <input
              type="number"
              step="any"
              value={test.resultValue || ''}
              onChange={(e) => onTestChange(index, 'resultValue', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              value={test.resultUnit || 'μg/mL FEU'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="μg/mL FEU">μg/mL FEU</option>
              <option value="ng/mL DDU">ng/mL DDU</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            {test.resultUnit === 'ng/mL DDU' ? '< 250 ng/mL DDU (normal)' : '< 0.5 μg/mL FEU (normal)'}
          </div>
        </div>

        {abnormality !== 'normal' && test.resultValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag
            </label>
            <span className="inline-block px-3 py-2 rounded text-sm font-medium bg-yellow-100 text-yellow-800">
              High
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Method (optional)
          </label>
          <select
            value={test.testMethod || ''}
            onChange={(e) => onTestChange(index, 'testMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="ELISA">ELISA</option>
            <option value="Latex">Latex</option>
            <option value="Immunoturbidimetric">Immunoturbidimetric</option>
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

// Coagulation Factor Assays Component
export const CoagulationFactorAssaysInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factor</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value (%)</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const abnormality = param.resultValue 
                ? calculateAbnormality(param.resultValue, param.ref, patient?.gender)
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
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
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

// Mixing Studies (PT, aPTT) Component
export const MixingStudiesInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

      <div className="space-y-4">
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Baseline Results</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PT (sec)
              </label>
              <input
                type="number"
                step="any"
                value={test.baselinePT || ''}
                onChange={(e) => onTestChange(index, 'baselinePT', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter PT"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                aPTT (sec)
              </label>
              <input
                type="number"
                step="any"
                value={test.baselineAPTT || ''}
                onChange={(e) => onTestChange(index, 'baselineAPTT', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter aPTT"
              />
            </div>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Mixing Study (1:1 mix with normal plasma)</h5>
          <div className="space-y-4">
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">aPTT Mix</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    aPTT immediate (sec)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={test.apttMixImmediate || ''}
                    onChange={(e) => onTestChange(index, 'apttMixImmediate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    aPTT after 2 hours incubation (sec)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={test.apttMixAfter2h || ''}
                    onChange={(e) => onTestChange(index, 'apttMixAfter2h', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter value"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  aPTT Mix Interpretation
                </label>
                <select
                  value={test.apttMixInterpretation || ''}
                  onChange={(e) => onTestChange(index, 'apttMixInterpretation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Corrected">Corrected</option>
                  <option value="Not corrected">Not corrected</option>
                  <option value="Partially corrected">Partially corrected</option>
                </select>
              </div>
            </div>

            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">PT Mix (optional)</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PT immediate (sec)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={test.ptMixImmediate || ''}
                    onChange={(e) => onTestChange(index, 'ptMixImmediate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PT after incubation (sec)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={test.ptMixAfterIncubation || ''}
                    onChange={(e) => onTestChange(index, 'ptMixAfterIncubation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter value"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PT Mix Interpretation
                </label>
                <select
                  value={test.ptMixInterpretation || ''}
                  onChange={(e) => onTestChange(index, 'ptMixInterpretation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Corrected">Corrected</option>
                  <option value="Not corrected">Not corrected</option>
                  <option value="Partially corrected">Partially corrected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Interpretation
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="4"
            placeholder="Enter final interpretation (e.g., 'Suggestive of factor deficiency', 'Inhibitor likely present', 'Possible Lupus anticoagulant')..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Bleeding Profile / Platelet Function Tests Component
export const BleedingProfileInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const abnormality = param.resultValue 
                ? calculateAbnormality(param.resultValue, param.ref, patient?.gender)
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
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
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

