import React from 'react';
import { Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isBefore, startOfDay } from 'date-fns';

const CalendarSidebar = ({ 
  selectedDate, 
  onDateSelect, 
  currentDate, 
  onMonthChange, 
  appointments = [],
  darkMode = false
}) => {
  
  // Calendar navigation functions
  const nextMonth = () => {
    onMonthChange(addMonths(currentDate, 1));
  };
  
  const previousMonth = () => {
    onMonthChange(subMonths(currentDate, 1));
  };
  
  // Generate days for the current month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Days of week for header
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Function to get filtered appointments for selected date
  const getAppointmentsForDate = (date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.date), date)
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return isSameDay(day, today);
  };

  // Check if date is in the past
  const isPastDate = (day) => {
    const today = startOfDay(new Date());
    const dayStart = startOfDay(day);
    return isBefore(dayStart, today) && !isToday(day);
  };

  // Get today's appointments for summary
  const todayAppointments = getAppointmentsForDate(new Date());
  const totalToday = todayAppointments.length;
  const confirmedToday = Math.floor(totalToday * 0.6); // Mock data
  const pendingToday = totalToday - confirmedToday;

  return (
    <div className="bg-transparent">
      <div className="mb-4">
        <div className="flex justify-between items-center p-2">
          <button 
            onClick={previousMonth} 
            className={`p-1 sm:p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              darkMode
                ? 'text-[#79CAC2] hover:bg-[#79CAC2] hover:bg-opacity-10 focus:ring-[#79CAC2]'
                : 'text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 focus:ring-[#5ACCC3]'
            }`}
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className={`font-bold text-center text-sm sm:text-base ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
          }`}>
            {format(currentDate, 'MMMM').toUpperCase()}
          </h2>
          <button 
            onClick={nextMonth} 
            className={`p-1 sm:p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              darkMode
                ? 'text-[#79CAC2] hover:bg-[#79CAC2] hover:bg-opacity-10 focus:ring-[#79CAC2]'
                : 'text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 focus:ring-[#5ACCC3]'
            }`}
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map((day, i) => (
            <div key={i} className={`py-1 sm:py-2 text-xs sm:text-sm font-semibold ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'
            }`}>
              {day}
            </div>
          ))}
          
          {Array.from({ length: new Date(monthStart).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1 sm:p-2"></div>
          ))}
          
          {daysInMonth.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasAppointments = getAppointmentsForDate(day).length > 0;
            const isPast = isPastDate(day);
            
            // Determine styling based on date status
            let dayClasses = `
              p-1 sm:p-2 text-center rounded-lg w-8 h-8 sm:w-10 sm:h-10 mx-auto flex items-center justify-center
              cursor-pointer text-xs sm:text-sm transition-all duration-200 hover:scale-110
            `;
            
            // Selected date styling
            if (isSelected) {
              dayClasses += darkMode 
                ? ' bg-[#79CAC2] text-[#050C0F] shadow-md' 
                : ' bg-[#5ACCC3] text-white shadow-md';
            } 
            // Past dates with appointments - gray background
            else if (hasAppointments && isPast) {
              dayClasses += darkMode
                ? ' bg-gray-600 bg-opacity-30 text-gray-400 hover:bg-gray-600 hover:bg-opacity-40'
                : ' bg-gray-300 text-gray-500 hover:bg-gray-400';
            }
            // Upcoming dates with appointments - system color border only
            else if (hasAppointments && !isPast) {
              const borderColor = darkMode ? '#79CAC2' : '#5ACCC3';
              dayClasses += ` border-2 ${darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'} ${darkMode ? 'hover:bg-[#10262D]' : 'hover:bg-gray-100'}`;
            }
            // Today (if not selected and no appointments)
            else if (isTodayDate && !isSelected) {
              const borderColor = darkMode ? '#79CAC2' : '#5ACCC3';
              dayClasses += ` border-2 ${darkMode ? 'border-[#79CAC2]' : 'border-[#5ACCC3]'} ${darkMode ? 'hover:bg-[#10262D]' : 'hover:bg-gray-100'}`;
            }
            // Regular dates without appointments
            else {
              dayClasses += darkMode 
                ? ' hover:bg-[#10262D]' 
                : ' hover:bg-gray-100';
            }
            
            // Text color based on state
            if (!isSameMonth(day, currentDate)) {
              dayClasses += darkMode ? ' text-gray-600' : ' text-gray-400';
            } else if (isPast && !hasAppointments) {
              dayClasses += darkMode ? ' text-gray-500' : ' text-gray-400';
            } else if (isSelected) {
              // Selected text color is already set above
            } else {
              dayClasses += darkMode ? ' text-[#C1D9DD]' : ' text-gray-700';
            }
            
            return (
              <div 
                key={i} 
                onClick={() => onDateSelect(day)}
                className={dayClasses}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDateSelect(day);
                  }
                }}
                aria-label={`Select ${format(day, 'MMMM d, yyyy')}`}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className={`pt-3 sm:pt-4 border-t ${
        darkMode ? 'border-[#133037]' : 'border-gray-200'
      }`}>
        <h4 className={`text-xs sm:text-sm font-medium mb-2 ${
          darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
        }`}>Today's Summary</h4>
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>Total:</span>
            <span className={`font-medium ${
              darkMode ? 'text-[#79CAC2]' : 'text-[#5ACCC3]'
            }`}>{totalToday}</span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>Pending:</span>
            <span className={`font-medium ${
              darkMode ? 'text-[#FACC15]' : 'text-yellow-600'
            }`}>{pendingToday}</span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? 'text-[#8AA2A7]' : 'text-gray-600'}>Confirmed:</span>
            <span className={`font-medium ${
              darkMode ? 'text-[#4ADE80]' : 'text-green-600'
            }`}>{confirmedToday}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;