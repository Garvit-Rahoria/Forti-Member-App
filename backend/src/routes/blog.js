const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

function paginationMeta(total, page, perPage) {
  const t = parseInt(total, 10) || 0;
  const p = parseInt(page, 10) || 1;
  const pp = parseInt(perPage, 10) || 20;
  return { total: t, page: p, perPage: pp, lastPage: Math.max(1, Math.ceil(t / pp)) };
}
const { upload } = require('../middleware/upload');
const {
  buildCategoryTree,
  getCategoryDescendantIds,
  slugify,
  POST_TYPES,
  BLOCK_TYPES,
} = require('../utils/blogHelpers');

const router = express.Router();

function mapPostRow(row) {
  if (!row) return null;
  return {
    ...row,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
  };
}

async function loadPostBlocks(postId) {
  const [blocks] = await pool.query(
    'SELECT * FROM portal_blog_blocks WHERE post_id = ? ORDER BY sort_order, id',
    [postId]
  );
  return blocks.map(b => ({
    ...b,
    data: typeof b.data === 'string' ? JSON.parse(b.data) : (b.data || {}),
  }));
}

async function loadPostTags(postId) {
  const [tags] = await pool.query(
    `SELECT t.* FROM portal_blog_tags t
     JOIN portal_blog_post_tags pt ON pt.tag_id = t.id
     WHERE pt.post_id = ? ORDER BY t.name`,
    [postId]
  );
  return tags;
}

async function loadRelatedPosts(postId, limit = 6) {
  const [manual] = await pool.query(
    `SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at,
            m.slug AS menu_slug, c.slug AS category_slug
     FROM portal_blog_post_relations r
     JOIN portal_blog_posts p ON p.id = r.related_post_id
     JOIN portal_blog_menus m ON m.id = p.menu_id
     LEFT JOIN portal_blog_categories c ON c.id = p.category_id
     WHERE r.post_id = ? AND p.status = 'published'
     ORDER BY r.sort_order, r.related_post_id
     LIMIT ?`,
    [postId, limit]
  );
  if (manual.length >= limit) return manual;

  const [[post]] = await pool.query('SELECT category_id, menu_id FROM portal_blog_posts WHERE id = ?', [postId]);
  if (!post) return manual;

  const exclude = [postId, ...manual.map(m => m.id)];
  const placeholders = exclude.map(() => '?').join(',');
  const need = limit - manual.length;

  const [auto] = await pool.query(
    `SELECT DISTINCT ON (p.id) p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at,
            m.slug AS menu_slug, c.slug AS category_slug
     FROM portal_blog_posts p
     JOIN portal_blog_menus m ON m.id = p.menu_id
     LEFT JOIN portal_blog_categories c ON c.id = p.category_id
     LEFT JOIN portal_blog_post_tags pt ON pt.post_id = p.id
     WHERE p.status = 'published' AND p.menu_id = ?
       AND p.id NOT IN (${placeholders})
       AND (p.category_id = ? OR pt.tag_id IN (
         SELECT tag_id FROM portal_blog_post_tags WHERE post_id = ?
       ))
     ORDER BY p.id, p.is_featured DESC, p.published_at DESC NULLS LAST
     LIMIT ?`,
    [post.menu_id, ...exclude, post.category_id, postId, need]
  );

  return [...manual, ...auto];
}

async function replacePostBlocks(postId, blocks) {
  await pool.query('DELETE FROM portal_blog_blocks WHERE post_id = ?', [postId]);
  if (!Array.isArray(blocks) || !blocks.length) return;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const type = BLOCK_TYPES.includes(b.block_type) ? b.block_type : 'paragraph';
    await pool.query(
      `INSERT INTO portal_blog_blocks (post_id, block_type, sort_order, data) VALUES (?, ?, ?, ?)`,
      [postId, type, b.sort_order ?? i, JSON.stringify(b.data || {})]
    );
  }
}

