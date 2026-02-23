const express = require("express");
const path = require("path");
const multer = require("multer");
const { nanoid } = require("nanoid");
const db = require("../db");

const router = express.Router();

function requireLogin(req, res, next) {
	if (!res.locals.user) return res.redirect("/login");
	next();
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
	filename: (req, file, cb) => cb(null, `${Date.now()}-${nanoid(10)}.pdf`)
});

const upload = multer({
	storage,
	limits: { fileSize: 25 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype !== "application/pdf") return cb(new Error("Only PDF files allowed."));
		cb(null, true);
	}
});

router.get("/browse", (req, res) => {
	const q = (req.query.q || "").trim();
	const category = req.query.category || "";
	const type = req.query.type || "";
	const language = req.query.language || "";
	const sort = req.query.sort || "newest";
	const page = Math.max(1, parseInt(req.query.page || "1", 10));
	const pageSize = 10;
	const offset = (page - 1) * pageSize;

	const where = ["d.status='APPROVED'"];
	const params = [];

	if (q) {
		where.push("(d.title LIKE ? OR d.authors LIKE ? OR d.abstract LIKE ? OR d.keywords LIKE ?)");
		params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
	}
	if (category) {
		where.push("c.slug=?");
		params.push(category);
	}
	if (type) {
		where.push("d.document_type=?");
		params.push(type);
	}
	if (language) {
		where.push("d.language=?");
		params.push(language);
	}

	let orderBy = "d.created_at DESC";
	if (sort === "most_viewed") orderBy = "d.views_count DESC";
	if (sort === "most_downloaded") orderBy = "d.downloads_count DESC";

	const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
	const total = db
		.prepare(`
			SELECT COUNT(*) AS cnt
			FROM documents d JOIN categories c ON c.id=d.category_id
			${whereSql}
		`)
		.get(...params).cnt;

	const docs = db
		.prepare(`
			SELECT d.id, d.title, d.authors, d.year, d.language, d.document_type, c.name AS category, c.slug
			FROM documents d JOIN categories c ON c.id=d.category_id
			${whereSql}
			ORDER BY ${orderBy}
			LIMIT ? OFFSET ?
		`)
		.all(...params, pageSize, offset);

	const categories = db.prepare("SELECT name, slug FROM categories ORDER BY name").all();

	res.render("browse", {
		docs,
		categories,
		q,
		category,
		type,
		language,
		sort,
		page,
		pages: Math.ceil(total / pageSize)
	});
});

router.get("/doc/:id", (req, res) => {
	const id = Number(req.params.id);
	const doc = db
		.prepare(`
			SELECT d.*, c.name AS category, c.slug, u.name AS uploader_name
			FROM documents d
			JOIN categories c ON c.id=d.category_id
			JOIN users u ON u.id=d.uploader_id
			WHERE d.id=? AND d.status='APPROVED'
		`)
		.get(id);

	if (!doc) return res.status(404).send("Document not found.");

	db.prepare("UPDATE documents SET views_count=views_count+1 WHERE id=?").run(id);

	const related = db
		.prepare(`
			SELECT d.id, d.title, d.authors, d.year
			FROM documents d
			WHERE d.status='APPROVED' AND d.category_id=? AND d.id<>?
			ORDER BY d.created_at DESC
			LIMIT 4
		`)
		.all(doc.category_id, id);

	const bookmarked =
		res.locals.user &&
		db.prepare("SELECT 1 FROM bookmarks WHERE user_id=? AND document_id=?").get(res.locals.user.id, id);

	res.render("doc", { doc: { ...doc, views_count: doc.views_count + 1 }, related, bookmarked: !!bookmarked });
});

router.get("/doc/:id/download", (req, res) => {
	const id = Number(req.params.id);
	const doc = db.prepare("SELECT * FROM documents WHERE id=? AND status='APPROVED'").get(id);
	if (!doc) return res.status(404).send("Not found.");

	db.prepare("UPDATE documents SET downloads_count=downloads_count+1 WHERE id=?").run(id);

	const absolutePath = path.join(__dirname, "..", doc.pdf_path);
	return res.download(absolutePath, `${doc.title}.pdf`);
});

router.post("/doc/:id/bookmark", requireLogin, (req, res) => {
	const id = Number(req.params.id);
	const exists = db.prepare("SELECT 1 FROM bookmarks WHERE user_id=? AND document_id=?").get(res.locals.user.id, id);
	if (exists) {
		db.prepare("DELETE FROM bookmarks WHERE user_id=? AND document_id=?").run(res.locals.user.id, id);
	} else {
		db.prepare("INSERT OR IGNORE INTO bookmarks(user_id, document_id) VALUES (?, ?)").run(res.locals.user.id, id);
	}
	res.redirect(`/doc/${id}`);
});

router.get("/upload", requireLogin, (req, res) => {
	const categories = db.prepare("SELECT id, name FROM categories ORDER BY name").all();
	res.render("upload", { categories, error: null, ok: false });
});

router.post("/upload", requireLogin, upload.single("pdf"), (req, res) => {
	try {
		const categories = db.prepare("SELECT id, name FROM categories ORDER BY name").all();
		const {
			title,
			authors,
			abstract,
			keywords,
			category_id,
			document_type,
			year,
			journal_or_conference,
			doi,
			language
		} = req.body;

		if (!title || !authors || !abstract || !keywords || !category_id || !document_type || !language || !req.file) {
			return res.render("upload", { categories, error: "Please fill all required fields and upload a PDF.", ok: false });
		}

		const pdf_path = path.join("uploads", req.file.filename);

		db.prepare(`
			INSERT INTO documents(title, authors, abstract, keywords, category_id, document_type, year, journal_or_conference, doi, language, pdf_path, status, uploader_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
		`).run(
			title,
			authors,
			abstract,
			keywords,
			Number(category_id),
			document_type,
			year ? Number(year) : null,
			journal_or_conference || null,
			doi || null,
			language,
			pdf_path,
			res.locals.user.id
		);

		return res.render("upload", { categories, error: null, ok: true });
	} catch (e) {
		return res.status(500).send("Upload error.");
	}
});

module.exports = router;
