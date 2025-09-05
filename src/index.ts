"use strict";

const path = require("path");
const express = require("express");
const morgan = require("morgan");

const createDatabase = require("./database");
const createStatements = require("./statements");
const createHelpers = require("./helpers");
const registerRoutes = require("./routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

/* Static & parsing */
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(isProduction ? "tiny" : "dev"));

/* Views */
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "pug");

/* Database & statements */
const db = createDatabase({ baseDir: path.join(__dirname, "..") });
const helpers = createHelpers();
const statements = createStatements(db);

/* Routes */
registerRoutes(app, statements, helpers);

/* Fallback */
app.use((_req, res) => res.redirect("/"));

/* Start server (lokal) */
const PORT = process.env.PORT || 8080;
const HOST = process.env.IP || "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});
