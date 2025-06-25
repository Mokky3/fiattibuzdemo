import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <nav className="bg-emerald-400 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="text-white text-xl font-bold">FIATTIB</div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/patient/appointment" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                APPOINTMENT
              </Link>
              <Link to="/patient/records" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                RECORDS
              </Link>
              <Link to="/patient/prescription" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                PRESCRIPTION
              </Link>
              <Link to="/patient/insurance" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                INSURANCE
              </Link>
              <Link to="/patient/hospital" className="text-white hover:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium">
                HOSPITAL
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/20 text-white placeholder-white/70 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
            </div>
            <button className="text-white hover:text-emerald-100">
              <Bell className="h-5 w-5" />
            </button>
            <div className="bg-emerald-600 rounded-full p-2">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
