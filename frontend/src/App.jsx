import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './components/Auth/SignIn';
import SignUp from './components/Auth/SignUp';
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
import Prescription from './components/Patients/Prescription';
import Hospital from './components/Patients/Hospital';
import DoctorStats from './components/Doctors/DoctorStats';
import DoctorMessages from './components/Doctors/DoctorMessages';
import DoctorProfile from './components/Doctors/DoctorProfile';
import ChangePassword from './components/Doctors/ChangePassword';
import ReceptionistDashboard from './components/Reception/ReceptionDashboard';
import ReceptionistHeader from './components/Reception/ReceptionHeader';
import PatientRegister from './components/Reception/PatientRegister';
import ReceptionAppointments from './components/Reception/ReceptionAppoinments';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminUsers from './components/Admin/AdminUsers';
import AdminClinics from './components/Admin/AdminClinics';
import AdminSettings from './components/Admin/AdminSettings';
import AdminLogs from './components/Admin/AdminLogs';
import AdminUserProfile from './components/Admin/AdminUserProfile';
import ClinicProfile from './components/Admin/ClinicProfile';
import AdminUserStats from './components/Admin/AdminUserStats';







function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* 👤 Authentication */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

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


        {/* 🧑‍⚕️ Patient Pages */}
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/appointment" element={<PatientAppointment />} />
        <Route path="/patient/records" element={<Records />} />
        <Route path="/patient/prescription" element={<Prescription />} />
        <Route path="/patient/hospital" element={<Hospital />} />

        {/* 🏥 Receptionist Pages */}
        <Route path="/reception/dashboard" element={<ReceptionistDashboard />} />
        <Route path="/reception/header" element={<ReceptionistHeader />} />
        <Route path="/reception/register" element={<PatientRegister />} />
        <Route path="/reception/appointments" element={<ReceptionAppointments />} />

        {/* 🏢 Admin Pages */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/clinics" element={<AdminClinics />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
        <Route path="/admin/clinics/:clinicId" element={<ClinicProfile />} />
        <Route path="/admin/users/:userId/stats" element={<AdminUserStats />} />

        {/* Redirects */}
      </Routes>
    </Router>
  );
}

export default App;
