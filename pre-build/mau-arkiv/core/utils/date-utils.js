"use strict";
/**
 * Date utility functions for handling timezone conversions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLocalISOString = exports.getTimezoneOffsetHours = exports.utcToLocal = exports.getCurrentLocalTime = exports.toLocalTime = void 0;
/**
 * Converts a Date object to local timezone
 * This is useful when storing dates in the database in local time instead of UTC
 * @param date - The date to convert (defaults to current date/time)
 * @returns Date object adjusted to local timezone
 */
function toLocalTime(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    return new Date(date.getTime() - offset);
}
exports.toLocalTime = toLocalTime;
/**
 * Gets the current date/time in local timezone
 * @returns Date object representing current time in local timezone
 */
function getCurrentLocalTime() {
    return toLocalTime(new Date());
}
exports.getCurrentLocalTime = getCurrentLocalTime;
/**
 * Converts UTC date to local timezone
 * @param utcDate - Date in UTC
 * @returns Date object adjusted to local timezone
 */
function utcToLocal(utcDate) {
    return toLocalTime(utcDate);
}
exports.utcToLocal = utcToLocal;
/**
 * Gets timezone offset in hours
 * @returns Timezone offset in hours (e.g., -5 for EST, +1 for CET)
 */
function getTimezoneOffsetHours() {
    return -(new Date().getTimezoneOffset() / 60);
}
exports.getTimezoneOffsetHours = getTimezoneOffsetHours;
/**
 * Formats a date as ISO string in local timezone
 * @param date - The date to format
 * @returns ISO formatted string in local timezone
 */
function toLocalISOString(date = new Date()) {
    const localDate = toLocalTime(date);
    return localDate.toISOString().slice(0, -1); // Remove 'Z' to indicate it's not UTC
}
exports.toLocalISOString = toLocalISOString;
