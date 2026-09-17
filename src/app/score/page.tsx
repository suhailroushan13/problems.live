import type { Metadata } from "next";
import ScorePage from "../reputation/page";

export const metadata: Metadata = {
  title: "Score",
  description:
    "How Score works on problems.live, how to earn it, what trust tiers unlock, and where it shows up.",
  alternates: { canonical: "/score" },
};

export default ScorePage;