async function replacePostTags(postId, tagIds) {
  await pool.query('DELETE FROM portal_blog_post_tags WHERE post_id = ?', [postId]);
  if (!Array.isArray(tagIds)) return;
  for (const tagId of tagIds) {
    if (tagId) await pool.query('INSERT INTO portal_blog_post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
  }
}

async function replacePostRelations(postId, relatedIds) {
  await pool.query('DELETE FROM portal_blog_post_relations WHERE post_id = ?', [postId]);
  if (!Array.isArray(relatedIds)) return;
  let i = 0;
  for (const rid of relatedIds) {
    if (rid && Number(rid) !== Number(postId)) {
      await pool.query(
        'INSERT INTO portal_blog_post_relations (post_id, related_post_id, sort_order) VALUES (?, ?, ?)',
        [postId, rid, i++]
      );
    }
  }
}

// ── PUBLIC: Navigation tree for header ───────────────────────────────────────
router.get('/nav', async (req, res) => {
  try {
    const [menus] = await pool.query(
      `SELECT * FROM portal_blog_menus WHERE is_active = TRUE AND show_in_header = TRUE ORDER BY sort_order, label`
    );
    const [categories] = await pool.query(
      `SELECT c.*, m.slug AS menu_slug
       FROM portal_blog_categories c
       JOIN portal_blog_menus m ON m.id = c.menu_id
       WHERE c.is_active = TRUE AND m.is_active = TRUE
       ORDER BY c.sort_order, c.name`
    );

    const nav = menus.map(menu => {
      const menuCats = categories.filter(c => c.menu_id === menu.id);
      const tree = buildCategoryTree(menuCats, null);
      const dropdownRoots = menuCats.filter(c => !c.parent_id && c.nav_visibility === 'main_dropdown');
      return {
        ...menu,
        path: menu.nav_path || `/content/${menu.slug}`,
        categories: tree,
        dropdown: dropdownRoots.map(r => ({
          id: r.id,
          slug: r.slug,
          name: r.nav_label || r.name,
          path: `/content/${menu.slug}/${r.slug}`,
          children: menuCats
            .filter(c => c.parent_id === r.id && c.nav_visibility === 'main_dropdown')
            .map(ch => ({
              id: ch.id,
              slug: ch.slug,
              name: ch.nav_label || ch.name,
              path: `/content/${menu.slug}/${ch.slug}`,
            })),
        })),
      };
    });

    return ok(res, nav);
  } catch (err) {
    console.error('[blog nav]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC: Menu hub (parent landing) ────────────────────────────────────────
router.get('/menus/:menuSlug', async (req, res) => {
  try {
    const [[menu]] = await pool.query(
      'SELECT * FROM portal_blog_menus WHERE slug = ? AND is_active = TRUE',
      [req.params.menuSlug]
    );
    if (!menu) return fail(res, 'Not found', 404);

    const [categories] = await pool.query(
      'SELECT * FROM portal_blog_categories WHERE menu_id = ? AND is_active = TRUE ORDER BY sort_order, name',
      [menu.id]
    );
    const tree = buildCategoryTree(categories, null);
    const rootCategories = categories.filter(c => !c.parent_id);

    const [featured] = await pool.query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at,
              c.slug AS category_slug, c.name AS category_name
       FROM portal_blog_posts p
       LEFT JOIN portal_blog_categories c ON c.id = p.category_id
       WHERE p.menu_id = ? AND p.status = 'published'
       ORDER BY p.is_featured DESC, p.published_at DESC NULLS LAST
       LIMIT 6`,
      [menu.id]
    );

    const [recent] = await pool.query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at,
              c.slug AS category_slug, c.name AS category_name
       FROM portal_blog_posts p
       LEFT JOIN portal_blog_categories c ON c.id = p.category_id
       WHERE p.menu_id = ? AND p.status = 'published'
       ORDER BY p.published_at DESC NULLS LAST
       LIMIT 12`,
      [menu.id]
    );

    return ok(res, {
      menu,
      path: menu.nav_path || `/content/${menu.slug}`,
      category_tree: tree,
      root_categories: rootCategories.map(r => ({
        ...r,
        path: `/content/${menu.slug}/${r.slug}`,
        child_count: categories.filter(c => c.parent_id === r.id).length,
      })),
      featured_posts: featured,
      recent_posts: recent,
    });
  } catch (err) {
    console.error('[blog hub]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC: Category page ──────────────────────────────────────────────────────
router.get('/menus/:menuSlug/categories/:categorySlug', async (req, res) => {
  try {
    const [[menu]] = await pool.query(
      'SELECT * FROM portal_blog_menus WHERE slug = ? AND is_active = TRUE',
      [req.params.menuSlug]
    );
    if (!menu) return fail(res, 'Menu not found', 404);

    const [[category]] = await pool.query(
      'SELECT * FROM portal_blog_categories WHERE menu_id = ? AND slug = ? AND is_active = TRUE',
      [menu.id, req.params.categorySlug]
    );
    if (!category) return fail(res, 'Category not found', 404);

    const [allCats] = await pool.query(
      'SELECT * FROM portal_blog_categories WHERE menu_id = ? AND is_active = TRUE',
      [menu.id]
    );
    const childCategories = allCats
      .filter(c => c.parent_id === category.id)
      .map(c => ({
        ...c,
        path: `/content/${menu.slug}/${c.slug}`,
      }));

    let parent = null;
    if (category.parent_id) {
      const [[p]] = await pool.query(
        'SELECT slug, name FROM portal_blog_categories WHERE id = ?',
        [category.parent_id]
      );
      parent = p || null;
    }

    const catIds = await getCategoryDescendantIds(category.id);
    const placeholders = catIds.map(() => '?').join(',');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(50, parseInt(req.query.per_page, 10) || 12);
    const offset = (page - 1) * perPage;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM portal_blog_posts
       WHERE status = 'published' AND category_id IN (${placeholders})`,
      catIds
    );

    const [posts] = await pool.query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at, p.is_featured,
              c.slug AS category_slug, c.name AS category_name
       FROM portal_blog_posts p
       LEFT JOIN portal_blog_categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND p.category_id IN (${placeholders})
       ORDER BY p.is_featured DESC, p.published_at DESC NULLS LAST
       LIMIT ? OFFSET ?`,
      [...catIds, perPage, offset]
    );

    const breadcrumbs = [];
    if (parent?.slug) {
      breadcrumbs.push({ label: parent.name, path: `/content/${menu.slug}/${parent.slug}` });
    }
    breadcrumbs.push({ label: category.name, path: `/content/${menu.slug}/${category.slug}` });

    return ok(res, {
      menu,
      category,
      parent_category: parent || null,
      breadcrumbs,
      hub_path: `/content/${menu.slug}`,
      child_categories: childCategories,
      posts,
      pagination: paginationMeta(total, page, perPage),
    });
  } catch (err) {
    console.error('[blog category]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC: Single post (blocks + related) ─────────────────────────────────────
router.get('/menus/:menuSlug/posts/:postSlug', async (req, res) => {
  try {
    const [[menu]] = await pool.query(
      'SELECT * FROM portal_blog_menus WHERE slug = ? AND is_active = TRUE',
      [req.params.menuSlug]
    );
    if (!menu) return fail(res, 'Not found', 404);

    const [[post]] = await pool.query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.parent_id AS category_parent_id,
              u.full_name AS author_name
       FROM portal_blog_posts p
       LEFT JOIN portal_blog_categories c ON c.id = p.category_id
       LEFT JOIN portal_admin_users u ON u.id = p.author_id
       WHERE p.menu_id = ? AND p.slug = ? AND p.status = 'published'`,
      [menu.id, req.params.postSlug]
    );
    if (!post) return fail(res, 'Post not found', 404);

    await pool.query('UPDATE portal_blog_posts SET view_count = view_count + 1 WHERE id = ?', [post.id]);

    const blocks = await loadPostBlocks(post.id);
    const tags = await loadPostTags(post.id);
    const related = await loadRelatedPosts(post.id, 6);

    const breadcrumbs = [
      { label: menu.label, path: `/content/${menu.slug}` },
    ];
    if (post.category_slug) {
      breadcrumbs.push({
        label: post.category_name,
        path: `/content/${menu.slug}/${post.category_slug}`,
      });
    }
    breadcrumbs.push({ label: post.title, path: null });

    return ok(res, {
      menu,
      post: { ...post, tags },
      blocks,
      related_posts: related,
      breadcrumbs,
    });
  } catch (err) {
    console.error('[blog post]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC: List tags ──────────────────────────────────────────────────────────
router.get('/tags', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM portal_blog_tags ORDER BY name');
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.get('/tags/:tagSlug/posts', async (req, res) => {
  try {
    const [[tag]] = await pool.query('SELECT * FROM portal_blog_tags WHERE slug = ?', [req.params.tagSlug]);
    if (!tag) return fail(res, 'Tag not found', 404);
    const [posts] = await pool.query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_path, p.post_type, p.published_at,
              m.slug AS menu_slug, c.slug AS category_slug
       FROM portal_blog_posts p
       JOIN portal_blog_post_tags pt ON pt.post_id = p.id
       JOIN portal_blog_menus m ON m.id = p.menu_id
       LEFT JOIN portal_blog_categories c ON c.id = p.category_id
       WHERE pt.tag_id = ? AND p.status = 'published'
       ORDER BY p.published_at DESC NULLS LAST
       LIMIT 50`,
      [tag.id]
    );
    return ok(res, { tag, posts });
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.get('/meta/post-types', (req, res) => ok(res, { post_types: POST_TYPES, block_types: BLOCK_TYPES }));

// ── ADMIN ──────────────────────────────────────────────────────────────────────
const admin = express.Router();
admin.use(authMiddleware);
admin.use(requireRole('super_admin', 'admin'));

admin.get('/menus', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM portal_blog_menus ORDER BY sort_order, label');
  return ok(res, rows);
});

admin.post('/menus', async (req, res) => {
  const { slug, label, description, nav_path, sort_order, show_in_header, is_active } = req.body;
  if (!slug || !label) return fail(res, 'slug and label required', 422);
  try {
    const [r] = await pool.query(
      `INSERT INTO portal_blog_menus (slug, label, description, nav_path, sort_order, show_in_header, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, label, description || null, nav_path || `/content/${slug}`, sort_order ?? 0, show_in_header !== false, is_active !== false]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_blog_menus WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug exists', 409);
    return fail(res, 'Server error', 500);
  }
});

admin.put('/menus/:id', async (req, res) => {
  const { slug, label, description, nav_path, sort_order, show_in_header, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE portal_blog_menus SET slug=COALESCE(?,slug), label=COALESCE(?,label),
       description=COALESCE(?,description), nav_path=COALESCE(?,nav_path),
       sort_order=COALESCE(?,sort_order), show_in_header=COALESCE(?,show_in_header),
       is_active=COALESCE(?,is_active), updated_at=NOW() WHERE id=?`,
      [slug, label, description, nav_path, sort_order, show_in_header, is_active, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_blog_menus WHERE id = ?', [req.params.id]);
    return ok(res, row);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

admin.get('/categories', async (req, res) => {
  const menuId = req.query.menu_id;
  let sql = 'SELECT c.*, m.slug AS menu_slug, m.label AS menu_label FROM portal_blog_categories c JOIN portal_blog_menus m ON m.id = c.menu_id';
  const params = [];
  if (menuId) { sql += ' WHERE c.menu_id = ?'; params.push(menuId); }
  sql += ' ORDER BY c.menu_id, c.sort_order, c.name';
  const [rows] = await pool.query(sql, params);
  const byMenu = {};
  for (const row of rows) {
    if (!byMenu[row.menu_id]) byMenu[row.menu_id] = { menu_slug: row.menu_slug, menu_label: row.menu_label, tree: [] };
  }
  const menus = [...new Set(rows.map(r => r.menu_id))];
  const result = menus.map(mid => {
    const menuRows = rows.filter(r => r.menu_id === mid);
    return {
      menu_id: mid,
      menu_slug: menuRows[0]?.menu_slug,
      menu_label: menuRows[0]?.menu_label,
      flat: menuRows,
      tree: buildCategoryTree(menuRows, null),
    };
  });
  return ok(res, result);
});

admin.post('/categories', async (req, res) => {
  const { menu_id, parent_id, slug, name, description, nav_label, nav_visibility, sort_order, is_active } = req.body;
  if (!menu_id || !name) return fail(res, 'menu_id and name required', 422);
  const catSlug = slug || slugify(name);
  try {
    const [r] = await pool.query(
      `INSERT INTO portal_blog_categories (menu_id, parent_id, slug, name, description, nav_label, nav_visibility, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [menu_id, parent_id || null, catSlug, name, description || null, nav_label || null, nav_visibility || 'hub_only', sort_order ?? 0, is_active !== false]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_blog_categories WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug exists in this menu', 409);
    return fail(res, 'Server error', 500);
  }
});

admin.put('/categories/:id', async (req, res) => {
  const { parent_id, slug, name, description, nav_label, nav_visibility, sort_order, is_active } = req.body;
  if (Number(parent_id) === Number(req.params.id)) return fail(res, 'Category cannot be its own parent', 422);
  try {
    await pool.query(
      `UPDATE portal_blog_categories SET parent_id=?, slug=COALESCE(?,slug), name=COALESCE(?,name),
       description=COALESCE(?,description), nav_label=COALESCE(?,nav_label),
       nav_visibility=COALESCE(?,nav_visibility), sort_order=COALESCE(?,sort_order),
       is_active=COALESCE(?,is_active), updated_at=NOW() WHERE id=?`,
      [parent_id ?? null, slug, name, description, nav_label, nav_visibility, sort_order, is_active, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_blog_categories WHERE id = ?', [req.params.id]);
    return ok(res, row);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

admin.delete('/categories/:id', async (req, res) => {
  const [[{ cnt }]] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM portal_blog_categories WHERE parent_id = ?',
    [req.params.id]
  );
  if (Number(cnt) > 0) return fail(res, 'Remove child categories first', 422);
  await pool.query('UPDATE portal_blog_posts SET category_id = NULL WHERE category_id = ?', [req.params.id]);
  await pool.query('DELETE FROM portal_blog_categories WHERE id = ?', [req.params.id]);
  return ok(res, null, 'Deleted');
});

admin.get('/tags', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM portal_blog_tags ORDER BY name');
  return ok(res, rows);
});

admin.post('/tags', async (req, res) => {
  const { name, slug } = req.body;
  if (!name) return fail(res, 'name required', 422);
  try {
    const [r] = await pool.query(
      'INSERT INTO portal_blog_tags (slug, name) VALUES (?, ?)',
      [slug || slugify(name), name]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_blog_tags WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug exists', 409);
    return fail(res, 'Server error', 500);
  }
});

admin.get('/posts', async (req, res) => {
  const { menu_id, category_id, status, post_type, q, page = 1, per_page = 20 } = req.query;
  let where = '1=1';
  const params = [];
  if (menu_id) { where += ' AND p.menu_id = ?'; params.push(menu_id); }
  if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  if (post_type) { where += ' AND p.post_type = ?'; params.push(post_type); }
  if (q) {
    where += ' AND (p.title ILIKE ? OR p.excerpt ILIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  const offset = (Math.max(1, page) - 1) * per_page;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM portal_blog_posts p WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT p.*, m.slug AS menu_slug, m.label AS menu_label, c.name AS category_name, c.slug AS category_slug
     FROM portal_blog_posts p
     JOIN portal_blog_menus m ON m.id = p.menu_id
     LEFT JOIN portal_blog_categories c ON c.id = p.category_id
     WHERE ${where}
     ORDER BY p.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(per_page), offset]
  );
  return ok(res, { data: rows, pagination: paginationMeta(total, page, per_page) });
});

admin.get('/posts/:id', async (req, res) => {
  const [[post]] = await pool.query(
    `SELECT p.*, m.slug AS menu_slug FROM portal_blog_posts p
     JOIN portal_blog_menus m ON m.id = p.menu_id WHERE p.id = ?`,
    [req.params.id]
  );
  if (!post) return fail(res, 'Not found', 404);
  const blocks = await loadPostBlocks(post.id);
  const tags = await loadPostTags(post.id);
  const [relatedIds] = await pool.query(
    'SELECT related_post_id FROM portal_blog_post_relations WHERE post_id = ? ORDER BY sort_order',
    [post.id]
  );
  return ok(res, {
    post,
    blocks,
    tags,
    related_post_ids: relatedIds.map(r => r.related_post_id),
  });
});

admin.post('/posts', async (req, res) => {
  const {
    menu_id, category_id, slug, title, excerpt, body, post_type, featured_image_path,
    status, is_featured, published_at, meta_title, meta_description, sort_order,
    tag_ids, blocks, related_post_ids,
  } = req.body;
  if (!menu_id || !title) return fail(res, 'menu_id and title required', 422);
  const postSlug = slug || slugify(title);
  const postStatus = status || 'draft';
  try {
    const [r] = await pool.query(
      `INSERT INTO portal_blog_posts
         (uuid, menu_id, category_id, slug, title, excerpt, body, post_type, featured_image_path,
          status, is_featured, author_id, published_at, meta_title, meta_description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(), menu_id, category_id || null, postSlug, title, excerpt || null, body || null,
        post_type || 'news', featured_image_path || null, postStatus, !!is_featured, req.user?.id || null,
        postStatus === 'published' ? (published_at || new Date()) : null,
        meta_title || null, meta_description || null, sort_order ?? 0,
      ]
    );
    const postId = r.insertId;
    await replacePostTags(postId, tag_ids);
    await replacePostBlocks(postId, blocks);
    await replacePostRelations(postId, related_post_ids);
    const [[post]] = await pool.query('SELECT * FROM portal_blog_posts WHERE id = ?', [postId]);
    return ok(res, post, 'Created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug exists in menu', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

admin.put('/posts/:id', async (req, res) => {
  const {
    category_id, slug, title, excerpt, body, post_type, featured_image_path,
    status, is_featured, published_at, meta_title, meta_description, sort_order,
    tag_ids, blocks, related_post_ids,
  } = req.body;
  try {
    const [[existing]] = await pool.query('SELECT status FROM portal_blog_posts WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 'Not found', 404);

    let pubAt = published_at;
    if (status === 'published' && existing.status !== 'published' && !pubAt) pubAt = new Date();

    await pool.query(
      `UPDATE portal_blog_posts SET
         category_id=COALESCE(?,category_id), slug=COALESCE(?,slug), title=COALESCE(?,title),
         excerpt=COALESCE(?,excerpt), body=COALESCE(?,body), post_type=COALESCE(?,post_type),
         featured_image_path=COALESCE(?,featured_image_path), status=COALESCE(?,status),
         is_featured=COALESCE(?,is_featured), published_at=COALESCE(?,published_at),
         meta_title=COALESCE(?,meta_title), meta_description=COALESCE(?,meta_description),
         sort_order=COALESCE(?,sort_order), updated_at=NOW()
       WHERE id=?`,
      [
        category_id, slug, title, excerpt, body, post_type, featured_image_path,
        status, is_featured, pubAt, meta_title, meta_description, sort_order, req.params.id,
      ]
    );
    if (tag_ids !== undefined) await replacePostTags(req.params.id, tag_ids);
    if (blocks !== undefined) await replacePostBlocks(req.params.id, blocks);
    if (related_post_ids !== undefined) await replacePostRelations(req.params.id, related_post_ids);

    const [[post]] = await pool.query('SELECT * FROM portal_blog_posts WHERE id = ?', [req.params.id]);
    return ok(res, post);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

admin.delete('/posts/:id', async (req, res) => {
  await pool.query('DELETE FROM portal_blog_posts WHERE id = ?', [req.params.id]);
  return ok(res, null, 'Deleted');
});

admin.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) return fail(res, 'No file', 422);
  return ok(res, { path: `/uploads/photos/${req.file.filename}` });
});

router.use('/admin', admin);

module.exports = router;
