/**
 * Date utility functions for handling timezone conversions
 */

/**
 * Converts a Date object to local timezone
 * This is useful when storing dates in the database in local time instead of UTC
 * @param date - The date to convert (defaults to current date/time)
 * @returns Date object adjusted to local timezone
 */
export function toLocalTime(date: Date = new Date()): Date {
    const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    return new Date(date.getTime() - offset);
}

/**
 * Gets the current date/time in local timezone
 * @returns Date object representing current time in local timezone
 */
export function getCurrentLocalTime(): Date {
    return toLocalTime(new Date());
}

/**
 * Converts UTC date to local timezone
 * @param utcDate - Date in UTC
 * @returns Date object adjusted to local timezone
 */
export function utcToLocal(utcDate: Date): Date {
    return toLocalTime(utcDate);
}

/**
 * Gets timezone offset in hours
 * @returns Timezone offset in hours (e.g., -5 for EST, +1 for CET)
 */
export function getTimezoneOffsetHours(): number {
    return -(new Date().getTimezoneOffset() / 60);
}

/**
 * Formats a date as ISO string in local timezone
 * @param date - The date to format
 * @returns ISO formatted string in local timezone
 */
export function toLocalISOString(date: Date = new Date()): string {
    const localDate = toLocalTime(date);
    return localDate.toISOString().slice(0, -1); // Remove 'Z' to indicate it's not UTC
}
