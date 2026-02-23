require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./db");

function slugify(s) {
	return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const defaultCategories = [
	"Engineering",
	"Medicine",
	"Economics",
	"Education",
	"Agriculture",
	"Environment",
	"Literature",
	"Law",
	"Computer Science"
];

for (const name of defaultCategories) {
	const slug = slugify(name);
	db.prepare("INSERT OR IGNORE INTO categories(name, slug) VALUES (?, ?)").run(name, slug);
}

const adminEmail = "admin@afghanjournalmb.com";
const existing = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);

(async () => {
	if (!existing) {
		const hash = await bcrypt.hash("Admin123!", 12);
		db.prepare(
			"INSERT INTO users(name, email, password_hash, role, affiliation, country) VALUES (?, ?, ?, 'admin', ?, ?)"
		).run("Admin", adminEmail, hash, "Afghan Journal MB", "Afghanistan");
		console.log("✅ Seeded admin user: admin@afghanjournalmb.com / Admin123!");
	} else {
		console.log("ℹ️ Admin user already exists.");
	}

	console.log("✅ Seed complete.");
})();
