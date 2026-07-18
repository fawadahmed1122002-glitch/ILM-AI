import type { Metadata } from "next";
import MeritCalculatorClient from "./MeritCalculatorClient";

export const metadata: Metadata = {
  title: "Merit Calculator — Estimate Your ECAT, MDCAT, NET & Entry Test Aggregate | PrepXMentor",
  description:
    "Estimate your admission merit score for UET, NUST, FAST-NUCES, King Edward Medical University, Allama Iqbal Medical College, and Fatima Jinnah Medical University using verified official merit formulas.",
};

export default function MeritCalculatorPage() {
  return <MeritCalculatorClient />;
}