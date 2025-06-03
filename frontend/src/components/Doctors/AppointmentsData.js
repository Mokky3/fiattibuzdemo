import { format } from 'date-fns';

// Helper to generate a date object for specified days from now
const getDateFromNow = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

// Generate a formatted date string
const formatDate = (date) => {
  return format(date, 'dd.MM.yyyy');
};

// Initial appointments data
const initialAppointments = [
  {
    id: 1,
    time: '10:00',
    date: new Date(),
    formattedDate: formatDate(new Date()),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'upcoming', // upcoming, accepted, past, pending
  },
  {
    id: 2,
    time: '10:30',
    date: new Date(),
    formattedDate: formatDate(new Date()),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'upcoming',
  },
  {
    id: 3,
    time: '11:00',
    date: new Date(),
    formattedDate: formatDate(new Date()),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'upcoming',
  },
  {
    id: 4,
    time: '14:00',
    date: new Date(),
    formattedDate: formatDate(new Date()),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'upcoming',
  },
  {
    id: 5,
    time: '14:00',
    date: getDateFromNow(10),
    formattedDate: formatDate(getDateFromNow(10)),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'pending',
  },
  {
    id: 6,
    time: '10:00',
    date: getDateFromNow(-5),
    formattedDate: formatDate(getDateFromNow(-5)),
    patient: 'Muhammad Hariton',
    problem: 'Anxiety problems',
    description: 'Description of problems and notes are written here',
    provider: 'Name of physician',
    status: 'past',
  },
];

export { initialAppointments };