/**
 * sitemap.xml 生成
 */

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://motioncover.vercel.app';
  
  return [
    {
      url: `${baseUrl}/visualizer/cover-25d`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
