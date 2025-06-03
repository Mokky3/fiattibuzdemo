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
    <div className="bg-gray-200 rounded-md shadow p-2 mb-4 border-2 border-blue-400">
      <div className="flex items-center space-x-2 mb-4 p-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center p-2">
          <button 
            onClick={previousMonth} 
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            &lt;
          </button>
          <h2 className="font-bold text-gray-700 text-center">
            {format(currentDate, 'MMMM').toUpperCase()}
          </h2>
          <button 
            onClick={nextMonth} 
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            &gt;
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map((day, i) => (
            <div key={i} className="py-2 text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
          
          {Array.from({ length: new Date(monthStart).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2"></div>
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
                  p-2 text-center rounded-full w-10 h-10 mx-auto flex items-center justify-center
                  cursor-pointer text-sm 
                  ${isSelected ? 'bg-[#5ACCC3] text-white' : 'hover:bg-gray-300'}
                  ${isTodayDate && !isSelected ? 'border border-[#5ACCC3]' : ''}
                  ${hasAppointments && !isSelected ? 'bg-gray-300' : ''}
                  ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
                `}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Today's Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Appointments:</span>
            <span className="font-medium text-blue-600">{totalToday}</span>
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