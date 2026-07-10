import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Search, BookOpen, Tag, Eye, ChevronDown, ChevronUp, FolderOpen, Layers } from 'lucide-react';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedArticle, setExpandedArticle] = useState(null);

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
      console.error('Failed to fetch KB articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(articles.map(a => a.category))];
    return cats.sort();
  }, [articles]);

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [articles, searchQuery, selectedCategory]);

  // Group articles by category for display
  const groupedArticles = useMemo(() => {
    const groups = {};
    filteredArticles.forEach(article => {
      if (!groups[article.category]) {
        groups[article.category] = [];
      }
      groups[article.category].push(article);
    });
    return groups;
  }, [filteredArticles]);

  const toggleArticle = (id) => {
    setExpandedArticle(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <BookOpen size={32} style={{ color: 'var(--primary-color)' }} />
          <h1 style={{ margin: 0, fontSize: '2rem' }}>Knowledge Base</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Browse our help articles and guides. Find answers to common questions before submitting a ticket.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ 
        display: 'flex', 
        gap: '1rem', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        marginBottom: '2rem',
        padding: '1rem 1.5rem',
        borderLeft: '4px solid var(--primary-color)'
      }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            placeholder="Search articles by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <select 
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '0.55rem 1rem', minWidth: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem', textAlign: 'center', borderTop: '3px solid var(--primary-color)' }}>
          <Layers size={20} style={{ color: 'var(--primary-color)', marginBottom: '0.25rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{articles.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Articles</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem', textAlign: 'center', borderTop: '3px solid var(--secondary-color)' }}>
          <FolderOpen size={20} style={{ color: 'var(--secondary-color)', marginBottom: '0.25rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary-color)' }}>{categories.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Categories</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', padding: '1rem', textAlign: 'center', borderTop: '3px solid var(--priority-medium)' }}>
          <Eye size={20} style={{ color: 'var(--priority-medium)', marginBottom: '0.25rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--priority-medium)' }}>
            {articles.reduce((sum, a) => sum + (a.viewCount || 0), 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Views</div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing {filteredArticles.length} of {articles.length} articles
        {selectedCategory && <span> in <strong>{selectedCategory}</strong></span>}
        {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
      </div>

      {/* Articles grouped by category */}
      {Object.keys(groupedArticles).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Search size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>No articles found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or category filter.</p>
        </div>
      ) : (
        Object.entries(groupedArticles).map(([category, categoryArticles]) => (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '2px solid var(--border-color)'
            }}>
              <FolderOpen size={18} style={{ color: 'var(--secondary-color)' }} />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{category}</h2>
              <span className="badge badge-closed" style={{ marginLeft: '0.5rem' }}>
                {categoryArticles.length} article{categoryArticles.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categoryArticles.map(article => (
                <div 
                  key={article._id} 
                  className="card"
                  style={{ 
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    transition: 'var(--transition-normal)',
                    borderLeft: expandedArticle === article._id ? '3px solid var(--primary-color)' : '3px solid transparent'
                  }}
                  onClick={() => toggleArticle(article._id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <BookOpen size={14} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{article.title}</h3>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Eye size={11} /> {article.viewCount || 0} views
                        </span>
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                        {(article.tags || []).length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Tag size={11} />
                            {article.tags.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedArticle === article._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  {/* Expanded content */}
                  {expandedArticle === article._id && (
                    <div 
                      className="animate-fade-in"
                      style={{ 
                        marginTop: '1rem', 
                        paddingTop: '1rem', 
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.7',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {article.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
