const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const played = (m) => m.hg !== null && m.hg !== undefined && m.hg !== '' && m.ag !== null && m.ag !== undefined && m.ag !== '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function standings(comp) {
  const t = {};
  comp.teams.forEach((x) => (t[x.id] = { id: x.id, name: x.name, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, pts: 0, form: [] }));
  const ms = comp.matches.filter(played).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  for (const m of ms) {
    const h = t[m.home], a = t[m.away];
    if (!h || !a) continue;
    const hg = +m.hg, ag = +m.ag;
    h.j++; a.j++; h.gm += hg; h.gs += ag; a.gm += ag; a.gs += hg;
    if (hg > ag) { h.v++; a.d++; h.pts += 3; h.form.push('v'); a.form.push('d'); }
    else if (hg < ag) { a.v++; h.d++; a.pts += 3; a.form.push('v'); h.form.push('d'); }
    else { h.e++; a.e++; h.pts++; a.pts++; h.form.push('e'); a.form.push('e'); }
  }
  return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gm - y.gs) - (x.gm - x.gs) || y.gm - x.gm || x.name.localeCompare(y.name, 'pt'));
}

const COLORS = ['#ff7a0a', '#15136b', '#ff3b0f', '#3b37c9', '#e86a00', '#6b6bd6'];
const colorOf = (id) => COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
const initials = (n) => n.replace(/\b(SC|CF|FC|GD|AD|CD|UD|SL|SG|CS|ACD|CP)\b/gi, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || n.slice(0, 2).toUpperCase();
