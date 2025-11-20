import React from 'react';
import { X } from 'lucide-react';

// Glucose Monitoring (Glucometer) Component
export const GlucoseMonitoringPOCTInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value, testType) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Convert mmol/L to mg/dL if needed (assuming test.resultUnit contains the unit)
    let valueInMgdL = numValue;
    if (test.resultUnit === 'mmol/L') {
      valueInMgdL = numValue * 18.0182; // Conversion factor
    }

    if (testType === 'Fasting') {
      if (valueInMgdL >= 70 && valueInMgdL <= 100) return 'normal';
      if (valueInMgdL < 70) return 'low';
      return 'high';
    } else if (testType === 'Random' || testType === 'Post-prandial') {
      if (valueInMgdL < 200) return 'normal';
      return 'high';
    }

    return 'normal';
  };

  const abnormality = calculateAbnormality(test.resultValue, test.glucoseTestType);

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
              Glucose Value
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
              <option value="mmol/L">mmol/L</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Type
          </label>
          <select
            value={test.glucoseTestType || ''}
            onChange={(e) => onTestChange(index, 'glucoseTestType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Fasting">Fasting</option>
            <option value="Random">Random</option>
            <option value="Post-prandial">Post-prandial</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device ID (optional)
            </label>
            <input
              type="text"
              value={test.deviceId || ''}
              onChange={(e) => onTestChange(index, 'deviceId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter device ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Strip Lot (optional)
            </label>
            <input
              type="text"
              value={test.testStripLot || ''}
              onChange={(e) => onTestChange(index, 'testStripLot', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter lot number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            {test.glucoseTestType === 'Fasting' ? 'Fasting: 70–100 mg/dL' : 
             test.glucoseTestType === 'Random' ? 'Random: < 200 mg/dL' :
             test.glucoseTestType === 'Post-prandial' ? 'Post-prandial: < 200 mg/dL' :
             'Select test type'}
          </div>
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

// POCT HbA1c Component
export const POCTHbA1cInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Normal < 5.7%
    if (numValue < 5.7) return 'normal';
    if (numValue >= 5.7 && numValue < 6.5) return 'elevated'; // Prediabetes
    return 'high'; // Diabetes
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HbA1c (%)
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
            Lot Number (optional)
          </label>
          <input
            type="text"
            value={test.lotNumber || ''}
            onChange={(e) => onTestChange(index, 'lotNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter lot number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            Normal: &lt; 5.7%
          </div>
        </div>

        {abnormality !== 'normal' && test.resultValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diabetes Control Category
            </label>
            <span className={`inline-block px-3 py-2 rounded text-sm font-medium ${
              abnormality === 'elevated' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {abnormality === 'elevated' ? 'Prediabetes (5.7–6.4%)' : 'Diabetes (≥6.5%)'}
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

// POCT ABG (Arterial Blood Gas) Component
export const POCTABGInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle ranges like "7.35–7.45", "35–45", "-2 to +2"
    const rangeMatch = refRange.match(/([-+]?\d+\.?\d*)[–-]?to?[–-]?([-+]?\d+\.?\d*)/) || refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (numValue < low) return 'low';
      if (numValue > high) return 'high';
      return 'normal';
    }

    // Handle "< 2.0"
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

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Name
            </label>
            <input
              type="text"
              value={test.deviceName || ''}
              onChange={(e) => onTestChange(index, 'deviceName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., i-STAT, EPOS"
            />
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
              <option value="Arterial">Arterial</option>
              <option value="Venous">Venous</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temperature Correction (optional)
          </label>
          <input
            type="number"
            step="any"
            value={test.temperatureCorrection || ''}
            onChange={(e) => onTestChange(index, 'temperatureCorrection', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter temperature"
          />
        </div>

        <div className="mb-4">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
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

// Rapid Infectious Tests (POCT) Component
export const RapidInfectiousTestsPOCTInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            <option value="Invalid">Invalid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Control Line
          </label>
          <select
            value={test.controlLine || ''}
            onChange={(e) => onTestChange(index, 'controlLine', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specimen Type
          </label>
          <input
            type="text"
            value={test.specimenType || ''}
            onChange={(e) => onTestChange(index, 'specimenType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter specimen type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lot Number (optional)
          </label>
          <input
            type="text"
            value={test.lotNumber || ''}
            onChange={(e) => onTestChange(index, 'lotNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter lot number"
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

// POCT Cardiac Markers Component
export const POCTCardiacMarkersInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle "< 0.04", "< 6", "< 100", etc.
    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }

    return 'normal';
  };

  const abnormality = calculateAbnormality(test.resultValue, test.referenceRange);

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={test.resultUnit || ''}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., ng/mL, pg/mL"
            />
          </div>
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
            placeholder="e.g., < 0.04 ng/mL"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device ID
            </label>
            <input
              type="text"
              value={test.deviceId || ''}
              onChange={(e) => onTestChange(index, 'deviceId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter device ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time of Collection
            </label>
            <input
              type="datetime-local"
              value={test.timeOfCollection || ''}
              onChange={(e) => onTestChange(index, 'timeOfCollection', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            />
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

// Electrolytes (POCT) Component
export const ElectrolytesPOCTInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device ID
          </label>
          <input
            type="text"
            value={test.deviceId || ''}
            onChange={(e) => onTestChange(index, 'deviceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter device ID"
          />
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

// Urine POCT (Rapid Urine Stick) Component
export const UrinePOCTInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

  const getSelectOptions = (param) => {
    if (param.name.includes('pH') || param.name.includes('Specific gravity')) {
      return null; // These are numeric
    }
    
    if (param.name.includes('Nitrite')) {
      return ['Negative', 'Positive'];
    }
    
    // For Glucose, Protein, Ketones, Blood, Leukocyte esterase
    return ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const isNumeric = param.name.includes('pH') || param.name.includes('Specific gravity');
              const options = getSelectOptions(param);
              
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                  <td className="px-3 py-2">
                    {isNumeric ? (
                      <input
                        type="number"
                        step="any"
                        value={param.result || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="Enter value"
                      />
                    ) : (
                      <select
                        value={param.result || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'result', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        {options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
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

// Pregnancy Test (hCG POCT) Component
export const PregnancyTestPOCTInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            <option value="Invalid">Invalid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Control Line
          </label>
          <select
            value={test.controlLine || ''}
            onChange={(e) => onTestChange(index, 'controlLine', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
          </select>
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
            <option value="Urine">Urine</option>
            <option value="Whole blood">Whole blood</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lot Number
          </label>
          <input
            type="text"
            value={test.lotNumber || ''}
            onChange={(e) => onTestChange(index, 'lotNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter lot number"
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

// POCT Coagulation (INR Devices) Component
export const POCTCoagulationInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Normal: 0.8–1.2, Warfarin therapy: 2.0–3.0
    if (numValue >= 0.8 && numValue <= 1.2) return 'normal';
    if (numValue >= 2.0 && numValue <= 3.0) return 'therapeutic';
    if (numValue < 0.8) return 'low';
    if (numValue > 3.0) return 'high';
    return 'elevated';
  };

  const abnormality = calculateAbnormality(test.inrValue);

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
              INR Value
            </label>
            <input
              type="number"
              step="any"
              value={test.inrValue || ''}
              onChange={(e) => onTestChange(index, 'inrValue', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter INR"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PT Value (optional)
            </label>
            <input
              type="number"
              step="any"
              value={test.ptValue || ''}
              onChange={(e) => onTestChange(index, 'ptValue', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter PT"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device ID / Meter Serial
          </label>
          <input
            type="text"
            value={test.deviceId || ''}
            onChange={(e) => onTestChange(index, 'deviceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter device ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            Normal: INR 0.8–1.2 | Warfarin therapy: 2.0–3.0
          </div>
        </div>

        {abnormality !== 'normal' && test.inrValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <span className={`inline-block px-3 py-2 rounded text-sm font-medium ${
              abnormality === 'therapeutic' ? 'bg-green-100 text-green-800' :
              abnormality === 'elevated' ? 'bg-yellow-100 text-yellow-800' :
              abnormality === 'high' ? 'bg-red-100 text-red-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {abnormality === 'therapeutic' ? 'Therapeutic (Warfarin)' :
               abnormality === 'elevated' ? 'Elevated (1.2–2.0)' :
               abnormality === 'high' ? 'High (>3.0)' :
               'Low (<0.8)'}
            </span>
          </div>
        )}

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

// Other POCT Devices Component (CRP, ESR, Lactate, Blood Ketones, Microalbumin)
export const OtherPOCTDevicesInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value, refRange) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle "< 2.0", "< 0.6", etc.
    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }

    return 'normal';
  };

  const abnormality = calculateAbnormality(test.resultValue, test.referenceRange);

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={test.resultUnit || ''}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., mg/L, mm/hr, mmol/L"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range (optional)
          </label>
          <input
            type="text"
            value={test.referenceRange || ''}
            onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., < 2.0"
          />
        </div>

        {abnormality !== 'normal' && test.resultValue && test.referenceRange && (
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

