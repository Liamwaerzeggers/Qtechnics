import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import ReviewCard from './ReviewCard';
import { GOOGLE_REVIEWS, GOOGLE_RATING, REVIEWS_URL } from '../data/googleReviews';

const HOMEPAGE_REVIEWS = GOOGLE_REVIEWS.slice(0, 6);

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-[#f7f4f1]" data-testid="testimonials-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Google rating */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-5 py-2 shadow-sm mb-6">
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="font-semibold text-[#202020]">{GOOGLE_RATING.aggregate}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-[#FBBC04] text-[#FBBC04]" />
              ))}
            </div>
            <span className="text-sm text-gray-600">({GOOGLE_RATING.total} reviews)</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-3">
            Wat onze klanten zeggen
          </h2>
          <p className="text-[#202020]/70 text-lg max-w-2xl mx-auto">
            Echte beoordelingen van echte klanten, geverifieerd door Google.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {HOMEPAGE_REVIEWS.map((r) => (
            <ReviewCard key={r.name + r.date} review={r} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 bg-[#3a190b] text-white px-6 py-3 rounded-full font-medium hover:bg-[#500000] transition-colors"
            data-testid="view-all-reviews-btn"
          >
            Bekijk alle reviews <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#3a190b] hover:underline px-6 py-3 text-sm"
            data-testid="leave-review-btn"
          >
            Schrijf zelf een review op Google
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
