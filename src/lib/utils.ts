import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDuration = (totalSeconds: number | null | undefined): string => {
  if (totalSeconds == null || totalSeconds < 0) return '-';

  // Under 1 second: return milliseconds
  if (totalSeconds < 1) {
    return `${Math.round(totalSeconds * 1000)}ms`;
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  // Hide seconds if duration is in days to keep UI clean
  if (seconds > 0 && days === 0) {
    parts.push(`${seconds}s`);
  }

  // Handle case where duration is exactly a multiple of 60 
  // and above 0 but parts might be empty if we are not careful 
  // (though the logic above handles it via minutes/hours/days).
  // If even seconds is 0 but it's >= 1s (e.g. 1.0s), 
  // it might result in empty parts if it was say exactly 1.0001s but rounded down.
  
  if (parts.length === 0) {
    return "0s";
  }

  return parts.join(' ');
};
