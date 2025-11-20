import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './components/Auth/SignIn.jsx';
import SignUp from './components/Auth/SignUp.jsx';
import Register from './components/Auth/Register.jsx';
import ForgotPassword from './components/Auth/ForgotPassword.jsx';
import ResetPassword from './components/Auth/ResetPassword.jsx';
import './App.css';
import Dashboard from './components/Doctors/Dashboard';
import Appointments from './components/Doctors/Appointments';
import Patient from './components/Doctors/Patient';
import Report from './components/Doctors/Report';
import ViewReport from './components/Doctors/ViewReport';
import Landing from './components/General/Landing';
import PatientDashboard from './components/Patients/PatientDashboard';
import PatientAppointment from './components/Patients/PatientAppointment';
import Records from './components/Patients/Records';
import RecordSummary from './components/Patients/RecordSummary';
import Prescription from './components/Patients/Prescription';
import Hospital from './components/Patients/Hospital';
import PatientProfile from './components/Patients/profile';
import PatientSettings from './components/Patients/settings';
import DoctorStats from './components/Doctors/DoctorStats';
import DoctorMessages from './components/Doctors/DoctorMessages';
import DoctorProfile from './components/Doctors/DoctorProfile';
import ChangePassword from './components/Doctors/ChangePassword';
import ReceptionMessages from './components/Reception/ReceptionMessages';
import ReceptionistHeader from './components/Reception/ReceptionHeader';
import ReceptionistDashboard from './components/Reception/ReceptionDashboard';
import ReceptionAppointments from './components/Reception/ReceptionAppoinments';
import AllPastAppointments from './components/Reception/AllPastAppointments';
import AppointmentDetails from './components/Reception/AppointmentDetails';
import PatientRegister from './components/Reception/PatientRegister';
import ReceptionChangePassword from './components/Reception/ChangePassword';
import ReceptionProfile from './components/Reception/profile.jsx';
import ReceptionSettings from './components/Reception/settings.jsx';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminUsers from './components/Admin/AdminUsers';
import AdminClinics from './components/Admin/AdminClinics';
import AdminSettings from './components/Admin/AdminSettings';
import AdminLogs from './components/Admin/AdminLogs';
import AdminUserProfile from './components/Admin/AdminUserProfile';
import ClinicProfile from './components/Admin/ClinicProfile';
import AdminUserStats from './components/Admin/AdminUserStats';
import AdminProfile from './components/Admin/AdminProfile';
import AdminChangePasswordPage from './components/Admin/AdminChangePasswordPage';
import DoctorSettings from './components/Doctors/settings';
import LabTechnicianDashboard from './components/Lab/dashboard';
import LabHeader from './components/Lab/header';
import LabMessages from './components/Lab/messages';
import LabOrdersModule from './components/Lab/orders';
import LabPatientsModule from './components/Lab/patients';
import LabProfileModule from './components/Lab/profile';
import LabReportsModule from './components/Lab/Reports';
import LabReport from './components/Lab/LabReport';
import LabSettingsModule from './components/Lab/settings';
import LabResultsModule from './components/Lab/results';
import NurseHeader from './components/Nurse/header';
import NursePortalDashboard from './components/Nurse/dashboard';
import NursePatients from './components/Nurse/patients';
import NurseMedicationsModule from './components/Nurse/medications';
import NurseVitalsModule from './components/Nurse/vitals';
import NurseTasksModule from './components/Nurse/tasks';
import NurseSettingsModule from './components/Nurse/settings';
import NurseProfile from './components/Nurse/profile';
import NurseChangePassword from './components/Nurse/ChangePassword';
import NursePatientProfile from './components/Nurse/PatientProfile';
import NurseMessages from './components/Nurse/NurseMessages';
import RadiologyDashboard from './components/Radiology/dashboard';
import RadiologyStudies from './components/Radiology/studies';
import RadiologyWorklist from './components/Radiology/worklist';
import RadiologyMessages from './components/Radiology/messages';
import RadiologyProfileModule from './components/Radiology/profile';
import RadiologySettingsModule from './components/Radiology/settings';
import RadiologyTemplates from './components/Radiology/templates';
import PACSViewer from './components/Radiology/PACS';
import RadiologyHeader from './components/Radiology/header';
















