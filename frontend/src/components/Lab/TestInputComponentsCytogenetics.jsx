import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

// Conventional Karyotyping (G-banding) Component
export const ConventionalKaryotypingInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Specimen Type
            </label>
            <select
              value={test.specimenType || ''}
              onChange={(e) => onTestChange(index, 'specimenType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Peripheral Blood">Peripheral Blood</option>
              <option value="Bone Marrow">Bone Marrow</option>
              <option value="Amniotic Fluid">Amniotic Fluid</option>
              <option value="CVS (Chorionic Villus)">CVS (Chorionic Villus)</option>
              <option value="Solid Tissue">Solid Tissue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culture Type
            </label>
            <select
              value={test.cultureType || ''}
              onChange={(e) => onTestChange(index, 'cultureType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="24-hour">24-hour</option>
              <option value="48-hour">48-hour</option>
              <option value="72-hour">72-hour</option>
              <option value="Unstimulated">Unstimulated</option>
              <option value="Stimulated">Stimulated</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Metaphases Analyzed
            </label>
            <input
              type="number"
              value={test.totalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'totalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normal Metaphases
            </label>
            <input
              type="number"
              value={test.normalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'normalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abnormal Metaphases
            </label>
            <input
              type="number"
              value={test.abnormalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'abnormalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modal Chromosome Number
            </label>
            <input
              type="number"
              value={test.modalChromosomeNumber || ''}
              onChange={(e) => onTestChange(index, 'modalChromosomeNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., 46"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Karyotype Result (ISCN format)
          </label>
          <textarea
            value={test.karyotypeResult || ''}
            onChange={(e) => onTestChange(index, 'karyotypeResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="e.g., 46,XY or 47,XX,+21 or 46,XY,t(9;22)(q34;q11.2)"
          ></textarea>
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
            placeholder="Enter interpretation, chromosomal abnormality details, clinical significance..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conclusion
          </label>
          <select
            value={test.conclusion || ''}
            onChange={(e) => onTestChange(index, 'conclusion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Normal">Normal</option>
            <option value="Abnormal">Abnormal</option>
            <option value="Inconclusive">Inconclusive</option>
            <option value="Culture Failure">Culture Failure</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Rapid Aneuploidy Detection (QF-PCR) Component
export const RapidAneuploidyDetectionInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const chromosomes = [
    { code: 'CHR13', name: 'Chr 13', options: ['Normal', 'Trisomy', 'Monosomy'] },
    { code: 'CHR18', name: 'Chr 18', options: ['Normal', 'Trisomy', 'Monosomy'] },
    { code: 'CHR21', name: 'Chr 21', options: ['Normal', 'Trisomy', 'Monosomy'] },
    { code: 'CHRX', name: 'Chr X', options: ['Normal', 'Turner', 'Triple X'] },
    { code: 'CHRY', name: 'Chr Y', options: ['Present', 'Absent'] }
  ];

  const updateChromosomeResult = (code, value) => {
    const currentResults = test.chromosomeResults || {};
    onTestChange(index, 'chromosomeResults', { ...currentResults, [code]: value });
  };

  const addSTRMarker = () => {
    const newMarker = {
      id: Date.now(),
      markerName: '',
      allelePattern: '',
      peakRatio: ''
    };
    const currentMarkers = test.strMarkers || [];
    onTestChange(index, 'strMarkers', [...currentMarkers, newMarker]);
  };

  const removeSTRMarker = (markerId) => {
    const currentMarkers = test.strMarkers || [];
    onTestChange(index, 'strMarkers', currentMarkers.filter(m => m.id !== markerId));
  };

  const updateSTRMarker = (markerId, field, value) => {
    const currentMarkers = test.strMarkers || [];
    onTestChange(index, 'strMarkers', currentMarkers.map(m => 
      m.id === markerId ? { ...m, [field]: value } : m
    ));
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
            Tested Chromosomes
          </label>
          <div className="space-y-2">
            {chromosomes.map(chr => (
              <div key={chr.code} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {chr.name}
                  </label>
                  <select
                    value={test.chromosomeResults?.[chr.code] || ''}
                    onChange={(e) => updateChromosomeResult(chr.code, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    {chr.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              STR Marker Results
            </label>
            <button
              onClick={addSTRMarker}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200"
            >
              <Plus className="w-4 h-4" />
              Add STR Marker
            </button>
          </div>

          <div className="space-y-3">
            {(test.strMarkers || []).map((marker) => (
              <div key={marker.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Marker Name
                      </label>
                      <input
                        type="text"
                        value={marker.markerName || ''}
                        onChange={(e) => updateSTRMarker(marker.id, 'markerName', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="e.g., D21S11"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Allele Pattern
                      </label>
                      <select
                        value={marker.allelePattern || ''}
                        onChange={(e) => updateSTRMarker(marker.id, 'allelePattern', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="1:1">1:1 (normal)</option>
                        <option value="1:2">1:2 (trisomy)</option>
                        <option value="1:3">1:3 (mosaic)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Peak Ratio Values
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={marker.peakRatio || ''}
                        onChange={(e) => updateSTRMarker(marker.id, 'peakRatio', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="Enter ratio"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeSTRMarker(marker.id)}
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

// FISH Panels Component
export const FISHPanelsInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const commonPanels = {
    'Leukemia FISH Panel': [
      { code: 'BCRABL', name: 'BCR-ABL (t(9;22))' },
      { code: 'PMLRARA', name: 'PML-RARA (t(15;17))' },
      { code: 'TELAML1', name: 'ETV6-RUNX1 (t(12;21))' },
      { code: 'MLL', name: 'MLL rearrangement' },
      { code: 'RUNX1', name: '8;21 translocation' },
      { code: '11Q', name: '11q23 deletion' },
      { code: '7Q', name: '7q deletion' },
      { code: '5Q', name: '5q deletion' }
    ],
    'Prenatal FISH Panel': [
      { code: 'CHR13', name: 'Chr 13' },
      { code: 'CHR18', name: 'Chr 18' },
      { code: 'CHR21', name: 'Chr 21' },
      { code: 'CHRX', name: 'Chr X' },
      { code: 'CHRY', name: 'Chr Y' }
    ],
    'Lymphoma FISH Panel': [
      { code: 'CCND1', name: 'CCND1 (t(11;14))' },
      { code: 'BCL2', name: 'BCL2 (t(14;18))' },
      { code: 'BCL6', name: 'BCL6 rearrangement' },
      { code: 'MYC', name: 'MYC rearrangement' }
    ],
    'Solid Tumor FISH': [
      { code: 'HER2', name: 'HER2/neu amplification' },
      { code: 'ALK', name: 'ALK rearrangement' },
      { code: 'ROS1', name: 'ROS1 rearrangement' },
      { code: 'MET', name: 'MET amplification' }
    ]
  };

  const addMarker = (markerName = '', markerCode = '') => {
    const newMarker = {
      id: Date.now(),
      markerName: markerName,
      markerCode: markerCode,
      result: '',
      percentPositive: '',
      nucleiAnalyzed: '',
      ratio: '',
      amplification: '',
      comments: ''
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

  const addPanelMarkers = (panelName) => {
    const markers = commonPanels[panelName] || [];
    markers.forEach(marker => {
      addMarker(marker.name, marker.code);
    });
  };

  const isSolidTumor = test.fishPanelType === 'Solid Tumor FISH';

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
            FISH Panel Type
          </label>
          <select
            value={test.fishPanelType || ''}
            onChange={(e) => onTestChange(index, 'fishPanelType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            {Object.keys(commonPanels).map(panel => (
              <option key={panel} value={panel}>{panel}</option>
            ))}
          </select>
        </div>

        {test.fishPanelType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Add Panel Markers
            </label>
            <button
              onClick={() => addPanelMarkers(test.fishPanelType)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 border border-blue-200"
            >
              Add All {test.fishPanelType} Markers
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              FISH Markers
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
                <div className="flex items-start justify-between">
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
                        placeholder="e.g., BCR-ABL"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Result
                      </label>
                      <select
                        value={marker.result || ''}
                        onChange={(e) => updateMarker(marker.id, 'result', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="Detected">Detected</option>
                        <option value="Not Detected">Not Detected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        % Positive Nuclei
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
                        Nuclei Analyzed
                      </label>
                      <input
                        type="number"
                        value={marker.nucleiAnalyzed || ''}
                        onChange={(e) => updateMarker(marker.id, 'nucleiAnalyzed', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                        placeholder="Enter number"
                      />
                    </div>
                    {isSolidTumor && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Ratio (e.g., HER2/CEN17)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={marker.ratio || ''}
                            onChange={(e) => updateMarker(marker.id, 'ratio', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                            placeholder="Enter ratio"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Amplification
                          </label>
                          <select
                            value={marker.amplification || ''}
                            onChange={(e) => updateMarker(marker.id, 'amplification', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                          >
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div className={isSolidTumor ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Comments
                      </label>
                      <input
                        type="text"
                        value={marker.comments || ''}
                        onChange={(e) => updateMarker(marker.id, 'comments', e.target.value)}
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

// Chromosomal Microarray (CMA / aCGH) Component
export const ChromosomalMicroarrayInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            <option value="Normal">Normal</option>
            <option value="Abnormal - CNV detected">Abnormal - CNV detected</option>
          </select>
        </div>

        {test.result === 'Abnormal - CNV detected' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNV Type
                </label>
                <select
                  value={test.cnvType || ''}
                  onChange={(e) => onTestChange(index, 'cnvType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Deletion">Deletion</option>
                  <option value="Duplication">Duplication</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNV Size (Mb)
                </label>
                <input
                  type="number"
                  step="any"
                  value={test.cnvSize || ''}
                  onChange={(e) => onTestChange(index, 'cnvSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter size"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chromosomal Location
              </label>
              <input
                type="text"
                value={test.chromosomalLocation || ''}
                onChange={(e) => onTestChange(index, 'chromosomalLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="e.g., 15q11.2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISCN Description
              </label>
              <textarea
                value={test.iscnDescription || ''}
                onChange={(e) => onTestChange(index, 'iscnDescription', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                rows="2"
                placeholder="Enter ISCN description..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pathogenicity Classification
              </label>
              <select
                value={test.pathogenicityClassification || ''}
                onChange={(e) => onTestChange(index, 'pathogenicityClassification', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Pathogenic">Pathogenic</option>
                <option value="Likely pathogenic">Likely pathogenic</option>
                <option value="VUS">VUS</option>
                <option value="Likely benign">Likely benign</option>
                <option value="Benign">Benign</option>
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

// Prenatal Cytogenetics Component
export const PrenatalCytogeneticsInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Gestational Age (weeks)
            </label>
            <input
              type="number"
              step="any"
              value={test.gestationalAge || ''}
              onChange={(e) => onTestChange(index, 'gestationalAge', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter weeks"
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
              <option value="Amniotic fluid">Amniotic fluid</option>
              <option value="CVS">CVS</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culture Success
            </label>
            <select
              value={test.cultureSuccess || ''}
              onChange={(e) => onTestChange(index, 'cultureSuccess', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metaphases Analyzed
            </label>
            <input
              type="number"
              value={test.metaphasesAnalyzed || ''}
              onChange={(e) => onTestChange(index, 'metaphasesAnalyzed', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Karyotype (ISCN)
          </label>
          <textarea
            value={test.finalKaryotype || ''}
            onChange={(e) => onTestChange(index, 'finalKaryotype', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="2"
            placeholder="e.g., 46,XY or 47,XX,+21"
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aneuploidy Results for 13/18/21/X/Y
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {['13', '18', '21', 'X', 'Y'].map(chr => (
              <div key={chr}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Chr {chr}
                </label>
                <input
                  type="text"
                  value={test[`aneuploidyChr${chr}`] || ''}
                  onChange={(e) => onTestChange(index, `aneuploidyChr${chr}`, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Normal/Trisomy"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mosaicism (%)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max="100"
              value={test.mosaicism || ''}
              onChange={(e) => onTestChange(index, 'mosaicism', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter %"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maternal Cell Contamination
            </label>
            <select
              value={test.maternalCellContamination || ''}
              onChange={(e) => onTestChange(index, 'maternalCellContamination', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
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

// Postnatal/Constitutional Cytogenetics Component
export const PostnatalConstitutionalCytogeneticsInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            Indication for Testing
          </label>
          <select
            value={test.indication || ''}
            onChange={(e) => onTestChange(index, 'indication', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Developmental delay">Developmental delay</option>
            <option value="Infertility">Infertility</option>
            <option value="Dysmorphic features">Dysmorphic features</option>
            <option value="Recurrent miscarriage">Recurrent miscarriage</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="Peripheral Blood">Peripheral Blood</option>
              <option value="Bone Marrow">Bone Marrow</option>
              <option value="Solid Tissue">Solid Tissue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culture Type
            </label>
            <select
              value={test.cultureType || ''}
              onChange={(e) => onTestChange(index, 'cultureType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="24-hour">24-hour</option>
              <option value="48-hour">48-hour</option>
              <option value="72-hour">72-hour</option>
              <option value="Unstimulated">Unstimulated</option>
              <option value="Stimulated">Stimulated</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Metaphases Analyzed
            </label>
            <input
              type="number"
              value={test.totalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'totalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normal Metaphases
            </label>
            <input
              type="number"
              value={test.normalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'normalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abnormal Metaphases
            </label>
            <input
              type="number"
              value={test.abnormalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'abnormalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modal Chromosome Number
            </label>
            <input
              type="number"
              value={test.modalChromosomeNumber || ''}
              onChange={(e) => onTestChange(index, 'modalChromosomeNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., 46"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Karyotype Result (ISCN format)
          </label>
          <textarea
            value={test.karyotypeResult || ''}
            onChange={(e) => onTestChange(index, 'karyotypeResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="e.g., 46,XY or 47,XX,+21"
          ></textarea>
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
            placeholder="Enter interpretation, chromosomal abnormality details, clinical significance..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conclusion
          </label>
          <select
            value={test.conclusion || ''}
            onChange={(e) => onTestChange(index, 'conclusion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Normal">Normal</option>
            <option value="Abnormal">Abnormal</option>
            <option value="Inconclusive">Inconclusive</option>
            <option value="Culture Failure">Culture Failure</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Oncology Cytogenetics Component
export const OncologyCytogeneticsInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Specimen Type
            </label>
            <select
              value={test.specimenType || ''}
              onChange={(e) => onTestChange(index, 'specimenType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Bone Marrow">Bone Marrow</option>
              <option value="Peripheral Blood">Peripheral Blood</option>
              <option value="Solid Tissue">Solid Tissue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culture Type
            </label>
            <select
              value={test.cultureType || ''}
              onChange={(e) => onTestChange(index, 'cultureType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="24-hour">24-hour</option>
              <option value="48-hour">48-hour</option>
              <option value="72-hour">72-hour</option>
              <option value="Unstimulated">Unstimulated</option>
              <option value="Stimulated">Stimulated</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Metaphases Analyzed
            </label>
            <input
              type="number"
              value={test.totalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'totalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normal Metaphases
            </label>
            <input
              type="number"
              value={test.normalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'normalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abnormal Metaphases
            </label>
            <input
              type="number"
              value={test.abnormalMetaphases || ''}
              onChange={(e) => onTestChange(index, 'abnormalMetaphases', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modal Chromosome Number
            </label>
            <input
              type="number"
              value={test.modalChromosomeNumber || ''}
              onChange={(e) => onTestChange(index, 'modalChromosomeNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="e.g., 46"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Karyotype Result (ISCN format)
          </label>
          <textarea
            value={test.karyotypeResult || ''}
            onChange={(e) => onTestChange(index, 'karyotypeResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="e.g., 46,XY,t(9;22)(q34;q11.2) - Philadelphia chromosome"
          ></textarea>
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
            placeholder="Enter interpretation, chromosomal abnormality details, clinical significance..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conclusion
          </label>
          <select
            value={test.conclusion || ''}
            onChange={(e) => onTestChange(index, 'conclusion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Normal">Normal</option>
            <option value="Abnormal">Abnormal</option>
            <option value="Inconclusive">Inconclusive</option>
            <option value="Culture Failure">Culture Failure</option>
          </select>
        </div>
      </div>
    </div>
  );
};

