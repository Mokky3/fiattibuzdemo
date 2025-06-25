import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    pinfl: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^\d{14}$/.test(formData.pinfl)) {
      alert("PINFL 14 raqamdan iborat bo'lishi kerak");
      return;
    }

    if (!/^\+998\d{9}$/.test(formData.phoneNumber)) {
      alert("Telefon raqam +998 bilan boshlanib, jami 13 raqamdan iborat bo'lishi kerak");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}/.test(formData.password)) {
      alert("Parolda kamida 8ta belgi, katta va kichik harf, raqam va belgi bo'lishi kerak");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Parollar mos emas");
      return;
    }

    const payload = {
      first_name: formData.firstName,
      last_name: formData.surname,
      pinfl: formData.pinfl,
      phone_number: formData.phoneNumber,
      email: formData.email,
      password: formData.password,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/patients/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
      }

      const data = await response.json();
      console.log('Registration success:', data);
      alert("Ro'yxatdan o'tish muvaffaqiyatli!");
      navigate('/patient/dashboard');
    } catch (error) {
      console.error('Registration failed:', error.message);
      alert("Xatolik: " + error.message);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="w-full max-w-md border border-[#5DC692] rounded-lg p-10">
          <div className="text-center mb-10">
            <h1 className="text-[#F44A53] text-4xl font-bold mb-3">AKFA MEDLINE</h1>
            <p className="text-gray-700 text-lg">Bemor portali</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Ismingiz"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Familyangiz"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <input
                type="text"
                name="pinfl"
                value={formData.pinfl}
                onChange={(e) => {
                  if (e.target.value.length > 14) return;
                  setFormData(prev => ({ ...prev, pinfl: e.target.value.replace(/\D/g, '') }));
                }}
                placeholder="PINFL (14 raqam)"
                pattern="^\d{14}$"
                title="PINFL 14 raqamdan iborat bo'lishi kerak"
                maxLength={14}
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onFocus={() => {
                  if (!formData.phoneNumber.startsWith('+998')) {
                    setFormData(prev => ({ ...prev, phoneNumber: '+998' }));
                  }
                }}
                onChange={(e) => {
                  const input = e.target.value;
                  if (!input.startsWith('+998')) return;
                  const cleaned = '+998' + input.slice(4).replace(/\D/g, '').slice(0, 9);
                  setFormData(prev => ({ ...prev, phoneNumber: cleaned }));
                }}
                placeholder="+998901234567"
                pattern="^\+998\d{9}$"
                title="Telefon raqam +998 bilan boshlanib, jami 13 raqamdan iborat bo'lishi kerak"
                maxLength={13}
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@gmail.com"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Parol (kamida 8 belgi, @#$...)"
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$"
                title="Kamida 8 belgi, katta-kichik harf, raqam va belgi bo'lishi kerak"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="mb-6">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Parolingizni yana bir bor kiriting"
                className="w-full px-4 py-4 border border-[#5DC692] rounded-md focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mr-2 h-4 w-4 accent-[#5DC692]"
                required
              />
              <label className="text-[#5DC692] text-sm">
                Foydalanish shartlariga roziman
                <span className="block text-gray-500 text-xs">Rozilik bildirgan holda davom eting</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#5DC692] text-white font-medium rounded-md text-lg mb-4"
            >
              Ro'yxatdan o'tish
            </button>

            <div className="text-center">
              <Link to="/signin" className="text-sm text-[#5DC692] hover:underline">
                Kirish
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
