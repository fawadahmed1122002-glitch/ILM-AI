export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "faq"; items: { question: string; answer: string }[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedDate: string; // ISO date
  readingMinutes: number;
  content: ContentBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "choosing-your-entry-test",
    title: "ECAT, NET, MDCAT, or the FAST Entry Test — How to Choose (or Prepare for More Than One)",
    excerpt:
      "Most FSc students end up sitting more than one entry test. Here's how to think about which one deserves your best hours, and how to prepare for several without burning out.",
    category: "Exam Strategy",
    publishedDate: "2026-07-18",
    readingMinutes: 6,
    content: [
      {
        type: "paragraph",
        text: "If you're in FSc Part 2 right now, there's a good chance you're not just preparing for one test. Between ECAT, NUST's NET, MDCAT, and the FAST Entry Test, most students end up sitting at least two of these within the same few months — often with overlapping prep windows and almost no guidance on how to split their time.",
      },
      {
        type: "heading",
        text: "Start with what you actually want to study",
      },
      {
        type: "paragraph",
        text: "Before anything else, the test you prioritize should follow from the degree you want, not the other way around. If medicine is the goal, MDCAT isn't optional — it's the only door in. If you're set on engineering, ECAT and NET both lead there, and you can reasonably prepare for both since they share most of their subject foundation. If computing or software engineering is the target, the FAST Entry Test becomes the priority, and its emphasis on analytical reasoning alongside Maths sets it apart from the others.",
      },
      {
        type: "heading",
        text: "Where the tests overlap — and where they don't",
      },
      {
        type: "paragraph",
        text: "ECAT and NET share the most common ground: both lean heavily on Physics, Maths, and Chemistry, which means solid FSc-level fundamentals in those three subjects carry you a long way toward both tests simultaneously. MDCAT is a different animal entirely — Biology and Chemistry dominate, Maths drops out of the picture, and the depth expected in Biology is well beyond what a Physics/Maths-focused student would have built up. The FAST Entry Test is the outlier of the four: less about subject depth, more about Maths fluency combined with English and analytical/IQ-style reasoning.",
      },
      {
        type: "list",
        items: [
          "Engineering-bound (ECAT + NET): shared Physics/Maths/Chemistry prep works for both — study once, sit twice.",
          "Medicine-bound (MDCAT): needs dedicated Biology depth that ECAT/NET prep won't build for you.",
          "Computing-bound (FAST): prioritize Maths problem-solving speed and analytical reasoning practice over content memorization.",
        ],
      },
      {
        type: "callout",
        text: "Exact test dates, application windows, and syllabus scope are set fresh by each university every year — always confirm the current cycle on the official website before locking in a study calendar.",
      },
      {
        type: "heading",
        text: "If you're preparing for more than one",
      },
      {
        type: "paragraph",
        text: "The realistic approach for most engineering-track students is to treat ECAT and NET as one combined prep track rather than two separate ones — build strong Physics, Maths, and Chemistry fundamentals first, then spend the final stretch before each specific test on past-paper familiarity and pacing for that test's format. Trying to fully separate the two typically wastes time re-learning the same content twice.",
      },
      {
        type: "heading",
        text: "A simple way to decide where to spend today's study time",
      },
      {
        type: "paragraph",
        text: "When you're not sure what to study on a given day, three questions usually settle it: Which test is closest on the calendar? Which subject, if weak, would hurt you across more than one test? And which of your weak topics has the most room to improve quickly versus one that needs months of groundwork? Prioritizing shared, high-leverage subjects (Physics and Maths, for most students) tends to pay off across multiple tests at once — which is exactly the kind of cross-subject tracking PrepXMentor's per-topic accuracy view is built to surface.",
      },
    ],
  },
  {
    slug: "understanding-merit-formulas",
    title: "Understanding Your Merit Score: How Pakistani Universities Actually Calculate Admission",
    excerpt:
      "A strong test score doesn't mean the same thing everywhere. Here's how weighted merit aggregates actually work, and why the same three scores produce different outcomes at different universities.",
    category: "University Guides",
    publishedDate: "2026-07-18",
    readingMinutes: 7,
    content: [
      {
        type: "paragraph",
        text: "A lot of FSc students assume their entry test score is more or less the whole story — score well on MDCAT or ECAT, and admission follows. In reality, almost every university in Pakistan uses a weighted aggregate: a formula that blends your Matric (or SSC) percentage, your FSc percentage, and your test score, each multiplied by a different weight before being added together. Understanding those weights changes how you should be spending your remaining study time.",
      },
      {
        type: "heading",
        text: "The general idea",
      },
      {
        type: "paragraph",
        text: "A merit aggregate is calculated as: (Matric % × weight) + (FSc % × weight) + (Test % × weight), where the three weights add up to 100%. The catch is that these weights are not standardized across universities — they're set independently, and they can differ dramatically depending on the institution and the program.",
      },
      {
        type: "heading",
        text: "Why the weights matter more than most students realize",
      },
      {
        type: "paragraph",
        text: "Consider two real examples. NUST's NET carries a 75% weight in its own formula — Matric and FSc together make up only 25%. That means a student with an average academic record but an excellent NET score can still land a strong aggregate, and conversely, a top FSc student with a mediocre NET performance won't be rescued by their grades. Compare that to Punjab's public medical colleges, where the MDCAT weight sits at 50% and FSc contributes a full 40% — academic consistency across two years of FSc genuinely matters there, not just test-day performance.",
      },
      {
        type: "paragraph",
        text: "This is exactly why two students with identical Matric, FSc, and test percentages can end up with meaningfully different aggregates once you plug their numbers into two different universities' formulas — and why 'my score is good' only means something once you know good relative to which formula.",
      },
      {
        type: "heading",
        text: "A worked example",
      },
      {
        type: "paragraph",
        text: "Take a hypothetical student with Matric 85%, FSc 80%, and a test score of 75% (purely illustrative numbers). Under NUST's formula (Matric 10% + FSc 15% + NET 75%), that works out to 76.75%. Under a UHS medical college formula (Matric 10% + FSc 40% + MDCAT 50%), the same three percentages produce 78.0% — close in this case, but that's just where these particular numbers happen to land. Shift the test score down to 60% instead, and the NUST aggregate falls to 65.5% while the MDCAT-style aggregate only drops to 70.5% — a much bigger swing under NUST's formula, because the test carries three-quarters of the weight there instead of half.",
      },
      {
        type: "callout",
        text: "Formulas are set by each university and can change year to year — plug your real numbers into our merit calculator for a live, per-university estimate, and always confirm against the official prospectus before making decisions.",
      },
      {
        type: "heading",
        text: "What this means for how you actually study",
      },
      {
        type: "paragraph",
        text: "If your target university weighs the entry test heavily (NUST, most computing programs), that test deserves the disproportionate share of your remaining hours. If your target weighs FSc heavily (Punjab's medical colleges), a slipping FSc grade is worth fixing even late in the year — it's not just a formality alongside the 'real' test. Knowing which lever actually moves your aggregate is the difference between studying hard and studying where it counts.",
      },
    ],
  },
   {
    slug: "fast-entry-test-english-syllabus-2026",
    title: "FAST Entry Test English Syllabus 2026: What's Tested (SAT-Style)",
    excerpt: "FAST-NUCES English carries 10% weight and follows an SAT-style format, not a grammar-drill one. Here's exactly what's tested and how to prepare efficiently.",
    category: "Subject Guides",
    publishedDate: "2026-07-18",
    readingMinutes: 6,
    content: [
      { type: "heading", text: "FAST English Section: Weightage & Pattern" },
      { type: "paragraph", text: "The FAST-NUCES BS Computer Science and Engineering entry test consists of 120 MCQs across four sections: Advanced Mathematics, Basic Mathematics, IQ & Analytical Reasoning, and English. English carries 10% weight in the overall scoring, with roughly 30 of the 120 questions drawn from this section \u2014 though the exact split can vary slightly by cycle." },
      { type: "callout", text: "Source note: section weightings confirmed across multiple independent 2026 admission-guide sources citing FAST-NUCES's official test pattern. Always cross-check current-cycle specifics at nu.edu.pk before finalizing your prep plan." },
      { type: "paragraph", text: "The English section is not grammar-drill style like many FSc tests. It behaves more like an SAT-style section that tests how you use English under time pressure, rather than how well you've memorized grammar rules in isolation." },
      { type: "heading", text: "What's Actually Tested" },
      { type: "paragraph", text: "FAST does not publish a detailed, chapter-wise English syllabus. Based on the test's official pattern and past papers, the English section typically covers four skill areas:" },
      { type: "list", items: [
        "Reading comprehension \u2014 short passages followed by inference and detail questions, including main idea, tone, and what's implied vs. directly stated",
        "Sentence correction / grammar in context \u2014 identifying the clearest, grammatically correct version of a sentence (subject-verb agreement, tense consistency, pronoun use)",
        "Vocabulary in context \u2014 understanding what a word means in that specific sentence, not from a memorized list",
        "Sentence structure & clarity \u2014 recognizing effective vs. awkward construction, combining or reordering clauses",
      ] },
      { type: "heading", text: "Why \"I'm Good at English\" Isn't Enough" },
      { type: "paragraph", text: "Many FSc students who read and communicate comfortably in English assume this is the one section they don't need to specifically prepare for. That assumption only holds if the test measured general fluency \u2014 it doesn't. It tests a specific, learnable skill set: timed comprehension, error-spotting, and context-based vocabulary. Being fluent helps, but it's not a substitute for practicing the exact question types under real time pressure." },
      { type: "heading", text: "How to Prepare Effectively" },
      { type: "paragraph", text: "Reading comfortably but slowly is a pacing problem, not a comprehension problem \u2014 and it needs timed practice from early in your prep, not just the final weeks. Sentence correction rewards a specific skill: spotting subtle errors quickly inside a full sentence, which comes from repeated exposure to this exact question style rather than generic grammar review. Vocabulary questions rarely test isolated definitions \u2014 they test whether you can infer meaning from context, which favors reading broadly over memorizing word lists." },
      { type: "list", items: [
        "Run 3-5 timed English practice sets before test day, under strict timing that mimics the real section length",
        "Track which question types cost you the most time, and which errors you repeatedly make",
        "Read broadly in English (articles, editorials) rather than memorizing isolated vocabulary lists",
      ] },
      { type: "table", headers: ["Program", "English Weight", "Typical MCQs*", "Format"], rows: [
        ["BS (CS / Engineering)", "10%", "~30 (of ~120)", "SAT-style: comprehension, sentence correction, vocab in context"],
        ["BBA & BS (AF/BA/FinTech)", "10%", "~30 (of ~120)", "Same general pattern"],
      ] },
      { type: "paragraph", text: "*Exact MCQ count can vary slightly by cycle; the 10% weighting is consistent across the sources we checked." },
      { type: "faq", items: [
        { question: "What is the weight of English in the FAST entry test?", answer: "English carries 10% weight in both the BS (CS/Engineering) and BBA & BS (AF/BA/FinTech) undergraduate tests, per FAST-NUCES's test pattern." },
        { question: "Is the FAST English section hard for FSc students?", answer: "It can feel hard if you only practice untimed or grammar-rule-style questions. With timed, SAT-style practice, most FSc students improve quickly." },
        { question: "Do I need to memorize word lists for FAST English?", answer: "No \u2014 focus on vocabulary in context and reading broadly. Memorizing isolated word lists is far less effective than learning to infer meaning from sentences." },
        { question: "How much time should I spend on the English section?", answer: "Many students aim for roughly 25-30 minutes within the full paper, leaving more time for Math and IQ \u2014 but test different splits in timed mocks to find what works for you." },
      ] },
    ],
  },
  {
  slug: "fast-entry-test-syllabus-format-explained",
  title: "FAST Entry Test Syllabus & Format 2026: Sections, Weightage & Negative Marking",
  excerpt:
    "A clear breakdown of the FAST‑NUCES Entry Test: sections, weightage, question counts, and negative marking—so you know exactly what you’re preparing for.",
  category: "Exam Strategy",
  publishedDate: "2026-07-19",
  readingMinutes: 7,
  content: [
    {
      type: "heading",
      text: "What the FAST Entry Test Actually Covers",
    } as const,
    {
      type: "paragraph",
      text:
        "If you’re aiming for a FAST‑NUCES campus — Lahore, Islamabad, Karachi, Peshawar, or CFD — you’ll usually sit the university’s own NU Entry Test rather than ECAT or NUST’s NET. It’s a separate exam with its own structure, and confusing it with ECAT prep is one of the most common mistakes students make.",
    } as const,
    {
      type: "paragraph",
      text:
        "The test is built around four main sections for BS (CS/Engineering): Advanced Mathematics, Basic Mathematics, English, and Analytical / IQ Reasoning. Advanced Mathematics draws on your FSc Part I and Part II syllabus and carries the largest share of the paper. Basic Mathematics is lighter — arithmetic, percentages, ratios, and number sense rather than calculus‑level content. English follows an SAT‑style pattern rather than the grammar‑drill style you may be used to from school tests. The IQ section is the one most students find least familiar, since it isn’t taught directly in FSc at all.",
    } as const,

    {
      type: "heading",
      text: "FAST NU Entry Test Pattern: Sections & Weightage",
    } as const,
    {
      type: "paragraph",
      text:
        "According to the official FAST‑NUCES test pattern page, the BS (CS/Engg.) undergraduate test is divided as: Advanced Mathematics 50%, Basic Mathematics 20%, Analytical Skills & IQ 20%, and English 10%.",
    } as const,
    {
      type: "paragraph",
      text:
        "Most prep platforms and student reports describe this as 120 MCQs total, with an approximate split like: Advanced Math ~50 MCQs, Basic Math ~20 MCQs, IQ ~20 MCQs, and English ~30 MCQs. The test is scored out of 100 marks, with negative marking applied for wrong answers.",
    } as const,
    {
      type: "callout",
      text:
        "Exact question counts, section weightages, and negative marking values are set by FAST‑NUCES and can be revised between cycles. Always confirm the current pattern on nu.edu.pk/Admissions/TestPattern before you build a study plan around specific numbers.",
    } as const,

    {
      type: "heading",
      text: "How the Paper Is Scored (Including Negative Marking)",
    } as const,
    {
      type: "paragraph",
      text:
        "The FAST entry test uses negative marking, so guessing blindly on questions you have no idea about can cost you more than it gains. This changes your in‑test strategy compared to a test with no penalty for wrong answers.",
    } as const,
    {
      type: "paragraph",
      text:
        "Based on widely used prep resources and student reports: Advanced Math, Basic Math and IQ each give +1 mark for a correct answer and −0.25 marks for a wrong answer. English questions carry lower individual weight, but negative marking still applies (commonly around −1⁄12 per wrong English MCQ in many calculators).",
    } as const,
    {
      type: "paragraph",
      text:
        "This means an educated guess after eliminating two or three options can be worth it, while a pure random guess across many unknown questions usually isn’t.",
    } as const,

    {
      type: "heading",
      text: "Why the Section Split Matters for Your Prep Time",
    } as const,
    {
      type: "paragraph",
      text:
        "Many students default to spending most of their prep hours on Advanced Mathematics because it’s the biggest section, which isn’t wrong — but it means Basic Maths, English, and IQ often get treated as afterthoughts, even though all sections contribute to your final score.",
    } as const,
    {
      type: "paragraph",
      text:
        "A student who’s strong in Advanced Maths but weak in IQ reasoning is often better off spending an extra week on IQ pattern practice than squeezing marginal gains out of an already‑strong section.",
    } as const,
    {
      type: "paragraph",
      text:
        "This is especially true for the IQ section, since it has almost no overlap with your FSc coursework. You can’t cram it the way you can cram a Maths chapter you’ve seen before — it needs its own dedicated practice across pattern types like number series, verbal reasoning, logical puzzles, and pattern completion.",
    } as const,

    {
      type: "heading",
      text: "English Deserves More Respect Than It Gets",
    } as const,
    {
      type: "paragraph",
      text:
        "Because English isn’t a “core” FSc subject the way Maths or Physics is, many engineering‑track students treat it as the section they’ll “just wing.” That’s a risky assumption on a test built in an SAT‑style format, since SAT‑style English rewards specific comprehension and sentence‑correction skills that aren’t the same as general fluency.",
    } as const,
    {
      type: "paragraph",
      text:
        "If your day‑to‑day English is strong but you’ve never sat a timed, SAT‑style comprehension section, it’s worth doing a few timed practice sets specifically to get used to the pacing.",
    } as const,

    {
      type: "heading",
      text: "Putting a Study Plan Together Around This Structure",
    } as const,
    {
      type: "paragraph",
      text:
        "Once you know the section breakdown, the practical next step is figuring out where your time is best spent relative to where you’re already strong. A rough starting split for most FSc students preparing over 8–10 weeks looks something like: Advanced Mathematics as the largest weekly time block, focused on FSc Part I & II topics; Analytical / IQ Reasoning with consistent practice every week; English with regular timed sets in an SAT‑style format; and Basic Mathematics with lighter, periodic review rather than daily drilling.",
    } as const,
    {
      type: "paragraph",
      text:
        "The section names and rough weightage give you the map, but the real preparation work is in past‑paper practice under timed conditions, which tells you far more about your actual readiness than reading the syllabus ever will.",
    } as const,

    {
      type: "heading",
      text: "Quick Reference: FAST NU Entry Test (BS CS/Engg.)",
    } as const,
    {
      type: "list",
      items: [
        "Sections: Advanced Math, Basic Math, IQ, English",
        "Weightage: 50% Adv. Math, 20% Basic Math, 20% IQ, 10% English",
        "Typical MCQs: ~120 total (50 / 20 / 20 / 30 approx.)",
        "Scoring: Out of 100 marks, with negative marking (around −0.25 in Math/IQ; English has lower per‑question weight but still penalized)",
        "Key point: Confirm latest pattern at nu.edu.pk/Admissions/TestPattern.",
      ],
    } as const,
  ],
},{
  slug: "fast-entry-test-analytical-iq-section",
  title: "FAST Entry Test: Analytical / IQ Section Explained (2026 Guide)",
  excerpt:
    "The IQ section is the part of the FAST Entry Test that FSc coursework doesn’t prepare you for. Here’s what it actually tests and how to build the skill from scratch.",
  category: "Subject Guides",
  publishedDate: "2026-07-19",
  readingMinutes: 6,
  content: [
    {
      type: "heading",
      text: "Why the IQ Section Catches Students Off Guard",
    } as const,
    {
      type: "paragraph",
      text:
        "Every other section on the FAST Entry Test connects back to something you’ve studied for two years — Advanced Maths to your FSc syllabus, English to comprehension skills you’ve been building since school. The Analytical / IQ section is different.",
    } as const,
    {
      type: "paragraph",
      text:
        "It isn’t taught as a subject anywhere in FSc, which means most students walk into it with zero formal preparation and only whatever pattern‑recognition instinct they’ve picked up on their own. That’s exactly why it’s worth taking seriously rather than treating as a “just wing it” section.",
    } as const,
    {
      type: "paragraph",
      text:
        "Since IQ can’t be crammed the way a Maths chapter can, students who start IQ practice late are usually the ones who underperform on it — not because the questions are harder, but because they simply haven’t built the pattern‑recognition reps yet.",
    } as const,

    {
      type: "heading",
      text: "What “IQ Reasoning” Actually Means on the FAST Test",
    } as const,
    {
      type: "paragraph",
      text:
        "In the context of entry tests like FAST’s, analytical or IQ reasoning covers a cluster of question types built around finding patterns and relationships rather than recalling facts.",
    } as const,
    {
      type: "paragraph",
      text:
        "Across Pakistani entry tests of this style, the most common categories include: Number series (identifying the next number in a sequence), Verbal reasoning and analogies (word relationships, odd‑one‑out, basic logic with words), Logical puzzles (seating arrangements, sequencing, basic deduction), and Non‑verbal / pattern reasoning (shape sequences, visual pattern completion, figure analogies).",
    } as const,
    {
      type: "callout",
      text:
        "The exact mix and proportion of question types on FAST’s specific paper can vary by cycle. The categories above are the general pattern‑reasoning skill areas this kind of section draws from, not a confirmed breakdown of this year’s paper. Verify against official past papers where available.",
    } as const,

    {
      type: "heading",
      text: "How to Actually Practice IQ, Not Just Read About It",
    } as const,
    {
      type: "paragraph",
      text:
        "The single most effective way to build this skill is volume of exposure to varied question types under timed conditions — not reading explanations of “how number series work,” but sitting down with 20–30 mixed questions and a timer, repeatedly, over several weeks.",
    } as const,
    {
      type: "paragraph",
      text:
        "Pattern recognition is a trained skill, closer to how you’d build speed at mental arithmetic than how you’d learn a Physics chapter. The improvement comes from repetition, not from a single insight.",
    } as const,
    {
      type: "paragraph",
      text:
        "A useful habit is keeping a running log of which specific pattern types trip you up. For example, if you’re consistently slow on logical seating‑arrangement puzzles but fast on number series, that tells you exactly where your remaining practice hours should go.",
    } as const,
    {
      type: "paragraph",
      text:
        "Instead of treating “IQ” as one undifferentiated blob of difficulty, you can break it into: “number series,” “verbal analogies,” “seating arrangements,” “visual patterns,” etc., and track accuracy per type.",
    } as const,

    {
      type: "heading",
      text: "Managing Time Pressure on the IQ Section",
    } as const,
    {
      type: "paragraph",
      text:
        "Because IQ questions can look deceptively simple, it’s easy to sink far more time into one tricky puzzle than it’s worth, at the cost of easier questions later in the section.",
    } as const,
    {
      type: "paragraph",
      text:
        "A reasonable habit is setting yourself a rough per‑question time ceiling during practice: if you’re stuck past that point, mark it and move on, then come back if time allows.",
    } as const,
    {
      type: "paragraph",
      text:
        "This is a skill you build in practice sessions, not something you can decide to do for the first time on test day under real pressure.",
    } as const,
    {
      type: "paragraph",
      text:
        "Over time, you’ll learn to recognize which question types you can solve in under a minute and which ones tend to trap you and are better skipped on first pass.",
    } as const,

    {
      type: "heading",
      text: "Where IQ Fits Into Your Overall Prep",
    } as const,
    {
      type: "paragraph",
      text:
        "If you’re splitting study time across Advanced Maths, Basic Maths, English, and IQ, it’s worth resisting the instinct to push IQ practice to “later” simply because it feels less structured than a Maths syllabus.",
    } as const,
    {
      type: "paragraph",
      text:
        "Since every section on the paper is scored the same way per question, an hour spent turning a weak IQ score into an average one is often worth more to your overall aggregate than an hour spent polishing an already‑strong Maths score by a couple of extra points.",
    } as const,
    {
      type: "paragraph",
      text:
        "Start IQ practice early, keep it consistent rather than saving it for a cram session, and track your accuracy by pattern type rather than by a single overall percentage. That’s the difference between a section that quietly drags your score down and one that holds its own alongside the rest of the paper.",
    } as const,

    {
      type: "heading",
      text: "Quick Reference: FAST Analytical / IQ Section",
    } as const,
    {
      type: "list",
      items: [
        "Role in test: Part of the FAST NU Entry Test for BS (CS/Engg/Business)",
        "Main skill tested: Pattern recognition & logical reasoning, not FSc content",
        "Common question types: Number series, Verbal reasoning & analogies, Logical puzzles (seating, sequencing), Non‑verbal / visual patterns",
        "Best prep method: High volume of mixed, timed practice + tracking accuracy by pattern type",
        "Key tip: Start early, practice consistently, and don’t let one hard puzzle steal time from easier questions.",
      ],
    } as const,
  ],
},
  {
    slug: "ecat-merit-formula-fsc-percentage",
    title: "ECAT Merit Formula: Why Your FSc Percentage Carries the Biggest Weight",
    excerpt:
      "On UET's current formula, FSc carries more weight than ECAT itself. Here's what that means for how you should actually be splitting your prep time.",
    category: "Exam Strategy",
    // TODO: confirm actual publish date before shipping — placeholder follows the sequence of the surrounding posts.
    publishedDate: "2026-07-20",
    readingMinutes: 6,
    content: [
      {
        type: "heading",
        text: "The number that surprises most ECAT aspirants",
      },
      {
        type: "paragraph",
        text: "Most students preparing for ECAT assume the entry test is the dominant factor in their engineering aggregate, since it's the part that feels like \"the real exam.\" On UET Lahore's current published formula, that assumption is backwards: Matric carries 17%, FSc carries 50%, and ECAT itself carries 33%. FSc alone is the single largest component of the aggregate — bigger than the entry test you've likely been treating as the main event.",
      },
      {
        type: "paragraph",
        text: "That doesn't mean ECAT prep doesn't matter — 33% is still a large share, and it's the component with the most day-to-day variance between students. But it does mean a student who neglects FSc while grinding ECAT practice questions is optimizing the smaller of the two academic-facing levers.",
      },
      {
        type: "heading",
        text: "Which part of FSc actually counts",
      },
      {
        type: "paragraph",
        text: "For current 12th-grade applicants, this typically uses your available FSc marks at the time of the admission cycle — generally FSc Part 1, since Part 2 results usually aren't announced yet when ECAT-based merit lists are compiled. That makes Part 1 the critical board component for your engineering aggregate specifically, distinct from MDCAT's formula, which combines both FSc parts together.",
      },
      {
        type: "list",
        items: [
          "Matric (SSC): 17% of the aggregate",
          "FSc (typically Part 1 for current applicants): 50% — the largest single component",
          "ECAT: 33%",
        ],
      },
      {
        type: "callout",
        text: "This 17/50/33 split reflects UET Lahore's currently published Fall-cycle formula. Older or alternate splits (such as 25/45/30) have circulated in past admission cycles, and different UET sub-campuses or specific programs may use different weightages — confirm your exact program's current formula at uet.edu.pk before finalizing a study plan around these numbers.",
      },
      {
        type: "heading",
        text: "Why FSc Part 1 deserves more respect than it usually gets",
      },
      {
        type: "paragraph",
        text: "If you're currently in FSc Part 1, this is arguably the single highest-leverage academic stretch for your ECAT aggregate, since it's contributing 50% of your final number and is a result you can no longer meaningfully change once it's out. Treating Part 1 as \"just the first year, ECAT is what really matters\" is a common but costly misread of how the formula actually weighs things.",
      },
      {
        type: "paragraph",
        text: "If Part 1 is already behind you and wasn't as strong as you'd hoped, that percentage is largely locked in for this formula — your remaining leverage sits almost entirely in maximizing your ECAT score within its 33% share, since Matric and FSc Part 1 are no longer things you can improve.",
      },
      {
        type: "heading",
        text: "Rethinking how you split remaining prep time",
      },
      {
        type: "paragraph",
        text: "A student with a strong FSc Part 1 percentage and an average ECAT score is often better positioned than a student with the reverse profile, purely because of how much more weight FSc carries — which argues for genuinely protecting FSc study time during Part 1 rather than treating those two years as a stepping stone toward \"real\" ECAT prep later. If you're already past Part 1, the practical focus shifts entirely toward extracting as much value as possible from your remaining 33% share through disciplined, timed ECAT practice.",
      },
      {
        type: "list",
        items: [
          "If you're in FSc Part 1 now: protect real study time for board depth — this result carries more weight than ECAT itself",
          "If Part 1 is already finalized: your leverage is now concentrated in the 33% ECAT component — timed past-paper practice and pacing matter more here than any further academic-record changes",
          "Either way, don't let ECAT-specific MCQ drilling fully displace board-level conceptual study while Part 1 is still in progress — the same Physics, Chemistry, and Maths foundation serves both",
        ],
      },
      {
        type: "paragraph",
        text: "Knowing exactly which lever is doing the heavy lifting in your specific aggregate — FSc Part 1 for ECAT, unlike MDCAT's combined-parts approach — is the difference between studying hard in general and studying where the formula actually rewards it most.",
      },
    ],
  },
  // SOURCE NOTES (internal, not published on the page):
  // Formula (17% Matric + 50% FSc + 33% ECAT) confirmed as UET Lahore's current Fall 2026 formula
  // across multiple independent sources (Maqsad, CampusAxis, Parhlai, ToolForge). One source flagged
  // an alternate Spring 2026 split (25% Matric + 45% FSc + 20% ECAT + 10% interview) and an older
  // legacy 25/45/30 split still in circulation — do a final direct check against uet.edu.pk or the
  // ECAT-conducting body given program/cycle variation before publishing the exact figures, and
  // update the placeholder publishedDate above.
];

 

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}