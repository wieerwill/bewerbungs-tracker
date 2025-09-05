import path from 'path';
import express from 'express';
import morgan from 'morgan';

import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import csurf from 'csurf';

import createDatabase from './database';
import createStatements from './statements';
import registerRoutes from './routes';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

/* Static & parsing */
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(methodOverride('_method')); // allows ?_method=DELETE or hidden input
app.use(morgan(isProduction ? 'tiny' : 'dev'));

/* Views */
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug');

/* CSRF (double-submit cookie) */
app.use(
  csurf({
    cookie: { httpOnly: true, sameSite: 'lax', secure: false }, // local app
  }),
);
// expose token to all templates
app.use((req, res, next) => {
  res.locals.csrfToken = (req as any).csrfToken();
  next();
});

/* DB + statements */
const db = createDatabase({ baseDir: path.join(__dirname, '..') });
const statements = createStatements(db);

/* Routes */
registerRoutes(app, statements);

/* Fallback */
app.use((_req, res) => res.redirect('/'));

/* Start */
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.IP || '127.0.0.1';
app.listen(PORT, HOST, () =>
  console.log(`Listening on http://${HOST}:${PORT}`),
);
