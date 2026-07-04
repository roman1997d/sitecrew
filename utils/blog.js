const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');
const BLOG_POSTS_FILE = path.join(BLOG_DIR, 'posts.json');
const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getBlogPostsFilePath() {
  return BLOG_POSTS_FILE;
}

function readRawBlogPosts() {
  try {
    if (!fs.existsSync(BLOG_POSTS_FILE)) return [];
    const raw = fs.readFileSync(BLOG_POSTS_FILE, 'utf8');
    const posts = JSON.parse(raw);
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    return [];
  }
}

function writeRawBlogPosts(posts) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  const tempPath = `${BLOG_POSTS_FILE}.tmp`;
  const payload = `${JSON.stringify(posts, null, 2)}\n`;
  fs.writeFileSync(tempPath, payload, 'utf8');
  fs.renameSync(tempPath, BLOG_POSTS_FILE);
}

function normalizeBlogSections(sections = []) {
  return sections
    .map((section) => ({
      heading: String(section.heading || '').trim(),
      paragraphs: (section.paragraphs || [])
        .map((paragraph) => String(paragraph || '').trim())
        .filter(Boolean),
    }))
    .filter((section) => section.heading && section.paragraphs.length);
}

function normalizeBlogPostInput(input, { fallbackPublishedAt = null } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const publishedAt = input.publishedAt || fallbackPublishedAt || today;

  return {
    slug: String(input.slug || '').trim().toLowerCase(),
    title: String(input.title || '').trim(),
    description: String(input.description || '').trim(),
    category: String(input.category || 'Guides').trim() || 'Guides',
    icon: String(input.icon || 'bi-journal-text').trim() || 'bi-journal-text',
    publishedAt,
    updatedAt: input.updatedAt || today,
    sections: normalizeBlogSections(input.sections),
  };
}

function sortBlogPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function createBlogPost(input) {
  const post = normalizeBlogPostInput({
    ...input,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  if (!BLOG_SLUG_PATTERN.test(post.slug)) {
    const error = new Error('Invalid blog slug format.');
    error.statusCode = 400;
    throw error;
  }

  const posts = readRawBlogPosts();
  if (posts.some((item) => item.slug === post.slug)) {
    const error = new Error('A blog post with this slug already exists.');
    error.statusCode = 409;
    throw error;
  }

  if (!post.sections.length) {
    const error = new Error('At least one section with content is required.');
    error.statusCode = 400;
    throw error;
  }

  posts.push(post);
  writeRawBlogPosts(sortBlogPosts(posts));
  return enrichBlogPost(post);
}

function updateBlogPost(currentSlug, input) {
  const posts = readRawBlogPosts();
  const index = posts.findIndex((item) => item.slug === currentSlug);
  if (index === -1) {
    const error = new Error('Blog post not found.');
    error.statusCode = 404;
    throw error;
  }

  const nextSlug = String(input.slug || currentSlug).trim().toLowerCase();
  if (!BLOG_SLUG_PATTERN.test(nextSlug)) {
    const error = new Error('Invalid blog slug format.');
    error.statusCode = 400;
    throw error;
  }

  if (nextSlug !== currentSlug && posts.some((item) => item.slug === nextSlug)) {
    const error = new Error('A blog post with this slug already exists.');
    error.statusCode = 409;
    throw error;
  }

  const updated = normalizeBlogPostInput(
    {
      ...posts[index],
      ...input,
      slug: nextSlug,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
    { fallbackPublishedAt: posts[index].publishedAt }
  );

  if (!updated.sections.length) {
    const error = new Error('At least one section with content is required.');
    error.statusCode = 400;
    throw error;
  }

  posts[index] = updated;
  writeRawBlogPosts(sortBlogPosts(posts));
  return enrichBlogPost(updated);
}

function deleteBlogPost(slug) {
  const posts = readRawBlogPosts();
  const nextPosts = posts.filter((item) => item.slug !== slug);
  if (nextPosts.length === posts.length) {
    const error = new Error('Blog post not found.');
    error.statusCode = 404;
    throw error;
  }

  writeRawBlogPosts(nextPosts);
  return { slug };
}

function getRawBlogPostBySlug(slug) {
  return readRawBlogPosts().find((post) => post.slug === slug) || null;
}

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
    const posts = readRawBlogPosts();
    return sortBlogPosts(posts).map(enrichBlogPost);
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
  getBlogPostsFilePath,
  readRawBlogPosts,
  writeRawBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getRawBlogPostBySlug,
  normalizeBlogPostInput,
  BLOG_SLUG_PATTERN,
};
