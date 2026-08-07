// Auto-generated from 4 years (2022-2025) of UET Lahore official merit-list data,
// manually transcribed and cross-checked against UET's official admissions portal
// (admission.uet.edu.pk, ecat.uet.edu.pk) for program classification.
//
// Only ECAT-based ("standard" formula) programs are included -- F.Sc.-based programs
// (Chemistry, Mathematics, Physics, BBA, BBIT, Environmental Science, Food Science &
// Technology, Energy Systems and Management, Business Analytics, Business Data Analytics,
// Biomedical Sciences, Industrial Chemistry, Interior Design, Islamic Studies, Logistics
// and Supply Chain Management, Materials Science, English Language and Literature) are
// excluded because their admission formula has no ECAT component and isn't comparable to
// this calculator's blended Matric+FSc+ECAT score.
//
// "session" (Morning/Afternoon) only exists as a distinction from 2025 onward -- years
// 2022-2024 predate the split, so a single history array may end in a session-tagged 2025
// point after three untagged years. Where a program had BOTH sessions in 2025, it appears
// as two separate offerings sharing the same 2022-2024 baseline.
//
// KNOWN DATA-QUALITY CAVEATS (do not silently resolve without checking the official
// UET merit list PDF/portal -- these are genuine conflicts found in the source screenshots):
//   - Electrical Engineering, Gujranwala Campus (RCET), A1, 2022: source had two conflicting values
//   - Biomedical Engineering, New Campus (Kala Shah Kaku), A1, 2022: source had two conflicting values
//   - Transportation Engineering, Main Campus (Lahore), A2, 2023: value matched an unrelated
//     program's figure exactly (near-certain transcription artifact in the source)
//   - Civil Engineering, Narowal Campus, A1, 2025 Morning: source had two conflicting values
//   - Computer Science, Main Campus (Lahore), A2, 2025 Morning: source had two conflicting values
// All five are omitted from history below rather than guessed at.

import {
  MeritHistoryPoint,
  Tier,
  getTrend,
  getProjectedCutoff,
  getTier,
  TIER_LABELS,
  groupByProgram,
} from "./merit-history-shared";

// Re-exported so existing imports elsewhere in the app (e.g.
// MeritCalculatorClient.tsx) that pull these from this file keep working
// unchanged -- the actual logic now lives in merit-history-shared.ts so
// FAST's data file can use the exact same functions without duplicating them.
export type { MeritHistoryPoint, Tier };
export { getTrend, getProjectedCutoff, getTier, TIER_LABELS, groupByProgram };

export type MeritCategory = "A1" | "A2";
export type Session = "Morning" | "Afternoon" | null;

export interface ProgramOffering {
  program: string;
  campus: string;
  category: MeritCategory;
  session: Session;
  history: MeritHistoryPoint[];
}

