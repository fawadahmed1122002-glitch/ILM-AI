// ============================================================================
// SITE CONFIG -- update SITE_URL once the production domain is finalized.
// Used for canonical URLs and JSON-LD across all /universities pages.
// ============================================================================
export const SITE_URL = "https://prepxmentor.com";

// Confirmed against the real /merit-calculator page: it's a flat route (no
// [slug] segment) that lets the user pick a university via client-side
// state. Deep-linking a specific university therefore uses a query param,
// which MeritCalculatorClient reads via useSearchParams() to pre-select.
export const MERIT_CALCULATOR_BASE_PATH = "/merit-calculator";
export function getMeritCalculatorUrl(slug: string): string {
  return `${MERIT_CALCULATOR_BASE_PATH}?university=${encodeURIComponent(slug)}`;
}

// ============================================================================
// TYPES
// ============================================================================

// Tightened from `string` -- prevents typos (e.g. "Enginering") from silently
// breaking category filters, landing pages, and JSON-LD.
export type Category = "Engineering" | "Computing" | "Medical" | "Veterinary";
export const CATEGORIES: Category[] = ["Engineering", "Computing", "Medical", "Veterinary"];

export type FormulaConfidence = "high" | "medium" | "low" | "unverified";

// Single source of truth for the merit formula. The old `meritFormula` string
// field was hand-maintained *alongside* this object with no enforcement they
// stayed in sync -- one edited without the other would silently drift into
// contradiction. Now the display string is always derived from these weights
// via `formatMeritFormula`, so there is exactly one place to update a number.
export interface MeritWeights {
  matricLabel: string;
  fscLabel: string;
  // Label for the test portion, e.g. "ECAT", "Entry Test", "Test Percentile".
  // Kept separate from `test` (the short badge name shown elsewhere) because
  // several universities' official merit formula wording differs from their
  // test's common name (e.g. PIEAS's test is common-named "PIEAS Admission
  // Test" but its merit formula refers to "Test Percentile").
  testLabel: string;
  // Optional short caveat shown directly under the test-score input on the
  // merit calculator -- for cases where "enter your marks" isn't literally
  // correct, e.g. PIEAS ranks by test PERCENTILE, not raw score. Omit
  // (undefined) when the plain obtained/total marks entry is accurate as-is.
  testNote?: string;
  // matric / fsc / test are decimal weights (sum to 1.0 where a formula exists).
  matric: number;
  fsc: number;
  test: number;
}

export interface University {
  slug: string;
  name: string;
  fullName: string;
  category: Category;
  test: string;
  // Primary / headquarters city only. Additional campus cities go in
  // `campuses` -- keeping this split means `city` stays clean enough to use
  // for city-filter UI, city landing pages, and JSON-LD `addressLocality`,
  // none of which work well against a raw "Islamabad, Lahore, Abbottabad..."
  // string.
  city: string;
  campuses: string[];
  province: string;
  // Year founded. null where not independently verified -- do not fabricate;
  // see the data-confidence note below. (King Edward's 1860 is kept because
  // it was already asserted in that entry's own `about` text.)
  establishedYear: number | null;
  // "YYYY-MM" -- when this entry's merit formula / test-pattern facts were
  // last checked against sources. Surface this on-page as a freshness signal
  // and in JSON-LD `dateModified`.
  lastVerified: string;
  totalQuestions: number | null;
  duration: string | null;
  meritWeights: MeritWeights | null;
  formulaConfidence: FormulaConfidence;
  subjects: string[];
  minAggregate: string;
  negativeMarking: boolean | null;
  seats: string;
  // Parsed numeric approximation of `seats`, where the source gave a single
  // "~N" figure. null where seats "varies by program/department" or wasn't
  // stated as a single figure -- do not infer a number that isn't there.
  seatsApprox: number | null;
  testType: string;
  topPrograms: string[];
  // Complete program catalog, once independently verified per university --
  // same confidence bar as meritWeights: do not fill this from memory or a
  // single unverified source. null falls back to showing topPrograms with an
  // honest "full list not yet added" note rather than pretending topPrograms
  // (a curated highlight subset) is the complete offering.
  allPrograms: string[] | null;
  website: string;
  // Path under /public (e.g. "/universities/uet.jpg") once a real, properly-
  // licensed photo or logo has been sourced. null renders a category-colored
  // initials placeholder instead -- never hotlink a university's logo from an
  // unknown third-party URL; source from the university's own press/brand page
  // or your own campus photography.
  image: string | null;
  about: string;
}

