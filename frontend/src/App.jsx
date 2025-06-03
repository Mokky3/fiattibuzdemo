import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SignIn from './components/Auth/SignIn'
import SignUp from './components/Auth/SignUp'
import './App.css'
import Dashboard from './components/Doctors/Dashboard'
import Appointments from './components/Doctors/Appointments'
import Patient from './components/Doctors/Patient'
import Report from './components/Doctors/Report'
import ViewReport from './components/Doctors/ViewReport'
import Landing from './components/General/Landing'
import PatientDashboard from './components/Patients/PatientDashboard'
import PatientAppointment from './components/Patients/PatientAppointment'
import Records from './components/Patients/Records'
import Prescription from './components/Patients/Prescription'
import Hospital from './components/Patients/Hospital'

function App() {
  return (
    <Router>
      
        <Routes>
          {/* <Route path="/doctor" element={<SignIn />} /> */}
          <Route path="/doctor/signin" element={<SignIn />} />
          <Route path="/doctor/signup" element={<SignUp />} />
          <Route path="/doctor/dashboard" element={<Dashboard />} />
          <Route path="/doctor/appointment" element={<Appointments />} />
          <Route path="/doctor/patient" element={<Patient />} />
          <Route path="/doctor/report/:patientId" element={<Report />} />
          <Route path="/reports/:reportId" element={<ViewReport />} />
          <Route path="/" element={<Landing />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/appointment" element={<PatientAppointment />} />
          <Route path="/patient/records" element={<Records />} />
          <Route path="/patient/prescription" element={<Prescription />} />
          <Route path="/patient/hospital" element={<Hospital />} />
          {/* Add more routes as needed */}
        </Routes>
    </Router>
  )
}

export default App