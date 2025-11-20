import React from 'react';
import { X } from 'lucide-react';

// Urine Dipstick (Chemical Analysis) Component
export const UrineDipstickInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const glucoseOptions = ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
  const proteinOptions = ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
  const ketonesOptions = ['Negative', 'Trace', '1+', '2+', '3+'];
  const leukocyteOptions = ['Negative', 'Trace', '1+', '2+', '3+'];
  const bloodOptions = ['Negative', 'Trace', '1+', '2+', '3+'];

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
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Color</td>
              <td className="px-3 py-2">
                <select
                  value={test.color || ''}
                  onChange={(e) => onTestChange(index, 'color', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Straw">Straw</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Amber">Amber</option>
                  <option value="Dark">Dark</option>
                  <option value="Red">Red</option>
                  <option value="Brown">Brown</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Appearance (Clarity)</td>
              <td className="px-3 py-2">
                <select
                  value={test.appearance || ''}
                  onChange={(e) => onTestChange(index, 'appearance', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Clear">Clear</option>
                  <option value="Slightly cloudy">Slightly cloudy</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Turbid">Turbid</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Specific Gravity</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  step="0.001"
                  value={test.specificGravity || ''}
                  onChange={(e) => onTestChange(index, 'specificGravity', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="1.005-1.030"
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">pH</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  value={test.pH || ''}
                  onChange={(e) => onTestChange(index, 'pH', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="4.5-8.0"
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Glucose</td>
              <td className="px-3 py-2">
                <select
                  value={test.glucose || ''}
                  onChange={(e) => onTestChange(index, 'glucose', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  {glucoseOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Protein</td>
              <td className="px-3 py-2">
                <select
                  value={test.protein || ''}
                  onChange={(e) => onTestChange(index, 'protein', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  {proteinOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Ketones</td>
              <td className="px-3 py-2">
                <select
                  value={test.ketones || ''}
                  onChange={(e) => onTestChange(index, 'ketones', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  {ketonesOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Bilirubin</td>
              <td className="px-3 py-2">
                <select
                  value={test.bilirubin || ''}
                  onChange={(e) => onTestChange(index, 'bilirubin', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Negative">Negative</option>
                  <option value="Positive">Positive</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Urobilinogen</td>
              <td className="px-3 py-2">
                <select
                  value={test.urobilinogen || ''}
                  onChange={(e) => onTestChange(index, 'urobilinogen', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Normal">Normal</option>
                  <option value="Increased">Increased</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Nitrite</td>
              <td className="px-3 py-2">
                <select
                  value={test.nitrite || ''}
                  onChange={(e) => onTestChange(index, 'nitrite', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Negative">Negative</option>
                  <option value="Positive">Positive</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Leukocyte Esterase</td>
              <td className="px-3 py-2">
                <select
                  value={test.leukocyteEsterase || ''}
                  onChange={(e) => onTestChange(index, 'leukocyteEsterase', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  {leukocyteOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Blood</td>
              <td className="px-3 py-2">
                <select
                  value={test.blood || ''}
                  onChange={(e) => onTestChange(index, 'blood', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  {bloodOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Odor (optional)</td>
              <td className="px-3 py-2">
                <select
                  value={test.odor || ''}
                  onChange={(e) => onTestChange(index, 'odor', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Normal">Normal</option>
                  <option value="Strong">Strong</option>
                  <option value="Foul">Foul</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm text-gray-900">Foam (optional)</td>
              <td className="px-3 py-2">
                <select
                  value={test.foam || ''}
                  onChange={(e) => onTestChange(index, 'foam', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                >
                  <option value="">Select...</option>
                  <option value="Normal">Normal</option>
                  <option value="Excessive">Excessive</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
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
          placeholder="Enter interpretation..."
        ></textarea>
      </div>
    </div>
  );
};

// Urine Microscopy Component
export const UrineMicroscopyInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

  const cellularOptions = ['None', 'Few', 'Moderate', 'Many'];
  const crystalOptions = ['None', 'Few', 'Many'];

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
        {/* Cellular Elements */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Cellular Elements</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RBC (/HPF)</label>
              <input
                type="number"
                value={test.rbc || ''}
                onChange={(e) => onTestChange(index, 'rbc', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WBC (/HPF)</label>
              <input
                type="number"
                value={test.wbc || ''}
                onChange={(e) => onTestChange(index, 'wbc', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Epithelial Cells</label>
              <select
                value={test.epithelialCells || ''}
                onChange={(e) => onTestChange(index, 'epithelialCells', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {cellularOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bacteria</label>
              <select
                value={test.bacteria || ''}
                onChange={(e) => onTestChange(index, 'bacteria', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {cellularOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeast</label>
              <select
                value={test.yeast || ''}
                onChange={(e) => onTestChange(index, 'yeast', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="None">None</option>
                <option value="Present">Present</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spermatozoa (optional)</label>
              <select
                value={test.spermatozoa || ''}
                onChange={(e) => onTestChange(index, 'spermatozoa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="None">None</option>
                <option value="Present">Present</option>
              </select>
            </div>
          </div>
        </div>

        {/* Casts */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Casts (/LPF)</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hyaline Casts</label>
              <input
                type="number"
                value={test.hyalineCasts || ''}
                onChange={(e) => onTestChange(index, 'hyalineCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Granular Casts</label>
              <input
                type="number"
                value={test.granularCasts || ''}
                onChange={(e) => onTestChange(index, 'granularCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RBC Casts</label>
              <input
                type="number"
                value={test.rbcCasts || ''}
                onChange={(e) => onTestChange(index, 'rbcCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WBC Casts</label>
              <input
                type="number"
                value={test.wbcCasts || ''}
                onChange={(e) => onTestChange(index, 'wbcCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Epithelial Casts</label>
              <input
                type="number"
                value={test.epithelialCasts || ''}
                onChange={(e) => onTestChange(index, 'epithelialCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broad Casts (optional)</label>
              <input
                type="number"
                value={test.broadCasts || ''}
                onChange={(e) => onTestChange(index, 'broadCasts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter count"
              />
            </div>
          </div>
        </div>

        {/* Crystals */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Crystals</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calcium Oxalate</label>
              <select
                value={test.calciumOxalate || ''}
                onChange={(e) => onTestChange(index, 'calciumOxalate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {crystalOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uric Acid Crystals</label>
              <select
                value={test.uricAcidCrystals || ''}
                onChange={(e) => onTestChange(index, 'uricAcidCrystals', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {crystalOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Triple Phosphate</label>
              <select
                value={test.triplePhosphate || ''}
                onChange={(e) => onTestChange(index, 'triplePhosphate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {crystalOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amorphous Crystals</label>
              <select
                value={test.amorphousCrystals || ''}
                onChange={(e) => onTestChange(index, 'amorphousCrystals', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                {crystalOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Parasites */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Parasites (Rare)</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trichomonas</label>
              <select
                value={test.trichomonas || ''}
                onChange={(e) => onTestChange(index, 'trichomonas', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schistosoma eggs</label>
              <select
                value={test.schistosomaEggs || ''}
                onChange={(e) => onTestChange(index, 'schistosomaEggs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mucus Threads */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mucus Threads</label>
          <select
            value={test.mucusThreads || ''}
            onChange={(e) => onTestChange(index, 'mucusThreads', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            {cellularOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation / Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter interpretation or comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// 24-Hour Urine Tests Component
export const Urine24HourInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
        {/* General Values */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Volume (mL)
            </label>
            <input
              type="number"
              value={test.totalVolume || ''}
              onChange={(e) => onTestChange(index, 'totalVolume', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter volume"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Duration (hrs)
            </label>
            <input
              type="number"
              value={test.collectionDuration || '24'}
              onChange={(e) => onTestChange(index, 'collectionDuration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="24"
            />
          </div>
        </div>

        {/* Chemical Parameters */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Chemical Parameters</h5>
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
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
                  <td className="px-3 py-2 text-sm text-gray-600">{param.unit}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{param.ref || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            placeholder="Enter interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Urine Protein/Creatinine Ratio (UPCR) Component
export const UrineUPCRInput = ({ test, index, onRemove, onTestChange, patient }) => {
  // Auto-calculate ratio
  const calculateRatio = () => {
    const protein = parseFloat(test.urineProtein);
    const creatinine = parseFloat(test.urineCreatinine);
    if (!isNaN(protein) && !isNaN(creatinine) && creatinine > 0) {
      return (protein / creatinine * 1000).toFixed(2); // Convert to mg/g
    }
    return '';
  };

  const ratio = calculateRatio();
  let interpretation = '';
  if (ratio) {
    const ratioNum = parseFloat(ratio);
    if (ratioNum < 150) {
      interpretation = 'Normal';
    } else if (ratioNum >= 30 && ratioNum <= 300) {
      interpretation = 'Microalbuminuria';
    } else if (ratioNum > 300) {
      interpretation = 'Macroalbuminuria';
    }
  }

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
              Urine Protein (spot) (mg/dL)
            </label>
            <input
              type="number"
              step="any"
              value={test.urineProtein || ''}
              onChange={(e) => onTestChange(index, 'urineProtein', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urine Creatinine (spot) (mg/dL)
            </label>
            <input
              type="number"
              step="any"
              value={test.urineCreatinine || ''}
              onChange={(e) => onTestChange(index, 'urineCreatinine', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter value"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Protein/Creatinine Ratio (mg/g) - Auto-calculated
          </label>
          <input
            type="text"
            value={ratio || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
            placeholder="Will be calculated automatically"
          />
        </div>

        {interpretation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interpretation
            </label>
            <div className={`px-3 py-2 rounded-md ${
              interpretation === 'Normal' ? 'bg-green-100 text-green-800' :
              interpretation === 'Microalbuminuria' ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {interpretation}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Interpretation / Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter additional interpretation or comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Urine Microalbumin Component
export const UrineMicroalbuminInput = ({ test, index, onRemove, onTestChange, patient }) => {
  // Auto-calculate ACR
  const calculateACR = () => {
    const microalbumin = parseFloat(test.microalbumin);
    const creatinine = parseFloat(test.urineCreatinine);
    if (!isNaN(microalbumin) && !isNaN(creatinine) && creatinine > 0) {
      return (microalbumin / creatinine * 1000).toFixed(2); // Convert to mg/g
    }
    return '';
  };

  const acr = calculateACR();
  let interpretation = '';
  if (acr) {
    const acrNum = parseFloat(acr);
    if (acrNum < 30) {
      interpretation = 'Normal';
    } else if (acrNum >= 30 && acrNum <= 300) {
      interpretation = 'Microalbuminuria';
    } else if (acrNum > 300) {
      interpretation = 'Macroalbuminuria';
    }
  }

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
              Microalbumin (mg/L)
            </label>
            <input
              type="number"
              step="any"
              value={test.microalbumin || ''}
              onChange={(e) => onTestChange(index, 'microalbumin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urine Creatinine (mg/dL)
            </label>
            <input
              type="number"
              step="any"
              value={test.urineCreatinine || ''}
              onChange={(e) => onTestChange(index, 'urineCreatinine', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              placeholder="Enter value"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Albumin/Creatinine Ratio (ACR) (mg/g) - Auto-calculated
          </label>
          <input
            type="text"
            value={acr || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
            placeholder="Will be calculated automatically"
          />
        </div>

        {interpretation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interpretation
            </label>
            <div className={`px-3 py-2 rounded-md ${
              interpretation === 'Normal' ? 'bg-green-100 text-green-800' :
              interpretation === 'Microalbuminuria' ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {interpretation}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Interpretation / Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter additional interpretation or comments..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// GI Tumor Markers Component
export const GITumorMarkersInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Handle special cases like "< 10", "> 25", etc.
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

    // Parse reference range (e.g., "140–280")
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
  );
};

// PSA Panel Component (with auto-calculated Free/Total ratio)
export const PSAPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue <= threshold ? 'normal' : 'high';
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

  // Calculate Free/Total PSA Ratio
  const calculatePSARatio = () => {
    const totalPSA = test.parameters?.find(p => p.code === 'PSA')?.resultValue;
    const freePSA = test.parameters?.find(p => p.code === 'FPSA')?.resultValue;
    if (totalPSA && freePSA) {
      const totalNum = parseFloat(totalPSA);
      const freeNum = parseFloat(freePSA);
      if (!isNaN(totalNum) && !isNaN(freeNum) && totalNum > 0) {
        return ((freeNum / totalNum) * 100).toFixed(2);
      }
    }
    return '';
  };

  const psaRatio = calculatePSARatio();
  let ratioInterpretation = '';
  if (psaRatio) {
    const ratioNum = parseFloat(psaRatio);
    if (ratioNum > 25) {
      ratioInterpretation = 'Favorable (>25%)';
    } else {
      ratioInterpretation = 'Less favorable (≤25%)';
    }
  }

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

      {psaRatio && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Free/Total PSA Ratio (auto-calculated)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={`${psaRatio}%`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
              />
            </div>
            <div>
              <div className={`px-3 py-2 rounded-md text-sm font-medium ${
                ratioInterpretation.includes('Favorable') ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {ratioInterpretation}
              </div>
            </div>
          </div>
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
  );
};

// Testicular Cancer Markers Component
export const TesticularCancerMarkersInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue <= threshold ? 'normal' : 'high';
      }
    }

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

// Blood Group & Rh Typing Component
export const BloodGroupRhInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              ABO Group
            </label>
            <select
              value={test.aboGroup || ''}
              onChange={(e) => onTestChange(index, 'aboGroup', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rh Factor (D antigen)
            </label>
            <select
              value={test.rhFactor || ''}
              onChange={(e) => onTestChange(index, 'rhFactor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Method Used (optional)
          </label>
          <select
            value={test.method || ''}
            onChange={(e) => onTestChange(index, 'method', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Tube method">Tube method</option>
            <option value="Gel card">Gel card</option>
            <option value="Slide test">Slide test</option>
          </select>
        </div>

        {test.rhFactor === 'Negative' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weak D Testing
            </label>
            <select
              value={test.weakD || ''}
              onChange={(e) => onTestChange(index, 'weakD', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            >
              <option value="">Select...</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={test.interpretation || ''}
            onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            rows="3"
            placeholder="Enter comments (e.g., Forward and reverse grouping mismatch)..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Antibody Screening (IAT) Component
export const AntibodyScreeningInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Screening Cells</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screen Cell I
              </label>
              <select
                value={test.screenCellI || ''}
                onChange={(e) => onTestChange(index, 'screenCellI', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screen Cell II
              </label>
              <select
                value={test.screenCellII || ''}
                onChange={(e) => onTestChange(index, 'screenCellII', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screen Cell III (optional)
              </label>
              <select
                value={test.screenCellIII || ''}
                onChange={(e) => onTestChange(index, 'screenCellIII', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Antibody Screen Result
          </label>
          <select
            value={test.antibodyScreenResult || ''}
            onChange={(e) => onTestChange(index, 'antibodyScreenResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Negative">Negative</option>
            <option value="Positive (Antibody detected)">Positive (Antibody detected)</option>
          </select>
        </div>

        {test.antibodyScreenResult === 'Positive (Antibody detected)' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antibody Identified
              </label>
              <select
                value={test.antibodyIdentified || ''}
                onChange={(e) => onTestChange(index, 'antibodyIdentified', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select or type...</option>
                <option value="Anti-D">Anti-D</option>
                <option value="Anti-C">Anti-C</option>
                <option value="Anti-K">Anti-K</option>
                <option value="Anti-E">Anti-E</option>
                <option value="Anti-M">Anti-M</option>
                <option value="Anti-S">Anti-S</option>
                <option value="Anti-Lewis">Anti-Lewis</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {test.antibodyIdentified === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify Antibody
                </label>
                <input
                  type="text"
                  value={test.antibodyOther || ''}
                  onChange={(e) => onTestChange(index, 'antibodyOther', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  placeholder="Enter antibody name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reaction Strength
              </label>
              <select
                value={test.reactionStrength || ''}
                onChange={(e) => onTestChange(index, 'reactionStrength', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="1+">1+</option>
                <option value="2+">2+</option>
                <option value="3+">3+</option>
                <option value="4+">4+</option>
              </select>
            </div>
          </>
        )}

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

// Crossmatch (Compatibility Testing) Component
export const CrossmatchInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Donor Unit Info</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Donor Unit Number
              </label>
              <input
                type="text"
                value={test.donorUnitNumber || ''}
                onChange={(e) => onTestChange(index, 'donorUnitNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter unit number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <input
                type="text"
                value={test.donorBloodGroup || ''}
                onChange={(e) => onTestChange(index, 'donorBloodGroup', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="e.g., A+"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rh
              </label>
              <input
                type="text"
                value={test.donorRh || ''}
                onChange={(e) => onTestChange(index, 'donorRh', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Positive/Negative"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={test.expiryDate || ''}
                onChange={(e) => onTestChange(index, 'expiryDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Group (auto from patient record)
          </label>
          <input
            type="text"
            value={test.recipientGroup || patient?.bloodGroup || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            placeholder="Auto-filled from patient record"
          />
        </div>

        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Crossmatch Results</h5>
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reaction Strength</th>
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
                      <option value="Compatible">Compatible</option>
                      <option value="Incompatible">Incompatible</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {param.result === 'Incompatible' ? (
                      <select
                        value={param.reactionStrength || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'reactionStrength', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="1+">1+</option>
                        <option value="2+">2+</option>
                        <option value="3+">3+</option>
                        <option value="4+">4+</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
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
          <select
            value={test.finalInterpretation || ''}
            onChange={(e) => onTestChange(index, 'finalInterpretation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Compatible for transfusion">Compatible for transfusion</option>
            <option value="Incompatible — do NOT issue blood">Incompatible — do NOT issue blood</option>
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

// Direct Coombs Test (DAT) Component
export const DirectCoombsInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            DAT Result
          </label>
          <select
            value={test.datResult || ''}
            onChange={(e) => onTestChange(index, 'datResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        </div>

        {test.datResult === 'Positive' && (
          <>
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-3">Monospecific Testing</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anti-IgG
                  </label>
                  <select
                    value={test.antiIgG || ''}
                    onChange={(e) => onTestChange(index, 'antiIgG', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anti-C3d
                  </label>
                  <select
                    value={test.antiC3d || ''}
                    onChange={(e) => onTestChange(index, 'antiC3d', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                  >
                    <option value="">Select...</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reaction Strength
              </label>
              <select
                value={test.reactionStrength || ''}
                onChange={(e) => onTestChange(index, 'reactionStrength', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="1+">1+</option>
                <option value="2+">2+</option>
                <option value="3+">3+</option>
                <option value="4+">4+</option>
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
            placeholder="Enter interpretation (e.g., autoimmune hemolytic anemia)..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// Indirect Coombs Test (IAT) Component
export const IndirectCoombsInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            IAT Result
          </label>
          <select
            value={test.iatResult || ''}
            onChange={(e) => onTestChange(index, 'iatResult', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        </div>

        {test.iatResult === 'Positive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antibody Identified
              </label>
              <input
                type="text"
                value={test.antibodyIdentified || ''}
                onChange={(e) => onTestChange(index, 'antibodyIdentified', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                placeholder="Enter antibody name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reaction Strength
              </label>
              <select
                value={test.reactionStrength || ''}
                onChange={(e) => onTestChange(index, 'reactionStrength', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="1+">1+</option>
                <option value="2+">2+</option>
                <option value="3+">3+</option>
                <option value="4+">4+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              <select
                value={test.method || ''}
                onChange={(e) => onTestChange(index, 'method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              >
                <option value="">Select...</option>
                <option value="Tube">Tube</option>
                <option value="Gel card">Gel card</option>
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

// Major & Minor Crossmatch (Detailed Panel) Component
export const MajorMinorCrossmatchInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Crossmatch Results</h5>
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reaction Strength</th>
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
                      <option value="Compatible">Compatible</option>
                      <option value="Incompatible">Incompatible</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {param.result === 'Incompatible' ? (
                      <select
                        value={param.reactionStrength || ''}
                        onChange={(e) => handleParameterChange(pIdx, 'reactionStrength', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      >
                        <option value="">Select...</option>
                        <option value="1+">1+</option>
                        <option value="2+">2+</option>
                        <option value="3+">3+</option>
                        <option value="4+">4+</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Decision: Blood is safe for transfusion
          </label>
          <select
            value={test.safeForTransfusion || ''}
            onChange={(e) => onTestChange(index, 'safeForTransfusion', e.target.value)}
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

// Donor Screening Tests Component
export const DonorScreeningInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Numeric Value (if applicable)</th>
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
                  </select>
                </td>
                <td className="px-3 py-2">
                  {param.allowNumeric ? (
                    <input
                      type="number"
                      step="any"
                      value={param.numericValue || ''}
                      onChange={(e) => handleParameterChange(pIdx, 'numericValue', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
                      placeholder="Enter value"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
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
          value={test.interpretation || ''}
          onChange={(e) => onTestChange(index, 'interpretation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          rows="3"
          placeholder="Enter comments..."
        ></textarea>
      </div>
    </div>
  );
};

// Thyroid Panel Component
export const ThyroidPanelInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }

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

// Female Reproductive Hormones Component
export const FemaleReproductiveHormonesInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
  const calculateAbnormality = (value, refRange, gender = patient?.gender) => {
    if (!value || !refRange) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    if (refRange.trim().startsWith('<')) {
      const threshold = parseFloat(refRange.replace('<', '').trim());
      if (!isNaN(threshold)) {
        return numValue < threshold ? 'normal' : 'high';
      }
    }

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
            Cycle Day (optional)
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

// Male Reproductive Hormones Component
export const MaleReproductiveHormonesInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

// Cortisol Input Component
export const CortisolInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value, timeOfSample) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Morning: 6–18 µg/dL, Evening: 2–9 µg/dL
    if (timeOfSample === 'Morning') {
      if (numValue >= 6 && numValue <= 18) return 'normal';
      if (numValue < 6) return 'low';
      return 'high';
    } else if (timeOfSample === 'Evening') {
      if (numValue >= 2 && numValue <= 9) return 'normal';
      if (numValue < 2) return 'low';
      return 'high';
    }

    return 'normal';
  };

  const abnormality = calculateAbnormality(test.resultValue, test.timeOfSample);

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
            Time of Sample (required)
          </label>
          <select
            value={test.timeOfSample || ''}
            onChange={(e) => onTestChange(index, 'timeOfSample', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select...</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cortisol Value
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
              value={test.resultUnit || 'µg/dL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            {test.timeOfSample === 'Morning' ? 'Morning: 6–18 µg/dL' :
             test.timeOfSample === 'Evening' ? 'Evening: 2–9 µg/dL' :
             'Select time of sample'}
          </div>
        </div>

        {abnormality !== 'normal' && test.resultValue && test.timeOfSample && (
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

// ACTH Input Component
export const ACTHInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Reference: 10–60 pg/mL
    if (numValue >= 10 && numValue <= 60) return 'normal';
    if (numValue < 10) return 'low';
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
              ACTH Value
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
              value={test.resultUnit || 'pg/mL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
            10–60 pg/mL (sample must be chilled)
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

// DHEA-S Input Component
export const DHEASInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              DHEA-S Value
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
              value={test.resultUnit || 'µg/dL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              readOnly
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
            placeholder="Age-dependent"
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

// Growth Hormone Input Component
export const GrowthHormoneInput = ({ test, index, onRemove, onTestChange, patient }) => {
  const calculateAbnormality = (value) => {
    if (!value) return 'normal';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Reference: <10 ng/mL (typical)
    if (numValue < 10) return 'normal';
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
              Growth Hormone Value
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
            Reference Range
          </label>
          <input
            type="text"
            value={test.referenceRange || '<10'}
            onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter reference range"
          />
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

// IGF-1 Input Component
export const IGF1Input = ({ test, index, onRemove, onTestChange, patient }) => {
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
              IGF-1 Value
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
            Reference Range (optional)
          </label>
          <input
            type="text"
            value={test.referenceRange || ''}
            onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Age-dependent"
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

// Metabolic Hormones (Insulin-related) Component
export const MetabolicHormonesInput = ({ test, index, onRemove, onTestChange, onParameterChange, patient }) => {
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

  // Calculate HOMA-IR: (Glucose × Insulin) / 405
  const calculateHOMAIR = () => {
    const insulinParam = test.parameters?.find(p => p.code === 'INS');
    const glucoseValue = test.fastingGlucose || '';
    
    if (insulinParam?.resultValue && glucoseValue) {
      const insulin = parseFloat(insulinParam.resultValue);
      const glucose = parseFloat(glucoseValue);
      if (!isNaN(insulin) && !isNaN(glucose) && glucose > 0) {
        return ((glucose * insulin) / 405).toFixed(2);
      }
    }
    return '';
  };

  const homaIR = calculateHOMAIR();

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
            Fasting Glucose (if not auto-imported)
          </label>
          <input
            type="number"
            step="any"
            value={test.fastingGlucose || ''}
            onChange={(e) => onTestChange(index, 'fastingGlucose', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter fasting glucose (mg/dL)"
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
              {/* HOMA-IR row */}
              {homaIR && (
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900 font-medium">HOMA-IR (auto-calculated)</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={homaIR}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 font-medium"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">—</td>
                  <td className="px-3 py-2 text-sm text-gray-600">&lt;2.0 ideal</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      parseFloat(homaIR) < 2.0 ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {parseFloat(homaIR) < 2.0 ? 'N' : 'H'}
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
            rows="3"
            placeholder="Enter interpretation..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

// β-hCG (Quantitative) Input Component
export const BetaHCGQuantitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
              Beta-hCG Value
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
              value={test.resultUnit || 'mIU/mL'}
              onChange={(e) => onTestChange(index, 'resultUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Range (depends on pregnancy week)
          </label>
          <input
            type="text"
            value={test.referenceRange || ''}
            onChange={(e) => onTestChange(index, 'referenceRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
            placeholder="Enter reference range"
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

// hCG Qualitative (Rapid) Input Component
export const HCGQualitativeInput = ({ test, index, onRemove, onTestChange, patient }) => {
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
            <option value="Indeterminate">Indeterminate</option>
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

