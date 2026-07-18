import type { Metadata } from "next";
import UniversitiesClient from "./UniversitiesClient";

export const metadata: Metadata = {
  title: "University Admissions Guide — ECAT, MDCAT, NET, FAST Test Patterns & Merit Formulas | PrepXMentor",
  description: "Merit formulas, test patterns, and admission info for UET, NUST, FAST-NUCES, King Edward Medical University, Allama Iqbal Medical College, Fatima Jinnah Medical University, and UVAS.",
};

export default function UniversitiesPage() {
  return <UniversitiesClient />;
}
