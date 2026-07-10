import express from 'express';
import KnowledgeBaseArticle from '../models/KnowledgeBaseArticle.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Suggest KB articles based on keyword query
// @route   GET /api/kb/suggest
// @access  Private (Authenticated users)
router.get('/suggest', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    // Escape query string characters for safe regex evaluation
    const escapedQuery = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const articles = await KnowledgeBaseArticle.find({
      $or: [
        { title: regex },
        { content: regex }
      ]
    })
    .select('title slug content category')
    .limit(3);

    res.status(200).json({
      success: true,
      suggestions: articles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all KB articles (for standard kb search list)
// @route   GET /api/kb
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    let query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      query.$or = [{ title: searchRegex }, { content: searchRegex }];
    }

    const articles = await KnowledgeBaseArticle.find({ ...filter, ...query })
      .sort({ viewCount: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      articles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single KB article by ID or slug
// @route   GET /api/kb/:idOrSlug
// @access  Private
router.get('/:idOrSlug', protect, async (req, res) => {
  try {
    const param = req.params.idOrSlug;
    let article;

    // Try finding by ID first, then by slug
    if (param.match(/^[0-9a-fA-F]{24}$/)) {
      article = await KnowledgeBaseArticle.findById(param);
    }
    if (!article) {
      article = await KnowledgeBaseArticle.findOne({ slug: param });
    }

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Increment view count
    article.viewCount = (article.viewCount || 0) + 1;
    await article.save();

    res.status(200).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a new KB article
// @route   POST /api/kb
// @access  Private (Agent/Admin only)
router.post('/', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { title, slug, content, category, tags } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ success: false, message: 'Title, content, and category are required.' });
    }

    const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

    // Check for duplicate slug
    const existing = await KnowledgeBaseArticle.findOne({ slug: articleSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An article with this slug already exists. Please choose a different title or slug.' });
    }

    const article = await KnowledgeBaseArticle.create({
      title: title.trim(),
      slug: articleSlug,
      content: content.trim(),
      category: category.trim(),
      tags: tags || []
    });

    res.status(201).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update an existing KB article
// @route   PUT /api/kb/:id
// @access  Private (Agent/Admin only)
router.put('/:id', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { title, slug, content, category, tags } = req.body;

    const article = await KnowledgeBaseArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // If slug is changing, check for duplicates
    if (slug && slug !== article.slug) {
      const existing = await KnowledgeBaseArticle.findOne({ slug, _id: { $ne: article._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'An article with this slug already exists.' });
      }
      article.slug = slug;
    }

    if (title) article.title = title.trim();
    if (content) article.content = content.trim();
    if (category) article.category = category.trim();
    if (tags !== undefined) article.tags = tags;

    await article.save();

    res.status(200).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a KB article
// @route   DELETE /api/kb/:id
// @access  Private (Agent/Admin only)
router.delete('/:id', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const article = await KnowledgeBaseArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    await KnowledgeBaseArticle.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Article deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
