const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── GET /api/forms/slug/:slug  PUBLIC – for frontend rendering (no auth) ──
router.get('/slug/:slug', async (req, res) => {
  try {
    const [forms] = await pool.query(
      'SELECT * FROM fb_forms WHERE slug = ? AND is_active = 1',
      [req.params.slug]
    );
    if (!forms.length) return fail(res, 'Form not found', 404);

    const form = forms[0];
    const [sections] = await pool.query(
      'SELECT * FROM fb_sections WHERE form_id = ? AND is_active = 1 ORDER BY section_order, id',
      [form.id]
    );
    for (const section of sections) {
      const [fields] = await pool.query(
        'SELECT * FROM fb_fields WHERE section_id = ? AND is_active = 1 ORDER BY field_order, id',
        [section.id]
      );
      for (const field of fields) {
        const [options] = await pool.query(
          'SELECT * FROM fb_field_options WHERE field_id = ? AND is_active = 1 ORDER BY opt_order',
          [field.id]
        );
        field.options = options;
        if (field.options_source === 'dropdown_group' && field.options_group_id) {
          const [groupOptions] = await pool.query(
            'SELECT label, value FROM fb_dropdown_items WHERE group_id = ? AND is_active = 1 ORDER BY item_order',
            [field.options_group_id]
          );
          field.options = groupOptions;
        }
        if (field.has_condition) {
          const [conds] = await pool.query(
            `SELECT c.action, c.logic, r.watch_field_id, r.operator, r.value, wf.field_key AS watch_field_key
             FROM fb_field_conditions c
             JOIN fb_condition_rules r ON r.condition_id = c.id
             JOIN fb_fields wf ON wf.id = r.watch_field_id
             WHERE c.field_id = ?`,
            [field.id]
          );
          field.conditions = conds;
        }
      }
      section.fields = fields;
    }
    form.sections = sections;
    return ok(res, form);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// All routes below require auth
router.use(authMiddleware);

// ── GET /api/forms  List all forms
router.get('/', async (req, res) => {
  try {
    const [forms] = await pool.query(
      `SELECT f.*, u.full_name AS created_by_name,
         (SELECT COUNT(*) FROM fb_sections s WHERE s.form_id = f.id AND s.is_active = 1) AS section_count,
         (SELECT COUNT(*) FROM fb_fields fi WHERE fi.form_id = f.id AND fi.is_active = 1) AS field_count,
         (SELECT COUNT(*) FROM fb_submissions sub WHERE sub.form_id = f.id) AS submission_count
       FROM fb_forms f
       LEFT JOIN portal_admin_users u ON u.id = f.created_by
       ORDER BY f.created_at DESC`
    );
    return ok(res, forms);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── POST /api/forms  Create form
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, slug, description, form_type, is_multi_step = 1, allow_draft = 1, submit_label, success_message } = req.body;
  if (!name || !slug) return fail(res, 'Name and slug required', 422);

  try {
    const uuid = uuidv4();
    const [result] = await pool.query(
      `INSERT INTO fb_forms (uuid, name, slug, description, form_type, is_multi_step, allow_draft, submit_label, success_message, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid, name, slug, description, form_type || 'membership_application', is_multi_step, allow_draft, submit_label || 'Submit', success_message, req.user.id]
    );
    const [form] = await pool.query('SELECT * FROM fb_forms WHERE id = ?', [result.insertId]);
    return ok(res, form[0], 'Form created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Slug already exists', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── GET /api/forms/:id  Get single form with sections + fields
router.get('/:id', async (req, res) => {
  try {
    const [forms] = await pool.query('SELECT * FROM fb_forms WHERE id = ?', [req.params.id]);
    if (!forms.length) return fail(res, 'Form not found', 404);

    const form = forms[0];
    const [sections] = await pool.query(
      'SELECT * FROM fb_sections WHERE form_id = ? ORDER BY section_order, id',
      [form.id]
    );

    for (const section of sections) {
      const [fields] = await pool.query(
        'SELECT * FROM fb_fields WHERE section_id = ? AND is_active = 1 ORDER BY field_order, id',
        [section.id]
      );
      for (const field of fields) {
        const [options] = await pool.query(
          'SELECT * FROM fb_field_options WHERE field_id = ? AND is_active = 1 ORDER BY opt_order, id',
          [field.id]
        );
        field.options = options;

        if (field.has_condition) {
          const [conds] = await pool.query(
            `SELECT c.*, r.watch_field_id, r.operator, r.value, wf.field_key AS watch_field_key, wf.label AS watch_field_label
             FROM fb_field_conditions c
             JOIN fb_condition_rules r ON r.condition_id = c.id
             JOIN fb_fields wf ON wf.id = r.watch_field_id
             WHERE c.field_id = ?`,
            [field.id]
          );
          field.conditions = conds;
        }
      }
      section.fields = fields;
    }

    form.sections = sections;
    return ok(res, form);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUT /api/forms/:id  Update form
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, slug, description, form_type, is_active, is_multi_step, allow_draft, submit_label, success_message } = req.body;
  try {
    await pool.query(
      `UPDATE fb_forms SET name=?, slug=?, description=?, form_type=?, is_active=?, is_multi_step=?, allow_draft=?, submit_label=?, success_message=?, updated_at=NOW()
       WHERE id=?`,
      [name, slug, description, form_type, is_active, is_multi_step, allow_draft, submit_label, success_message, req.params.id]
    );
    const [form] = await pool.query('SELECT * FROM fb_forms WHERE id = ?', [req.params.id]);
    return ok(res, form[0], 'Form updated');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── DELETE /api/forms/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_forms WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Form deleted');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── POST /api/forms/:id/seed-sections  Seed membership application template
// Idempotent – returns 409 if sections already exist
router.post('/:id/seed-sections', requireRole('super_admin', 'admin'), async (req, res) => {
  const formId = req.params.id;
  try {
    const [forms] = await pool.query('SELECT * FROM fb_forms WHERE id = ?', [formId]);
    if (!forms.length) return fail(res, 'Form not found', 404);

    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM fb_sections WHERE form_id = ?', [formId]
    );
    if (cnt > 0) return fail(res, `Form already has ${cnt} section(s). Delete existing sections before re-seeding.`, 409);

    const SECTIONS = [
      {
        title: 'Basic Details', description: 'Your personal and contact information',
        icon: 'user', section_order: 0,
        fields: [
          { field_key: 'profile_photo',      label: 'Profile Photo',                  field_type: 'image',    is_required: 0, field_order: 0, col_width: 'full',  help_text: 'Upload a clear profile photo', options: [] },
          { field_key: 'full_name',           label: 'Full Name',                      field_type: 'text',     is_required: 1, field_order: 1, col_width: 'half',  placeholder: 'Enter your full name', options: [] },
          { field_key: 'email',               label: 'Email Address',                  field_type: 'email',    is_required: 1, field_order: 2, col_width: 'half',  placeholder: 'your@email.com', options: [] },
          { field_key: 'phone',               label: 'Phone Number',                   field_type: 'phone',    is_required: 1, field_order: 3, col_width: 'half',  placeholder: '+91 9876543210', options: [] },
          { field_key: 'gender',              label: 'Gender',                         field_type: 'dropdown', is_required: 0, field_order: 4, col_width: 'half',  options: [
            { label: 'Male',              value: 'male',              opt_order: 0 },
            { label: 'Female',            value: 'female',            opt_order: 1 },
            { label: 'Other',             value: 'other',             opt_order: 2 },
            { label: 'Prefer not to say', value: 'prefer_not_to_say', opt_order: 3 },
          ]},
          { field_key: 'aadhaar_number',      label: 'Aadhaar Number',                 field_type: 'aadhaar',  is_required: 0, field_order: 5, col_width: 'half',  placeholder: '12-digit Aadhaar', help_text: '12-digit Aadhaar number (India only)', options: [] },
          { field_key: 'pin_code',            label: 'PIN Code',                       field_type: 'text',     is_required: 0, field_order: 6, col_width: 'half',  placeholder: '6-digit PIN code', options: [] },
          { field_key: 'organisation_name',   label: 'Organisation / Company Name',    field_type: 'text',     is_required: 0, field_order: 7, col_width: 'full',  placeholder: 'Optional – leave blank if not applicable', options: [] },
          { field_key: 'social_links',        label: 'Social Media Links',             field_type: 'textarea', is_required: 0, field_order: 8, col_width: 'full',  placeholder: 'https://linkedin.com/in/yourname', help_text: 'Enter one social media link per line', options: [] },
        ],
      },
      {
        title: 'Location', description: 'Where are you based?',
        icon: 'map-pin', section_order: 1,
        fields: [
          { field_key: 'is_overseas', label: 'Are you based overseas?', field_type: 'radio', is_required: 0, field_order: 0, col_width: 'full', options: [
            { label: '🇮🇳 No — I\'m in India', value: '0', opt_order: 0 },
            { label: '🌍 Yes — I\'m Overseas',  value: '1', opt_order: 1 },
          ]},
          { field_key: 'country_id', label: 'Country',          field_type: 'country', is_required: 0, field_order: 1, col_width: 'half', options: [] },
          { field_key: 'state_id',   label: 'State / Province', field_type: 'state',   is_required: 0, field_order: 2, col_width: 'half', options: [] },
          { field_key: 'city_id',    label: 'City / District',  field_type: 'city',    is_required: 0, field_order: 3, col_width: 'half', options: [] },
        ],
      },
      {
        title: 'Membership Type', description: 'Select the membership category that best applies to you',
        icon: 'users', section_order: 2,
        fields: [
          { field_key: 'membership_type', label: 'Membership Type', field_type: 'radio', is_required: 1, field_order: 0, col_width: 'full', options: [
            { label: 'Individual – For professionals, students, and independent practitioners', value: 'individual', opt_order: 0 },
            { label: 'Corporate – For companies, organisations, and institutions',              value: 'corporate',  opt_order: 1 },
          ]},
        ],
      },
      {
        title: 'Plan & Package', description: 'Choose your preferred plan duration',
        icon: 'credit-card', section_order: 3,
        fields: [
          { field_key: 'plan_type', label: 'Membership Plan', field_type: 'radio', is_required: 1, field_order: 0, col_width: 'full', options: [
            { label: '📅 Yearly Membership – Renew annually, great flexibility',    value: 'yearly',   opt_order: 0 },
            { label: '♾️ Lifetime Membership – One-time payment, lifelong access',  value: 'lifetime', opt_order: 1 },
          ]},
        ],
      },
      {
        title: 'Payment', description: 'Complete your payment and enter transaction details',
        icon: 'check-circle', section_order: 4,
        fields: [
          { field_key: 'payment_method_id',   label: 'Payment Method',              field_type: 'payment_method', is_required: 1, field_order: 0, col_width: 'full', options: [] },
          { field_key: 'transaction_id',      label: 'Transaction / Reference ID',  field_type: 'transaction_id', is_required: 1, field_order: 1, col_width: 'full', placeholder: 'e.g. UPI123456789 / NEFT ref no.', options: [] },
          { field_key: 'payment_screenshot',  label: 'Payment Screenshot',          field_type: 'image',          is_required: 1, field_order: 2, col_width: 'full', help_text: 'Upload a screenshot or photo of your payment confirmation', options: [] },
          { field_key: 'terms_accepted',      label: 'Declaration & Terms',         field_type: 'checkbox',       is_required: 1, field_order: 3, col_width: 'full', options: [
            { label: 'I confirm that the payment has been made and the details provided are accurate. I agree to the terms and conditions of FORTI membership.', value: '1', opt_order: 0 },
          ]},
        ],
      },
    ];

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      for (const sec of SECTIONS) {
        const [secRes] = await conn.query(
          'INSERT INTO fb_sections (form_id, title, description, icon, section_order, is_active) VALUES (?,?,?,?,?,1)',
          [formId, sec.title, sec.description || null, sec.icon || 'document', sec.section_order]
        );
        const sectionId = secRes.insertId;

        for (const field of sec.fields) {
          const [fRes] = await conn.query(
            `INSERT INTO fb_fields
               (form_id, section_id, field_key, label, field_type, placeholder, help_text,
                is_required, is_active, field_order, col_width, options_source)
             VALUES (?,?,?,?,?,?,?,?,1,?,?,'manual')`,
            [formId, sectionId, field.field_key, field.label, field.field_type,
             field.placeholder || null, field.help_text || null,
             field.is_required || 0, field.field_order, field.col_width || 'full']
          );
          const fieldId = fRes.insertId;

          for (const opt of (field.options || [])) {
            await conn.query(
              'INSERT INTO fb_field_options (field_id, label, value, opt_order, is_active) VALUES (?,?,?,?,1)',
              [fieldId, opt.label, opt.value, opt.opt_order || 0]
            );
          }
        }
      }
      await conn.commit();
      conn.release();
      return ok(res, null, 'Membership application template seeded: 5 sections, all fields created');
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
