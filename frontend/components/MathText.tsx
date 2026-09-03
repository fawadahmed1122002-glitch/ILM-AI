"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";

/**
 * Shared renderer for any LLM/user text that may contain math.
 *
 * Backend prompts do not fix a single LaTeX delimiter style, so the model
 * produces a MIX across surfaces (verified against the live DB):
 *   - Study chat: display `\[ ... \]` and inline `\( ... \)`.
 *   - MCQ bank:   bare `\frac{...}{...}` commands with NO delimiters,
 *                 embedded inline inside Urdu question text.
 *   - Explanations: Unicode/ASCII math today, but may contain `\[ \]`/`\(...\)`
 *                 and always contain Markdown (`**bold**`, blank-line paragraphs).
 *
 * remark-math only understands `$...$` / `$$...$$` (its sole delimiter option
 * is `singleDollarTextMath`, which cannot enable `\[ \]` / `\( \)`), so we
 * NORMALIZE first: `\[ \]` -> `$$ $$`, `\( \)` -> `$ $`, and wrap bare
 * `\command` runs (allowlisted) in `$ $`. Then react-markdown + remark-math +
 * rehype-katex typeset the result.
 *
 * Text with no LaTeX is untouched by the normalizer, so it renders exactly as
 * ordinary Markdown/plain text -- no visual change for non-technical content.
 */

// LaTeX commands we are willing to treat as math when they appear BARE
// (no surrounding delimiter). Restricted to an allowlist so ordinary text
// that happens to contain a backslash + letters (e.g. a Windows path
// `C:\Users`) is never mistaken for a formula.
const MATH_COMMANDS = [
  "frac", "dfrac", "tfrac", "sqrt", "sin", "cos", "tan", "sec", "csc", "cot",
  "sinh", "cosh", "tanh", "arcsin", "arccos", "arctan", "log", "ln", "exp",
  "lim", "limsup", "liminf", "max", "min", "sum", "prod", "int", "iint",
  "oint", "infty", "partial", "nabla", "alpha", "beta", "gamma", "delta",
  "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota", "kappa",
  "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma",
  "varsigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi",
  "Psi", "Omega", "cdot", "cdots", "ldots", "vdots", "ddots", "times", "div",
  "pm", "mp", "leq", "le", "geq", "ge", "neq", "ne", "approx", "equiv", "sim",
  "simeq", "cong", "propto", "ll", "gg", "subset", "supset", "subseteq",
  "supseteq", "in", "notin", "ni", "cup", "cap", "forall", "exists", "angle",
  "triangle", "degree", "vec", "hat", "bar", "dot", "ddot", "tilde",
  "widetilde", "widehat", "overline", "underline", "overrightarrow",
  "overbrace", "underbrace", "mathbb", "mathbf", "mathrm", "mathit", "mathsf",
  "mathcal", "mathfrak", "text", "operatorname",
].join("|");

// A bare math run: a backslash + allowlisted command, immediately followed by
// any number of braced arguments, `^`/`_` scripts, or adjacent math tokens.
// Whitespace terminates the run so surrounding prose (incl. Urdu) is never
// swallowed.
const BARE_MATH_RE = new RegExp(
  "\\\\(?:" + MATH_COMMANDS + ")(?![a-zA-Z])" +
    "(?:" +
    "\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}" + // {arg} with one nesting level
    "|[_^]\\{[^{}]*\\}" +                    // ^{exp} / _{sub}
    "|[_^][A-Za-z0-9]" +                     // ^2 / _i
    "|[A-Za-z0-9+\\-*/=(),.]" +              // adjacent math tokens
    ")*",
  "g",
);

/**
 * Convert the model's mixed LaTeX delimiters into the `$`/`$$` form that
 * remark-math expects. Delimited regions are stashed behind NUL placeholders
 * first so the bare-command pass never double-wraps content that is already
 * inside a math block.
 */
export function normalizeMath(input: string): string {
  if (!input) return "";

  const store: string[] = [];
  const stash = (s: string) => {
    store.push(s);
    return `\u0000${store.length - 1}\u0000`;
  };

  let text = input;

  // 1. Display \[ ... \] -> $$ ... $$   (stash so it is protected)
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, body) => stash(`$$${body}$$`));
  // 2. Inline \( ... \) -> $ ... $
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_m, body) => stash(`$${body}$`));
  // 3. Any pre-existing $$ ... $$ the model may have emitted
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, body) => stash(`$$${body}$$`));

  // 4. Wrap bare allowlisted commands that live in ordinary prose.
  text = text.replace(BARE_MATH_RE, (m) => stash(`$${m}$`));

  // 5. Restore every stashed math region.
  text = text.replace(/\u0000(\d+)\u0000/g, (_m, i) => store[Number(i)]);

  return text;
}

interface MathTextProps {
  /** Raw text (explanation section, chat message, MCQ stem/option, etc.). */
  text: string | null | undefined;
  /** Extra classes applied to the wrapper element (color, size, font, ...). */
  className?: string;
  /** Text direction for the wrapper (e.g. "rtl" for Urdu blocks). */
  dir?: "rtl" | "ltr" | "auto";
  /**
   * Inline mode renders inside a <span> and unwraps Markdown paragraphs, so
   * the result can sit on the same line as sibling content (e.g. an option
   * letter "A." inside a button). Block mode (default) renders a <div> and
   * keeps paragraph/line-break structure.
   */
  inline?: boolean;
}

export default function MathText({ text, className, dir, inline = false }: MathTextProps) {
  const content = useMemo(() => normalizeMath(text ?? ""), [text]);
  const wrapperClass = className ? `math-text ${className}` : "math-text";

  // KaTeX: never hard-fail on malformed LaTeX -- render the raw source in the
  // error color instead so content stays readable. `strict: false` tolerates
  // Unicode inside \text{} and similar, which bilingual output relies on.
  const katexOptions = { throwOnError: false, strict: false, errorColor: "#dc2626" };

  if (inline) {
    return (
      <span className={wrapperClass} dir={dir}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, katexOptions]]}
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {content}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={wrapperClass} dir={dir}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[[rehypeKatex, katexOptions]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
