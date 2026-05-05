import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/// shadcn convention: `cn` merges Tailwind class strings, deduping conflicts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
