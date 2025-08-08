import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

const DoctorSearchModal = ({ isOpen, onClose }) => {
  const [doctorSearchData, setDoctorSearchData] = useState({
    fullName: '',
    hospital: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    additionalNote: ''
  });

  const appointmentTypes = [
    'General Consultation',
    'Yearly Check Up',
    'Follow-up Visit',
    'Emergency Consultation',
    'Specialist Consultation'
  ];

  // Sample Uzbek doctors data
  const sampleDoctors = [
    { name: 'Dr. Abdulla Karimov', specialty: 'Cardiologist', hospital: 'Akfa Medline' },
    { name: 'Dr. Dilshod Toshev', specialty: 'Neurologist', hospital: 'Tashkent Medical City' },
    { name: 'Dr. Feruza Ismailova', specialty: 'Pediatrician', hospital: 'International Clinic Tashkent' },
    { name: 'Dr. Gulnoza Rahimova', specialty: 'Dermatologist', hospital: 'Akfa Medline' },
    { name: 'Dr. Jasur Nabiev', specialty: 'Orthopedist', hospital: 'Seoul National University Hospital' },
    { name: 'Dr. Kamila Yusupova', specialty: 'Gynecologist', hospital: 'Republican Research Center of Emergency Medicine' },
    { name: 'Dr. Laziz Normatov', specialty: 'Urologist', hospital: 'Tashkent Medical City' },
    { name: 'Dr. Mavluda Sharipova', specialty: 'Endocrinologist', hospital: 'International Clinic Tashkent' },
    { name: 'Dr. Nodir Azizov', specialty: 'Gastroenterologist', hospital: 'Akfa Medline' },
    { name: 'Dr. Oybek Hakimov', specialty: 'Ophthalmologist', hospital: 'Seoul National University Hospital' },
    { name: 'Dr. Parvina Sultanova', specialty: 'Psychiatrist', hospital: 'Republican Research Center of Emergency Medicine' },
    { name: 'Dr. Rustam Qodirov', specialty: 'Surgeon', hospital: 'Tashkent Medical City' },
    { name: 'Dr. Sevara Mirzaeva', specialty: 'Radiologist', hospital: 'International Clinic Tashkent' },
    { name: 'Dr. Timur Ergashev', specialty: 'Anesthesiologist', hospital: 'Akfa Medline' },
    { name: 'Dr. Umida Mahmudova', specialty: 'Pathologist', hospital: 'Seoul National University Hospital' }
  ];

  const handleDoctorSearchChange = (field, value) => {
    setDoctorSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDoctorSearch = (e) => {
    e.preventDefault();
    console.log('Doctor search:', doctorSearchData);
    onClose();
  };

  const handleClose = () => {
    setDoctorSearchData({
      fullName: '',
      hospital: '',
      appointmentDate: '',
      appointmentTime: '',
      appointmentType: '',
      additionalNote: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 sm:border-4 border-blue-400">
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-2xl font-semibold text-emerald-400">Search a doctor</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <form onSubmit={handleDoctorSearch} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={doctorSearchData.fullName}
                  onChange={(e) => handleDoctorSearchChange('fullName', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Hospital"
                  value={doctorSearchData.hospital}
                  onChange={(e) => handleDoctorSearchChange('hospital', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors text-sm sm:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment date</label>
              <input
                type="date"
                value={doctorSearchData.appointmentDate}
                onChange={(e) => handleDoctorSearchChange('appointmentDate', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                placeholder="date/month/year"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment time</label>
              <input
                type="time"
                value={doctorSearchData.appointmentTime}
                onChange={(e) => handleDoctorSearchChange('appointmentTime', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm sm:text-base"
                placeholder="time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Appointment type</label>
              <div className="relative">
                <select
                  value={doctorSearchData.appointmentType}
                  onChange={(e) => handleDoctorSearchChange('appointmentType', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent appearance-none bg-white text-sm sm:text-base"
                >
                  <option value="">Value</option>
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 sm:top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">Additional note (optional)</label>
              <textarea
                value={doctorSearchData.additionalNote}
                onChange={(e) => handleDoctorSearchChange('additionalNote', e.target.value)}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-sm sm:text-base"
                placeholder="Value"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 sm:px-8 py-2 sm:py-3 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium text-sm sm:text-base"
              >
                SUBMIT
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorSearchModal; 