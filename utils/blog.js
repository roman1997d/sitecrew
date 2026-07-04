const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');

function getPostText(post) {
  const sectionText = (post.sections || []).flatMap((section) => [
    section.heading,
    ...(section.paragraphs || []),
  ]);
  return [post.title, post.description, ...sectionText].filter(Boolean).join(' ');
}

function estimateReadMinutes(post) {
  const words = getPostText(post).split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 200));
}

function enrichBlogPost(post) {
  return {
    ...post,
    category: post.category || 'Guides',
    icon: post.icon || 'bi-journal-text',
    readMinutes: estimateReadMinutes(post),
  };
}

function loadBlogPosts() {
  try {
    const indexPath = path.join(BLOG_DIR, 'posts.json');
    if (!fs.existsSync(indexPath)) return [];
    const raw = fs.readFileSync(indexPath, 'utf8');
    const posts = JSON.parse(raw);
    return Array.isArray(posts)
      ? posts
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .map(enrichBlogPost)
      : [];
  } catch (error) {
    return [];
  }
}

function getBlogCategories(posts = loadBlogPosts()) {
  return [...new Set(posts.map((post) => post.category))];
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
  getBlogCategories,
  estimateReadMinutes,
  enrichBlogPost,
};
