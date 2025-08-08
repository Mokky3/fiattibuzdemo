import React from 'react';
import { Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';

const CalendarSidebar = ({ 
  selectedDate, 
  onDateSelect, 
  currentDate, 
  onMonthChange, 
  appointments = [] 
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

  // Get today's appointments for summary
  const todayAppointments = getAppointmentsForDate(new Date());
  const totalToday = todayAppointments.length;
  const confirmedToday = Math.floor(totalToday * 0.6); // Mock data
  const pendingToday = totalToday - confirmedToday;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 sm:p-4 mb-4">
      <div className="flex items-center space-x-2 mb-4 p-2">
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#5ACCC3]" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Calendar</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center p-2">
          <button 
            onClick={previousMonth} 
            className="p-1 sm:p-2 text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:ring-opacity-50"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-bold text-gray-700 text-center text-sm sm:text-base">
            {format(currentDate, 'MMMM').toUpperCase()}
          </h2>
          <button 
            onClick={nextMonth} 
            className="p-1 sm:p-2 text-[#5ACCC3] hover:bg-[#5ACCC3] hover:bg-opacity-10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#5ACCC3] focus:ring-opacity-50"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map((day, i) => (
            <div key={i} className="py-1 sm:py-2 text-xs sm:text-sm font-semibold text-gray-600">
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
            
            return (
              <div 
                key={i} 
                onClick={() => onDateSelect(day)}
                className={`
                  p-1 sm:p-2 text-center rounded-lg w-8 h-8 sm:w-10 sm:h-10 mx-auto flex items-center justify-center
                  cursor-pointer text-xs sm:text-sm transition-all duration-200 hover:scale-110
                  ${isSelected ? 'bg-[#5ACCC3] text-white shadow-md' : 'hover:bg-gray-100'}
                  ${isTodayDate && !isSelected ? 'border-2 border-[#5ACCC3]' : ''}
                  ${hasAppointments && !isSelected ? 'bg-[#5ACCC3] bg-opacity-20' : ''}
                  ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                `}
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
      
      <div className="pt-3 sm:pt-4 border-t border-gray-200">
        <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Today's Summary</h4>
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-medium text-[#5ACCC3]">{totalToday}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pending:</span>
            <span className="font-medium text-yellow-600">{pendingToday}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Confirmed:</span>
            <span className="font-medium text-green-600">{confirmedToday}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;