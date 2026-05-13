import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumbs = ({ items }) => {
  if (!items || items.length === 0) return null;
  
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.label,
      "item": item.href ? "https://maxq.be" + item.href : undefined
    }))
  };

  return (
    <nav className="bg-gray-50 border-b py-3" aria-label="Breadcrumb" data-testid="breadcrumbs">
      <div className="max-w-7xl mx-auto px-4">
        <ol className="flex items-center flex-wrap gap-1 text-sm">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400 mx-1" />}
                {isLast || !item.href ? (
                  <span className="text-gray-500">{item.label}</span>
                ) : (
                  <Link to={item.href} className="text-[#3a190b] hover:underline">{item.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      </div>
    </nav>
  );
};

export default Breadcrumbs;
