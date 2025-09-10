import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '../dist');

const css = readFileSync(join(dist, 'public/styles.css'), 'utf8');
const js = readFileSync(join(dist, 'public/app.js'), 'utf8');

const html = `<!doctype html>
<html lang="de">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ApplicationApplication</title>
<style>${css}</style>
<body>
<header class="site-header">
  <div class="container brand"><span class="logo">A</span>ApplicationApplication</div>
</header>
<main class="site-main container">
  <div class="card">
    <div class="card-header"><h1>Jobs (Single-File)</h1></div>
    <div id="app"></div>
  </div>
</main>
<footer class="site-footer"><div class="container"><p>© Local</p></div></footer>
<script>
(async function(){
  const el = document.getElementById('app');
  try {
    const res = await fetch('/api/jobs');
    const json = await res.json();
    const jobs = json.data || json; // falls Router plain rows liefert
    if (!Array.isArray(jobs) || !jobs.length) { el.textContent = 'Keine Daten'; return; }
    // simplest render:
    const rows = jobs.map((j, i)=>\`
      <tr>
        <td>\${i+1}</td>
        <td>\${j.title || '—'}</td>
        <td>\${(j.company && j.company.name) || j.company_name || '—'}</td>
        <td>\${j.status}</td>
        <td><button class="btn secondary js-copy-job" data-jobid="\${j._id || j.id}">Kopieren</button></td>
      </tr>\`).join('');
    el.innerHTML = \`
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>#</th><th>Job</th><th>Unternehmen</th><th>Angeschrieben</th><th>Antwort</th><th>Aktion</th></tr></thead>
          <tbody>\${rows}</tbody>
        </table>
      </div>\`;
  } catch(e) {
    el.textContent = 'Fehler beim Laden';
  }
})();
</script>
<script>${js}</script>
</body>
</html>`;
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'app.single.html'), html, 'utf8');
console.log('single-file ✔');
