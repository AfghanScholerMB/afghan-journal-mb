const express = require("express");
const db = require("../db");

const router = express.Router();

/**
 * HOME
 */
router.get("/", (req, res) => {
  try {
    const latest = db
      .prepare(`
        SELECT
          d.*,
          u.name AS uploader_name,
          COALESCE(c.name, d.category) AS category_name
        FROM documents d
        LEFT JOIN users u ON u.id = d.uploaded_by
        LEFT JOIN categories c ON c.slug = d.category OR c.name = d.category
        WHERE d.status = 'approved'
        ORDER BY d.created_at DESC
        LIMIT 10
      `)
      .all();

    const top = db
      .prepare(`
        SELECT
          d.id,
          d.title,
          d.authors,
          d.year,
          COALESCE(c.name, d.category) AS category,
          d.document_type,
          d.downloads_count
        FROM documents d
        LEFT JOIN categories c ON c.slug = d.category OR c.name = d.category
        WHERE d.status = 'approved'
        ORDER BY d.downloads_count DESC
        LIMIT 6
      `)
      .all();

    const categories = db
      .prepare(`SELECT id, name, slug FROM categories ORDER BY name`)
      .all();

    res.render("home", {
      user: req.session?.user || null,
      latest,
      top,
      categories,
    });
  } catch (err) {
    console.error("Home page error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * BROWSE
 * Optional filters: ?category=engineering  and/or  ?type=article
 */
router.get("/browse", (req, res) => {
  try {
    const { category, type, q } = req.query;

    let where = "WHERE d.status = 'approved'";
    const params = {};

    if (category && category.trim()) {
      where += " AND (d.category = @category OR EXISTS (SELECT 1 FROM categories c WHERE (c.slug = @category OR c.name = @category) AND (c.slug = d.category OR c.name = d.category)))";
      params.category = category.trim();
    }

    if (type && type.trim()) {
      where += " AND d.document_type = @type";
      params.type = type.trim();
    }

    if (q && q.trim()) {
      where += `
        AND (
          d.title LIKE @q
          OR d.authors LIKE @q
          OR d.abstract LIKE @q
          OR d.keywords LIKE @q
        )
      `;
      params.q = `%${q.trim()}%`;
    }

    const docs = db
      .prepare(`
        SELECT
          d.*,
          u.name AS uploader_name,
          COALESCE(c.name, d.category) AS category_name
        FROM documents d
        LEFT JOIN users u ON u.id = d.uploaded_by
        LEFT JOIN categories c ON c.slug = d.category OR c.name = d.category
        ${where}
        ORDER BY d.created_at DESC
      `)
      .all(params);

    const categories = db
      .prepare(`SELECT id, name, slug FROM categories ORDER BY name`)
      .all();

    res.render("browse", {
      user: req.session?.user || null,
      docs,
      categories,
      filters: { category: category || "", type: type || "", q: q || "" },
    });
  } catch (err) {
    console.error("Browse error:", err);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * ABOUT
 */
router.get("/about", (req, res) => {
  res.render("about", { user: req.session?.user || null });
});

/**
 * CONTACT
 */
router.get("/contact", (req, res) => {
  res.render("contact", { user: req.session?.user || null });
});

module.exports = router;