import React from 'react';
import { X } from 'lucide-react';

// Female Fertility Hormone Panel Component
export const FemaleFertilityHormonePanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle "< 1.5" format
    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }

    // Handle ranges like "3–10" or "30–120"
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cycle Day (Day 2/3 recommended)
          </label>
          <input
            type="number"
            value={test.cycleDay || ''}
            onChange={(e) => onTestChange(index, 'cycleDay', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter cycle day"
          />
        </div>

        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hormone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference (Follicular)</th>
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
    </div>
  );
};

// Male Fertility Hormone Panel Component
export const MaleFertilityHormonePanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hormone</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
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

// Ovarian Reserve Tests Component
export const OvarianReserveTestsInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle ranges like "8–15"
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cycle Day (Day 2–3 for FSH)
          </label>
          <input
            type="number"
            value={test.cycleDay || ''}
            onChange={(e) => onTestChange(index, 'cycleDay', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter cycle day"
          />
        </div>

        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {test.parameters?.map((param, pIdx) => {
                const abnormality = param.resultValue 
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
                          const newAbnormality = calculateAbnormality(newValue, param.ref);
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
    </div>
  );
};

// Progesterone Day 21 Test Component
export const ProgesteroneDay21Input = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // > 5 ng/mL indicates ovulation
    if (numValue > 5) return 'normal';
    return 'low';
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
              Progesterone Value
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
            <input
              type="text"
              value={test.resultUnit || 'ng/mL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cycle Day
          </label>
          <input
            type="number"
            value={test.cycleDay || ''}
            onChange={(e) => onTestChange(index, 'cycleDay', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter cycle day"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            &gt; 5 ng/mL indicates ovulation
          </div>
        </div>

        {abnormality !== 'normal' && test.resultValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag
            </label>
            <span className="inline-block px-3 py-2 rounded text-sm font-medium bg-orange-100 text-orange-800">
              Low (may indicate no ovulation)
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

// LH Surge Test Component
export const LHSurgeTestInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Result
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

// Estradiol Rising Pattern Component
export const EstradiolRisingPatternInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Estradiol (E2) Value
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
              Cycle Day
            </label>
            <input
              type="number"
              value={test.cycleDay || ''}
              onChange={(e) => onTestChange(index, 'cycleDay', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter cycle day"
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

// Semen Analysis Component
export const SemenAnalysisInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle "≥ 1.5", "≥ 15", "≥ 32%", etc.
    if (refRange.trim().startsWith('≥')) {
      const threshold = parseFloat(refRange.replace('≥', '').trim());
      if (!isNaN(threshold)) {
        return numValue >= threshold ? 'normal' : 'low';
      }
    }

    // Handle ranges like "7.2–8.0"
    const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (numValue < low) return 'low';
      if (numValue > high) return 'high';
      return 'normal';
    }

    // Handle "< 60 min"
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

      <div className="space-y-6">
        {/* A. Semen Physical Properties */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">A. Semen Physical Properties</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume (mL)
              </label>
              <input
                type="number"
                step="any"
                value={test.volume || ''}
                onChange={(e) => onTestChange(index, 'volume', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter volume"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: ≥ 1.5 mL</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <select
                value={test.color || ''}
                onChange={(e) => onTestChange(index, 'color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Gray">Gray</option>
                <option value="White">White</option>
                <option value="Yellow">Yellow</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Viscosity
              </label>
              <select
                value={test.viscosity || ''}
                onChange={(e) => onTestChange(index, 'viscosity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liquefaction Time (minutes)
              </label>
              <input
                type="number"
                step="any"
                value={test.liquefactionTime || ''}
                onChange={(e) => onTestChange(index, 'liquefactionTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter time"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: &lt; 60 min</div>
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
                placeholder="Enter pH"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: 7.2–8.0</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Odor (optional)
              </label>
              <select
                value={test.odor || ''}
                onChange={(e) => onTestChange(index, 'odor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Normal">Normal</option>
                <option value="Abnormal">Abnormal</option>
              </select>
            </div>
          </div>
        </div>

        {/* B. Sperm Concentration */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">B. Sperm Concentration</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concentration (million/mL)
              </label>
              <input
                type="number"
                step="any"
                value={test.concentration || ''}
                onChange={(e) => onTestChange(index, 'concentration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter concentration"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: ≥ 15</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Sperm Count (million/ejaculate)
              </label>
              <input
                type="number"
                step="any"
                value={test.totalSpermCount || ''}
                onChange={(e) => onTestChange(index, 'totalSpermCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter total count"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: ≥ 39</div>
            </div>
          </div>
        </div>

        {/* C. Motility */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">C. Motility</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progressive Motility (%)
              </label>
              <input
                type="number"
                step="any"
                value={test.progressiveMotility || ''}
                onChange={(e) => onTestChange(index, 'progressiveMotility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter %"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: ≥ 32%</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Non-Progressive (%)
              </label>
              <input
                type="number"
                step="any"
                value={test.nonProgressive || ''}
                onChange={(e) => onTestChange(index, 'nonProgressive', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter %"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Immotile (%)
              </label>
              <input
                type="number"
                step="any"
                value={test.immotile || ''}
                onChange={(e) => onTestChange(index, 'immotile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter %"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Motility (%)
              </label>
              <input
                type="number"
                step="any"
                value={test.totalMotility || ''}
                onChange={(e) => onTestChange(index, 'totalMotility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter %"
              />
              <div className="text-xs text-gray-500 mt-1">Reference: ≥ 40%</div>
            </div>
          </div>
        </div>

        {/* D. Morphology */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">D. Morphology</h5>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normal Forms (%)
            </label>
            <input
              type="number"
              step="any"
              value={test.normalForms || ''}
              onChange={(e) => onTestChange(index, 'normalForms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
            <div className="text-xs text-gray-500 mt-1">Reference: ≥ 4% (strict Kruger)</div>
          </div>
        </div>

        {/* E. Vitality */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">E. Vitality</h5>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Percentage Alive (%)
            </label>
            <input
              type="number"
              step="any"
              value={test.vitality || ''}
              onChange={(e) => onTestChange(index, 'vitality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
            <div className="text-xs text-gray-500 mt-1">Reference: ≥ 58%</div>
          </div>
        </div>

        {/* F. Other Microscopic Findings */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">F. Other Microscopic Findings</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Round Cells
              </label>
              <input
                type="number"
                step="any"
                value={test.roundCells || ''}
                onChange={(e) => onTestChange(index, 'roundCells', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WBCs
              </label>
              <input
                type="number"
                step="any"
                value={test.wbcs || ''}
                onChange={(e) => onTestChange(index, 'wbcs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agglutination
              </label>
              <select
                value={test.agglutination || ''}
                onChange={(e) => onTestChange(index, 'agglutination', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debris
              </label>
              <select
                value={test.debris || ''}
                onChange={(e) => onTestChange(index, 'debris', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crystals
              </label>
              <select
                value={test.crystals || ''}
                onChange={(e) => onTestChange(index, 'crystals', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {/* G. Interpretation */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">G. Interpretation</h5>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="4"
            placeholder="Enter interpretation (e.g., Normozoospermia, Oligozoospermia, Asthenozoospermia, Teratozoospermia, Azoospermia)..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

