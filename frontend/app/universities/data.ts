export interface University {
  slug: string;
  name: string;
  fullName: string;
  category: string;
  test: string;
  city: string;
  totalQuestions: number;
  duration: string;
  meritFormula: string | null;
  formulaConfidence: "high" | "medium" | "low" | "unverified";
  // Structured version of meritFormula, for the merit calculator.
  // Derived directly from the verified meritFormula string above --
  // not a new/separate source of truth. null when meritFormula is null.
  // matric / fsc / test are decimal weights (sum to 1.0).
  meritWeights: {
    matricLabel: string; // "Matric" or "SSC" depending on how the university phrases it
    fscLabel: string;    // "FSc" or "FSc (Part 1)" for NUST specifically
    matric: number;
    fsc: number;
    test: number;
  } | null;
  subjects: string[];
  minAggregate: string;
  negativeMarking: boolean;
  seats: string;
  testType: string;
  topPrograms: string[];
  website: string;
  about: string;
}

// NOTE ON DATA CONFIDENCE:
// Merit formulas verified via web research (multiple independent sources,
// official pages where possible) as of Jul 2026 -- see formulaConfidence
// per entry. Operational stats (question count, duration, seats, negative
// marking) were NOT independently verified. Fees and admission dates are
// intentionally omitted -- not researched, and too high-stakes/time-
// sensitive to guess. Always confirm with the official university website.

export const UNIVERSITIES: University[] = [
  {
    slug: "uet",
    name: "UET Lahore",
    fullName: "University of Engineering and Technology, Lahore",
    category: "Engineering",
    test: "ECAT",
    city: "Lahore",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "Matric 17% + FSc 50% + ECAT 33%",
    formulaConfidence: "medium",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", matric: 0.17, fsc: 0.50, test: 0.33 },
    subjects: ["Physics", "Maths", "Chemistry", "English"],
    minAggregate: "60%",
    negativeMarking: false,
    seats: "~4,000",
    testType: "Paper-based",
    topPrograms: ["Civil Engineering", "Electrical Engineering", "Mechanical Engineering", "Computer Science"],
    website: "https://uet.edu.pk",
    about: "UET Lahore is one of Pakistan's oldest and most established engineering universities, offering undergraduate programs across a wide range of engineering disciplines. Admission is based on the ECAT (Engineering College Admission Test), combined with Matric and FSc academic scores.",
  },
  {
    slug: "nust",
    name: "NUST",
    fullName: "National University of Sciences and Technology",
    category: "Engineering",
    test: "NET",
    city: "Islamabad",
    totalQuestions: 200,
    duration: "3 hours",
    meritFormula: "Matric 10% + FSc (Part 1) 15% + NET 75%",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc (Part 1)", matric: 0.10, fsc: 0.15, test: 0.75 },
    subjects: ["Physics", "Maths", "Chemistry / CS", "English", "Intelligence"],
    minAggregate: "Varies by program",
    negativeMarking: true,
    seats: "~2,500",
    testType: "Paper-based",
    topPrograms: ["Electrical Engineering", "Computer Science", "Mechanical Engineering", "BBA"],
    website: "https://nust.edu.pk",
    about: "NUST runs its own NET (NUST Entry Test), held in multiple series throughout the year, letting students retake and improve their best score. This makes NUST prep a recurring, year-round effort rather than a single attempt.",
  },
  {
    slug: "fast",
    name: "FAST-NUCES",
    fullName: "National University of Computer and Emerging Sciences",
    category: "Computing",
    test: "FAST Entry Test",
    city: "Lahore, Islamabad, Karachi, Peshawar, Chiniot-Faisalabad",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "SSC 10% + FSc 40% + Entry Test 50%",
    formulaConfidence: "low",
    meritWeights: { matricLabel: "SSC", fscLabel: "FSc", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Maths", "English", "IQ / Analytical"],
    minAggregate: "55%",
    negativeMarking: false,
    seats: "~3,000",
    testType: "Computer-based",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS Artificial Intelligence", "BS Electrical Engineering"],
    website: "https://nu.edu.pk",
    about: "FAST-NUCES is Pakistan's leading dedicated computing university, with 5 campuses across the country. Known for strong CS/software engineering placement outcomes and a competitive, analytical-reasoning-heavy entry test.",
  },
  {
    slug: "king-edward",
    name: "King Edward Medical University",
    fullName: "King Edward Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 200,
    duration: "3.5 hours",
    meritFormula: "Matric 10% + FSc 40% + MDCAT 50%",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "75%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://kemu.edu.pk",
    about: "KEMU is Pakistan's oldest medical college (est. 1860) and consistently has the highest closing merit in Punjab, reflecting its reputation as the province's most competitive public medical school.",
  },
  {
    slug: "allama-iqbal",
    name: "Allama Iqbal Medical College",
    fullName: "Allama Iqbal Medical College, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 200,
    duration: "3.5 hours",
    meritFormula: "Matric 10% + FSc 40% + MDCAT 50%",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "72%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://aimc.edu.pk",
    about: "AIMC is a well-established public medical college in Lahore, affiliated with Jinnah Hospital, and consistently ranks among Punjab's top MDCAT closing merits.",
  },
  {
    slug: "fatima-jinnah",
    name: "Fatima Jinnah Medical University",
    fullName: "Fatima Jinnah Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 200,
    duration: "3.5 hours",
    meritFormula: "Matric 10% + FSc 40% + MDCAT 50%",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "70%+",
    negativeMarking: true,
    seats: "~150 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://fjmu.edu.pk",
    about: "FJMU is a public medical university in Lahore. Historically a women's medical college, it remains one of Punjab's key public MBBS institutions under the same UHS-administered MDCAT merit system.",
  },
  {
    slug: "uvas",
    name: "UVAS",
    fullName: "University of Veterinary and Animal Sciences, Lahore",
    category: "Veterinary",
    test: "Entry Test",
    city: "Lahore",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: null,
    formulaConfidence: "unverified",
    meritWeights: null,
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "55%",
    negativeMarking: false,
    seats: "~800",
    testType: "Paper-based",
    topPrograms: ["DVM (Doctor of Veterinary Medicine)", "BS Zoology", "BS Food Science", "BS Bioinformatics"],
    website: "https://uvas.edu.pk",
    about: "UVAS is Pakistan's leading veterinary sciences university, offering the DVM degree plus several allied life-science bachelor's programs. Requires FSc Pre-Medical for DVM admission.",
  },
];

export function getUniversityBySlug(slug: string): University | undefined {
  return UNIVERSITIES.find((u) => u.slug === slug);
}