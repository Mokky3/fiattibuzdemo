import React from 'react';
import { X } from 'lucide-react';
import {
  UrineDipstickInput,
  UrineMicroscopyInput,
  Urine24HourInput,
  UrineUPCRInput,
  UrineMicroalbuminInput,
  ThyroidPanelInput,
  FemaleReproductiveHormonesInput,
  MaleReproductiveHormonesInput,
  CortisolInput,
  ACTHInput,
  DHEASInput,
  GrowthHormoneInput,
  IGF1Input,
  MetabolicHormonesInput,
  BetaHCGQuantitativeInput,
  HCGQualitativeInput,
  GITumorMarkersInput,
  PSAPanelInput,
  TesticularCancerMarkersInput,
  BloodGroupRhInput,
  AntibodyScreeningInput,
  CrossmatchInput,
  DirectCoombsInput,
  IndirectCoombsInput,
  MajorMinorCrossmatchInput,
  DonorScreeningInput
} from './TestInputComponentsExtended';
import {
  BasicCoagulationPanelInput,
  DDimerInput,
  CoagulationFactorAssaysInput,
  MixingStudiesInput,
  BleedingProfileInput
} from './TestInputComponentsCoagulation';
import {
  UrineDrugScreeningInput,
  ConfirmatoryToxicologyInput,
  TherapeuticDrugMonitoringInput,
  EthanolInput,
  BreathAlcoholInput,
  ToxicAlcoholsInput,
  HeavyMetalsPanelInput
} from './TestInputComponentsToxicology';
import {
  FemaleFertilityHormonePanelInput,
  MaleFertilityHormonePanelInput,
  OvarianReserveTestsInput,
  ProgesteroneDay21Input,
  LHSurgeTestInput,
  EstradiolRisingPatternInput,
  SemenAnalysisInput
} from './TestInputComponentsFertility';
import {
  RespiratoryPCRPanelInput,
  GastrointestinalPCRPanelInput,
  UrogenitalSTIPCRPanelInput,
  TBMycobacteriaPCRInput,
  HepatitisViralLoadInput,
  HIVViralLoadInput,
  HPVPCRGenotypingInput,
  COVID19PCRInput,
  OncologyMolecularPanelsInput
} from './TestInputComponentsMolecular';
import {
  GlucoseMonitoringPOCTInput,
  POCTHbA1cInput,
  POCTABGInput,
  RapidInfectiousTestsPOCTInput,
  POCTCardiacMarkersInput,
  ElectrolytesPOCTInput,
  UrinePOCTInput,
  PregnancyTestPOCTInput,
  POCTCoagulationInput,
  OtherPOCTDevicesInput
} from './TestInputComponentsPOCT';
import {
  LymphocyteSubsetPanelInput,
  LeukemiaLymphomaImmunophenotypingInput,
  HLAB27FlowCytometryInput,
  StemCellEnumerationInput,
  MinimalResidualDiseaseInput,
  PNHPanelInput
} from './TestInputComponentsFlowCytometry';
import {
  ConventionalKaryotypingInput,
  RapidAneuploidyDetectionInput,
  FISHPanelsInput,
  ChromosomalMicroarrayInput,
  PrenatalCytogeneticsInput,
  PostnatalConstitutionalCytogeneticsInput,
  OncologyCytogeneticsInput
} from './TestInputComponentsCytogenetics';

// Helper function to calculate abnormality (needs to be passed from parent or defined here)
const calculateAbnormality = (value, refRange, gender) => {
  if (!value || !refRange) return 'normal';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'normal';

  let low = null;
  let high = null;

  // Handle gender-specific ranges (e.g., "M:13–17; F:12–15.5")
  if (refRange.includes('M:') && refRange.includes('F:')) {
    const parts = refRange.split(';');
    let genderPart = '';
    if (gender === 'male' || gender === 'M') {
      genderPart = parts.find(p => p.trim().startsWith('M:'));
    } else if (gender === 'female' || gender === 'F') {
      genderPart = parts.find(p => p.trim().startsWith('F:'));
    }
    if (genderPart) {
      const rangeMatch = genderPart.match(/(\d+\.?\d*)–(\d+\.?\d*)/);
      if (rangeMatch) {
        low = parseFloat(rangeMatch[1]);
        high = parseFloat(rangeMatch[2]);
      }
    }
  } else {
    // Handle ranges like "-2 to +2" (for Base Excess)
    const toRangeMatch = refRange.match(/(-?\d+\.?\d*)\s+to\s+(\+?-?\d+\.?\d*)/i);
    if (toRangeMatch) {
      low = parseFloat(toRangeMatch[1]);
      high = parseFloat(toRangeMatch[2].replace('+', ''));
      if (!isNaN(low) && !isNaN(high)) {
        if (numValue < low) return 'low';
        if (numValue > high) return 'high';
        return 'normal';
      }
    }
    
    // Single range (supports both "–" and "-" as separators)
    const rangeMatch = refRange.match(/(\d+\.?\d*)[–-](\d+\.?\d*)/);
    if (rangeMatch) {
      low = parseFloat(rangeMatch[1]);
      high = parseFloat(rangeMatch[2]);
    } else if (refRange.trim().startsWith('>')) {
      const threshold = parseFloat(refRange.replace('>', '').trim());
      if (!isNaN(threshold)) {
        return numValue > threshold ? 'normal' : 'low';
      }
    } else if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }
  }

  if (low === null || high === null) return 'normal';

  if (numValue < low) return 'low';
  if (numValue > high) return 'high';
  return 'normal';
};