function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* 👤 Authentication */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 🔒 Doctors: no signup allowed */}
        <Route path="/doctor/signin" element={<SignIn />} />
        <Route path="/doctor/signup" element={<Navigate to="/signin" replace />} /> {/* 🔒 Blocked */}

        {/* 👨‍⚕️ Doctor Pages */}
        <Route path="/doctor/dashboard" element={<Dashboard />} />
        <Route path="/doctor/appointment" element={<Appointments />} />
        <Route path="/doctor/patient" element={<Patient />} />
        <Route path="/doctor/report/:patientId" element={<Report />} />
        <Route path="/reports/:reportId" element={<ViewReport />} />
        <Route path="/doctor/stats" element={<DoctorStats />} />
        <Route path="/doctor/messages" element={<DoctorMessages />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/doctor/change-password" element={<ChangePassword />} />
        <Route path="/doctor/settings" element={<DoctorSettings />} />
        <Route path="/doctor/profile/:patientId" element={<PatientProfile />} />


        {/* 🧑‍⚕️ Patient Pages */}
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/appointment" element={<PatientAppointment />} />
        <Route path="/patient/records" element={<Records />} />
        <Route path="/patient/records/:recordId" element={<RecordSummary />} />
        <Route path="/patient/prescription" element={<Prescription />} />
        <Route path="/patient/hospital" element={<Hospital />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/patient/settings" element={<PatientSettings />} />


        {/* 🏥 Receptionist Pages */}
        <Route path="/reception/dashboard" element={<ReceptionistDashboard />} />
        <Route path="/reception/header" element={<ReceptionistHeader />} />
        <Route path="/reception/register" element={<PatientRegister />} />
        <Route path="/reception/appointments" element={<ReceptionAppointments />} />
        <Route path="/reception/appointments/past" element={<AllPastAppointments />} />
        <Route path="/reception/appointments/:appointmentId" element={<AppointmentDetails />} />
        <Route path="/reception/messages" element={<ReceptionMessages />} />
        <Route path="/reception/change-password" element={<ReceptionChangePassword />} />
        <Route path="/reception/profile" element={<ReceptionProfile />} />
        <Route path="/reception/settings" element={<ReceptionSettings />} />


        {/* 🏢 Admin Pages */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/clinics" element={<AdminClinics />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
        <Route path="/admin/clinics/:clinicId" element={<ClinicProfile />} />
        <Route path="/admin/users/:userId/stats" element={<AdminUserStats />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/change-password" element={<AdminChangePasswordPage />} />

        {/* 🧪 Lab Technician Pages */}
        <Route path="/lab/dashboard" element={<LabTechnicianDashboard />} />
        <Route path="/lab/messages" element={<LabMessages />} />
        <Route path="/lab/orders" element={<LabOrdersModule />} />
        <Route path="/lab/patients" element={<LabPatientsModule />} />
        <Route path="/lab/profile" element={<LabProfileModule />} />
        <Route path="/lab/results" element={<LabResultsModule />} />
        <Route path="/lab/reports" element={<LabReportsModule />} />
        <Route path="/lab/reports/new" element={<LabReport />} />
        <Route path="/lab/reports/new/:patientId" element={<LabReport />} />
        <Route path="/lab/settings" element={<LabSettingsModule />} />

        {/* 🩺 Nurse Pages */}
        <Route path="/nurse/dashboard" element={<NursePortalDashboard />} />
        <Route path="/nurse/patients" element={<NursePatients />} />
        <Route path="/nurse/patients/:patientId/profile" element={<NursePatientProfile />} />
        <Route path="/nurse/medications" element={<NurseMedicationsModule />} />
        <Route path="/nurse/vitals" element={<NurseVitalsModule />} />
        <Route path="/nurse/tasks" element={<NurseTasksModule />} />
        <Route path="/nurse/messages" element={<NurseMessages />} />
        <Route path="/nurse/settings" element={<NurseSettingsModule />} />
        <Route path="/nurse/profile" element={<NurseProfile />} />
        <Route path="/nurse/change-password" element={<NurseChangePassword />} />

        {/* 🩻 Radiology Pages */}
        <Route path="/radiology/dashboard" element={<RadiologyDashboard />} />
        <Route path="/radiology/studies" element={<RadiologyStudies />} />
        <Route path="/radiology/worklist" element={<RadiologyWorklist />} />
        <Route path="/radiology/messages" element={<RadiologyMessages />} />
        <Route path="/radiology/profile" element={<RadiologyProfileModule />} />
        <Route path="/radiology/settings" element={<RadiologySettingsModule />} />
        <Route path="/radiology/templates" element={<RadiologyTemplates />} />
        <Route path="/radiology/pacs" element={<PACSViewer />} />

        

        {/* Redirects */}


        <Route path="*" element={<h1 className="text-center mt-10 text-red-600 text-2xl">404 — Page not found</h1>} />

      </Routes>
    </Router>
  );
}

export default App;
