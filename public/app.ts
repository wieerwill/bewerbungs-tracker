// Minimaler Client-Bootstrap
document.addEventListener('click', async (e) => {
  const el = e.target as HTMLElement;
  if (el?.classList?.contains('js-copy-job')) {
    const id = el.getAttribute('data-jobid');
    if (!id) return;
    try {
      const res = await fetch(`/api/jobs/${id}/clipboard`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      el.textContent = 'Kopiert ✔';
      setTimeout(() => (el.textContent = 'Kopieren'), 1500);
    } catch {
      alert('Kopieren fehlgeschlagen');
    }
  }
});
