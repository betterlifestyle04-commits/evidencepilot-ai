import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "EvidencePilot — Evidence before certainty", template: "%s | EvidencePilot" },
  description: "Turn statements into claim-by-claim evidence reviews with retrieved sources, transparent uncertainty, and careful rewrites. Powered by NVIDIA Nemotron via Nebius and Tavily Search.",
  applicationName: "EvidencePilot",
  keywords: ["AI fact-checking", "evidence review", "claim analysis", "source-based research", "Nemotron", "Nebius", "Tavily"],
  openGraph: {
    type: "website",
    title: "EvidencePilot — Evidence before certainty",
    description: "Check claims, review retrieved sources, and write with greater precision."
  },
  twitter: { card: "summary", title: "EvidencePilot", description: "Better claims. Stronger proof." }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
