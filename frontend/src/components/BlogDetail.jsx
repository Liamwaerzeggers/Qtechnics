import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import { Button } from './ui/button';
import Breadcrumbs from './Breadcrumbs';
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

const TagList = ({ tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag className="h-4 w-4 text-gray-400" />
        {tags.map((tag, i) => (
          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
        ))}
      </div>
    </div>
  );
};

const BlogContent = ({ html }) => {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:text-[#202020] prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-[#3a190b]"
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="blog-content"
    />
  );
};

const BlogDetail = () => {
  const params = useParams();
  const slugParam = params.slug;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlog = async () => {
      try {
        const res = await fetch(API_URL + '/api/blogs/' + slugParam);
        if (res.ok) setBlog(await res.json());
      } catch (err) {
        console.error('Error fetching blog:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slugParam]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>;
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Artikel niet gevonden</h1>
          <Link to="/blog"><Button className="bg-[#3a190b] text-white">Terug naar blog</Button></Link>
        </div>
      </div>
    );
  }

  const blogTitle = blog.title || '';
  const blogExcerpt = blog.excerpt || '';
  const blogContent = blog.content || '';
  const blogCategory = blog.category || 'renovatie';
  const blogTags = blog.tags || [];
  const blogSlug = blog.slug || '';
  const blogCreatedAt = blog.created_at || '';
  const date = new Date(blogCreatedAt).toLocaleDateString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const catLabel = getCatLabel(blogCategory);
  const canonicalUrl = 'https://maxq.be/blog/' + blogSlug;
  const pageTitle = blogTitle + ' | Max Q Blog';

  return (
    <div data-testid="blog-detail">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={blogExcerpt} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={blogTitle} />
        <meta property="og:description" content={blogExcerpt} />
        <meta property="og:type" content="article" />
      </Helmet>

      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog' },
        { label: blogTitle }
      ]} />

      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/blog" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors" data-testid="blog-back-link">
            <ArrowLeft className="h-4 w-4" /> Terug naar blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{catLabel}</span>
            <span className="text-xs text-white/70 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{date}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="blog-detail-title">{blogTitle}</h1>
        </div>
      </section>

      <article className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <BlogContent html={blogContent} />
          <TagList tags={blogTags} />
        </div>
      </article>

      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Hulp nodig bij uw renovatie?</h2>
          <p className="text-white/80 mb-8">Onze experts staan voor u klaar. Vraag een gratis adviesgesprek aan.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3" data-testid="blog-detail-cta">
                Gratis adviesgesprek
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                Meer artikelen
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default BlogDetail;
