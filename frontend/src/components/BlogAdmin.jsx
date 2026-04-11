import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Send, Calendar, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getCatLabel = (cat) => {
  if (cat === 'badkamer') return 'Badkamer';
  if (cat === 'keuken') return 'Keuken';
  if (cat === 'interieur') return 'Interieur';
  if (cat === 'technieken') return 'Technieken';
  if (cat === 'duurzaamheid') return 'Duurzaamheid';
  return 'Renovatie';
};

const BlogAdmin = () => {
  const [blogs, setBlogs] = useState([]);
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBlogs = async () => {
    try {
      const res = await fetch(API_URL + '/api/blogs?published_only=false');
      if (res.ok) setBlogs(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadTopics = async () => {
    try {
      const res = await fetch(API_URL + '/api/blog-topics');
      if (res.ok) setTopics(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadBlogs(), loadTopics()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Blog artikel verwijderen?')) return;
    try {
      await fetch(API_URL + '/api/blogs/' + id, { method: 'DELETE' });
      await loadBlogs();
    } catch (e) { alert('Fout bij verwijderen'); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(API_URL + '/api/blogs/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert('Blog gegenereerd: ' + data.title);
        await loadBlogs();
        await loadTopics();
      } else {
        alert('Generatie mislukt. Probeer opnieuw.');
      }
    } catch (e) { alert('Fout bij genereren'); }
    setGenerating(false);
  };

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;
    try {
      await fetch(API_URL + '/api/blog-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTopic.trim() }),
      });
      setNewTopic('');
      await loadTopics();
    } catch (e) { alert('Fout bij toevoegen'); }
  };

  const handleDeleteTopic = async (id) => {
    try {
      await fetch(API_URL + '/api/blog-topics/' + id, { method: 'DELETE' });
      await loadTopics();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Blog beheer laden...</div>;
  }

  return (
    <div data-testid="blog-admin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#202020]">Blog Beheer</h1>
          <p className="text-[#202020]/70">{blogs.length} artikelen gepubliceerd</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#3a190b] hover:bg-[#500000] text-white"
          data-testid="generate-blog-btn"
        >
          {generating ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Genereren...</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" />Blog genereren</>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-lg mb-4">Gepubliceerde artikelen</h2>
          <div className="space-y-3">
            {blogs.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">Nog geen blogartikelen. Klik op "Blog genereren" om te starten.</p>
            ) : (
              blogs.map((blog) => {
                const date = new Date(blog.created_at).toLocaleDateString('nl-BE', {
                  day: 'numeric', month: 'short', year: 'numeric'
                });
                return (
                  <div key={blog.id} className="bg-white rounded-lg border p-4 flex items-start justify-between gap-4" data-testid="blog-admin-item">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#202020] truncate">{blog.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{date}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {getCatLabel(blog.category)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 truncate">{blog.excerpt}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={'/blog/' + blog.slug}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#3a190b] hover:underline"
                      >
                        Bekijk
                      </a>
                      <button
                        onClick={() => handleDelete(blog.id)}
                        className="text-red-500 hover:text-red-700"
                        data-testid="delete-blog-btn"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-4">Eigen topics toevoegen</h2>
          <p className="text-sm text-gray-500 mb-3">
            Voeg eigen blog ideeën toe. Deze krijgen voorrang bij de volgende automatische generatie.
          </p>
          <div className="flex gap-2 mb-4">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Bijv. Tips voor kleine badkamers"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
              data-testid="topic-input"
            />
            <Button
              onClick={handleAddTopic}
              disabled={!newTopic.trim()}
              className="bg-[#3a190b] hover:bg-[#500000] text-white flex-shrink-0"
              data-testid="add-topic-btn"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {topics.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Geen custom topics in de wachtrij</p>
            ) : (
              topics.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2" data-testid="topic-item">
                  <span className="text-sm text-[#202020] truncate flex-1">{t.topic}</span>
                  <button onClick={() => handleDeleteTopic(t.id)} className="text-red-400 hover:text-red-600 ml-2">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Automatische generatie:</strong> Elke dag wordt automatisch 1 blog gegenereerd. 
              Custom topics worden eerst verwerkt. Alle blogs zijn SEO-geoptimaliseerd met links naar jullie offertepagina.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogAdmin;
