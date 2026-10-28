import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "EvidencePilot", description: "Evidence-first claim analysis powered by NVIDIA Nemotron and Tavily." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
