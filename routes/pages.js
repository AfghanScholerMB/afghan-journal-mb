const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
	const latest = db.prepare(`
		SELECT d.id, d.title, d.authors, d.year, c.name AS category, d.document_type
		FROM documents d JOIN categories c ON c.id = d.category_id
		WHERE d.status='APPROVED'
		ORDER BY d.created_at DESC
		LIMIT 6
	`).all();

	const top = db.prepare(`
		SELECT d.id, d.title, d.authors, d.year, c.name AS category, d.document_type, d.downloads_count
		FROM documents d JOIN categories c ON c.id = d.category_id
		WHERE d.status='APPROVED'
		ORDER BY d.downloads_count DESC
		LIMIT 6
	`).all();

	const categories = db.prepare("SELECT id, name, slug FROM categories ORDER BY name").all();
	res.render("home", { latest, top, categories });
});

router.get("/about", (req, res) => res.render("about"));
router.get("/terms", (req, res) => res.render("terms"));
router.get("/privacy", (req, res) => res.render("privacy"));

router.get("/contact", (req, res) => res.render("contact", { ok: false, error: null }));
router.post("/contact", (req, res) => {
	const { name, email, message } = req.body;
	if (!name || !email || !message) return res.render("contact", { ok: false, error: "All fields are required." });
	db.prepare("INSERT INTO contact_messages(name, email, message) VALUES (?, ?, ?)").run(name, email, message);
	res.render("contact", { ok: true, error: null });
});

router.get("/profile", (req, res) => {
	if (!res.locals.user) return res.redirect("/login");

	const myUploads = db.prepare(`
		SELECT d.*, c.name AS category
		FROM documents d JOIN categories c ON c.id=d.category_id
		WHERE d.uploader_id=?
		ORDER BY d.created_at DESC
	`).all(res.locals.user.id);

	const bookmarks = db.prepare(`
		SELECT d.id, d.title, d.authors, d.year, c.name AS category, d.document_type
		FROM bookmarks b
		JOIN documents d ON d.id=b.document_id
		JOIN categories c ON c.id=d.category_id
		WHERE b.user_id=? AND d.status='APPROVED'
		ORDER BY b.created_at DESC
	`).all(res.locals.user.id);

	res.render("profile", { myUploads, bookmarks });
});

module.exports = router;
