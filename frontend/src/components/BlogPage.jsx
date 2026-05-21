import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import InternalLinks from './InternalLinks';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getCatLabel = (cat) => {
  if (cat === 'badkamer') return 'Badkamer';
  if (cat === 'keuken') return 'Keuken';
  if (cat === 'interieur') return 'Interieur';
  if (cat === 'technieken') return 'Technieken';
  if (cat === 'duurzaamheid') return 'Duurzaamheid';
  return 'Renovatie';
};

const getCatColor = (cat) => {
  if (cat === 'badkamer') return 'bg-blue-100 text-blue-800';
  if (cat === 'keuken') return 'bg-orange-100 text-orange-800';
  if (cat === 'interieur') return 'bg-purple-100 text-purple-800';
  if (cat === 'technieken') return 'bg-green-100 text-green-800';
  if (cat === 'duurzaamheid') return 'bg-emerald-100 text-emerald-800';
  return 'bg-amber-100 text-amber-800';
};

const BlogCard = ({ blog }) => {
  const date = new Date(blog.created_at).toLocaleDateString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const catColor = getCatColor(blog.category);
  const catLabel = getCatLabel(blog.category);
  const href = '/blog/' + blog.slug;

  return (
    <Link to={href} className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden" data-testid="blog-card">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className={catColor + ' text-xs px-2 py-1 rounded-full font-medium'}>{catLabel}</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />{date}
          </span>
        </div>
        <h2 className="text-lg font-bold text-[#202020] mb-2 group-hover:text-[#3a190b] transition-colors">{blog.title}</h2>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{blog.excerpt}</p>
        <span className="text-sm font-medium text-[#3a190b] flex items-center gap-1">
          Lees meer <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

const FilterButton = ({ label, active, onClick, testId }) => {
  const base = active
    ? 'bg-[#3a190b] text-white'
    : 'bg-white text-[#3a190b] border border-[#3a190b]/20 hover:border-[#3a190b]';
  return (
    <button onClick={onClick} className={base + ' px-4 py-2 rounded-full text-sm font-medium transition-colors'} data-testid={testId}>
      {label}
    </button>
  );
};

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('alle');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(API_URL + '/api/blogs');
        if (res.ok) setBlogs(await res.json());
      } catch (err) {
        console.error('Error fetching blogs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const cats = ['alle'];
  blogs.forEach((b) => {
    if (!cats.includes(b.category)) cats.push(b.category);
  });
  const filtered = filter === 'alle' ? blogs : blogs.filter((b) => b.category === filter);

  return (
    <div data-testid="blog-page">
      <Helmet>
        <title>Renovatie Blog ✓ Tips & Premies 2026 | Max Q</title>
        <meta name="description" content="Dagelijkse renovatie tips, trends en expertadvies. Bespaar duizenden euro's met inzichten over premies, EPC en slim verbouwen in Vlaanderen." />
        <link rel="canonical" href="https://maxq.be/blog" />
      </Helmet>

      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="blog-page-title">Kennisbank en Blog</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Tips, trends en vakkennis over renovatie en interieurdesign. Geschreven door onze experts met 35+ jaar ervaring.
          </p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 mb-8" data-testid="blog-filters">
            {cats.map((cat) => (
              <FilterButton
                key={cat}
                label={cat === 'alle' ? 'Alle artikelen' : getCatLabel(cat)}
                active={filter === cat}
                onClick={() => setFilter(cat)}
                testId={'blog-filter-' + cat}
              />
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Artikelen laden...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Nog geen artikelen beschikbaar.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Klaar om te renoveren?</h2>
          <p className="text-white/80 mb-8">Neem contact op voor een gratis adviesgesprek met onze experts.</p>
          <Link to="/start">
            <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3" data-testid="blog-cta">
              Gratis offerte aanvragen
            </Button>
          </Link>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default BlogPage;
