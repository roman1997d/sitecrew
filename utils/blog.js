const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');

function loadBlogPosts() {
  try {
    const indexPath = path.join(BLOG_DIR, 'posts.json');
    if (!fs.existsSync(indexPath)) return [];
    const raw = fs.readFileSync(indexPath, 'utf8');
    const posts = JSON.parse(raw);
    return Array.isArray(posts) ? posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)) : [];
  } catch (error) {
    return [];
  }
}

function getBlogPostBySlug(slug) {
  return loadBlogPosts().find((post) => post.slug === slug) || null;
}

function getBlogSitemapEntries() {
  return loadBlogPosts().map((post) => ({
    path: `/blog/${post.slug}`,
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: post.publishedAt,
  }));
}

function getArticleSchema(post, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'SiteCrew',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SiteCrew',
    },
    mainEntityOfPage: canonicalUrl,
  };
}

module.exports = {
  loadBlogPosts,
  getBlogPostBySlug,
  getBlogSitemapEntries,
  getArticleSchema,
};
