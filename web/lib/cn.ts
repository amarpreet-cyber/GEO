import clsx, { type ClassValue } from "clsx";

// Tiny class joiner — mirrors the Outreach `cn` helper.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
