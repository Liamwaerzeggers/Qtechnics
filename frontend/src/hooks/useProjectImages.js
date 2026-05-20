import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback Unsplash URLs - only used if no real project photo exists for that category
const FALLBACK_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=80',
  totaalproject: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  badkamer: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80',
  keuken: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=1200&q=80',
  interieur: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
  maatkasten: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  technieken: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80',
};

const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) return `${BACKEND_URL}/api${url}`;
  if (url.startsWith('/api/')) return `${BACKEND_URL}${url}`;
  return `${BACKEND_URL}${url}`;
};

// Heuristic: detect if the URL is a real uploaded photo (vs Unsplash placeholder)
const isRealPhoto = (url) => {
  if (!url) return false;
  if (url.includes('unsplash.com') || url.includes('pexels.com')) return false;
  return true;
};

/**
 * useProjectImages
 *
 * Fetches all projects from /api/projects and returns categorized
 * real project images (excluding Unsplash placeholders).
 * Each consumer can request an image per category with safe fallback.
 */
export const useProjectImages = () => {
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const projects = await res.json();
        const grouped = {};
        for (const p of projects) {
          const cat = p.category || 'totaalproject';
          if (!grouped[cat]) grouped[cat] = [];
          // Main image
          if (isRealPhoto(p.mainImage)) {
            grouped[cat].push(resolveUrl(p.mainImage));
          }
          // Gallery images
          for (const g of (p.galleryImages || [])) {
            if (isRealPhoto(g)) grouped[cat].push(resolveUrl(g));
          }
          // After photos from before/after
          for (const ba of (p.beforeAfterImages || [])) {
            if (ba && isRealPhoto(ba.after)) grouped[cat].push(resolveUrl(ba.after));
          }
        }
        setByCategory(grouped);
      } catch (err) {
        // silent fail — fallbacks kick in
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Pick first real image for a category, fallback to Unsplash placeholder
  const pick = (category, index = 0) => {
    const list = byCategory[category] || [];
    if (list.length > index) return list[index];
    return FALLBACK_IMAGES[category] || FALLBACK_IMAGES.hero;
  };

  // Best hero image - prefer totaalproject, then any real photo
  const pickHero = () => {
    const order = ['totaalproject', 'interieur', 'keuken', 'badkamer', 'maatkasten', 'technieken'];
    for (const cat of order) {
      if (byCategory[cat] && byCategory[cat].length > 0) {
        return byCategory[cat][0];
      }
    }
    return FALLBACK_IMAGES.hero;
  };

  return { pick, pickHero, byCategory, loading };
};

export default useProjectImages;
