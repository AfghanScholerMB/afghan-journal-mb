require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const helmet = require("helmet");

const db = require("./db");

const pages = require("./routes/pages");
const auth = require("./routes/auth");
const docs = require("./routes/docs");
const admin = require("./routes/admin");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));

app.use(
	session({
		secret: process.env.SESSION_SECRET || "dev_secret_change_me",
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: "lax"
		}
	})
);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // PDFs accessible (basic)

// Load user into res.locals
app.use((req, res, next) => {
	res.locals.user = null;
	if (req.session.userId) {
		const user = db
			.prepare("SELECT id, name, email, role, is_banned FROM users WHERE id=?")
			.get(req.session.userId);
		if (user && user.is_banned === 0) {
			res.locals.user = user;
		} else {
			req.session.destroy(() => {});
		}
	}
	next();
});

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/", pages);
app.use("/", auth);
app.use("/", docs);
app.use("/", admin);

// 404
app.use((req, res) => {
	res.status(404).send("404 Not Found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Afghan Journal MB running on port ${PORT}`));
