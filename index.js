const express = require('express'),
    app = express(),
    session = require('express-session'),
    morgan = require('morgan'),
    path = require("path"),
    { v4: uuidv4 } = require("uuid"),
    diskdb = require("diskdb"),
    db = diskdb.connect('./database', ['job'])

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ limit: "50mb", parameterLimit: 500000000, extended: true }));
app.use(express.json({ limit: '50mb' }));
app.set('trust proxy', 1)
app.use(session({
    secret: "yourSuperSecretSessionSecret",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: true
    }
}));

if (process.env.NODE_ENV == 'development') {
    app.use(morgan(':method :url :status :res[content-length] :response-time ms :remote-user'));
} else {
    app.use(morgan(':method :url :status :res[content-length] :response-time ms :remote-user @:remote-addr HTTP/:http-version :user-agent [:date[clf]]'));
}

app.set('views', './views');
app.set('view engine', 'pug');

const dbUpdateOptions = {
    multi: false, // update multiple - default false
    upsert: false // if object is not found, add it (update-insert) - default false
}

/*## ROUTING START ##*/
app.get("/new", (req, res) => {
    let localmsg = String(req.query.msg) ? req.query.msg : null;
    return res.render("new", { msg: localmsg })
})

app.post("/new", (req, res) => {
    //let jobId = uuidv4().toString()
    //let companyId = uuidv4().toString()
    //let contactId = uuidv4().toString()
    let newJob = {
        "title": String(req.body.jobTitle),
        "description": String(req.body.jobDescription),
        "note": String(req.body.jobNote),
        //"companyId": companyId,
        //"contactId": contactId,
        "applied": false,
        "answer": false,
        company: {
            //"id": companyId,
            "name": String(req.body.companyName),
            "website": String(req.body.companyWebsite),
            "street": String(req.body.companyStreet),
            "city": String(req.body.companyCity),
            "note": String(req.body.companyNote)
        },
        contact: {
            //"id": contactId,
            "name": String(req.body.contactName),
            "email": String(req.body.contactEmail),
            "telephone": String(req.body.contactTelephone),
            "note": String(req.body.contactNote)
        }
    }
    let insertedJob = db.job.save(newJob)
    return res.redirect(`detail/${insertedJob._id}`)
})

app.get("/detail/:id", (req, res) => {
    const findJob = db.job.findOne({ _id: String(req.params.id) })
    if (!findJob) {
        return res.redirect("/?msg=no%20job%20to%20id%20found")
    }
    else {
        let localmsg = String(req.query.msg) ? req.query.msg : null;
        return res.render("detail", { job: findJob, msg: localmsg })
    }
})

app.get("/detail", (req, res) => {
    return res.redirect("/?msg=no%20id%20selected")
})

app.post("/edit/:id", (req, res) => {
    const oldJob = db.job.findOne({ _id: String(req.params.id) })
    let editedJob = {
        "title": String(req.body.jobTitle),
        "description": String(req.body.jobDescription),
        "note": String(req.body.jobNote),
        //"companyId": companyId,
        //"contactId": contactId,
        "applied": false,
        "answer": false,
        company: {
            //"id": companyId,
            "name": String(req.body.companyName),
            "website": String(req.body.companyWebsite),
            "street": String(req.body.companyStreet),
            "city": String(req.body.companyCity),
            "note": String(req.body.companyNote)
        },
        contact: {
            //"id": contactId,
            "name": String(req.body.contactName),
            "email": String(req.body.contactEmail),
            "telephone": String(req.body.contactTelephone),
            "note": String(req.body.contactNote)
        }
    }
    let update = db.job.update(oldJob, editedJob, dbUpdateOptions)
    //let msg = (update.updated==1)?"success":"update failed"
    //console.log(msg)
    return res.redirect("/")
    return res.render("detail", { job: oldJob })
})

app.get("/edit/:id", (req, res) => {
    const findJob = db.job.findOne({ _id: String(req.params.id) })
    if (!findJob) {
        return res.redirect("/?msg=no%20job%20to%20id%20found")
    }
    else {
        let localmsg = String(req.query.msg) ? req.query.msg : null;
        return res.render("edit", { job: findJob, msg: localmsg })
    }
})

app.get("/toggle/:id/:field", (req, res) => {
    const oldJob = db.job.findOne({ _id: String(req.params.id) })
    const changeField = String(req.params.field)
    let toggle;
    if (changeField == "applied") {
        toggle = {
            applied: oldJob.applied ? false : true
        }
    }
    else {
        toggle = {
            answer: oldJob.answer ? false : true
        }
    }
    let update = db.job.update(oldJob, toggle, dbUpdateOptions)
    return res.redirect(`detail/${String(req.params.id)}`)
})

app.get("/delete/:id", (req, res) => {
    db.job.remove({ _id: String(req.params.id) }, false)
    res.redirect('/')
})

app.get("/", (req, res) => {
    let localmsg = String(req.query.msg) ? req.query.msg : null;
    res.render('index', { jobs: db.job.find(), msg: localmsg });
})

app.get("***", (req, res) => {
    res.redirect("/")
})

/*## ROUTING END ##*/

/*## Start Message ##*/
process.env.PORT = process.env.PORT ? process.env.PORT : "8080"
process.env.IP = process.env.IP ? process.env.IP : "localhost"
app.listen(process.env.PORT, process.env.IP, function () {
    console.log(
        `---------------
        \nServer is listening at http://${process.env.IP}:${process.env.PORT} 
        \nWorking in ${process.env.NODE_ENV} Mode 
        \n---------------\n`);
});

module.exports = app;