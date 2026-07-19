export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string };

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
  
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}