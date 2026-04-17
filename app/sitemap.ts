import type { MetadataRoute } from "next";

const BASE_URL = "https://ymarchive.chat";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/viewer`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/feedback`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
