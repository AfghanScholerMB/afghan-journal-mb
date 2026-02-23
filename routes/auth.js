const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.get("/register", (req, res) => res.render("register", { error: null }));
router.get("/login", (req, res) => res.render("login", { error: null }));

router.post("/register", async (req, res) => {
	const { name, email, password, affiliation, country } = req.body;
	if (!name || !email || !password) return res.render("register", { error: "All required fields must be filled." });

	const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email.trim().toLowerCase());
	if (existing) return res.render("register", { error: "Email already registered." });

	const hash = await bcrypt.hash(password, 12);
	const info = db
		.prepare("INSERT INTO users(name, email, password_hash, role, affiliation, country) VALUES (?, ?, ?, 'user', ?, ?)")
		.run(name.trim(), email.trim().toLowerCase(), hash, affiliation || null, country || null);

	req.session.userId = info.lastInsertRowid;
	res.redirect("/profile");
});

router.post("/login", async (req, res) => {
	const { email, password } = req.body;
	const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").trim().toLowerCase());
	if (!user) return res.render("login", { error: "Invalid email or password." });
	if (user.is_banned) return res.render("login", { error: "Your account is banned." });

	const ok = await bcrypt.compare(password || "", user.password_hash);
	if (!ok) return res.render("login", { error: "Invalid email or password." });

	req.session.userId = user.id;
	res.redirect("/profile");
});

router.post("/logout", (req, res) => {
	req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
