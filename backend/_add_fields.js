const { pool } = require('./src/config/database');

(async () => {
  try {
    const formId = 1;
    const sectionId = 1; // Basic Details

    // Check what already exists
    const [existing] = await pool.query(
      'SELECT field_key FROM fb_fields WHERE form_id=? AND section_id=?',
      [formId, sectionId]
    );
    const existingKeys = existing.map(r => r.field_key);
    console.log('Existing keys:', existingKeys);

    const fieldsToAdd = [];

    // date_of_birth after social_links (order 9)
    if (!existingKeys.includes('date_of_birth')) {
      fieldsToAdd.push({
        form_id: formId,
        section_id: sectionId,
        field_key: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: 1,
        field_order: 9,
        col_width: 'half',
        placeholder: 'Select date of birth',
        config: JSON.stringify({})
      });
    }

    // organisation_type (order 10)
    if (!existingKeys.includes('organisation_type')) {
      fieldsToAdd.push({
        form_id: formId,
        section_id: sectionId,
        field_key: 'organisation_type',
        label: 'Organisation Type',
        type: 'dropdown',
        required: 1,
        field_order: 10,
        col_width: 'half',
        placeholder: 'Select organisation type',
        config: JSON.stringify({})
      });
    }

    // organisation_logo (order 11)
    if (!existingKeys.includes('organisation_logo')) {
      fieldsToAdd.push({
        form_id: formId,
        section_id: sectionId,
        field_key: 'organisation_logo',
        label: 'Organisation Logo',
        type: 'image',
        required: 0,
        field_order: 11,
        col_width: 'full',
        placeholder: 'Upload organisation logo',
        config: JSON.stringify({ accept: 'image/*', maxSize: 5 })
      });
    }

    if (fieldsToAdd.length === 0) {
      console.log('All fields already exist! Nothing to add.');
      process.exit(0);
    }

    for (const f of fieldsToAdd) {
      const [result] = await pool.query('INSERT INTO fb_fields SET ?', f);
      console.log(`Added field: ${f.field_key} (id: ${result.insertId})`);

      // Add dropdown options for organisation_type
      if (f.field_key === 'organisation_type') {
        const options = [
          'Pvt Ltd', 'LLP', 'Partnership', 'Proprietorship',
          'Trust', 'Society', 'Government', 'Other'
        ];
        for (let i = 0; i < options.length; i++) {
          await pool.query('INSERT INTO fb_field_options SET ?', {
            field_id: result.insertId,
            label: options[i],
            value: options[i].toLowerCase().replace(/\s+/g, '_'),
            option_order: i
          });
        }
        console.log(`  Added ${options.length} dropdown options for organisation_type`);
      }
    }

    console.log('\nDone! Added', fieldsToAdd.length, 'fields.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
