// Auto-generated from 2 years (2025-2026) of FAST-NUCES closing-merit data,
// sourced from a third-party test-prep aggregator (not FAST's own official
// portal) and cross-checked against FAST's official program pages
// (nu.edu.pk) for which formula/university entry each program belongs to.
//
// universitySlug ties each offering to the matching entry in data.ts --
// "fast-engineering" (Civil/Computer/Electrical Engineering, 17/50/33 formula)
// or "fast" (everything else -- CS, SE, AI, Data Science, Cyber Security,
// BBA, Business Analytics, Accounting & Finance, Financial Technology --
// 10/40/50 formula).
//
// KNOWN CAVEATS -- do not silently resolve without checking FAST's own
// official closing-merit list:
//   - Four "0" values in the 2025 source (Faisalabad BBA, Peshawar AI/EE,
//     Karachi BBA) were treated as "not offered / no data" and excluded --
//     a real 0% cutoff isn't plausible for a competitive private university.
//   - Islamabad Accounting & Finance jumped 31 -> 63.51 between 2025 and 2026,
//     more than doubling in one year at the same campus -- flagged, not verified.
//   - Karachi Computer Engineering (60.36 -> 71.47) and a few other Engineering
//     programs show large (7-11pt) one-year swings -- plausible but unverified.
//   - Multan's 2026 figure for Business Analytics has no 2025 precedent (Multan
//     launched Fall 2025 with only AI/CS/SE per FAST's own announcement) --
//     read as a genuine second-year program addition, not a data error.
//
// Because this is only 2 years, getTrend() here is a single year-over-year
// delta, not an average of several -- a much weaker signal than UET's 4-year
// baseline. Surface that distinction in the UI rather than presenting both
// universities' trend lines with equal confidence.

import { MeritHistoryPoint } from "./merit-history-shared";

export interface FastProgramOffering {
  universitySlug: "fast" | "fast-engineering";
  program: string;
  campus: string;
  history: MeritHistoryPoint[];
}

