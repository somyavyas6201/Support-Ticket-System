import mongoose from 'mongoose';

const knowledgeBaseArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Article content is required']
  },
  category: {
    type: String,
    required: [true, 'Article category is required'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const KnowledgeBaseArticle = mongoose.model('KnowledgeBaseArticle', knowledgeBaseArticleSchema);
export default KnowledgeBaseArticle;
