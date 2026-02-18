import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Vital Sign Form Component
export const VitalSignForm = ({ onSubmit, onCancel, submitting }) => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
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
    <form onSubmit={handleSubmit} className={`border rounded-lg p-6 space-y-4 transition-colors ${
      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('recordVitalSigns')}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('temperature')} (°C)</label>
          <input
            type="number"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="36.5"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('bloodPressure')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.bloodPressureSystolic}
              onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
              className={`w-full border rounded px-3 py-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="120"
            />
            <span className={`self-center ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>/</span>
            <input
              type="number"
              value={formData.bloodPressureDiastolic}
              onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
              className={`w-full border rounded px-3 py-2 transition-colors ${
                darkMode
                  ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="80"
            />
          </div>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('heartRate')} (bpm)</label>
          <input
            type="number"
            value={formData.heartRate}
            onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="72"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('respiratoryRate')}</label>
          <input
            type="number"
            value={formData.respiratoryRate}
            onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="16"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('oxygenSaturation')} (%)</label>
          <input
            type="number"
            value={formData.oxygenSaturation}
            onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="98"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('painScale')} (0-10)</label>
          <input
            type="number"
            min="0"
            max="10"
            value={formData.painScale}
            onChange={(e) => setFormData({ ...formData, painScale: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="0"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('height')} (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="170"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
          }`}>{t('weight')} (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            className={`w-full border rounded px-3 py-2 transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            placeholder="70"
          />
        </div>
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('notes')}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          rows="3"
          placeholder={t('additionalNotes')}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 border rounded transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          disabled={submitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded transition-colors ${
            darkMode
              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
          disabled={submitting}
        >
          {submitting ? t('recording') : t('recordVitalSigns')}
        </button>
      </div>
    </form>
  );
};

// Observation Form Component
export const ObservationForm = ({ onSubmit, onCancel, submitting }) => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
    <form onSubmit={handleSubmit} className={`border rounded-lg p-6 space-y-4 transition-colors ${
      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('addClinicalObservation')}</h3>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('observation')}</label>
        <textarea
          value={formData.observation}
          onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          rows="4"
          placeholder={t('observationPlaceholder')}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('category')}</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="general">{t('general')}</option>
          <option value="pain">{t('pain')}</option>
          <option value="wound">{t('wound')}</option>
          <option value="behavioral">{t('behavioral')}</option>
          <option value="safety">{t('safety')}</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 border rounded transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          disabled={submitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded transition-colors ${
            darkMode
              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
          disabled={submitting || !formData.observation.trim()}
        >
          {submitting ? t('recording') : t('recordObservation')}
        </button>
      </div>
    </form>
  );
};

// Allergy Form Component
export const AllergyForm = ({ onSubmit, onCancel, submitting }) => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
    <form onSubmit={handleSubmit} className={`border rounded-lg p-6 space-y-4 transition-colors ${
      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('addAllergy')}</h3>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('allergen')} *</label>
        <input
          type="text"
          value={formData.allergen}
          onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder={t('allergenPlaceholder')}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('severity')}</label>
        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="">{t('selectSeverity')}</option>
          <option value="mild">{t('mild')}</option>
          <option value="moderate">{t('moderate')}</option>
          <option value="severe">{t('severe')}</option>
          <option value="life-threatening">{t('lifeThreatening')}</option>
        </select>
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('reaction')}</label>
        <input
          type="text"
          value={formData.reaction}
          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder={t('reactionPlaceholder')}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 border rounded transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          disabled={submitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded transition-colors ${
            darkMode
              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
          disabled={submitting || !formData.allergen.trim()}
        >
          {submitting ? t('adding') : t('addAllergy')}
        </button>
      </div>
    </form>
  );
};

// Immunization Form Component
export const ImmunizationForm = ({ onSubmit, onCancel, submitting }) => {
  const { t } = useTranslation();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
    <form onSubmit={handleSubmit} className={`border rounded-lg p-6 space-y-4 transition-colors ${
      darkMode ? 'bg-[#0D2026] border-[#133037]' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
      }`}>{t('addImmunization')}</h3>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('vaccine')} *</label>
        <input
          type="text"
          value={formData.vaccine}
          onChange={(e) => setFormData({ ...formData, vaccine: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder={t('vaccinePlaceholder')}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('lotNumber')}</label>
        <input
          type="text"
          value={formData.lotNumber}
          onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder={t('lotNumberPlaceholder')}
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
        }`}>{t('date')}</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className={`w-full border rounded px-3 py-2 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 border rounded transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          disabled={submitting}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded transition-colors ${
            darkMode
              ? 'bg-[#79CAC2] text-[#050C0F] hover:bg-[#58B4AA]'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
          disabled={submitting || !formData.vaccine.trim()}
        >
          {submitting ? t('adding') : t('addImmunization')}
        </button>
      </div>
    </form>
  );
};