// ============================================================================
// NOTE ON DATA CONFIDENCE -- READ BEFORE RELYING ON ANY ENTRY BELOW
// ============================================================================
// Merit formulas verified via web research (multiple independent sources,
// official pages where possible) as of Jul 2026. formulaConfidence per entry:
//
//   "high"   - Confirmed via an official university/regulator page or document,
//              OR via strong convergence (5+) of independent third-party sources
//              with no credible conflicting figures found.
//   "medium" - Found on official-adjacent pages but formula not stated as a
//              clean single weighted split, or minor unresolved ambiguity.
//   "low"    - Genuine conflicts found between sources, no official formula
//              located, or the university itself states merit varies by
//              program/department with no single universal formula.
//
// FIVE ENTRIES BELOW ARE "low" CONFIDENCE AND NEED YOUR OWN VERIFICATION
// before shipping as fact: Punjab University (PU), UCP, UMT, Bahria, Air
// University. Reasons noted per entry. Do not silently upgrade these to
// "high" without re-checking an official source directly.
//
// Operational stats (question count, duration, seats, negative marking)
// were NOT independently verified except where noted. Fees and admission
// dates are intentionally omitted -- not researched, and too high-stakes/
// time-sensitive to hardcode. Always confirm with the official university
// website (see `website` field per entry).
//
// establishedYear is left null throughout except where the fact was already
// asserted elsewhere in this file (King Edward, 1860) -- founding years were
// not part of this research pass and should not be guessed at.
// ============================================================================