export const UET_CLOSING_MERITS: ProgramOffering[] = [
  { program: "Applied Computing", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 77.6 }] },
  { program: "Applied Computing", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 64.64 }] },
  { program: "Architectural Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 75.57 }, { year: 2023, pct: 77.65 }, { year: 2024, pct: 74.33 }, { year: 2025, pct: 78.27 }] },
  { program: "Architectural Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 60.69 }, { year: 2023, pct: 68.82 }, { year: 2024, pct: 71.29 }, { year: 2025, pct: 74.09 }] },
  { program: "Architecture", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 75.33 }, { year: 2023, pct: 79.43 }, { year: 2024, pct: 76.2 }, { year: 2025, pct: 78.84 }] },
  { program: "Architecture", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 54.98 }, { year: 2023, pct: 72.94 }, { year: 2024, pct: 72.75 }, { year: 2025, pct: 73.75 }] },
  { program: "Architecture", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2024, pct: 50.1 }, { year: 2025, pct: 51.77 }] },
  { program: "Artificial Intelligence", campus: "Main Campus (Lahore)", category: "A2", session: "Afternoon", history: [{ year: 2025, pct: 70.75 }] },
  { program: "Artificial Intelligence", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 78.89 }] },
  { program: "Artificial Intelligence", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 74.6 }] },
  { program: "Automotive Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 71.43 }, { year: 2023, pct: 74.3 }, { year: 2024, pct: 71.26 }, { year: 2025, pct: 77.01 }] },
  { program: "Automotive Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 55.92 }, { year: 2023, pct: 64.26 }, { year: 2024, pct: 65.64 }, { year: 2025, pct: 69.31 }] },
  { program: "Biomedical Engineering", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2023, pct: 52.28 }, { year: 2024, pct: 50.06 }, { year: 2025, pct: 53.88 }] },
  { program: "Biomedical Engineering", campus: "Narowal Campus", category: "A2", session: null, history: [{ year: 2022, pct: 56.49 }] },
  { program: "Biomedical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2023, pct: 71.64 }, { year: 2024, pct: 68.77 }, { year: 2025, pct: 70.09 }] },
  { program: "Biomedical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2023, pct: 52.32 }, { year: 2024, pct: 62.28 }, { year: 2025, pct: 58.73 }] },
  { program: "Chemical Engineering", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 54.47 }, { year: 2023, pct: 66.72 }, { year: 2024, pct: 58.83 }, { year: 2025, pct: 50.19 }] },
  { program: "Chemical Engineering", campus: "Faisalabad Campus", category: "A2", session: null, history: [{ year: 2022, pct: 58.92 }, { year: 2023, pct: 51.25 }] },
  { program: "Chemical Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 74.48 }, { year: 2023, pct: 75.67 }, { year: 2024, pct: 72.51 }, { year: 2025, pct: 78.47 }] },
  { program: "Chemical Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 55.11 }, { year: 2023, pct: 67.66 }, { year: 2024, pct: 67.86 }, { year: 2025, pct: 70.55 }] },
  { program: "Chemical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 61.52 }, { year: 2023, pct: 69.09 }, { year: 2024, pct: 62.04 }, { year: 2025, pct: 64.77 }] },
  { program: "Chemical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 54.61 }, { year: 2023, pct: 51.74 }, { year: 2024, pct: 58.03 }, { year: 2025, pct: 56.73 }] },
  { program: "City & Regional Planning", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 70.61 }, { year: 2023, pct: 76.3 }, { year: 2024, pct: 69.49 }, { year: 2025, pct: 70.45 }] },
  { program: "City & Regional Planning", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 52.7 }, { year: 2023, pct: 68.47 }, { year: 2024, pct: 67.11 }, { year: 2025, pct: 65.17 }] },
  { program: "Civil Engineering", campus: "Main Campus (Lahore)", category: "A1", session: null, history: [{ year: 2022, pct: 75.21 }, { year: 2023, pct: 76.25 }, { year: 2024, pct: 73.94 }] },
  { program: "Civil Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 65.44 }, { year: 2023, pct: 69.01 }, { year: 2024, pct: 68.03 }, { year: 2025, pct: 70.13 }] },
  { program: "Civil Engineering", campus: "Narowal Campus", category: "A1", session: null, history: [{ year: 2022, pct: 67.25 }, { year: 2023, pct: 67.95 }, { year: 2024, pct: 60.32 }] },
  { program: "Computer Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 79.67 }, { year: 2023, pct: 80.05 }, { year: 2024, pct: 76.45 }, { year: 2025, pct: 81.56 }] },
  { program: "Computer Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 72.97 }, { year: 2023, pct: 75.75 }, { year: 2024, pct: 73.37 }, { year: 2025, pct: 75.68 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2025, pct: 60.74 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Faisalabad Campus", category: "A2", session: "Morning", history: [{ year: 2025, pct: 57.11 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Gujranwala Campus (RCET)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 50.71 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Gujranwala Campus (RCET)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 58.12 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2025, pct: 58.44 }] },
  { program: "Computer Engineering (NCEAC)", campus: "Narowal Campus", category: "A2", session: "Morning", history: [{ year: 2025, pct: 60.15 }] },
  { program: "Computer Engineering (NCEAC)", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 72.78 }] },
  { program: "Computer Engineering (NCEAC)", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 66.03 }] },
  { program: "Computer Science", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 68.57 }, { year: 2023, pct: 75.56 }, { year: 2024, pct: 72.93 }, { year: 2025, pct: 71.29 }] },
  { program: "Computer Science", campus: "Faisalabad Campus", category: "A2", session: "Morning", history: [{ year: 2022, pct: 53.21 }, { year: 2023, pct: 71.3 }, { year: 2025, pct: 60.92 }] },
  { program: "Computer Science", campus: "Gujranwala Campus (RCET)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 64.34 }, { year: 2023, pct: 69.89 }, { year: 2024, pct: 67.05 }, { year: 2025, pct: 66.72 }] },
  { program: "Computer Science", campus: "Gujranwala Campus (RCET)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 50.96 }, { year: 2023, pct: 66.2 }, { year: 2025, pct: 51.14 }] },
  { program: "Computer Science", campus: "Main Campus (Lahore)", category: "A1", session: null, history: [{ year: 2022, pct: 79.38 }, { year: 2023, pct: 82.21 }, { year: 2024, pct: 81.47 }] },
  { program: "Computer Science", campus: "Main Campus (Lahore)", category: "A2", session: "Afternoon", history: [{ year: 2022, pct: 74.02 }, { year: 2023, pct: 78.41 }, { year: 2024, pct: 79.03 }, { year: 2025, pct: 72.57 }] },
  { program: "Computer Science", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 67.87 }, { year: 2023, pct: 69.49 }, { year: 2024, pct: 68.4 }, { year: 2025, pct: 66.84 }] },
  { program: "Computer Science", campus: "Narowal Campus", category: "A2", session: "Morning", history: [{ year: 2025, pct: 50.57 }] },
  { program: "Computer Science", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 75.21 }, { year: 2023, pct: 77.9 }, { year: 2024, pct: 78.83 }, { year: 2025, pct: 77.19 }] },
  { program: "Computer Science", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 68.23 }, { year: 2023, pct: 74.47 }, { year: 2024, pct: 74.29 }, { year: 2025, pct: 68.11 }] },
  { program: "Cybersecurity", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 81.68 }] },
  { program: "Cybersecurity", campus: "Main Campus (Lahore)", category: "A2", session: "Afternoon", history: [{ year: 2025, pct: 68.57 }] },
  { program: "Cybersecurity", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 75.8 }] },
  { program: "Data Science", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2024, pct: 80.03 }, { year: 2025, pct: 82.19 }] },
  { program: "Data Science", campus: "Main Campus (Lahore)", category: "A2", session: "Afternoon", history: [{ year: 2024, pct: 76.77 }, { year: 2025, pct: 68.89 }] },
  { program: "Data Science", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2024, pct: 76.77 }, { year: 2025, pct: 78.39 }] },
  { program: "Electrical Engineering", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 56.97 }, { year: 2023, pct: 66.51 }, { year: 2024, pct: 60.88 }, { year: 2025, pct: 60.58 }] },
  { program: "Electrical Engineering", campus: "Faisalabad Campus", category: "A2", session: null, history: [{ year: 2022, pct: 55.5 }, { year: 2023, pct: 51.07 }] },
  { program: "Electrical Engineering", campus: "Gujranwala Campus (RCET)", category: "A1", session: "Morning", history: [{ year: 2023, pct: 58.73 }, { year: 2024, pct: 55.62 }, { year: 2025, pct: 51.24 }] },
  { program: "Electrical Engineering", campus: "Gujranwala Campus (RCET)", category: "A2", session: null, history: [{ year: 2023, pct: 53.65 }] },
  { program: "Electrical Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 75.23 }, { year: 2023, pct: 77.52 }, { year: 2024, pct: 74.62 }, { year: 2025, pct: 80.35 }] },
  { program: "Electrical Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 51.0 }, { year: 2023, pct: 68.46 }, { year: 2024, pct: 68.94 }, { year: 2025, pct: 72.36 }] },
  { program: "Electrical Engineering", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 57.49 }, { year: 2023, pct: 58.11 }, { year: 2024, pct: 52.84 }, { year: 2025, pct: 50.69 }] },
  { program: "Electrical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 70.0 }, { year: 2023, pct: 71.8 }, { year: 2024, pct: 68.08 }, { year: 2025, pct: 69.74 }] },
  { program: "Electrical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 54.82 }, { year: 2023, pct: 56.82 }, { year: 2024, pct: 67.05 }, { year: 2025, pct: 66.72 }] },
  { program: "Environmental Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 66.88 }, { year: 2023, pct: 70.76 }, { year: 2024, pct: 64.77 }, { year: 2025, pct: 70.55 }] },
  { program: "Environmental Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 53.25 }, { year: 2023, pct: 55.07 }] },
  { program: "Gaming and Animations", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 77.93 }] },
  { program: "Gaming and Animations", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 63.7 }] },
  { program: "Geological Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 53.39 }, { year: 2023, pct: 66.44 }, { year: 2024, pct: 54.84 }, { year: 2025, pct: 57.92 }] },
  { program: "Geological Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 53.29 }, { year: 2023, pct: 56.77 }] },
  { program: "Industrial & Manufacturing Engineering", campus: "Gujranwala Campus (RCET)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 54.24 }, { year: 2023, pct: 52.28 }, { year: 2024, pct: 51.28 }, { year: 2025, pct: 52.79 }] },
  { program: "Industrial & Manufacturing Engineering", campus: "Gujranwala Campus (RCET)", category: "A2", session: null, history: [{ year: 2023, pct: 58.77 }] },
  { program: "Industrial & Manufacturing Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 70.8 }, { year: 2023, pct: 71.47 }, { year: 2024, pct: 67.55 }, { year: 2025, pct: 70.64 }] },
  { program: "Industrial & Manufacturing Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 55.68 }, { year: 2023, pct: 62.16 }, { year: 2024, pct: 65.46 }, { year: 2025, pct: 67.55 }] },
  { program: "Information Systems Technology", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 79.52 }] },
  { program: "Information Systems Technology", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 69.19 }] },
  { program: "Information Systems Technology", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 70.87 }] },
  { program: "Information Systems Technology", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 54.35 }] },
  { program: "Mechanical Engineering", campus: "Gujranwala Campus (RCET)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 54.36 }, { year: 2023, pct: 61.72 }, { year: 2024, pct: 58.16 }, { year: 2025, pct: 51.33 }] },
  { program: "Mechanical Engineering", campus: "Gujranwala Campus (RCET)", category: "A2", session: null, history: [{ year: 2022, pct: 61.23 }, { year: 2023, pct: 61.1 }] },
  { program: "Mechanical Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 76.64 }, { year: 2023, pct: 77.89 }, { year: 2024, pct: 74.44 }, { year: 2025, pct: 80.25 }] },
  { program: "Mechanical Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 56.05 }, { year: 2023, pct: 69.6 }, { year: 2024, pct: 68.66 }, { year: 2025, pct: 72.92 }] },
  { program: "Mechanical Engineering", campus: "Narowal Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 54.08 }, { year: 2023, pct: 58.83 }, { year: 2024, pct: 54.74 }, { year: 2025, pct: 50.38 }] },
  { program: "Mechanical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 69.0 }, { year: 2023, pct: 71.99 }, { year: 2024, pct: 67.63 }, { year: 2025, pct: 69.82 }] },
  { program: "Mechanical Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 55.3 }, { year: 2023, pct: 62.01 }, { year: 2024, pct: 65.61 }, { year: 2025, pct: 66.92 }] },
  { program: "Mechatronics & Control Engineering", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2023, pct: 60.37 }, { year: 2024, pct: 52.74 }, { year: 2025, pct: 56.59 }] },
  { program: "Mechatronics & Control Engineering", campus: "Faisalabad Campus", category: "A2", session: null, history: [{ year: 2022, pct: 63.21 }, { year: 2023, pct: 53.05 }, { year: 2024, pct: 56.21 }] },
  { program: "Mechatronics & Control Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 73.41 }, { year: 2023, pct: 76.22 }, { year: 2024, pct: 73.56 }, { year: 2025, pct: 79.62 }] },
  { program: "Mechatronics & Control Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 58.87 }, { year: 2023, pct: 70.16 }, { year: 2024, pct: 70.98 }, { year: 2025, pct: 72.6 }] },
  { program: "Metallurgical & Materials Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 66.97 }, { year: 2023, pct: 71.16 }, { year: 2025, pct: 69.31 }] },
  { program: "Metallurgical & Materials Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 54.62 }, { year: 2023, pct: 56.62 }, { year: 2024, pct: 64.42 }] },
  { program: "Mining Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 56.6 }, { year: 2023, pct: 68.58 }, { year: 2024, pct: 59.53 }, { year: 2025, pct: 62.32 }] },
  { program: "Mining Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 59.27 }, { year: 2023, pct: 56.72 }] },
  { program: "Petroleum & Gas Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 72.8 }, { year: 2023, pct: 75.3 }, { year: 2024, pct: 70.77 }, { year: 2025, pct: 76.54 }] },
  { program: "Petroleum & Gas Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 55.64 }, { year: 2023, pct: 67.03 }, { year: 2024, pct: 68.56 }, { year: 2025, pct: 69.81 }] },
  { program: "Polymer Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 58.21 }, { year: 2023, pct: 68.15 }, { year: 2024, pct: 59.34 }, { year: 2025, pct: 62.36 }] },
  { program: "Polymer Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 53.25 }, { year: 2023, pct: 51.11 }] },
  { program: "Product & Industrial Design", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 68.54 }, { year: 2023, pct: 75.13 }, { year: 2024, pct: 65.09 }, { year: 2025, pct: 64.75 }] },
  { program: "Product & Industrial Design", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 60.9 }, { year: 2023, pct: 66.93 }, { year: 2024, pct: 64.11 }, { year: 2025, pct: 57.23 }] },
  { program: "Robotics and Intelligent Systems", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2025, pct: 79.84 }] },
  { program: "Robotics and Intelligent Systems", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 69.08 }] },
  { program: "Software Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Afternoon", history: [{ year: 2025, pct: 82.48 }] },
  { program: "Software Engineering", campus: "Main Campus (Lahore)", category: "A2", session: "Morning", history: [{ year: 2025, pct: 78.84 }] },
  { program: "Software Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 77.57 }, { year: 2023, pct: 80.54 }, { year: 2024, pct: 79.26 }, { year: 2025, pct: 79.99 }] },
  { program: "Software Engineering", campus: "New Campus (Kala Shah Kaku)", category: "A2", session: "Morning", history: [{ year: 2022, pct: 74.71 }, { year: 2023, pct: 77.93 }, { year: 2024, pct: 78.49 }, { year: 2025, pct: 66.09 }] },
  { program: "Textile Engineering", campus: "Faisalabad Campus", category: "A1", session: "Morning", history: [{ year: 2022, pct: 52.22 }, { year: 2023, pct: 68.66 }, { year: 2024, pct: 56.33 }, { year: 2025, pct: 51.45 }] },
  { program: "Textile Engineering", campus: "Faisalabad Campus", category: "A2", session: null, history: [{ year: 2022, pct: 50.88 }, { year: 2023, pct: 54.14 }] },
  { program: "Transportation Engineering", campus: "Main Campus (Lahore)", category: "A1", session: "Morning", history: [{ year: 2022, pct: 60.37 }, { year: 2023, pct: 69.3 }, { year: 2024, pct: 59.63 }, { year: 2025, pct: 62.05 }] },
  { program: "Transportation Engineering", campus: "Main Campus (Lahore)", category: "A2", session: null, history: [{ year: 2022, pct: 57.2 }] },
];
