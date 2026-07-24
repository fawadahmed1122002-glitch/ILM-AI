import Image from "next/image";
import type { University, Category } from "./data";

// Category-tinted gradient used for the placeholder when no real image has
// been sourced yet (uni.image === null). Keeps every card visually
// consistent instead of showing broken images or empty boxes.
const CATEGORY_GRADIENTS: Record<Category, string> = {
  Engineering: "from-blue-500 to-blue-700",
  Medical: "from-rose-500 to-rose-700",
  Computing: "from-teal-500 to-teal-700",
  Veterinary: "from-green-500 to-green-700",
};

function getInitials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function UniversityLogo({
  uni,
  size = 48,
  rounded = "rounded-xl",
}: {
  uni: University;
  size?: number;
  rounded?: string;
}) {
  if (uni.image) {
    return (
      <Image
        src={uni.image}
        alt={`${uni.name} logo`}
        width={size}
        height={size}
        className={`${rounded} object-cover flex-shrink-0 border border-slate-200 dark:border-slate-800`}
      />
    );
  }

  // Decorative placeholder -- the university's real name is always rendered
  // as adjacent text (card title / H1), so this stays aria-hidden rather
  // than duplicating the name for screen readers.
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center ${rounded} bg-gradient-to-br ${CATEGORY_GRADIENTS[uni.category]} text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {getInitials(uni.name)}
    </div>
  );
}