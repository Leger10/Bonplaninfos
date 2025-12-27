import { addMonths, setDate, startOfMonth, isAfter, isSameDay, getDate } from 'date-fns';

/**
 * Calculates the next withdrawal date based on a schedule of days.
 * @param {number[]} scheduleDays - Array of days of the month (e.g., [5, 15, 25])
 * @returns {Date} The next valid withdrawal date
 */
export const getNextWithdrawalDate = (scheduleDays) => {
  if (!scheduleDays || scheduleDays.length === 0) return null;

  const today = new Date();
  const currentDay = getDate(today);
  const sortedDays = [...scheduleDays].sort((a, b) => a - b);

  // Try to find a date in the current month
  for (const day of sortedDays) {
    if (day >= currentDay) {
        // If today is the day, return today. Otherwise return the future date in current month
        const nextDate = setDate(today, day);
        return nextDate;
    }
  }

  // If no date found in current month, take the first available day next month
  const nextMonth = addMonths(today, 1);
  return setDate(startOfMonth(nextMonth), sortedDays[0]);
};

/**
 * Checks if withdrawals are currently open based on the schedule.
 * @param {number[]} scheduleDays 
 * @returns {boolean}
 */
export const isWithdrawalOpen = (scheduleDays) => {
    if (!scheduleDays || scheduleDays.length === 0) return false;
    const today = getDate(new Date());
    return scheduleDays.includes(today);
};