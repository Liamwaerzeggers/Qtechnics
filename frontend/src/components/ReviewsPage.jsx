import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Star, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import Breadcrumbs from './Breadcrumbs';
import ReviewCard from './ReviewCard';
import InternalLinks from './InternalLinks';
import { GOOGLE_REVIEWS, GOOGLE_RATING, REVIEWS_URL } from '../data/googleReviews';

const buildSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://maxq.be/#organization',
  name: 'Max Q - powered by QTechnics',
  url: 'https://maxq.be',
  telephone: '+32488152028',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Gerhees 118',
    postalCode: '3945',
    addressLocality: 'Ham',
    addressCountry: 'BE',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: GOOGLE_RATING.aggregate,
    reviewCount: GOOGLE_RATING.total,
    bestRating: 5,
    worstRating: 1,
  },
  review: GOOGLE_REVIEWS.map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name },
    datePublished: r.date,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: r.text,
  })),
});

const ReviewsPage = () => {
  return (
    <div data-testid="reviews-page">
      <Helmet>
        <title>Klantenreviews | 4,8★ op Google | Max Q Renovaties</title>
        <meta
          name="description"
          content="Lees echte Google reviews van klanten van Max Q - powered by QTechnics. 4,8 sterren op 37 reviews. Renovaties in Limburg en Vlaams-Brabant."
        />
        <link rel="canonical" href="https://maxq.be/reviews" />
        <script type="application/ld+json">{JSON.stringify(buildSchema())}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-5 py-2 mb-6">
            <span className="font-bold text-2xl">{GOOGLE_RATING.aggregate}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-[#FBBC04] text-[#FBBC04]" />
              ))}
            </div>
            <span className="text-sm">({GOOGLE_RATING.total} Google reviews)</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            data-testid="reviews-title"
          >
            Wat onze klanten zeggen
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Geverifieerde Google reviews van klanten in Limburg, Antwerpen en Vlaams-Brabant.
          </p>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16 bg-[#f7f4f1]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GOOGLE_REVIEWS.map((r) => (
              <ReviewCard key={r.name + r.date} review={r} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href={REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#3a190b] hover:underline font-medium"
              data-testid="external-google-reviews"
            >
              Bekijk alle {GOOGLE_RATING.total} reviews op Google
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Word onze volgende tevreden klant
          </h2>
          <p className="text-white/80 mb-8">
            Vraag een gratis adviesgesprek aan en ontdek hoe wij uw project tot een succes maken.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button
                className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3"
                data-testid="reviews-cta-start"
              >
                Gratis adviesgesprek <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/projecten">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-8 py-3"
              >
                Bekijk realisaties
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default ReviewsPage;
