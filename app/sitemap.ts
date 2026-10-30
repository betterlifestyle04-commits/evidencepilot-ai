import type { MetadataRoute } from "next";

const siteUrl = "https://evidencepilot-ai-flame.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.4 }
  ];
}
