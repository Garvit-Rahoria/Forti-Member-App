const { pool } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const posts = [
    {
      menu_id: 1,
      category_id: 1, // News
      slug: 'forti-annual-summit-2026',
      title: 'FORTI Announces Annual Trade & Investment Summit 2026 in Jaipur',
      excerpt: 'The Federation of Rajasthan Trade and Industry (FORTI) is proud to announce its upcoming Annual Trade & Investment Summit, bringing together top industry leaders.',
      body: '<p>The Federation of Rajasthan Trade and Industry (FORTI) is proud to announce its upcoming Annual Trade & Investment Summit, which will take place in Jaipur later this year. The summit will bring together top industry leaders, government officials, and international investors to discuss the future of manufacturing, trade, and exports in the region.</p><p>Keynote speakers include prominent figures from the Ministry of Commerce and leaders of top global corporations. Registration opens next month.</p>',
      post_type: 'news',
      status: 'published',
      is_featured: true,
      meta_title: 'FORTI Annual Trade Summit 2026',
      meta_description: 'Join the FORTI Annual Trade & Investment Summit 2026 in Jaipur. Network with industry leaders and explore new business opportunities.',
    },
    {
      menu_id: 1,
      category_id: 2, // Industry Updates
      slug: 'renewable-energy-growth-rajasthan',
      title: 'Rajasthan Emerges as the Top Destination for Renewable Energy Investments',
      excerpt: 'Recent reports indicate a massive surge in solar and wind energy investments in Rajasthan, solidifying its position as India’s renewable energy powerhouse.',
      body: '<p>Rajasthan continues to lead the nation in renewable energy adoption. With its vast desert landscapes and high solar irradiation, the state has attracted billions in investments over the past year. Several mega solar parks have been commissioned, creating thousands of jobs and driving down the cost of clean energy.</p><p>FORTI is actively working with the state government to simplify the land acquisition process for new solar projects and provide subsidies for MSMEs adopting green energy solutions.</p>',
      post_type: 'article',
      status: 'published',
      is_featured: true,
      meta_title: 'Renewable Energy Growth in Rajasthan',
      meta_description: 'Discover how Rajasthan is leading India’s renewable energy sector with massive investments in solar and wind power.',
    },
    {
      menu_id: 1,
      category_id: 3, // Tax & Regulatory
      slug: 'gst-compliance-changes-msme-2026',
      title: 'New GST Compliance Guidelines for MSMEs in 2026',
      excerpt: 'The Ministry of Finance has introduced several key changes to GST filing requirements for MSMEs. Here is what you need to know.',
      body: '<p>Effective April 2026, the Ministry of Finance has rolled out updated GST compliance guidelines specifically targeted at Micro, Small, and Medium Enterprises (MSMEs). The changes aim to reduce the compliance burden by allowing quarterly filings for businesses with a turnover of up to ₹10 Crores.</p><p>However, new e-invoicing mandates will apply to B2B transactions above ₹2 Crores. FORTI urges all members to consult their financial advisors and update their accounting software accordingly.</p>',
      post_type: 'alert',
      status: 'published',
      is_featured: false,
      meta_title: 'GST Compliance Changes MSME 2026',
      meta_description: 'Stay updated on the latest GST compliance changes for MSMEs in 2026. Learn about quarterly filing limits and e-invoicing mandates.',
    },
    {
      menu_id: 1,
      category_id: 1, // News
      slug: 'forti-delegation-visits-uae',
      title: 'FORTI Delegation Explores Export Opportunities in the UAE',
      excerpt: 'A high-level delegation from FORTI recently concluded a successful 5-day trade mission to Dubai and Abu Dhabi.',
      body: '<p>Last week, a high-level delegation from the Federation of Rajasthan Trade and Industry (FORTI) visited the UAE to explore new export opportunities for Rajasthani handicrafts, textiles, and agricultural products. The delegation met with the Dubai Chamber of Commerce and several prominent retail groups.</p><p>The visit concluded with the signing of three major MoUs that are expected to boost state exports by over 15% in the coming fiscal year.</p>',
      post_type: 'news',
      status: 'published',
      is_featured: false,
      meta_title: 'FORTI UAE Trade Delegation',
      meta_description: 'A recent FORTI delegation visited the UAE to explore export opportunities, resulting in three major MoUs to boost Rajasthani trade.',
    }
  ];

  for (const p of posts) {
    try {
      await pool.query(
        `INSERT INTO portal_blog_posts 
        (uuid, menu_id, category_id, slug, title, excerpt, body, post_type, status, is_featured, author_id, published_at, view_count, meta_title, meta_description, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), 0, $12, $13, NOW(), NOW())`,
        [uuidv4(), p.menu_id, p.category_id, p.slug, p.title, p.excerpt, p.body, p.post_type, p.status, p.is_featured, 1, p.meta_title, p.meta_description]
      );
      console.log(`Inserted post: ${p.title}`);
    } catch(e) {
      console.error(e.message);
    }
  }

  // Delete the old dummy post
  await pool.query("DELETE FROM portal_blog_posts WHERE title = 'forti is orgnising a event at delhi '");
  console.log('Deleted old test post.');
  process.exit(0);
}

seed();
