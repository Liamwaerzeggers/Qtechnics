import React from 'react';
import { Star } from 'lucide-react';

const Avatar = ({ initial }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a190b] to-[#500000] text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
    {initial}
  </div>
);

const Stars = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={
          i <= rating
            ? 'h-4 w-4 fill-[#FBBC04] text-[#FBBC04]'
            : 'h-4 w-4 fill-gray-200 text-gray-200'
        }
      />
    ))}
  </div>
);

const ReviewCard = ({ review }) => {
  return (
    <article
      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col"
      data-testid="review-card"
    >
      <header className="flex items-start gap-3 mb-3">
        <Avatar initial={review.initial} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#202020] truncate">{review.name}</p>
            {review.badge && (
              <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                {review.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={review.rating} />
            <span className="text-xs text-gray-500">{review.dateText}</span>
          </div>
        </div>
        <svg className="h-5 w-5 flex-shrink-0 opacity-70" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      </header>
      <p className="text-[#202020]/80 text-sm leading-relaxed">{review.text}</p>
    </article>
  );
};

export default ReviewCard;
