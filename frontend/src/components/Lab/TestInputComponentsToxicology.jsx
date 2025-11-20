import React from 'react';
import { X } from 'lucide-react';

// Urine Drug Screening Panel Component
export const UrineDrugScreeningInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
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
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Invalid">Invalid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Urine Validity Tests (optional)</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Creatinine (mg/dL)
              </label>
              <input
                type="number"
                step="any"
                value={test.creatinine || ''}
                onChange={(e) => onTestChange(index, 'creatinine', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Gravity
              </label>
              <input
                type="number"
                step="any"
                value={test.specificGravity || ''}
                onChange={(e) => onTestChange(index, 'specificGravity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                pH
              </label>
              <input
                type="number"
                step="any"
                value={test.pH || ''}
                onChange={(e) => onTestChange(index, 'pH', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter value"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adulteration Check
          </label>
          <select
            value={test.adulterationCheck || ''}
            onChange={(e) => onTestChange(index, 'adulterationCheck', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Normal">Normal</option>
            <option value="Suspicious">Suspicious</option>
            <option value="Invalid">Invalid</option>
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

// Confirmatory Toxicology Component
export const ConfirmatoryToxicologyInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Drug Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantitative Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cutoff Level</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.resultValue || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'resultValue', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter value"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">{param.unit || 'ng/mL'}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="any"
                    value={param.cutoffLevel || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'cutoffLevel', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                    placeholder="Enter cutoff"
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

// Therapeutic Drug Monitoring (TDM) Component
export const TherapeuticDrugMonitoringInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value, refRange, testType) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle ranges like "5–10 / Trough <2" or "10–20"
    if (refRange.includes('/')) {
      // For peak/trough ranges
      const parts = refRange.split('/');
      if (testType === 'Peak') {
        const peakMatch = parts[0].match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
        if (peakMatch) {
          const low = parseFloat(peakMatch[1]);
          const high = parseFloat(peakMatch[2]);
          if (numValue < low) return 'low';
          if (numValue > high) return 'high';
          return 'normal';
        }
      } else if (testType === 'Trough') {
        const troughMatch = parts[1].match(/<(\d+\.?\d*)/);
        if (troughMatch) {
          const threshold = parseFloat(troughMatch[1]);
          return numValue < threshold ? 'normal' : 'high';
        }
      }
    } else {
      // Regular range
      const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1]);
        const high = parseFloat(rangeMatch[2]);
        if (numValue < low) return 'low';
        if (numValue > high) return 'high';
        return 'normal';
      }
    }

    return 'normal';
  };

  const abnormality = calculateAbnormality(test.resultValue, test.referenceRange, test.tdmTestType);

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
            Drug Name
          </label>
          <input
            type="text"
            value={test.drugName || ''}
            onChange={(e) => onTestChange(index, 'drugName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter drug name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Type
            </label>
            <select
              value={test.tdmTestType || ''}
              onChange={(e) => onTestChange(index, 'tdmTestType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Trough">Trough</option>
              <option value="Peak">Peak</option>
              <option value="Random">Random</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Result Value
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={test.resultUnit || ''}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., µg/mL, ng/mL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Range
            </label>
            <input
              type="text"
              value={test.referenceRange || ''}
              onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., 10–20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time of Last Dose (required for interpretation)
          </label>
          <input
            type="datetime-local"
            value={test.timeOfLastDose || ''}
            onChange={(e) => onTestChange(index, 'timeOfLastDose', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          />
        </div>

        {abnormality !== 'normal' && test.resultValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag
            </label>
            <span className={`inline-block px-3 py-2 rounded text-sm font-medium ${
              abnormality === 'high' ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {abnormality === 'high' ? 'High' : 'Low'}
            </span>
          </div>
        )}

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

// Ethanol (Blood Alcohol Level) Input Component
export const EthanolInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // 0 mg/dL normal, 80 mg/dL = legally intoxicated
    if (numValue === 0) return 'normal';
    if (numValue >= 80) return 'high';
    return 'elevated';
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
              Ethanol Level
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
              value={test.resultUnit || 'mg/dL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="mg/dL">mg/dL</option>
              <option value="g/L">g/L</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            0 mg/dL (normal), 80 mg/dL = legally intoxicated (varies by country)
          </div>
        </div>

        {abnormality !== 'normal' && test.resultValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag
            </label>
            <span className={`inline-block px-3 py-2 rounded text-sm font-medium ${
              abnormality === 'high' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {abnormality === 'high' ? 'Legally Intoxicated (≥80 mg/dL)' : 'Elevated'}
            </span>
          </div>
        )}

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

// Breath Alcohol Input Component
export const BreathAlcoholInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Result (%BAC)
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
              Reference Range
            </label>
            <input
              type="text"
              value={test.referenceRange || ''}
              onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter reference"
            />
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

// Toxic Alcohols Panel Component
export const ToxicAlcoholsInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // For toxic alcohols, 0 is normal, anything above is abnormal
    if (refRange === '0' || refRange.trim() === '< 10') {
      if (numValue === 0 || (refRange.includes('<') && numValue < 10)) return 'normal';
      return 'high';
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

      <div className="space-y-4">
        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alcohol</th>
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
                        abnormality === 'high' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {abnormality === 'normal' ? 'N' : 'H'}
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
            Anion Gap (optional)
          </label>
          <input
            type="number"
            step="any"
            value={test.anionGap || ''}
            onChange={(e) => onTestChange(index, 'anionGap', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter anion gap"
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

// Heavy Metals Panel Component
export const HeavyMetalsPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle "< 5", "< 10", etc.
    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metal</th>
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
                      abnormality === 'high' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {abnormality === 'normal' ? 'N' : 'H'}
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