export const UNIVERSITIES: University[] = [
  // ---------------------------------------------------------------------
  // ENGINEERING
  // ---------------------------------------------------------------------
  {
    slug: "uet",
    name: "UET Lahore",
    fullName: "University of Engineering and Technology, Lahore",
    category: "Engineering",
    test: "ECAT",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: "2 hours",
    formulaConfidence: "high", // Official UET Fall 2026 Undergraduate Prospectus, "Determination of Merit" section
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "ECAT", matric: 0.17, fsc: 0.50, test: 0.33 },
    subjects: ["Physics", "Maths", "Chemistry", "English"],
    minAggregate: "60%",
    negativeMarking: false,
    seats: "~4,000",
    seatsApprox: 4000,
    testType: "Paper-based",
    topPrograms: ["Civil Engineering", "Electrical Engineering", "Mechanical Engineering", "Computer Science"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://uet.edu.pk",
    image: "/universities/uet.png", // TODO: add once a licensed photo/logo is sourced
    about: "UET Lahore is one of Pakistan's oldest and most established engineering universities, offering undergraduate programs across a wide range of engineering disciplines. Admission is based on the ECAT, combined with Matric and FSc academic scores.",
  },
  {
    slug: "nust",
    name: "NUST",
    fullName: "National University of Sciences and Technology",
    category: "Engineering",
    test: "NET",
    city: "Islamabad",
    campuses: [],
    province: "Islamabad Capital Territory",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 200,
    duration: "3 hours",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc (Part 1)", testLabel: "NET", matric: 0.10, fsc: 0.15, test: 0.75 },
    subjects: ["Physics", "Maths", "Chemistry / CS", "English", "Intelligence"],
    minAggregate: "Varies by program",
    negativeMarking: true,
    seats: "~2,500",
    seatsApprox: 2500,
    testType: "Paper-based",
    topPrograms: ["Electrical Engineering", "Computer Science", "Mechanical Engineering", "BBA"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://nust.edu.pk",
    image: "/universities/nust.png", // TODO: add once a licensed photo/logo is sourced
    about: "NUST runs its own NET, held in multiple series throughout the year, letting students retake and improve their best score. This makes NUST prep a recurring, year-round effort rather than a single attempt.",
  },
  {
    slug: "fast-engineering",
    name: "FAST-NUCES (Engineering)",
    fullName: "National University of Computer and Emerging Sciences — Engineering Programs",
    category: "Engineering",
    test: "FAST Entry Test",
    city: "Lahore",
    campuses: ["Islamabad", "Karachi", "Peshawar", "Chiniot-Faisalabad"],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: "2 hours",
    formulaConfidence: "high", // Official nu.edu.pk/Admissions/EligibilityCriteria, updated 03-Jul-2026
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "Entry Test", matric: 0.17, fsc: 0.50, test: 0.33 },
    subjects: ["Physics", "Maths", "Chemistry / CS"],
    minAggregate: "60% in both SSC and HSSC",
    negativeMarking: false,
    seats: "~600",
    seatsApprox: 600,
    testType: "Computer-based",
    topPrograms: ["BS Civil Engineering", "BS Electrical Engineering", "BS Computer Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://nu.edu.pk",
    image: "/universities/fast.png", // TODO: add once a licensed photo/logo is sourced
    about: "FAST-NUCES's PEC-accredited engineering programs use a different merit formula than its Computing/CS programs -- weighted more heavily toward FSc, matching the standard HEC engineering pattern shared with UET. Looking for FAST's Computing or Business programs instead? See FAST-NUCES (Computing/Business), which uses a separate 50%-test-weighted formula.",
  },
  {
    slug: "giki",
    name: "GIKI",
    fullName: "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology",
    category: "Engineering",
    test: "GIKI Admission Test",
    city: "Topi",
    campuses: [],
    province: "Khyber Pakhtunkhwa",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "high", // Official giki.edu.pk/admissions/admissions-undergraduates/eligibility-criteria
    meritWeights: { matricLabel: "SSC + HSSC Part-I (combined)", fscLabel: "", testLabel: "Admission Test", matric: 0.15, fsc: 0, test: 0.85 },
    subjects: ["Physics", "Mathematics", "Chemistry / CS"],
    minAggregate: "60% in HSSC (Math, Physics & overall)",
    negativeMarking: null,
    seats: "~450",
    seatsApprox: 450,
    testType: "Own admission test (Physics + Math, intermediate level)",
    topPrograms: ["BS Computer Science", "BS Electrical Engineering", "BS Mechanical Engineering", "BS AI"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://giki.edu.pk",
    image: "/universities/giki.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "GIKI is a highly selective, donor-independent engineering institute in KPK known for one of Pakistan's most test-weighted merit formulas -- 85% of your score comes from the admission test itself.",
  },
  {
    slug: "pieas",
    name: "PIEAS",
    fullName: "Pakistan Institute of Engineering and Applied Sciences",
    category: "Engineering",
    test: "PIEAS Admission Test",
    city: "Islamabad",
    campuses: [],
    province: "Islamabad Capital Territory",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: "3 hours",
    formulaConfidence: "high", // Official admissions.pieas.edu.pk/FAQs.html
    meritWeights: { matricLabel: "SSC", fscLabel: "HSSC (Part 1)", testLabel: "Test Percentile", testNote: "PIEAS ranks by test PERCENTILE, not your raw score out of 100 -- enter the percentile figure from your result card here.", matric: 0.15, fsc: 0.25, test: 0.60 },
    subjects: ["Physics", "Mathematics", "Chemistry", "English"],
    minAggregate: "60% in both SSC and HSSC",
    negativeMarking: false,
    seats: "~400",
    seatsApprox: 400,
    testType: "Own admission test, 100 MCQs -- merit uses test PERCENTILE, not raw score",
    topPrograms: ["BS Computer Science", "BS Electrical Engineering", "BS Mechanical Engineering", "BS Nuclear Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://admissions.pieas.edu.pk",
    image: "/universities/pieas.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "PIEAS, operated under the Pakistan Atomic Energy Commission, is one of Pakistan's most academically demanding engineering institutes. Its test-heavy merit formula (60%) makes entry test performance the single biggest lever for admission. The campus sits in Nilore, on the eastern edge of Islamabad.",
  },
  {
    slug: "comsats",
    name: "COMSATS University Islamabad",
    fullName: "COMSATS University Islamabad (CUI)",
    category: "Engineering",
    test: "NTS NAT (NAT-IE / NAT-ICS / NAT-IM)",
    city: "Islamabad",
    campuses: ["Lahore", "Abbottabad", "Wah", "Attock", "Sahiwal", "Vehari"],
    province: "Islamabad Capital Territory",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 90,
    duration: null,
    formulaConfidence: "high", // Multi-source convergence (5+) + official "CUI UG Admission Merit Criteria" notification confirmed to exist on comsats.edu.pk (full PDF blocked by bot detection)
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "NTS/NAT", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Physics", "Mathematics", "Chemistry / CS", "English"],
    minAggregate: "60% in Intermediate/FSc",
    negativeMarking: false,
    seats: "~5,000 across all campuses",
    seatsApprox: 5000,
    testType: "NTS-administered, multiple campuses",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS Electrical Engineering", "BS Data Science"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://comsats.edu.pk",
    image: "/universities/comsats.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "COMSATS is one of Pakistan's largest public-sector universities with 7 campuses nationwide. Note: Architecture and Art & Design programs use a separate interview-based formula, not the standard aggregate.",
  },
  {
    slug: "ned",
    name: "NED University",
    fullName: "NED University of Engineering and Technology, Karachi",
    category: "Engineering",
    test: "NED Pre-Admission Entry Test",
    city: "Karachi",
    campuses: [],
    province: "Sindh",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: null,
    formulaConfidence: "high", // Express Tribune (Mar 2025) reported the policy change, quoting NED's VC; confirmed current for 2026 by multiple sources + official neduet.edu.pk admissions schedule PDF. This REPLACED an older 50/50 formula.
    meritWeights: { matricLabel: "N/A — Matric not used", fscLabel: "FSc / HSC-I", testLabel: "Entry Test", matric: 0, fsc: 0.40, test: 0.60 },
    subjects: ["Physics", "Mathematics", "Chemistry / CS", "English"],
    minAggregate: "60% HSSC (Engineering), 50% (non-Engineering); 50% minimum pass on entry test",
    negativeMarking: false,
    seats: "~3,000+",
    seatsApprox: 3000,
    testType: "Own computer-based test, 100 MCQs across 4 sections",
    topPrograms: ["BE Computer Science & IT", "BE Electrical Engineering", "BE Civil Engineering", "BS Software Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://www.neduet.edu.pk",
    image: "/universities/ned.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "NED is Karachi's flagship engineering university. Uniquely among major engineering universities, it excludes Matric marks entirely from merit. Most seats reserved for Sindh-domicile candidates.",
  },
  {
    slug: "itu",
    name: "ITU",
    fullName: "Information Technology University, Lahore",
    category: "Computing",
    test: "ITU Admissions Test",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "high", // Official itu.edu.pk/admissions/application-process, "Norms & Criteria" -- specific to BS Computer Science / BS AI
    meritWeights: { matricLabel: "Matric", fscLabel: "Inter Part I", testLabel: "Admission Test/SAT-I/USAT", matric: 0.15, fsc: 0.35, test: 0.50 },
    subjects: ["Physics", "Mathematics", "Chemistry / CS"],
    minAggregate: "50% minimum in ITU Admissions Test",
    negativeMarking: null,
    seats: "~150",
    seatsApprox: 150,
    testType: "Own test; ECAT/SAT/USAT/NTS/GAT/GRE accepted as exemptions for some programs",
    topPrograms: ["BS Computer Science", "BS Artificial Intelligence", "BS Electrical Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://itu.edu.pk",
    image: "/universities/itu.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "ITU is a smaller, research-focused public university in Lahore founded by Umar Saif, modeled loosely after MIT. Strong startup/incubator culture. Formula shown applies to BS Computer Science and BS AI specifically; other programs may differ.",
  },
  {
    slug: "punjab-university",
    name: "University of the Punjab",
    fullName: "University of the Punjab, Lahore",
    category: "Engineering",
    test: "PU Entry Test",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "low", // PU explicitly does NOT publish one universal formula across departments (confirmed by a third-party aggregator's own disclaimer). Two conflicting formulas found (25% Matric+50% Inter+25% Test vs. 67% combined academic+33% test) with no official single source resolving which applies where. NEEDS YOUR OWN VERIFICATION per-department before shipping any number.
    meritWeights: null, // Deliberately left null -- see confidence note
    subjects: ["Physics", "Mathematics", "Chemistry / CS", "English"],
    minAggregate: "Varies by department",
    negativeMarking: null,
    seats: "Varies by department",
    seatsApprox: null,
    testType: "Own entry test; varies by faculty/department",
    topPrograms: ["BS Computer Science", "BS Information Technology", "BS Software Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://pu.edu.pk",
    image: "/universities/pu.png", // TODO: add once a licensed photo/logo is sourced
    about: "Punjab University is one of Pakistan's oldest and largest universities, with a huge range of departments each potentially running its own admission criteria. Unlike UET or NUST, there is no single central merit formula -- verify per-department before relying on any figure.",
  },
  {
    slug: "ucp",
    name: "UCP",
    fullName: "University of Central Punjab, Lahore",
    category: "Engineering",
    test: "UCP Entry Test",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "low", // Official UCP page describes the entry test as a pass/fail eligibility gate ("applicants required to PASS the entry test to be eligible"), not a weighted merit component. No official weighted split located. NEEDS YOUR OWN VERIFICATION.
    meritWeights: null,
    subjects: ["Physics", "Mathematics", "Chemistry"],
    minAggregate: "60% FSc (Pre-Engineering) for Engineering/Pharmacy programs",
    negativeMarking: null,
    seats: "Varies by program",
    seatsApprox: null,
    testType: "Own entry test -- appears to function as pass/fail eligibility gate rather than weighted merit component",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS Electrical Engineering", "BBA"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://ucp.edu.pk",
    image: "/universities/ucp.png", // TODO: add once a licensed photo/logo is sourced
    about: "UCP is a private university in Lahore. Its published admission criteria describe passing an entry test as an eligibility requirement, with final merit apparently based mainly on academic marks -- but the exact weighting isn't clearly published. Verify directly before relying on this for prep guidance.",
  },
  {
    slug: "umt",
    name: "UMT",
    fullName: "University of Management and Technology, Lahore",
    category: "Engineering",
    test: "GAT / UGAT / Entry Test",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "low", // Official UMT pages describe eligibility thresholds (50% GAT/UGAT, 33% minimum on entry test for Engineering) rather than a clean weighted merit split. Third-party sources conflict (Matric 25%+HSSC 75% for "most programs" vs Engineering allegedly adding a 30%-weighted test). Explicitly flagged by one source as "program specific." NEEDS YOUR OWN VERIFICATION.
    meritWeights: null,
    subjects: ["Physics", "Mathematics", "Chemistry / CS"],
    minAggregate: "50% in Intermediate; program-specific test minimums apply",
    negativeMarking: null,
    seats: "Varies by program",
    seatsApprox: null,
    testType: "Program-specific -- Engineering requires min. 33% on an accepted entry test",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS Electrical Engineering", "BBA"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://umt.edu.pk",
    image: "/universities/umt.png", // TODO: add once a licensed photo/logo is sourced
    about: "UMT is a private university in Lahore with a wide program range. Merit criteria genuinely vary by program per the university's own published pages -- no single formula applies across the board. Verify per-program before relying on this for prep guidance.",
  },
  {
    slug: "bahria",
    name: "Bahria University",
    fullName: "Bahria University",
    category: "Engineering",
    test: "BU Entry Test",
    city: "Islamabad",
    campuses: ["Karachi", "Lahore"],
    province: "Islamabad Capital Territory",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: null,
    duration: null,
    formulaConfidence: "low", // Two independent sources give conflicting formulas: one states a simple 50% Intermediate + 50% Test split ("50/50 aggregate"); another states 10% SSC + 30% HSSC + 60% BU Test. No official bahria.edu.pk source resolved which is current. NEEDS YOUR OWN VERIFICATION.
    meritWeights: null,
    subjects: ["Physics", "Mathematics", "Chemistry / CS"],
    minAggregate: "Varies by program",
    negativeMarking: null,
    seats: "Varies by campus",
    seatsApprox: null,
    testType: "Own BU Entry Test; ETS-approved alternate tests may be accepted",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BE Electrical Engineering", "MBBS/BDS (Karachi campus)"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://bahria.edu.pk",
    image: "/universities/bahria.png", // TODO: add once a licensed photo/logo is sourced
    about: "Bahria University is a multi-campus institution run under naval heritage, with strength in Engineering, Computing, and (at its Karachi campus) Medical/Dental programs. Sources disagree on the exact merit formula -- verify against the official portal before relying on this.",
  },
  {
    slug: "air-university",
    name: "Air University",
    fullName: "Air University, Islamabad",
    category: "Engineering",
    test: "AU-CBT / NAT / USAT",
    city: "Islamabad",
    campuses: [],
    province: "Islamabad Capital Territory",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: null,
    formulaConfidence: "low", // Genuine conflict: two sources state Matric 15% + FSc 35% + Test 50%; two other sources state Matric 10% + FSc 40% + Test 50%. No official au.edu.pk source resolved the discrepancy. NEEDS YOUR OWN VERIFICATION -- both figures are plausible, this is not a stale-vs-current situation like NED, just an unresolved conflict.
    meritWeights: null,
    subjects: ["Physics", "Mathematics", "Chemistry / CS", "English"],
    minAggregate: "50%+ in HSSC/A-Levels equivalence for most programs",
    negativeMarking: null,
    seats: "Varies by program",
    seatsApprox: null,
    testType: "AU-CBT or accepted alternates (NAT-IE/ICS, USAT-E/CS, SAT-I for Business)",
    topPrograms: ["BS Computer Science", "BE Electrical Engineering", "BS Software Engineering"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://au.edu.pk",
    image: "/universities/air.png", // TODO: add once a licensed photo/logo is sourced
    about: "Air University is a public university under the Pakistan Air Force, strong in Engineering and Computing. Test/exemption options are flexible (multiple NAT/USAT variants accepted) but the exact Matric/FSc weighting split is unresolved between sources -- verify directly.",
  },

  // ---------------------------------------------------------------------
  // COMPUTING
  // ---------------------------------------------------------------------
  {
    slug: "fast",
    name: "FAST-NUCES (Computing/Business)",
    fullName: "National University of Computer and Emerging Sciences",
    category: "Computing",
    test: "FAST Entry Test",
    city: "Lahore",
    campuses: ["Islamabad", "Karachi", "Peshawar", "Chiniot-Faisalabad"],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 100,
    duration: "2 hours",
    formulaConfidence: "high", // Official nu.edu.pk/Admissions/EligibilityCriteria, updated 03-Jul-2026. Applies to Computing/Business programs only.
    meritWeights: { matricLabel: "SSC", fscLabel: "FSc", testLabel: "Entry Test", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Maths", "English", "IQ / Analytical"],
    minAggregate: "60% SSC, 50% HSSC",
    negativeMarking: false,
    seats: "~3,000",
    seatsApprox: 3000,
    testType: "Computer-based",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS Artificial Intelligence", "BS Data Science"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://nu.edu.pk",
    image: "/universities/fast.png", // TODO: add once a licensed photo/logo is sourced
    about: "FAST-NUCES is Pakistan's leading dedicated computing university, with 5 campuses across the country. Known for strong CS/software engineering placement outcomes. Looking for FAST's PEC-accredited Engineering programs instead? See FAST-NUCES (Engineering), which uses a different, more FSc-weighted formula.",
  },

  // ---------------------------------------------------------------------
  // MEDICAL
  // ---------------------------------------------------------------------
  {
    slug: "king-edward",
    name: "King Edward Medical University",
    fullName: "King Edward Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: 1860,
    lastVerified: "2026-07",
    totalQuestions: 200,
    duration: "3.5 hours",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "MDCAT", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "75%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    seatsApprox: 250,
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://kemu.edu.pk",
    image: "/universities/kemu.png", // TODO: add once a licensed photo/logo is sourced
    about: "KEMU is Pakistan's oldest medical college (est. 1860) and consistently has the highest closing merit in Punjab.",
  },
  {
    slug: "allama-iqbal",
    name: "Allama Iqbal Medical College",
    fullName: "Allama Iqbal Medical College, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 200,
    duration: "3.5 hours",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "MDCAT", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "72%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    seatsApprox: 250,
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://aimc.edu.pk",
    image: "/universities/aimc.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "AIMC is a well-established public medical college in Lahore, affiliated with Jinnah Hospital.",
  },
  {
    slug: "fatima-jinnah",
    name: "Fatima Jinnah Medical University",
    fullName: "Fatima Jinnah Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 200,
    duration: "3.5 hours",
    formulaConfidence: "high",
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "MDCAT", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "70%+",
    negativeMarking: true,
    seats: "~150 MBBS",
    seatsApprox: 150,
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://fjmu.edu.pk",
    image: "/universities/fjmc.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "FJMU is a public medical university in Lahore, historically a women's medical college, under the same UHS-administered MDCAT merit system.",
  },
  {
    slug: "lmdc",
    name: "LMDC",
    fullName: "Lahore Medical & Dental College",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 200,
    duration: "3.5 hours",
    formulaConfidence: "high", // LMDC is a private college fully administered by UHS Lahore (confirmed via LMDC's own FAQ: "the college itself does not handle the admission process, as it is managed entirely by UHS"), so it uses the same standard UHS formula as King Edward/AIMC/FJMU.
    meritWeights: { matricLabel: "Matric", fscLabel: "FSc", testLabel: "MDCAT", matric: 0.10, fsc: 0.40, test: 0.50 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "55% MBBS / 50% BDS pass on MDCAT itself, plus standard UHS aggregate",
    negativeMarking: true,
    seats: "Private college -- check current UHS-published seat matrix",
    seatsApprox: null,
    testType: "Computer-based, UHS-administered",
    topPrograms: ["MBBS", "BDS"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://lmdc.edu.pk",
    image: "/universities/lmdc.jpg", // TODO: add once a licensed photo/logo is sourced
    about: "LMDC is a private medical/dental college in Lahore, affiliated with UHS and recognized by PMC. Dental students train at the historic De'Montmorency College of Dentistry. Admission process is run entirely by UHS, not the college itself.",
  },

  // ---------------------------------------------------------------------
  // VETERINARY
  // ---------------------------------------------------------------------
  {
    slug: "uvas",
    name: "UVAS",
    fullName: "University of Veterinary and Animal Sciences, Lahore",
    category: "Veterinary",
    test: "No Entry Test",
    city: "Lahore",
    campuses: [],
    province: "Punjab",
    establishedYear: null,
    lastVerified: "2026-07",
    totalQuestions: 0,
    duration: "N/A",
    formulaConfidence: "high", // Official uvas.edu.pk/Admissions/undergraduate/eligibility, 2026 cycle. No test score enters the merit weightage.
    meritWeights: { matricLabel: "Matric/O-Level", fscLabel: "FSc (Part 1)", testLabel: "", matric: 0.30, fsc: 0.70, test: 0 },
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "45%–60% (varies by program)",
    negativeMarking: false,
    seats: "~800",
    seatsApprox: 800,
    testType: "Academic record only — no entry test in merit calculation",
    topPrograms: ["DVM (Doctor of Veterinary Medicine)", "Pharm-D", "BS Zoology", "BS Food Science"],
    allPrograms: null, // TODO: add full verified catalog; falls back to topPrograms in UI
    website: "https://uvas.edu.pk",
    image: "/universities/uvas.png", // TODO: add once a licensed photo/logo is sourced
    about: "UVAS is Pakistan's leading veterinary sciences university. Unlike ECAT/MDCAT-based universities, admission is based purely on Matric and FSc academic marks -- no entry test score affects the merit ranking.",
  },
];

// ============================================================================
// LOOKUP / DERIVED HELPERS
// ============================================================================

export function getUniversityBySlug(slug: string): University | undefined {
  return UNIVERSITIES.find((u) => u.slug === slug);
}

export function getUniversitiesByCategory(category: Category): University[] {
  return UNIVERSITIES.filter((u) => u.category === category);
}

// Precomputed once at module load rather than re-filtered on every render/keystroke.
export const CATEGORY_COUNTS: Record<Category, number> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c] = UNIVERSITIES.filter((u) => u.category === c).length;
    return acc;
  },
  {} as Record<Category, number>
);

// URL slugs for category landing pages are just the lowercased category name.
// Centralized here so the [category] route and any links to it never drift.
export function categoryToSlug(category: Category): string {
  return category.toLowerCase();
}

export function slugToCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.toLowerCase() === slug.toLowerCase());
}

// Single source of truth for the human-readable merit formula string.
// Derived from meritWeights instead of hand-maintained separately, so the
// display text can never drift out of sync with the underlying weights.
export function formatMeritFormula(weights: MeritWeights | null): string | null {
  if (!weights) return null;
  const parts: string[] = [];
  if (weights.matric > 0 && weights.matricLabel) {
    parts.push(`${weights.matricLabel} ${Math.round(weights.matric * 100)}%`);
  }
  if (weights.fsc > 0 && weights.fscLabel) {
    parts.push(`${weights.fscLabel} ${Math.round(weights.fsc * 100)}%`);
  }
  if (weights.test > 0 && weights.testLabel) {
    parts.push(`${weights.testLabel} ${Math.round(weights.test * 100)}%`);
  }
  return parts.length > 0 ? parts.join(" + ") : null;
}

// Combines primary city + campuses into a short display string, e.g.
// "Islamabad + 6 more campuses" -- avoids ever rendering a long raw
// comma-joined list that truncates unreadably in card UI.
export function formatCityLine(uni: Pick<University, "city" | "campuses">): string {
  if (uni.campuses.length === 0) return uni.city;
  if (uni.campuses.length === 1) return `${uni.city} + ${uni.campuses[0]}`;
  return `${uni.city} + ${uni.campuses.length} more campuses`;
}