import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Header = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? "border-b-2 border-white" : "";
  };

  return (
    <header className="bg-[#5ACCC3] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo section */}
        <div className="font-bold text-2xl tracking-wider">
          <Link to="/" className="text-white no-underline hover:text-opacity-90 transition-all flex items-center">
            <span className="mr-1">FIATTIB</span>
          </Link>
        </div>
        
        {/* Navigation section */}
        <nav className="flex space-x-8">
          {[
            { name: "APPOINTMENT", path: "/doctor/appointment" },
            { name: "PATIENT", path: "/doctor/patient" },
            { name: "DATA", path: "/doctor/data" },
            { name: "RESOURCES", path: "/doctor/resources" },
            { name: "MESSAGES", path: "/doctor/messages" }
          ].map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`text-white font-medium py-1 hover:border-b-2 hover:border-white transition-all ${isActive(item.path)}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Actions section */}
        <div className="flex items-center space-x-5">
          {/* Search bar */}
          <div className="flex items-center bg-white rounded-full px-4 py-1.5 shadow-inner transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-white focus-within:ring-opacity-50">
            <input 
              type="text" 
              placeholder="SEARCH" 
              className="bg-transparent border-none outline-none text-gray-800 text-sm w-28 placeholder-gray-400" 
            />
            <button className="bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {/* Profile icon */}
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shadow-md hover:bg-gray-600 transition-colors cursor-pointer">
            SR
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header;