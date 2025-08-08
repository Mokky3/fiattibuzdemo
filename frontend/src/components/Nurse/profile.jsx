// src/components/Nurse/profile.jsx

import React from 'react';

const NurseProfile = () => {
  const nurse = {
    fullName: 'Nurse A. Karimova',
    email: 'a.karimova@fiattib.uz',
    phone: '+998 90 123 45 67',
    department: 'Pediatrics',
    licenseNumber: 'NR-99871234',
    experience: '5 years',
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">Nurse Profile</h2>
      <div className="space-y-2">
        <div><strong>Full Name:</strong> {nurse.fullName}</div>
        <div><strong>Email:</strong> {nurse.email}</div>
        <div><strong>Phone:</strong> {nurse.phone}</div>
        <div><strong>Department:</strong> {nurse.department}</div>
        <div><strong>License Number:</strong> {nurse.licenseNumber}</div>
        <div><strong>Experience:</strong> {nurse.experience}</div>
      </div>
    </div>
  );
};

export default NurseProfile;
