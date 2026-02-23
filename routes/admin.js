const express = require("express");
const db = require("../db");

const router = express.Router();

function requireMod(req, res, next) {
	const u = res.locals.user;
	if (!u) return res.redirect("/login");
	if (u.role !== "admin" && u.role !== "moderator") return res.status(403).send("Forbidden");
	next();
}

router.get("/admin", requireMod, (req, res) => {
	const counts = {
		users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
		docs: db.prepare("SELECT COUNT(*) AS c FROM documents").get().c,
		pending: db.prepare("SELECT COUNT(*) AS c FROM documents WHERE status='PENDING'").get().c
	};

	const pendingDocs = db
		.prepare(`
			SELECT d.id, d.title, d.authors, d.created_at, u.name AS uploader, c.name AS category
			FROM documents d
			JOIN users u ON u.id=d.uploader_id
			JOIN categories c ON c.id=d.category_id
			WHERE d.status='PENDING'
			ORDER BY d.created_at DESC
			LIMIT 20
		`)
		.all();

	const categories = db.prepare("SELECT * FROM categories ORDER BY name").all();
	const users = db.prepare("SELECT id, name, email, role, is_banned, created_at FROM users ORDER BY created_at DESC LIMIT 50").all();

	res.render("admin", { counts, pendingDocs, categories, users, error: null, ok: null });
});

router.post("/admin/docs/:id/approve", requireMod, (req, res) => {
	db.prepare("UPDATE documents SET status='APPROVED', reject_reason=NULL WHERE id=?").run(Number(req.params.id));
	res.redirect("/admin");
});

router.post("/admin/docs/:id/reject", requireMod, (req, res) => {
	const reason = (req.body.reason || "").trim();
	if (!reason) return res.status(400).send("Reject reason required.");
	db.prepare("UPDATE documents SET status='REJECTED', reject_reason=? WHERE id=?").run(reason, Number(req.params.id));
	res.redirect("/admin");
});

router.post("/admin/categories/add", requireMod, (req, res) => {
	const name = (req.body.name || "").trim();
	if (!name) return res.redirect("/admin");
	const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	db.prepare("INSERT OR IGNORE INTO categories(name, slug) VALUES (?, ?)").run(name, slug);
	res.redirect("/admin");
});

router.post("/admin/users/:id/ban", requireMod, (req, res) => {
	db.prepare("UPDATE users SET is_banned=1 WHERE id=?").run(Number(req.params.id));
	res.redirect("/admin");
});
router.post("/admin/users/:id/unban", requireMod, (req, res) => {
	db.prepare("UPDATE users SET is_banned=0 WHERE id=?").run(Number(req.params.id));
	res.redirect("/admin");
});
router.post("/admin/users/:id/role", requireMod, (req, res) => {
	const role = req.body.role;
	if (!["user", "moderator", "admin"].includes(role)) return res.redirect("/admin");
	db.prepare("UPDATE users SET role=? WHERE id=?").run(role, Number(req.params.id));
	res.redirect("/admin");
});

module.exports = router;
