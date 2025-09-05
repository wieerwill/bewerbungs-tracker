"use strict";

/**
 * Registriert alle Routen. Hält die Logik schlank und ruft nur Statements/Helper auf.
 */
function registerRoutes(app, s, h) {
  /* Home: Jobs Liste */
  app.get("/", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort : "";
    const msg = typeof req.query.msg === "string" ? req.query.msg : null;

    const rows = s.listJobs({ query, status, sort });
    const jobs = rows.map(h.jobRowToVm);
    res.render("index", { jobs, msg, q: query, status, sort });
  });

  /* Jobs: New + Create */
  app.get("/new", (req, res) => {
    const msg = typeof req.query.msg === "string" ? req.query.msg : null;
    res.render("new", { msg });
  });

  app.post("/new", (req, res) => {
    const record = h.requestToJob(req.body);
    if (!record.title) return res.redirect("/new?msg=" + encodeURIComponent("Titel ist erforderlich"));
    s.insertJob.run(record);
    res.redirect(`/detail/${record.id}`);
  });

  /* Jobs: Detail */
  app.get("/detail/:id", (req, res) => {
    const row = s.getJobById.get(String(req.params.id));
    if (!row) return res.redirect("/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden"));
    // Für Detail nochmal mit Join laden, um Namen anzuzeigen:
    const joined = s.listJobs({ query: "", status: "", sort: "" }).find(r => r.id === row.id) || row;
    const job = h.jobRowToVm(joined);
    const msg = typeof req.query.msg === "string" ? req.query.msg : null;
    res.render("detail", { job, msg });
  });

  /* Jobs: Edit Form + Update */
  app.get("/edit/:id", (req, res) => {
    const row = s.getJobById.get(String(req.params.id));
    if (!row) return res.redirect("/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden"));
    // für das Formular reicht die rohe Zeile
    const job = h.jobRowToVm({ ...row, company_name: "", company_website: "", company_city: "", contact_name: "", contact_email: "", contact_phone: "" });
    const msg = typeof req.query.msg === "string" ? req.query.msg : null;
    res.render("edit", { job, msg });
  });

  app.post("/edit/:id", (req, res) => {
    const row = s.getJobById.get(String(req.params.id));
    if (!row) return res.redirect("/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden"));
    const currentVm = h.jobRowToVm({ ...row });
    const record = h.requestToJob(req.body, currentVm); // behält applied/answer
    s.updateJob.run(record);
    res.redirect(`/detail/${record.id}`);
  });

  /* Jobs: Toggle Flags (einfach gelassen) */
  app.get("/toggle/:id/:field", (req, res) => {
    const id = String(req.params.id);
    const field = String(req.params.field);
    const row = s.getJobById.get(id);
    if (!row) return res.redirect("/?msg=" + encodeURIComponent("Kein Job zu dieser ID gefunden"));

    const vm = h.jobRowToVm(row);
    if (field === "applied") vm.applied = !vm.applied;
    else if (field === "answer") vm.answer = !vm.answer;
    else return res.redirect(`/detail/${id}?msg=` + encodeURIComponent("Unbekanntes Feld"));

    const updated = h.requestToJob({}, vm);
    s.updateJob.run(updated);
    res.redirect(`/detail/${id}`);
  });

  /* Jobs: Delete */
  app.get("/delete/:id", (req, res) => {
    s.deleteJobById.run(String(req.params.id));
    res.redirect("/");
  });

  /* Companies: Index */
  app.get("/companies", (_req, res) => {
    const companies = s.listCompanies.all().map(h.companyRowToVm);
    res.render("companies_index", { companies });
  });

  /* Companies: New + Create (inkl. optional erstem Kontakt) */
  app.get("/companies/new", (req, res) => {
    const msg = typeof req.query.msg === "string" ? req.query.msg : null;
    res.render("companies_new", { msg });
  });

  app.post("/companies/new", (req, res) => {
    const c = h.requestToCompany(req.body);
    if (!c.name) return res.redirect("/companies/new?msg=" + encodeURIComponent("Firmenname ist erforderlich"));
    try {
      s.insertCompany.run(c);
    } catch {
      return res.redirect("/companies/new?msg=" + encodeURIComponent("Unternehmen existiert bereits"));
    }

    const hasAnyContact =
      (req.body.contactName && req.body.contactName.trim()) ||
      (req.body.contactEmail && req.body.contactEmail.trim()) ||
      (req.body.contactPhone && req.body.contactPhone.trim()) ||
      (req.body.contactNote && req.body.contactNote.trim());

    if (hasAnyContact) {
      const ct = h.requestToContact(req.body, c.id);
      s.insertContact.run(ct);
    }

    res.redirect(`/companies/${c.id}`);
  });

  /* Companies: Detail */
  app.get("/companies/:id", (req, res) => {
    const row = s.getCompanyById.get(String(req.params.id));
    if (!row) return res.redirect("/companies");
    const company = h.companyRowToVm(row);
    const contacts = s.listContactsForCompany.all(company._id).map(h.contactRowToVm);
    res.render("company_detail", { company, contacts });
  });
}

module.exports = registerRoutes;
