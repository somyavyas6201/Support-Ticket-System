import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Tag,
  Eye,
  FolderOpen,
  FileText,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import Toast from '../../components/Toast';

export default function KBManage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    category: '',
    tags: ''
  });
  const [saving, setSaving] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await api.get('/api/kb');
      if (res.data && res.data.success) {
        setArticles(res.data.articles);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage('Failed to fetch knowledge base articles.');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = [...new Set(articles.map(a => a.category))];
    return cats.sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, searchQuery, selectedCategory]);

  // Auto-generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value) => {
    setForm(prev => ({
      ...prev,
      title: value,
      slug: editingArticle ? prev.slug : generateSlug(value)
    }));
  };

  const openNewEditor = () => {
    setEditingArticle(null);
    setForm({ title: '', slug: '', content: '', category: '', tags: '' });
    setShowEditor(true);
  };

  const openEditEditor = (article) => {
    setEditingArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      content: article.content,
      category: article.category,
      tags: (article.tags || []).join(', ')
    });
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
    setForm({ title: '', slug: '', content: '', category: '', tags: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.category.trim()) {
      setToastType('error');
      setToastMessage('Please fill in Title, Content, and Category.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || generateSlug(form.title),
        content: form.content.trim(),
        category: form.category.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingArticle) {
        // Update existing
        const res = await api.put(`/api/kb/${editingArticle._id}`, payload);
        if (res.data && res.data.success) {
          setToastType('success');
          setToastMessage('Article updated successfully!');
          fetchArticles();
          closeEditor();
        }
      } else {
        // Create new
        const res = await api.post('/api/kb', payload);
        if (res.data && res.data.success) {
          setToastType('success');
          setToastMessage('New article created!');
          fetchArticles();
          closeEditor();
        }
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articleId) => {
    try {
      const res = await api.delete(`/api/kb/${articleId}`);
      if (res.data && res.data.success) {
        setToastType('success');
        setToastMessage('Article deleted.');
        setArticles(prev => prev.filter(a => a._id !== articleId));
        setDeletingId(null);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to delete article.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={28} style={{ color: 'var(--primary-color)' }} />
            Knowledge Base Management
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create, edit, and manage help articles for customers.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNewEditor} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select 
          className="form-input"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ flex: '0 0 auto', padding: '0.55rem 1rem', minWidth: '180px' }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Editor Modal/Panel */}
      {showEditor && (
        <div className="card animate-fade-in" style={{ 
          marginBottom: '2rem', 
          padding: '2rem',
          borderLeft: '4px solid var(--primary-color)',
          backgroundColor: 'var(--surface-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileText size={20} style={{ color: 'var(--primary-color)' }} />
              {editingArticle ? 'Edit Article' : 'Create New Article'}
            </h2>
            <button onClick={closeEditor} className="btn" style={{ padding: '0.3rem', background: 'none', border: 'none' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Article title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Slug (URL-friendly)</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="auto-generated-slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Account Setup, API, Billing"
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                  list="kb-categories"
                />
                <datalist id="kb-categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. billing, refund, account"
                  value={form.tags}
                  onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Content * (Markdown supported)</label>
              <textarea 
                className="form-input"
                rows="12"
                placeholder="Write your article content here. You can use Markdown formatting..."
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                required
                style={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.6' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeEditor} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Save size={14} />
                {saving ? 'Saving...' : (editingArticle ? 'Update Article' : 'Create Article')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Views</th>
              <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tags</th>
              <th style={{ textAlign: 'right', padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredArticles.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No articles found. Create your first article above.
                </td>
              </tr>
            ) : (
              filteredArticles.map(article => (
                <tr 
                  key={article._id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{article.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{article.slug}</div>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-open">{article.category}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}>
                      <Eye size={12} /> {article.viewCount || 0}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {(article.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{ 
                          fontSize: '0.65rem', 
                          padding: '0.15rem 0.4rem', 
                          backgroundColor: 'var(--secondary-light)', 
                          color: 'var(--secondary-hover)', 
                          borderRadius: '10px',
                          fontWeight: 500
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditEditor(article)} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      {deletingId === article._id ? (
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button 
                            onClick={() => handleDelete(article._id)}
                            className="btn" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--priority-critical)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)' }}
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeletingId(article._id)} 
                          className="btn" 
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--priority-critical-light)', color: 'var(--priority-critical)', border: '1px solid var(--priority-critical)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage('')} 
        />
      )}
    </div>
  );
}