// Panel CBC Component
export const PanelCBCInput = ({ test, index, onRemove, onParameterChange, patient }) => {
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
                      value={param.resultValue}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
                        onParameterChange(index, pIdx, 'resultValue', newValue);
                        onParameterChange(index, pIdx, 'abnormalityType', newAbnormality);
                        onParameterChange(index, pIdx, 'isAbnormal', newAbnormality !== 'normal');
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
          Interpretation (optional)
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onParameterChange(index, null, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Add interpretation or notes..."
        ></textarea>
      </div>
    </div>
  );
};

// Panel WBC Differential Component
export const PanelWBCDiffInput = ({ test, index, onRemove, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">% Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Absolute (×10³/µL)</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range (%)</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => {
              const abnormality = param.percentValue 
                ? calculateAbnormality(param.percentValue, param.ref_percent, patient?.gender)
                : 'normal';
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={param.percentValue}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = calculateAbnormality(newValue, param.ref_percent, patient?.gender);
                        onParameterChange(index, pIdx, 'percentValue', newValue);
                        onParameterChange(index, pIdx, 'abnormalityType', newAbnormality);
                        onParameterChange(index, pIdx, 'isAbnormal', newAbnormality !== 'normal');
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      placeholder="Enter %"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={param.absoluteValue}
                      onChange={(e) => onParameterChange(index, pIdx, 'absoluteValue', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      placeholder="Optional"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.ref_percent || '-'}</td>
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
          Interpretation (optional)
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onParameterChange(index, null, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Add interpretation or notes..."
        ></textarea>
      </div>
    </div>
  );
};

// Panel Numeric Component (for panels like LFT, RFT, etc.)
export const PanelNumericInput = ({ test, index, onRemove, onParameterChange, patient }) => {
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
                      value={param.resultValue}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
                        onParameterChange(index, pIdx, 'resultValue', newValue);
                        onParameterChange(index, pIdx, 'abnormalityType', newAbnormality);
                        onParameterChange(index, pIdx, 'isAbnormal', newAbnormality !== 'normal');
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
          Interpretation (optional)
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onParameterChange(index, null, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Add interpretation or notes..."
        ></textarea>
      </div>
    </div>
  );
};

// Panel Platelet Component
export const PanelPlateletInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
            {test.numericParameters?.map((param, pIdx) => {
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
                      value={param.resultValue}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newAbnormality = calculateAbnormality(newValue, param.ref, patient?.gender);
                        onParameterChange(index, pIdx, 'resultValue', newValue);
                        onParameterChange(index, pIdx, 'abnormalityType', newAbnormality);
                        onParameterChange(index, pIdx, 'isAbnormal', newAbnormality !== 'normal');
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

      <div className="mb-4 space-y-3">
        <h5 className="text-sm font-medium text-gray-700">Morphology</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platelet Size</label>
            <select
              value={test.plateletSize || 'normal'}
              onChange={(e) => onTestChange(index, 'plateletSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="giant">Giant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platelet Clumping</label>
            <select
              value={test.plateletClumping || 'absent'}
              onChange={(e) => onTestChange(index, 'plateletClumping', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="absent">Absent</option>
              <option value="present">Present</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platelet Estimate</label>
            <select
              value={test.plateletEstimate || 'normal'}
              onChange={(e) => onTestChange(index, 'plateletEstimate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="decreased">Decreased</option>
              <option value="normal">Normal</option>
              <option value="increased">Increased</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Morphology Comment</label>
          <textarea
            value={test.morphologyComment || ''}
            onChange={(e) => onTestChange(index, 'morphologyComment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Additional morphology notes..."
          ></textarea>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interpretation (optional)
        </label>
        <textarea
          value={test.interpretation || ''}
          onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Add interpretation or notes..."
        ></textarea>
      </div>
    </div>
  );
};

// Morphology Panel Component
export const MorphologyPanelInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const rbcOptions = ['Normocytic / normochromic', 'Microcytosis', 'Macrocytosis', 'Hypochromia', 'Anisocytosis', 'Poikilocytosis', 'Target cells', 'Schistocytes', 'Spherocytes', 'Tear-drop cells', 'Nucleated RBCs'];
  const wbcOptions = ['Left shift / immature cells', 'Toxic granulation', 'Hypersegmented neutrophils', 'Atypical / reactive lymphocytes'];
  
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
          <label className="block text-sm font-medium text-gray-700 mb-2">RBC Morphology (multi-select)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {rbcOptions.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(test.rbcMorphology || []).includes(option)}
                  onChange={(e) => {
                    const current = test.rbcMorphology || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter(item => item !== option);
                    onTestChange(index, 'rbcMorphology', updated);
                  }}
                  className="rounded border-gray-300 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">WBC Morphology (multi-select)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {wbcOptions.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(test.wbcMorphology || []).includes(option)}
                  onChange={(e) => {
                    const current = test.wbcMorphology || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter(item => item !== option);
                    onTestChange(index, 'wbcMorphology', updated);
                  }}
                  className="rounded border-gray-300 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platelet Morphology</label>
          <select
            value={test.plateletMorphology || 'normal'}
            onChange={(e) => onTestChange(index, 'plateletMorphology', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="normal">Normal</option>
            <option value="decreased">Decreased</option>
            <option value="increased">Increased</option>
            <option value="giant">Giant Platelets</option>
            <option value="clumps">Platelet Clumps</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overall Smear Impression
          </label>
          <textarea
            value={test.overallImpression || ''}
            onChange={(e) => onTestChange(index, 'overallImpression', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="4"
            placeholder="Free-text summary / diagnosis..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Structured Text Report Component (Bone Marrow Examination)
export const StructuredTextReportInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Indication / Clinical History</label>
          <textarea
            value={test.indication || ''}
            onChange={(e) => onTestChange(index, 'indication', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Enter indication or clinical history..."
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cellularity</label>
            <select
              value={test.cellularity || 'normo'}
              onChange={(e) => onTestChange(index, 'cellularity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="hypo">Hypo</option>
              <option value="normo">Normo</option>
              <option value="hyper">Hyper</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Myeloid : Erythroid (M:E) Ratio</label>
            <input
              type="text"
              value={test.meRatio || ''}
              onChange={(e) => onTestChange(index, 'meRatio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., 3:1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blast Percentage (%)</label>
            <input
              type="number"
              step="any"
              value={test.blastPercentage || ''}
              onChange={(e) => onTestChange(index, 'blastPercentage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megakaryocytes</label>
            <select
              value={test.megakaryocytes || 'normal'}
              onChange={(e) => onTestChange(index, 'megakaryocytes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="increased">Increased</option>
              <option value="normal">Normal</option>
              <option value="decreased">Decreased</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Erythroid Series</label>
          <textarea
            value={test.erythroidSeries || ''}
            onChange={(e) => onTestChange(index, 'erythroidSeries', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Comment on erythroid series..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Myeloid Series</label>
          <textarea
            value={test.myeloidSeries || ''}
            onChange={(e) => onTestChange(index, 'myeloidSeries', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Comment on myeloid series..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Megakaryocytes Comment</label>
          <textarea
            value={test.megakaryocytesComment || ''}
            onChange={(e) => onTestChange(index, 'megakaryocytesComment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Additional megakaryocyte notes..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lymphoid / Plasma Cells</label>
          <textarea
            value={test.lymphoidPlasmaCells || ''}
            onChange={(e) => onTestChange(index, 'lymphoidPlasmaCells', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Comment on lymphoid/plasma cells..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Iron Stores</label>
          <input
            type="text"
            value={test.ironStores || ''}
            onChange={(e) => onTestChange(index, 'ironStores', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., 0-4, present, absent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Interpretation / Diagnosis
          </label>
          <textarea
            value={test.finalInterpretation || ''}
            onChange={(e) => onTestChange(index, 'finalInterpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="4"
            placeholder="Enter final interpretation or diagnosis..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Culture Panel Component (complex with multiple culture types)
export const CulturePanelInput = ({ test, index, onRemove, onTestChange, patient, setFormData }) => {
  const handleASTChange = (astIndex, value) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.map((t, i) => 
        i === index ? {
          ...t,
          astResults: t.astResults.map((ast, aIdx) => 
            aIdx === astIndex ? { ...ast, result: value } : ast
          )
        } : t
      )
    }));
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
        {/* Blood Culture Specific Fields */}
        {test.cultureType === 'blood' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Culture Result
              </label>
              <select
                value={test.cultureResult || ''}
                onChange={(e) => onTestChange(index, 'cultureResult', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="No growth">No growth</option>
                <option value="Growth detected">Growth detected</option>
                <option value="Contaminant suspected">Contaminant suspected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time to Positivity (hours, optional)
              </label>
              <input
                type="number"
                value={test.timeToPositivity || ''}
                onChange={(e) => onTestChange(index, 'timeToPositivity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter hours"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gram Stain Result
              </label>
              <select
                value={test.gramStain || ''}
                onChange={(e) => onTestChange(index, 'gramStain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Gram-positive cocci">Gram-positive cocci</option>
                <option value="Gram-negative rods">Gram-negative rods</option>
                <option value="Yeast">Yeast</option>
                <option value="Mixed">Mixed</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
          </>
        )}

        {/* Urine Culture Specific Fields */}
        {test.cultureType === 'urine' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colony Count (CFU/mL)
              </label>
              <input
                type="text"
                value={test.colonyCount || ''}
                onChange={(e) => onTestChange(index, 'colonyCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="e.g., >100,000 CFU/mL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Growth Pattern
              </label>
              <select
                value={test.growthPattern || ''}
                onChange={(e) => onTestChange(index, 'growthPattern', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Significant growth">Significant growth</option>
                <option value="Mixed flora">Mixed flora</option>
                <option value="Contaminants">Contaminants</option>
                <option value="No pathogen isolated">No pathogen isolated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gram Stain (optional)
              </label>
              <select
                value={test.gramStain || ''}
                onChange={(e) => onTestChange(index, 'gramStain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="G+ rods">G+ rods</option>
                <option value="G– rods">G– rods</option>
                <option value="Yeast">Yeast</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
          </>
        )}

        {/* Stool Culture Specific Fields */}
        {test.cultureType === 'stool' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pathogen Detected (multi-select)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Salmonella', 'Shigella', 'Campylobacter', 'Vibrio cholerae', 'E. coli (EHEC)', 'No enteric pathogen detected'].map(pathogen => (
                  <label key={pathogen} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(test.pathogenDetected || []).includes(pathogen)}
                      onChange={(e) => {
                        const current = test.pathogenDetected || [];
                        const updated = e.target.checked
                          ? [...current, pathogen]
                          : current.filter(item => item !== pathogen);
                        onTestChange(index, 'pathogenDetected', updated);
                      }}
                      className="rounded border-gray-300 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                    />
                    <span className="text-sm text-gray-700">{pathogen}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ova and Parasites
              </label>
              <select
                value={test.ovaParasites || ''}
                onChange={(e) => onTestChange(index, 'ovaParasites', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="None">None</option>
                <option value="Giardia">Giardia</option>
                <option value="Entamoeba">Entamoeba</option>
                <option value="Trichuris">Trichuris</option>
                <option value="Ascaris">Ascaris</option>
                <option value="Hookworm">Hookworm</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WBC per HPF
                </label>
                <input
                  type="number"
                  value={test.wbcPerHPF || ''}
                  onChange={(e) => onTestChange(index, 'wbcPerHPF', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RBC per HPF
                </label>
                <input
                  type="number"
                  value={test.rbcPerHPF || ''}
                  onChange={(e) => onTestChange(index, 'rbcPerHPF', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter number"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  H. pylori Ag
                </label>
                <select
                  value={test.hPyloriAg || ''}
                  onChange={(e) => onTestChange(index, 'hPyloriAg', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giardia Ag
                </label>
                <select
                  value={test.giardiaAg || ''}
                  onChange={(e) => onTestChange(index, 'giardiaAg', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotavirus Ag
                </label>
                <select
                  value={test.rotavirusAg || ''}
                  onChange={(e) => onTestChange(index, 'rotavirusAg', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Sputum Culture Specific Fields */}
        {test.cultureType === 'sputum' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality of Specimen
              </label>
              <select
                value={test.specimenQuality || ''}
                onChange={(e) => onTestChange(index, 'specimenQuality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Good quality">Good quality</option>
                <option value="Saliva contamination">Saliva contamination</option>
                <option value="Poor sample">Poor sample</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gram Stain (multi-select)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Gram + cocci', 'Gram – rods', 'Many PMNs', 'Few epithelial cells', 'Yeast'].map(option => (
                  <label key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(test.gramStainMulti || []).includes(option)}
                      onChange={(e) => {
                        const current = test.gramStainMulti || [];
                        const updated = e.target.checked
                          ? [...current, option]
                          : current.filter(item => item !== option);
                        onTestChange(index, 'gramStainMulti', updated);
                      }}
                      className="rounded border-gray-300 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Growth Level
              </label>
              <select
                value={test.growthLevel || ''}
                onChange={(e) => onTestChange(index, 'growthLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Scanty">Scanty</option>
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>
          </>
        )}

        {/* Wound Culture Specific Fields */}
        {test.cultureType === 'wound' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gram Stain (multi-select)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Gram + cocci', 'Gram – rods', 'Mixed flora', 'Fungi / yeast'].map(option => (
                  <label key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(test.gramStainMulti || []).includes(option)}
                      onChange={(e) => {
                        const current = test.gramStainMulti || [];
                        const updated = e.target.checked
                          ? [...current, option]
                          : current.filter(item => item !== option);
                        onTestChange(index, 'gramStainMulti', updated);
                      }}
                      className="rounded border-gray-300 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Growth Type
              </label>
              <select
                value={test.growthType || ''}
                onChange={(e) => onTestChange(index, 'growthType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Aerobic">Aerobic</option>
                <option value="Anaerobic">Anaerobic</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Growth Amount
              </label>
              <select
                value={test.growthAmount || ''}
                onChange={(e) => onTestChange(index, 'growthAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Scanty">Scanty</option>
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wound Type (optional)
              </label>
              <select
                value={test.woundType || ''}
                onChange={(e) => onTestChange(index, 'woundType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Diabetic ulcer">Diabetic ulcer</option>
                <option value="Surgical site infection">Surgical site infection</option>
                <option value="Abscess">Abscess</option>
                <option value="Cellulitis">Cellulitis</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </>
        )}

        {/* Common Fields for All Culture Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organism Identified
          </label>
          <input
            type="text"
            value={test.organism || ''}
            onChange={(e) => onTestChange(index, 'organism', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., E. coli, S. aureus, Klebsiella pneumoniae"
          />
        </div>

        {/* AST Panel - Common for All */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Antibiotic Sensitivity Testing (AST)
          </label>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Antibiotic</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {test.astResults?.map((ast, astIdx) => (
                  <tr key={astIdx}>
                    <td className="px-3 py-2 text-sm text-gray-900">{ast.antibiotic}</td>
                    <td className="px-3 py-2">
                      <select
                        value={ast.result || ''}
                        onChange={(e) => handleASTChange(astIdx, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="S">S (Sensitive)</option>
                        <option value="I">I (Intermediate)</option>
                        <option value="R">R (Resistant)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interpretation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Interpretation
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="4"
            placeholder="Enter final interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Qualitative with Titer Component (ANA)
export const QualitativeWithTiterInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            ANA Result
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

        {test.result === 'Positive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titer (optional)
              </label>
              <select
                value={test.titer || ''}
                onChange={(e) => onTestChange(index, 'titer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="1:40">1:40</option>
                <option value="1:80">1:80</option>
                <option value="1:160">1:160</option>
                <option value="1:320">1:320</option>
                <option value="1:640">1:640</option>
                <option value=">1:640">&gt;1:640</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern
              </label>
              <select
                value={test.pattern || ''}
                onChange={(e) => onTestChange(index, 'pattern', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Homogeneous">Homogeneous</option>
                <option value="Speckled">Speckled</option>
                <option value="Nucleolar">Nucleolar</option>
                <option value="Centromere">Centromere</option>
                <option value="Cytoplasmic">Cytoplasmic</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </>
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

// Numeric or Qualitative Component (Anti-dsDNA)
export const NumericOrQualitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const abnormality = test.resultValue 
    ? calculateAbnormality(test.resultValue, test.referenceRange, patient?.gender)
    : 'normal';

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Result Value
          </label>
          <input
            type="number"
            step="any"
            value={test.resultValue || ''}
            onChange={(e) => {
              onTestChange(index, 'resultValue', e.target.value);
            }}
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
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <input
            type="text"
            value={test.referenceRange || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flag
          </label>
          <span className={`inline-block px-3 py-2 rounded text-sm font-medium ${
            abnormality === 'normal' ? 'bg-green-100 text-green-800' :
            abnormality === 'high' ? 'bg-yellow-100 text-yellow-800' :
            abnormality === 'low' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {abnormality === 'normal' ? 'Normal' : abnormality === 'high' ? 'High' : 'Low'}
          </span>
        </div>
        <div className="col-span-2">
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

// Numeric Single Component (with special case for SPECIFIC_IGE)
export const NumericSingleInput = ({ test, index, onRemove, onTestChange, patient }) => {
  // Special case for Specific IgE Test
  if (test.testCode === 'SPECIFIC_IGE') {
    const calculateIgEClass = (value) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return '';
      if (numValue < 0.35) return 'Class 0';
      if (numValue < 0.70) return 'Class 1';
      if (numValue < 3.50) return 'Class 2';
      if (numValue < 17.50) return 'Class 3';
      return 'Class 4+';
    };

    const igeClass = test.resultValue ? calculateIgEClass(test.resultValue) : '';

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
              Allergen Name
            </label>
            <input
              type="text"
              value={test.allergenName || ''}
              onChange={(e) => onTestChange(index, 'allergenName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., lactose, egg white, peanuts, dust mite"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IgE Value (kU/L)
              </label>
              <input
                type="number"
                step="any"
                value={test.resultValue || ''}
                onChange={(e) => {
                  onTestChange(index, 'resultValue', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class (auto-calculated)
              </label>
              <input
                type="text"
                value={igeClass}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
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
  }

  // Standard numeric_single template
  const abnormality = test.resultValue 
    ? calculateAbnormality(test.resultValue, test.referenceRange, patient?.gender)
    : 'normal';
  
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Result Value
          </label>
          <input
            type="number"
            step="any"
            value={test.resultValue}
            onChange={(e) => {
              const newValue = e.target.value;
              const newAbnormality = calculateAbnormality(newValue, test.referenceRange, patient?.gender);
              onTestChange(index, 'resultValue', newValue);
              onTestChange(index, 'abnormalityType', newAbnormality);
              onTestChange(index, 'isAbnormal', newAbnormality !== 'normal');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter result value"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <input
            type="text"
            value={test.resultUnit}
            readOnly
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <input
            type="text"
            value={test.referenceRange}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abnormality
          </label>
          <select
            value={test.abnormalityType || abnormality}
            onChange={(e) => {
              onTestChange(index, 'abnormalityType', e.target.value);
              onTestChange(index, 'isAbnormal', e.target.value !== 'normal');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="low">Low</option>
            <option value="critical_high">Critical High</option>
            <option value="critical_low">Critical Low</option>
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={test.isAbnormal || false}
            onChange={(e) => onTestChange(index, 'isAbnormal', e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">Abnormal?</label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={test.isCritical || false}
            onChange={(e) => onTestChange(index, 'isCritical', e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">Critical?</label>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation (optional)
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="Add interpretation or notes..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Qualitative Test Component (Rapid Micro Tests)
export const QualitativeTestInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Test Type
          </label>
          <select
            value={test.testTypeSelected || ''}
            onChange={(e) => onTestChange(index, 'testTypeSelected', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            {test.testTypes?.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

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
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Line Intensity (optional)
          </label>
          <select
            value={test.lineIntensity || ''}
            onChange={(e) => onTestChange(index, 'lineIntensity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Weak">Weak</option>
            <option value="Moderate">Moderate</option>
            <option value="Strong">Strong</option>
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
            <option value="Nasopharyngeal swab">Nasopharyngeal swab</option>
            <option value="Oropharyngeal swab">Oropharyngeal swab</option>
            <option value="Stool">Stool</option>
            <option value="Blood">Blood</option>
            <option value="Urine">Urine</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Internal Control
          </label>
          <select
            value={test.internalControl || ''}
            onChange={(e) => onTestChange(index, 'internalControl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation / Notes
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter interpretation or notes..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Qualitative Component (AFB Smear)
export const QualitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Smear Result
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

        {test.result === 'Positive' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AFB Grading
            </label>
            <select
              value={test.grading || ''}
              onChange={(e) => onTestChange(index, 'grading', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Scanty">Scanty</option>
              <option value="1+">1+</option>
              <option value="2+">2+</option>
              <option value="3+">3+</option>
            </select>
          </div>
        )}

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
            <option value="Gastric aspirate">Gastric aspirate</option>
            <option value="BAL">BAL</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Molecular Panel Component (GeneXpert MTB/RIF)
export const MolecularPanelInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            value={test.parameters?.find(p => p.code === 'MTB')?.result || ''}
            onChange={(e) => {
              const updatedParams = test.parameters?.map(p => 
                p.code === 'MTB' ? { ...p, result: e.target.value } : p
              ) || [];
              onTestChange(index, 'parameters', updatedParams);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Detected">Detected</option>
            <option value="Not detected">Not detected</option>
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rifampicin Resistance
          </label>
          <select
            value={test.parameters?.find(p => p.code === 'RIF')?.result || ''}
            onChange={(e) => {
              const updatedParams = test.parameters?.map(p => 
                p.code === 'RIF' ? { ...p, result: e.target.value } : p
              ) || [];
              onTestChange(index, 'parameters', updatedParams);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Detected">Detected</option>
            <option value="Not detected">Not detected</option>
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semi-Quantitative Category
          </label>
          <select
            value={test.semiQuantCategory || ''}
            onChange={(e) => onTestChange(index, 'semiQuantCategory', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Very low">Very low</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ct MTB (optional)
            </label>
            <input
              type="number"
              step="any"
              value={test.parameters?.find(p => p.code === 'MTB')?.ctValue || ''}
              onChange={(e) => {
                const updatedParams = test.parameters?.map(p => 
                  p.code === 'MTB' ? { ...p, ctValue: e.target.value } : p
                ) || [];
                onTestChange(index, 'parameters', updatedParams);
              }}
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
              value={test.parameters?.find(p => p.code === 'RIF')?.ctValue || ''}
              onChange={(e) => {
                const updatedParams = test.parameters?.map(p => 
                  p.code === 'RIF' ? { ...p, ctValue: e.target.value } : p
                ) || [];
                onTestChange(index, 'parameters', updatedParams);
              }}
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
            Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Qualitative or Culture Component (Throat/Nasal Swab)
export const QualitativeOrCultureInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Test Type
          </label>
          <select
            value={test.testTypeSelected || ''}
            onChange={(e) => onTestChange(index, 'testTypeSelected', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            {test.testTypes?.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {test.testTypeSelected && test.testTypeSelected.includes('Rapid') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualitative Result
            </label>
            <select
              value={test.result || ''}
              onChange={(e) => onTestChange(index, 'result', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Indeterminate">Indeterminate</option>
            </select>
          </div>
        )}

        {test.testTypeSelected && test.testTypeSelected.includes('Culture') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Culture Result
              </label>
              <select
                value={test.cultureResult || ''}
                onChange={(e) => onTestChange(index, 'cultureResult', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="No significant growth">No significant growth</option>
                <option value="Pathogen isolated">Pathogen isolated</option>
                <option value="Normal flora">Normal flora</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organism Identified
              </label>
              <input
                type="text"
                value={test.organism || ''}
                onChange={(e) => onTestChange(index, 'organism', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="e.g., Streptococcus pyogenes, MRSA"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detected Organism (if applicable)
          </label>
          <input
            type="text"
            value={test.detectedOrganism || ''}
            onChange={(e) => onTestChange(index, 'detectedOrganism', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="e.g., Streptococcus pyogenes, MRSA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation / Remarks
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter interpretation or remarks..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Panel Qualitative Input Component (for Hepatitis B Panel, TORCH, etc.)
export const PanelQualitativeInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const handleParameterChange = (paramIndex, field, value) => {
    if (onParameterChange) {
      onParameterChange(index, paramIndex, field, value);
    } else {
      // Fallback: update via onTestChange
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              {test.parameters?.some(p => p.type === 'numeric') && (
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  {param.type === 'numeric' ? (
                    <input
                      type="number"
                      step="any"
                      value={param.numericValue || ''}
                      onChange={(e) => handleParameterChange(pIdx, 'numericValue', e.target.value)}
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
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      {param.allowIndeterminate && <option value="Indeterminate">Indeterminate</option>}
                    </select>
                  )}
                </td>
                {test.parameters?.some(p => p.type === 'numeric') && (
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {param.type === 'numeric' && param.unit ? param.unit : '-'}
                  </td>
                )}
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

// Qualitative or Numeric Input Component (for COVID Serology, Parasitic Serology, H. pylori)
export const QualitativeOrNumericInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
        {/* For COVID Serology */}
        {test.testSubtype === 'covid' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgM Result
                </label>
                <select
                  value={test.igmResult || ''}
                  onChange={(e) => onTestChange(index, 'igmResult', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgM Index Value (S/CO, optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={test.igmIndex || ''}
                  onChange={(e) => onTestChange(index, 'igmIndex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter S/CO ratio"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgG Result
                </label>
                <select
                  value={test.iggResult || ''}
                  onChange={(e) => onTestChange(index, 'iggResult', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgG Index Value (S/CO, optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={test.iggIndex || ''}
                  onChange={(e) => onTestChange(index, 'iggIndex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter S/CO ratio"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Antibodies
              </label>
              <select
                value={test.totalAntibodies || ''}
                onChange={(e) => onTestChange(index, 'totalAntibodies', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
          </>
        )}

        {/* For Parasitic Serology / H. pylori */}
        {(test.testSubtype === 'parasitic' || test.testSubtype === 'h_pylori') && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgM Result
                </label>
                <select
                  value={test.igmResult || ''}
                  onChange={(e) => onTestChange(index, 'igmResult', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgG Result
                </label>
                <select
                  value={test.iggResult || ''}
                  onChange={(e) => onTestChange(index, 'iggResult', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Index Value (IU/mL, optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={test.indexValue || ''}
                  onChange={(e) => onTestChange(index, 'indexValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IgG Avidity (optional)
                </label>
                <input
                  type="text"
                  value={test.iggAvidity || ''}
                  onChange={(e) => onTestChange(index, 'iggAvidity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="e.g., High, Low, Intermediate"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments / Interpretation
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments or interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Qualitative or Titer Input Component (for Syphilis)
export const QualitativeOrTiterInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const titerOptions = ['1:2', '1:4', '1:8', '1:16', '1:32', '1:64', '1:128', '1:256', '1:512', '1:1024', '1:2048'];

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
            RPR Result
          </label>
          <select
            value={test.rprResult || ''}
            onChange={(e) => onTestChange(index, 'rprResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Non-reactive">Non-reactive</option>
            <option value="Reactive">Reactive</option>
          </select>
        </div>

        {test.rprResult === 'Reactive' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RPR Titer
            </label>
            <select
              value={test.rprTiter || ''}
              onChange={(e) => onTestChange(index, 'rprTiter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select titer...</option>
              {titerOptions.map(titer => (
                <option key={titer} value={titer}>{titer}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TPHA / TPPA Result
          </label>
          <select
            value={test.tphaResult || ''}
            onChange={(e) => onTestChange(index, 'tphaResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
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

// Titer Panel Input Component (for Typhoid Widal Test)
export const TiterPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const titerOptions = ['1:20', '1:40', '1:80', '1:160', '1:320', '1:640', '1:1280', '1:2560'];

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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Antigen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Titer</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {test.parameters?.map((param, pIdx) => (
              <tr key={pIdx}>
                <td className="px-3 py-2 text-sm text-gray-900">{param.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={param.titer || ''}
                    onChange={(e) => handleParameterChange(pIdx, 'titer', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select titer...</option>
                    {titerOptions.map(titer => (
                      <option key={titer} value={titer}>{titer}</option>
                    ))}
                  </select>
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

// Titer Test Input Component (for Brucella Serology)
export const TiterTestInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const titerOptions = ['1:20', '1:40', '1:80', '1:160', '1:320', '1:640', '1:1280', '1:2560'];

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
            Brucella abortus Titer
          </label>
          <select
            value={test.abortusTiter || ''}
            onChange={(e) => onTestChange(index, 'abortusTiter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select titer...</option>
            {titerOptions.map(titer => (
              <option key={titer} value={titer}>{titer}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brucella melitensis Titer
          </label>
          <select
            value={test.melitensisTiter || ''}
            onChange={(e) => onTestChange(index, 'melitensisTiter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select titer...</option>
            {titerOptions.map(titer => (
              <option key={titer} value={titer}>{titer}</option>
            ))}
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

// Enhanced Qualitative Input for HIV (with additional fields)
export const HIVQualitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            HIV 1/2 Result
          </label>
          <select
            value={test.result || ''}
            onChange={(e) => onTestChange(index, 'result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Indeterminate">Indeterminate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Method
          </label>
          <select
            value={test.testMethod || ''}
            onChange={(e) => onTestChange(index, 'testMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="ELISA">ELISA</option>
            <option value="Rapid">Rapid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmatory Available
          </label>
          <select
            value={test.confirmatoryAvailable || ''}
            onChange={(e) => onTestChange(index, 'confirmatoryAvailable', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Enhanced Qualitative Input for Hepatitis C
export const HepatitisCQualitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Anti-HCV Result
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
            Index Value (optional)
          </label>
          <input
            type="number"
            step="any"
            value={test.indexValue || ''}
            onChange={(e) => onTestChange(index, 'indexValue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter index value"
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

// Main Test Input Renderer Component
export const TestInputRenderer = ({ test, index, onRemove, onTestChange, onParameterChange, patient, setFormData }) => {
  if (test.testType === 'panel_cbc') {
    return <PanelCBCInput test={test} index={index} onRemove={onRemove} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'panel_wbc_diff') {
    return <PanelWBCDiffInput test={test} index={index} onRemove={onRemove} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'panel_numeric') {
    return <PanelNumericInput test={test} index={index} onRemove={onRemove} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'panel_platelet') {
    return <PanelPlateletInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'morphology_panel') {
    return <MorphologyPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'structured_text_report') {
    return <StructuredTextReportInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'culture_panel') {
    return <CulturePanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} setFormData={setFormData} />;
  }
  
  if (test.testType === 'qualitative_with_titer') {
    return <QualitativeWithTiterInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'numeric_or_qualitative') {
    return <NumericOrQualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'numeric_single') {
    return <NumericSingleInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative_test') {
    return <QualitativeTestInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative') {
    return <QualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'molecular_panel') {
    return <MolecularPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative_or_culture') {
    return <QualitativeOrCultureInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'panel_qualitative') {
    return <PanelQualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative_or_numeric') {
    return <QualitativeOrNumericInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative_or_titer') {
    return <QualitativeOrTiterInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'titer_panel') {
    return <TiterPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'titer_test') {
    return <TiterTestInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Special handling for HIV and Hepatitis C
  if (test.testType === 'qualitative' && test.testCode === 'HIV') {
    return <HIVQualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'qualitative' && test.testCode === 'HEP_C') {
    return <HepatitisCQualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Urinalysis test types
  if (test.testType === 'urine_dipstick') {
    return <UrineDipstickInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'urine_microscopy') {
    return <UrineMicroscopyInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'urine_24h') {
    return <Urine24HourInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'urine_upcr') {
    return <UrineUPCRInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'urine_microalbumin') {
    return <UrineMicroalbuminInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Hormone test types
  if (test.testType === 'thyroid_panel') {
    return <ThyroidPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'female_reproductive_hormones') {
    return <FemaleReproductiveHormonesInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'male_reproductive_hormones') {
    return <MaleReproductiveHormonesInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'cortisol') {
    return <CortisolInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'acth') {
    return <ACTHInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'dheas') {
    return <DHEASInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'growth_hormone') {
    return <GrowthHormoneInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'igf1') {
    return <IGF1Input test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'metabolic_hormones') {
    return <MetabolicHormonesInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'beta_hcg_quantitative') {
    return <BetaHCGQuantitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'hcg_qualitative') {
    return <HCGQualitativeInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Tumor marker test types
  if (test.testType === 'gi_tumor_markers') {
    return <GITumorMarkersInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'psa_panel') {
    return <PSAPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'testicular_cancer_markers') {
    return <TesticularCancerMarkersInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Blood bank test types
  if (test.testType === 'blood_group_rh') {
    return <BloodGroupRhInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'antibody_screening') {
    return <AntibodyScreeningInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'crossmatch') {
    return <CrossmatchInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'direct_coombs') {
    return <DirectCoombsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'indirect_coombs') {
    return <IndirectCoombsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'major_minor_crossmatch') {
    return <MajorMinorCrossmatchInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'donor_screening') {
    return <DonorScreeningInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Coagulation test types
  if (test.testType === 'basic_coagulation_panel') {
    return <BasicCoagulationPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'd_dimer') {
    return <DDimerInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'coagulation_factor_assays') {
    return <CoagulationFactorAssaysInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'mixing_studies') {
    return <MixingStudiesInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'bleeding_profile') {
    return <BleedingProfileInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Toxicology test types
  if (test.testType === 'urine_drug_screening') {
    return <UrineDrugScreeningInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'confirmatory_toxicology') {
    return <ConfirmatoryToxicologyInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'therapeutic_drug_monitoring') {
    return <TherapeuticDrugMonitoringInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'ethanol') {
    return <EthanolInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'breath_alcohol') {
    return <BreathAlcoholInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'toxic_alcohols') {
    return <ToxicAlcoholsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'heavy_metals_panel') {
    return <HeavyMetalsPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Fertility test types
  if (test.testType === 'female_fertility_hormone_panel') {
    return <FemaleFertilityHormonePanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'male_fertility_hormone_panel') {
    return <MaleFertilityHormonePanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'ovarian_reserve_tests') {
    return <OvarianReserveTestsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'progesterone_day21') {
    return <ProgesteroneDay21Input test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'lh_surge_test') {
    return <LHSurgeTestInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'estradiol_rising_pattern') {
    return <EstradiolRisingPatternInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'semen_analysis') {
    return <SemenAnalysisInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Molecular Diagnostics test types
  if (test.testType === 'respiratory_pcr_panel') {
    return <RespiratoryPCRPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'gastrointestinal_pcr_panel') {
    return <GastrointestinalPCRPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'urogenital_sti_pcr_panel') {
    return <UrogenitalSTIPCRPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'tb_mycobacteria_pcr') {
    return <TBMycobacteriaPCRInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'hepatitis_viral_load') {
    return <HepatitisViralLoadInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'hiv_viral_load') {
    return <HIVViralLoadInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'hpv_pcr_genotyping') {
    return <HPVPCRGenotypingInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'covid19_pcr') {
    return <COVID19PCRInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'oncology_molecular_panels') {
    return <OncologyMolecularPanelsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // POCT test types
  if (test.testType === 'glucose_monitoring_poct') {
    return <GlucoseMonitoringPOCTInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'poct_hba1c') {
    return <POCTHbA1cInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'poct_abg') {
    return <POCTABGInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'rapid_infectious_tests_poct') {
    return <RapidInfectiousTestsPOCTInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'poct_cardiac_markers') {
    return <POCTCardiacMarkersInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'electrolytes_poct') {
    return <ElectrolytesPOCTInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'urine_poct') {
    return <UrinePOCTInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'pregnancy_test_poct') {
    return <PregnancyTestPOCTInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'poct_coagulation') {
    return <POCTCoagulationInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'other_poct_devices') {
    return <OtherPOCTDevicesInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Flow Cytometry test types
  if (test.testType === 'lymphocyte_subset_panel') {
    return <LymphocyteSubsetPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'leukemia_lymphoma_immunophenotyping') {
    return <LeukemiaLymphomaImmunophenotypingInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'hla_b27_flow_cytometry') {
    return <HLAB27FlowCytometryInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'stem_cell_enumeration') {
    return <StemCellEnumerationInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  if (test.testType === 'minimal_residual_disease') {
    return <MinimalResidualDiseaseInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'pnh_panel') {
    return <PNHPanelInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} onParameterChange={onParameterChange} patient={patient} />;
  }
  
  // Cytogenetics test types
  if (test.testType === 'conventional_karyotyping') {
    return <ConventionalKaryotypingInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'rapid_aneuploidy_detection') {
    return <RapidAneuploidyDetectionInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'fish_panels') {
    return <FISHPanelsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'chromosomal_microarray') {
    return <ChromosomalMicroarrayInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'prenatal_cytogenetics') {
    return <PrenatalCytogeneticsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'postnatal_constitutional_cytogenetics') {
    return <PostnatalConstitutionalCytogeneticsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  if (test.testType === 'oncology_cytogenetics') {
    return <OncologyCytogeneticsInput test={test} index={index} onRemove={onRemove} onTestChange={onTestChange} patient={patient} />;
  }
  
  // Fallback for unknown test types
  return <div className="border border-gray-200 rounded-lg p-4">Test type: {test.testType} - Component not yet implemented</div>;
};

