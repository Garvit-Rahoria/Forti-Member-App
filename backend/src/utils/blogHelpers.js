/**
 * Blog category tree and post helpers.
 */
const { pool } = require('../config/database');

function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter(c => (c.parent_id ?? null) === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map(c => ({
      ...c,
      children: buildCategoryTree(categories, c.id),
    }));
}

async function getCategoryDescendantIds(categoryId) {
  const [rows] = await pool.query(
    `WITH RECURSIVE tree AS (
       SELECT id FROM portal_blog_categories WHERE id = ?
       UNION ALL
       SELECT c.id FROM portal_blog_categories c
       INNER JOIN tree t ON c.parent_id = t.id
     )
     SELECT id FROM tree`,
    [categoryId]
  );
  return rows.map(r => r.id);
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

const POST_TYPES = [
  'news',
  'industry_update',
  'tax_update',
  'announcement',
  'event',
  'policy',
  'partnership',
];

const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'image',
  'quote',
  'list',
  'embed',
  'divider',
  'cta',
  'related_posts',
  'gallery',
];

module.exports = {
  buildCategoryTree,
  getCategoryDescendantIds,
  slugify,
  POST_TYPES,
  BLOCK_TYPES,
};
