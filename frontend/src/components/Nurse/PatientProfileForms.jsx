import React, { useState } from 'react';

// Vital Sign Form Component
export const VitalSignForm = ({ onSubmit, onCancel, submitting }) => {
  const [formData, setFormData] = useState({
    temperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    painScale: '',
    height: '',
    weight: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : null,
      bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : null,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
      respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : null,
      oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : null,
      painScale: formData.painScale ? parseInt(formData.painScale) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      notes: formData.notes || null,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Record Vital Signs</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="36.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.bloodPressureSystolic}
              onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="120"
            />
            <span className="self-center">/</span>
            <input
              type="number"
              value={formData.bloodPressureDiastolic}
              onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="80"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
          <input
            type="number"
            value={formData.heartRate}
            onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="72"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Respiratory Rate</label>
          <input
            type="number"
            value={formData.respiratoryRate}
            onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="16"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oxygen Saturation (%)</label>
          <input
            type="number"
            value={formData.oxygenSaturation}
            onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="98"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pain Scale (0-10)</label>
          <input
            type="number"
            min="0"
            max="10"
            value={formData.painScale}
            onChange={(e) => setFormData({ ...formData, painScale: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="170"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="70"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows="3"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          disabled={submitting}
        >
          {submitting ? 'Recording...' : 'Record Vital Signs'}
        </button>
      </div>
    </form>
  );
};

// Observation Form Component
export const ObservationForm = ({ onSubmit, onCancel, submitting }) => {
  const [formData, setFormData] = useState({
    observation: '',
    category: 'general',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      observation: formData.observation,
      category: formData.category,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Add Clinical Observation</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observation</label>
        <textarea
          value={formData.observation}
          onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows="4"
          placeholder="e.g., Patient alert, oriented x3, no acute distress..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="general">General</option>
          <option value="pain">Pain</option>
          <option value="wound">Wound</option>
          <option value="behavioral">Behavioral</option>
          <option value="safety">Safety</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          disabled={submitting || !formData.observation.trim()}
        >
          {submitting ? 'Recording...' : 'Record Observation'}
        </button>
      </div>
    </form>
  );
};

// Allergy Form Component
export const AllergyForm = ({ onSubmit, onCancel, submitting }) => {
  const [formData, setFormData] = useState({
    allergen: '',
    severity: '',
    reaction: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      allergen: formData.allergen,
      severity: formData.severity || null,
      reaction: formData.reaction || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Add Allergy</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Allergen *</label>
        <input
          type="text"
          value={formData.allergen}
          onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., Penicillin, Peanuts, Latex..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select severity...</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="life-threatening">Life-threatening</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reaction</label>
        <input
          type="text"
          value={formData.reaction}
          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., Rash, Difficulty breathing..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          disabled={submitting || !formData.allergen.trim()}
        >
          {submitting ? 'Adding...' : 'Add Allergy'}
        </button>
      </div>
    </form>
  );
};

// Immunization Form Component
export const ImmunizationForm = ({ onSubmit, onCancel, submitting }) => {
  const [formData, setFormData] = useState({
    vaccine: '',
    lotNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      vaccine: formData.vaccine,
      lotNumber: formData.lotNumber || null,
      date: formData.date || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Add Immunization</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine *</label>
        <input
          type="text"
          value={formData.vaccine}
          onChange={(e) => setFormData({ ...formData, vaccine: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., COVID-19, Influenza, Hepatitis B..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
        <input
          type="text"
          value={formData.lotNumber}
          onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="Lot number..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          disabled={submitting || !formData.vaccine.trim()}
        >
          {submitting ? 'Adding...' : 'Add Immunization'}
        </button>
      </div>
    </form>
  );
};