export const FAST_CLOSING_MERITS: FastProgramOffering[] = [
  { universitySlug: "fast", program: "Accounting & Finance", campus: "Islamabad", history: [{ year: 2025, pct: 31.0 }, { year: 2026, pct: 63.51 }] },
  { universitySlug: "fast", program: "Accounting & Finance", campus: "Lahore", history: [{ year: 2025, pct: 46.92 }, { year: 2026, pct: 60.0 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 71.9 }, { year: 2026, pct: 70.0 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Islamabad", history: [{ year: 2025, pct: 73.0 }, { year: 2026, pct: 74.22 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Karachi", history: [{ year: 2025, pct: 65.47 }, { year: 2026, pct: 69.0 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Lahore", history: [{ year: 2025, pct: 78.42 }, { year: 2026, pct: 77.0 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Multan", history: [{ year: 2025, pct: 63.5 }, { year: 2026, pct: 65.45 }] },
  { universitySlug: "fast", program: "Artificial Intelligence", campus: "Peshawar", history: [{ year: 2026, pct: 63.5 }] },
  { universitySlug: "fast", program: "Bachelor of Business Administration", campus: "Chiniot-Faisalabad", history: [{ year: 2026, pct: 55.75 }] },
  { universitySlug: "fast", program: "Bachelor of Business Administration", campus: "Islamabad", history: [{ year: 2025, pct: 54.0 }, { year: 2026, pct: 61.01 }] },
  { universitySlug: "fast", program: "Bachelor of Business Administration", campus: "Lahore", history: [{ year: 2025, pct: 49.67 }, { year: 2026, pct: 60.0 }] },
  { universitySlug: "fast", program: "Bachelor of Business Administration", campus: "Peshawar", history: [{ year: 2025, pct: 64.0 }] },
  { universitySlug: "fast", program: "Business Analytics", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 59.92 }, { year: 2026, pct: 56.85 }] },
  { universitySlug: "fast", program: "Business Analytics", campus: "Islamabad", history: [{ year: 2025, pct: 61.3 }, { year: 2026, pct: 62.91 }] },
  { universitySlug: "fast", program: "Business Analytics", campus: "Karachi", history: [{ year: 2026, pct: 60.75 }] },
  { universitySlug: "fast", program: "Business Analytics", campus: "Lahore", history: [{ year: 2025, pct: 61.13 }, { year: 2026, pct: 61.0 }] },
  { universitySlug: "fast", program: "Business Analytics", campus: "Multan", history: [{ year: 2026, pct: 59.0 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 65.0 }, { year: 2026, pct: 67.75 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Islamabad", history: [{ year: 2025, pct: 73.0 }, { year: 2026, pct: 73.55 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Karachi", history: [{ year: 2025, pct: 68.26 }, { year: 2026, pct: 65.89 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Lahore", history: [{ year: 2025, pct: 76.0 }, { year: 2026, pct: 74.35 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Multan", history: [{ year: 2025, pct: 66.0 }, { year: 2026, pct: 65.95 }] },
  { universitySlug: "fast", program: "Computer Science", campus: "Peshawar", history: [{ year: 2025, pct: 56.94 }, { year: 2026, pct: 59.0 }] },
  { universitySlug: "fast", program: "Cyber Security", campus: "Islamabad", history: [{ year: 2025, pct: 70.75 }, { year: 2026, pct: 72.71 }] },
  { universitySlug: "fast", program: "Cyber Security", campus: "Karachi", history: [{ year: 2025, pct: 65.08 }, { year: 2026, pct: 66.75 }] },
  { universitySlug: "fast", program: "Cyber Security", campus: "Lahore", history: [{ year: 2025, pct: 73.5 }, { year: 2026, pct: 75.0 }] },
  { universitySlug: "fast", program: "Data Science", campus: "Islamabad", history: [{ year: 2025, pct: 71.5 }, { year: 2026, pct: 73.02 }] },
  { universitySlug: "fast", program: "Data Science", campus: "Karachi", history: [{ year: 2025, pct: 67.76 }, { year: 2026, pct: 66.8 }] },
  { universitySlug: "fast", program: "Data Science", campus: "Lahore", history: [{ year: 2025, pct: 73.75 }, { year: 2026, pct: 74.25 }] },
  { universitySlug: "fast", program: "Financial Technology", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 57.0 }, { year: 2026, pct: 57.39 }] },
  { universitySlug: "fast", program: "Financial Technology", campus: "Islamabad", history: [{ year: 2026, pct: 64.0 }] },
  { universitySlug: "fast", program: "Financial Technology", campus: "Karachi", history: [{ year: 2025, pct: 49.3 }, { year: 2026, pct: 57.7 }] },
  { universitySlug: "fast", program: "Financial Technology", campus: "Lahore", history: [{ year: 2025, pct: 62.57 }, { year: 2026, pct: 64.5 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 65.87 }, { year: 2026, pct: 67.7 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Islamabad", history: [{ year: 2025, pct: 71.88 }, { year: 2026, pct: 72.5 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Karachi", history: [{ year: 2025, pct: 66.37 }, { year: 2026, pct: 66.3 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Lahore", history: [{ year: 2025, pct: 74.41 }, { year: 2026, pct: 74.18 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Multan", history: [{ year: 2025, pct: 70.21 }, { year: 2026, pct: 65.74 }] },
  { universitySlug: "fast", program: "Software Engineering", campus: "Peshawar", history: [{ year: 2025, pct: 57.8 }, { year: 2026, pct: 59.9 }] },
  { universitySlug: "fast-engineering", program: "Civil Engineering", campus: "Lahore", history: [{ year: 2025, pct: 54.0 }, { year: 2026, pct: 65.0 }] },
  { universitySlug: "fast-engineering", program: "Computer Engineering", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 70.38 }, { year: 2026, pct: 72.5 }] },
  { universitySlug: "fast-engineering", program: "Computer Engineering", campus: "Islamabad", history: [{ year: 2025, pct: 73.5 }, { year: 2026, pct: 77.02 }] },
  { universitySlug: "fast-engineering", program: "Computer Engineering", campus: "Karachi", history: [{ year: 2025, pct: 60.36 }, { year: 2026, pct: 71.47 }] },
  { universitySlug: "fast-engineering", program: "Computer Engineering", campus: "Lahore", history: [{ year: 2026, pct: 75.25 }] },
  { universitySlug: "fast-engineering", program: "Computer Engineering", campus: "Peshawar", history: [{ year: 2026, pct: 65.75 }] },
  { universitySlug: "fast-engineering", program: "Electrical Engineering", campus: "Chiniot-Faisalabad", history: [{ year: 2025, pct: 62.0 }, { year: 2026, pct: 72.25 }] },
  { universitySlug: "fast-engineering", program: "Electrical Engineering", campus: "Islamabad", history: [{ year: 2025, pct: 67.25 }, { year: 2026, pct: 74.27 }] },
  { universitySlug: "fast-engineering", program: "Electrical Engineering", campus: "Karachi", history: [{ year: 2025, pct: 61.33 }, { year: 2026, pct: 66.2 }] },
  { universitySlug: "fast-engineering", program: "Electrical Engineering", campus: "Lahore", history: [{ year: 2025, pct: 69.0 }, { year: 2026, pct: 74.0 }] },
  { universitySlug: "fast-engineering", program: "Electrical Engineering", campus: "Peshawar", history: [{ year: 2026, pct: 76.0 }] },
];
