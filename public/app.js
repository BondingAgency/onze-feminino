const app = document.getElementById('app');
let DB = { competitions: [] };
const FOLLOW_KEY = 'elas-follow';
const getFollow = () => { try { return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || []; } catch { return []; } };
const setFollow = (a) => { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(a)); } catch {} };
const fKey = (c, t) => c + ':' + t;

const fmtDate = (d) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '') : 'Data por definir';
const todayStr = () => new Date().toISOString().slice(0, 10);
const tname = (c, id) => (c.teams.find((t) => t.id === id) || { name: '?' }).name;
const sname = (c, id) => { const t = c.teams.find((x) => x.id === id); return t ? t.short || t.name : '?'; };

const crestSrc = (id) => 'clubes/' + id.replace(/-b$/, '') + '.png';
const CREST = (c, id, s = 34) => { const n = tname(c, id), src = crestSrc(id); return `<span class="cr" style="--s:${s}px;background:${colorOf(id)}"><b>${esc(initials(n))}</b>${src ? `<img src="${src}" alt="" decoding="async" onerror="this.remove()">` : ''}</span>`; };

function matchCard(c, m, withComp, noDate) {
  const done = played(m);
  const hw = done && +m.hg > +m.ag, aw = done && +m.ag > +m.hg;
  const row = (id, g, lo) => `<div class="tn ${lo ? 'lo' : ''}">${CREST(c, id, 30)}<span>${esc(sname(c, id))}</span>${done ? `<b class="g">${g}</b>` : ''}</div>`;
  const info = [];
  if (done) info.push('<span class="ft">Final</span>'); else info.push(`<b>${esc(m.time || '--:--')}</b>`);
  if (!noDate) info.push(`<small>${shortDate(m.date)}</small>`);
  if (withComp) info.push(`<small>${esc(c.name.replace(/ Feminina$/, ''))}${m.serie ? ' ' + esc(m.serie.replace(/^Série /, '')) : ''}</small>`);
  else if (m.serie) info.push(`<small>${esc(m.serie.replace(/^Série /, 'Série '))}</small>`);
  return `<a class="match" href="#/c/${c.id}/jogo/${m.id}"><div class="fxt">${row(m.home, m.hg, aw)}${row(m.away, m.ag, hw)}</div><div class="fxr">${info.join('')}</div></a>`;
}
const shortDate = (d) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' }).replace('.', '').replace(/^./, (x) => x.toUpperCase()).replace(',', '') : 'Por definir';
function untilLabel(m) {
  if (played(m)) return 'Terminado';
  if (!m.date) return 'Data por definir';
  const h = (new Date(m.date + 'T' + (m.time || '12:00')) - new Date()) / 36e5;
  if (h < -2.5) return 'Resultado por chegar';
  if (h < 0) return 'A decorrer';
  if (h < 1) return `Começa em ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 36) return `Começa em ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return `Faltam ${d} dias`;
}
const compShort = (c) => c.name.replace(/ Feminina$/, '');

function lastRounds(all) {
  const groups = {};
  all.filter(({ m }) => played(m)).forEach((x) => { const k = x.c.id + '|' + (x.m.serie || ''); (groups[k] = groups[k] || []).push(x); });
  const out = [];
  Object.values(groups).forEach((g) => {
    const rounds = [...new Set(g.map((x) => +x.m.round))].sort((a, b) => b - a);
    let pick = g.filter((x) => +x.m.round === rounds[0]);
    if (pick.length < 3 && rounds[1] !== undefined) pick = pick.concat(g.filter((x) => +x.m.round === rounds[1])).slice(0, 4);
    out.push(...pick.sort((a, b) => (b.m.date + b.m.time).localeCompare(a.m.date + a.m.time)));
  });
  return out;
}

function byComp(items, noDate) {
  const groups = [];
  for (const it of items) {
    const key = it.c.id + '|' + (it.m.serie || '');
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, c: it.c, serie: it.m.serie, ms: [] }));
    g.ms.push(it.m);
  }
  const ord = (g) => DB.competitions.indexOf(g.c) * 10 + (g.c.series ? g.c.series.findIndex((sr) => sr.name === g.serie) + 1 : 0);
  groups.sort((a, b) => ord(a) - ord(b));
  return groups.map((g) => `<a class="cgh" href="#/c/${g.c.id}">${EMB(20, g.c.id)}<span>${esc(compShort(g.c))}</span>${g.serie ? `<span class="cgs">${esc(g.serie)}</span>` : ''}</a>${g.ms.map((m) => matchCard(g.c, { ...m, serie: undefined }, false, noDate)).join('')}`).join('');
}

function allMatches() { return DB.competitions.flatMap((c) => c.matches.map((m) => ({ c, m }))); }

function home() {
  const all = allMatches();
  const t = todayStr();
  const up = all.filter(({ m }) => !played(m) && (m.date || '9999') >= t).sort((a, b) => (a.m.date + a.m.time).localeCompare(b.m.date + b.m.time));
  const lim = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const week = up.filter(({ m }) => m.date <= lim);
  const next = week.length ? week : up.slice(0, 4);
  const last = lastRounds(all);
  const c0 = DB.competitions.find((c) => c.matches.some(played));
  const head = (title, href, label) => `<div class="sh2"><h2>${title}</h2><a href="${href}">${label} ›</a></div>`;
  app.innerHTML = `${heroCard(all, t)}
  <div class="compchips">${DB.competitions.map((c, i) => `<a class="cchip ${i === 0 ? 'on' : ''}" href="#/c/${c.id}">${EMB(26, c.id)}${esc(compShort(c))}</a>`).join('')}</div>
  ${followBlock()}
  <div class="cols"><div>${head(week.length ? 'Esta semana' : 'Próximos jogos', '#/jogos/proximos', 'Ver tudo')}${next.length ? byComp(next) : '<div class="empty">Ainda não há jogos marcados.</div>'}</div>
  <div>${head('Últimos resultados', '#/jogos/resultados', 'Ver tudo')}${last.length ? byComp(last) : '<div class="empty">Ainda não há resultados.</div>'}</div>
  ${c0 ? `<div class="stand-col home-tab">${head('Classificação', `#/c/${c0.id}/classificacao`, esc(compShort(c0)))}<div class="mini">${tabela(c0)}</div></div>` : ''}</div>`;
}

function heroCard(all, t) {
  const byDate = [...all].sort((a, b) => (a.m.date + a.m.time).localeCompare(b.m.date + b.m.time));
  const nx = byDate.find(({ m }) => !played(m) && (m.date || '9999') >= t);
  const last = [...byDate].reverse().find(({ m }) => played(m));
  const h = nx || last;
  if (!h) return '';
  const { c, m } = h, done = played(m);
  const side = (id) => { const r = teamRow(c, id); return `<a class="ht" href="${teamHref(c, id)}">${CREST(c, id, 78)}<span>${esc(sname(c, id))}</span><small>${r ? r.pos + '.º lugar' : '&nbsp;'}</small></a>`; };
  const day = m.date ? new Date(m.date + 'T12:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '').replace(/^./, (x) => x.toUpperCase()) : 'Data por definir';
  return `<section class="hero"><div class="hk">${EMB(24, c.id)}<span>${esc(compShort(c))}</span><span class="dot"></span><span>Jornada ${m.round}</span><span class="cd">${untilLabel(m)}</span></div>
  <div class="hm">${side(m.home)}<div class="hc"><div class="hs">${done ? `${m.hg}–${m.ag}` : esc(m.time || '--:--')}</div><div class="hd">${day}</div></div>${side(m.away)}</div>
  <div class="hb"><a class="b1" href="#/c/${c.id}/jogo/${m.id}">Ver jogo</a><a class="b2" href="#/c/${c.id}/jogos/${m.round}">Jornada ${m.round}</a></div></section>`;
}

function followBlock() {
  const f = getFollow();
  if (!f.length) return `<a class="follow" href="#/conta"><div class="t">☆ Segue a tua equipa</div><div>Os jogos dela passam a aparecer aqui, no topo.</div></a>`;
  const items = [];
  for (const k of f) {
    const [cid, tid] = k.split(':');
    const c = DB.competitions.find((x) => x.id === cid);
    if (!c) continue;
    const ms = c.matches.filter((m) => m.home === tid || m.away === tid);
    const n = ms.filter((m) => !played(m)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    const l = ms.filter(played).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
    items.push(`<div class="follow"><div class="t">★ ${esc(tname(c, tid))}</div>${l ? matchCard(c, l) : ''}${n ? matchCard(c, n) : ''}</div>`);
  }
  return items.join('');
}

const EMB = (s, id) => id === "liga-bpi" ? `<span class="emb bpi" style="--s:${s}px"><img src="ligas/liga-bpi.png" alt=""></span>` : `<span class="emb" style="--s:${s}px"><img src="ligas/emblema-fpf-feminino.png" alt=""></span>`;

function sideLeagues(active) {
  return `<h2>Ligas</h2>${DB.competitions.map((c) => `<a class="sl ${c.id === active ? 'on' : ''}" href="#/c/${c.id}">${EMB(30, c.id)}<span>${esc(c.name)}</span></a>`).join('')}`;
}

function compCards() {
  return DB.competitions.map((c) => `<a class="comp" href="#/c/${c.id}">${EMB(52, c.id)}<div><div class="t">${esc(c.name)}</div><div class="s">Época ${esc(c.season)}</div></div><div class="go">›</div></a>`).join('');
}

function ligas() { app.innerHTML = `<h1>Competições</h1><p class="sub">Escolhe a liga.</p><div class="cards">${compCards()}</div>`; }

function comp(id, tab, arg) {
  const c = DB.competitions.find((x) => x.id === id);
  if (!c) return (app.innerHTML = '<div class="empty">Competição não encontrada.</div>');
  tab = tab || (!c.matches.length && c.series ? 'classificacao' : 'jogos');
  const tabs = [['jogos', 'Jogos'], ['classificacao', 'Classificação'], ['equipas', 'Equipas']];
  let body = '';
  if (tab === 'jogos') body = jogos(c, arg);
  else if (tab === 'classificacao') body = tabela(c);
  else body = equipas(c);
  app.innerHTML = `<a class="back" href="#/ligas">‹ Competições</a><div class="ch">${EMB(64, c.id)}<div><h1>${esc(c.name)}</h1><p class="sub">Época ${esc(c.season)}</p></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-go="#/c/${id}/${k}">${l}</button>`).join('')}</div>${body}`;
}

function jogos(c, arg) {
  const rounds = [...new Set(c.matches.map((m) => +m.round))].sort((a, b) => a - b);
  if (!rounds.length) return '<div class="empty">Ainda não há jornadas nesta competição.</div>';
  const t = todayStr();
  let r = +arg;
  if (!rounds.includes(r)) {
    // jornada atual = a do próximo jogo por data; se já acabou, a do último jogo
    const byDate = [...c.matches].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const nx = byDate.find((m) => !played(m) && (m.date || '9999') >= t);
    const last = [...byDate].reverse().find(played);
    r = nx ? +nx.round : last ? +last.round : rounds[0];
  }
  const ms = c.matches.filter((m) => +m.round === r).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const days = [...new Set(ms.map((m) => m.date))];
  const range = days.length > 1 ? `${fmtDate(days[0])} a ${fmtDate(days[days.length - 1])}` : fmtDate(days[0]);
  const chips = `<div class="chips">${rounds.map((n) => `<button class="chip ${n === r ? 'on' : ''}" data-go="#/c/${c.id}/jogos/${n}">${n}</button>`).join('')}</div>`;
  const byDay = (list) => [...new Set(list.map((m) => m.date))].map((d) => `<div class="dh">${fmtDate(d)}</div>${list.filter((m) => m.date === d).map((m) => matchCard(c, { ...m, serie: undefined }, false, true)).join('')}`).join('');
  const groups = c.series
    ? c.series.map((sr) => { const l = ms.filter((m) => m.serie === sr.name); return l.length ? `<div class="sh">${esc((c.phase ? c.phase + ' · ' : '') + sr.name)}</div>${byDay(l)}` : ''; }).join('') + byDay(ms.filter((m) => !c.series.some((sr) => sr.name === m.serie)))
    : byDay(ms);
  const ri = rounds.indexOf(r), pr = rounds[ri - 1], nx = rounds[ri + 1];
  const arrow = (n, l, lab) => `<button class="rnav" ${n ? `data-go="#/c/${c.id}/jogos/${n}"` : 'disabled'} aria-label="${lab}">${l}</button>`;
  return `<div class="rh"><div class="rt2">${arrow(pr, '‹', 'Jornada anterior')}<strong>Jornada ${r}</strong>${arrow(nx, '›', 'Jornada seguinte')}</div><span>${range}</span></div>${chips}${groups}`;
}

function tabela(c) {
  if (c.series) {
    const fm = Object.fromEntries(standings(c).map((t) => [t.id, t.form]));
    return c.series.map((sr) => {
      const rows = sr.table.map((r) => ({ ...r, name: tname(c, r.id), form: fm[r.id] || [] }));
      return `<div class="sh">${esc((c.phase ? c.phase + ' · ' : '') + sr.name)}</div><div style="height:10px"></div>${tabelaRows(c, rows)}`;
    }).join('<div style="height:18px"></div>') + LEG;
  }
  return tabelaRows(c, standings(c)) + LEG;
}
const LEG = '<div class="leg"><span><i class="v"></i>Vitória</span><span><i class="e"></i>Empate</span><span><i class="d"></i>Derrota</span><span class="lt">Toca numa equipa para ver os jogos dela</span></div>';

function tabelaRows(c, s) {
  if (!s.length) return '<div class="empty">Ainda não há equipas nesta competição.</div>';
  return `<table class="tbl"><thead><tr><th>#</th><th class="nm">Equipa</th><th>J</th><th class="hide-s">V</th><th class="hide-s">E</th><th class="hide-s">D</th><th>DG</th><th>Pts</th><th class="hide-s">Forma</th></tr></thead><tbody>${s.map((t, i) => `<tr class="go" data-go="${teamHref(c, t.id)}"><td class="ps">${i + 1}</td><td class="nm"><span class="tn">${CREST(c, t.id, 26)}${esc(t.name)}</span></td><td>${t.j}</td><td class="hide-s">${t.v}</td><td class="hide-s">${t.e}</td><td class="hide-s">${t.d}</td><td>${t.gm - t.gs > 0 ? '+' : ''}${t.gm - t.gs}</td><td class="pt">${t.pts}</td><td class="hide-s"><div class="form">${t.form.slice(-5).map((f) => `<i class="${f}">${f.toUpperCase()}</i>`).join('')}</div></td></tr>`).join('')}</tbody></table>`;
}

function equipas(c) {
  if (!c.teams.length) return '<div class="empty">Ainda não há equipas.</div>';
  const f = getFollow();
  return '<div class="tgrid">' + [...c.teams].sort((a, b) => a.name.localeCompare(b.name, 'pt')).map((t) => `<div class="team go" data-go="${teamHref(c, t.id)}">${CREST(c, t.id, 38)}<div>${esc(t.name)}</div><button class="star ${f.includes(fKey(c.id, t.id)) ? 'on' : ''}" data-star="${fKey(c.id, t.id)}" aria-label="Seguir ${esc(t.name)}">★</button></div>`).join('') + '</div>';
}

function jogosAll(mode, cf) {
  mode = mode === 'resultados' ? 'resultados' : 'proximos';
  const t = todayStr();
  const comps = DB.competitions.filter((c) => c.matches.length);
  const fol = getFollow();
  if (!comps.some((c) => c.id === cf) && !(cf === 'minha' && fol.length)) cf = '';
  const all = allMatches().filter(({ c, m }) => !cf || (cf === 'minha' ? fol.includes(fKey(c.id, m.home)) || fol.includes(fKey(c.id, m.away)) : c.id === cf));
  const list = mode === 'proximos'
    ? all.filter(({ m }) => !played(m) && (m.date || '9999') >= t).sort((a, b) => (a.m.date + a.m.time).localeCompare(b.m.date + b.m.time))
    : all.filter(({ m }) => played(m)).sort((a, b) => (b.m.date + b.m.time).localeCompare(a.m.date + a.m.time));
  const days = [...new Set(list.map(({ m }) => m.date))];
  const body = list.length
    ? days.map((d) => `<div class="dh">${fmtDate(d)}</div>${byComp(list.filter(({ m }) => m.date === d), true)}`).join('')
    : `<div class="empty">${mode === 'proximos' ? 'Ainda não há jogos marcados.' : 'Ainda não há resultados.'}</div>`;
  app.innerHTML = `<h1>Jogos</h1><p class="sub">${cf === 'minha' ? 'Jogos das equipas que segues' : cf ? esc(DB.competitions.find((c) => c.id === cf).name) : 'Todas as competições'}, por data.</p>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${mode === 'proximos'}" data-go="#/jogos/proximos/${cf}">Próximos</button><button role="tab" aria-selected="${mode === 'resultados'}" data-go="#/jogos/resultados/${cf}">Resultados</button></div>
  ${comps.length > 1 ? `<div class="filt">${[['', 'Todas'], ...(fol.length ? [['minha', '★ A minha equipa']] : []), ...comps.map((c) => [c.id, compShort(c)])].map(([id, l]) => `<button class="pill ${id === cf ? 'on' : ''}" data-go="#/jogos/${mode}/${id}">${esc(l)}</button>`).join('')}</div>` : ''}${body}`;
}

function noticias() {
  const n = [...(DB.news || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const card = (x) => `<a class="news" ${x.url ? `href="${esc(x.url)}" target="_blank" rel="noopener"` : ''}>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ''}<div class="nk">${esc([x.date ? fmtDate(x.date) : '', x.tag || ''].filter(Boolean).join(' · '))}</div><div class="nt">${esc(x.title || '')}</div>${x.summary ? `<div class="ns">${esc(x.summary)}</div>` : ''}</a>`;
  app.innerHTML = `<h1>Notícias</h1><p class="sub">O que se passa no futebol feminino.</p>${n.length ? `<div class="cols">${n.map(card).join('')}</div>` : '<div class="empty">Ainda não há notícias.</div>'}`;
}

function conta() {
  const f = getFollow();
  const dark = document.documentElement.dataset.theme === 'dark';
  const followed = f.map((k) => { const [cid, tid] = k.split(':'); const c = DB.competitions.find((x) => x.id === cid); return c ? { c, tid } : null; }).filter(Boolean);
  app.innerHTML = `<h1>Conta</h1><p class="sub">As tuas equipas e preferências. Fica guardado neste dispositivo.</p>
  <div class="acc"><div class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div><div><div class="t">Adepta do Onze</div><div class="s">${followed.length ? `${followed.length} ${followed.length === 1 ? 'equipa seguida' : 'equipas seguidas'}` : 'Ainda não segues nenhuma equipa'}</div></div></div>
  <h2>Preferências</h2>
  <div class="opt"><div><div>Aspeto</div><div class="s">${{ auto: 'Igual ao telemóvel', light: 'Sempre claro', dark: 'Sempre escuro' }[document.documentElement.dataset.pref || 'auto']}</div></div><div class="seg">${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button class="${(document.documentElement.dataset.pref || 'auto') === k ? 'on' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div></div>
  <h2>As minhas equipas</h2>
  ${followed.length ? '<div class="tgrid">' + followed.map(({ c, tid }) => `<div class="team go" data-go="${teamHref(c, tid)}">${CREST(c, tid, 38)}<div>${esc(tname(c, tid))}<div class="s" style="color:#5b5a86;font-size:13px">${esc(c.name)}</div></div><button class="star on" data-star="${fKey(c.id, tid)}" aria-label="Deixar de seguir">★</button></div>`).join('') + '</div>' : '<div class="empty">Clica na estrela numa equipa para a seguires.</div>'}
  <h2>Seguir equipas</h2>
  ${DB.competitions.filter((c) => c.teams.length).map((c) => `<div class="dh">${esc(c.name)}</div>${equipas(c)}`).join('')}`;
}


const teamHref = (c, id) => `#/c/${c.id}/equipa/${id}`;
function teamRow(c, id) {
  if (c.series) for (const sr of c.series) { const i = sr.table.findIndex((r) => r.id === id); if (i > -1) return { ...sr.table[i], pos: i + 1, grp: (c.phase ? c.phase + ' · ' : '') + sr.name }; }
  const s = standings(c); const i = s.findIndex((r) => r.id === id);
  return i > -1 && s[i].j ? { ...s[i], pos: i + 1, grp: '' } : null;
}
// Fotos dos clubes: cada uma com a sua fonte (regra: nunca usar uma foto sem indicar de onde veio)
const FOTOS = {
  'clube-albergaria': { src: 'fotos/clube-albergaria.png', fonte: 'Instagram @clubealbergariafutfeminino', url: 'https://www.instagram.com/p/Df-hM8BBO9R/' },
  'gil-vicente': { src: 'fotos/gil-vicente.png', fonte: 'Instagram @gilvicente.fc', url: 'https://www.instagram.com/p/DgAvm_4Nv_W/' },
};
const fotoClube = (id) => { const f = FOTOS[id]; return f ? `<figure class="foto"><img src="${f.src}" alt="" loading="lazy"><figcaption>Foto: <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.fonte)}</a></figcaption></figure>` : ''; };

function equipa(cid, tid) {
  const c = DB.competitions.find((x) => x.id === cid);
  const t = c && c.teams.find((x) => x.id === tid);
  if (!t) return (app.innerHTML = '<div class="empty">Equipa não encontrada.</div>');
  const on = getFollow().includes(fKey(c.id, t.id));
  const r = teamRow(c, t.id);
  const ms = c.matches.filter((m) => m.home === t.id || m.away === t.id);
  const tt = todayStr();
  const next = ms.filter((m) => !played(m)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const res = ms.filter(played).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const stat = (k, v) => `<div class="st"><b>${v}</b><span>${k}</span></div>`;
  app.innerHTML = `<a class="back" href="#/c/${c.id}/classificacao">‹ ${esc(c.name)}</a>
  <div class="th">${CREST(c, t.id, 72)}<div class="thn"><h1>${esc(t.name)}</h1><p class="sub">${esc(c.name)}${r && r.grp ? ' · ' + esc(r.grp) : ''}</p></div>
  <button class="fbtn ${on ? 'on' : ''}" data-star="${fKey(c.id, t.id)}" aria-pressed="${on}" aria-label="Seguir equipa" title="Seguir">${on ? '★' : '☆'}</button></div>
  ${fotoClube(t.id)}
  ${r ? `<div class="stats">${stat('Posição', r.pos + '.º')}${stat('Pontos', r.pts)}${stat('Jogos', r.j)}${stat('V-E-D', `${r.v}-${r.e}-${r.d}`)}${stat('Golos', `${r.gm}:${r.gs}`)}</div>` : ''}
  <div class="cols"><div><h2>Próximos jogos</h2>${next.length ? next.slice(0, 6).map((m) => matchCard(c, { ...m, serie: undefined })).join('') : '<div class="empty">Sem jogos marcados.</div>'}</div>
  <div><h2>Resultados</h2>${res.length ? res.map((m) => matchCard(c, { ...m, serie: undefined })).join('') : '<div class="empty">Ainda sem resultados.</div>'}</div></div>`;
}

const MOTM_COMPS = ['liga-bpi'];
function jogo(cid, mid) {
  const c = DB.competitions.find((x) => x.id === cid);
  const m = c && c.matches.find((x) => x.id === mid);
  if (!m) return (app.innerHTML = '<div class="empty">Jogo não encontrado.</div>');
  const done = played(m);
  const side = (id) => `<a class="ht" href="${teamHref(c, id)}">${CREST(c, id, 64)}<span>${esc(sname(c, id))}</span></a>`;
  const meta = [c.name, c.phase && m.serie ? `${c.phase} · ${m.serie}` : m.serie, `Jornada ${m.round}`].filter(Boolean).map(esc).join(' · ');
  const when = [m.date ? fmtDate(m.date) : 'Data por definir', m.time, m.venue].filter(Boolean).map(esc).join(' · ');
  let h = `<a class="back" href="#/c/${c.id}/jogos/${m.round}">‹ Jornada ${m.round}</a>
  <div class="hero mh"><div class="hk">${meta}</div>
  <div class="hm">${side(m.home)}<div class="hc"><div class="hs">${done ? `${m.hg}–${m.ag}` : esc(m.time || '--:--')}</div><div class="hd"><span class="stt ${done ? 'fin' : ''}">${done ? 'Terminado' : 'Por jogar'}</span></div></div>${side(m.away)}</div>
  <div class="hd mw">${when}</div></div>`;

  // Mulher do jogo (Liga BPI)
  if (MOTM_COMPS.includes(c.id)) {
    const mo = m.motm;
    h += `<h2>Mulher do jogo</h2>` + (mo && mo.name
      ? `<div class="motm">${mo.team ? CREST(c, mo.team, 48) : ''}<div><div class="mn">${esc(mo.name)}</div><div class="ms">${mo.team ? esc(tname(c, mo.team)) : ''}${mo.note ? ' · ' + esc(mo.note) : ''}</div></div><div class="mstar">★</div></div>`
      : `<div class="empty sm">${done ? 'A Mulher do jogo ainda não foi indicada.' : 'Conhecida no final do jogo.'}</div>`);
  }

  // Golos
  if (done) {
    const g = (m.goals || []).slice().sort((a, b) => (parseInt(a.min) || 0) - (parseInt(b.min) || 0));
    h += `<h2>Golos</h2>` + (g.length
      ? `<div class="goals">${g.map((x) => `<div class="gl ${x.team === 'away' ? 'aw' : ''}"><span class="gm">${esc(x.min)}'</span><span class="gp">${esc(x.player || '')}${x.note ? ` <i>(${esc(x.note)})</i>` : ''}</span></div>`).join('')}</div>`
      : `<div class="empty sm">${+m.hg + +m.ag === 0 ? 'Sem golos.' : 'As marcadoras ainda não estão disponíveis.'}</div>`);
  }

  // Resumo / antevisão
  if (done) {
    h += `<h2>Resumo</h2>` + (m.summary
      ? `<div class="sum">${String(m.summary).split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
      : `<div class="empty sm">O resumo deste jogo ainda não está disponível.</div>`);
  } else {
    const rh = teamRow(c, m.home), ra = teamRow(c, m.away);
    const fm = Object.fromEntries(standings(c).map((t) => [t.id, t.form]));
    const col = (id, r) => `<div class="pv">${CREST(c, id, 36)}<b>${esc(sname(c, id))}</b><span>${r ? `${r.pos}.º · ${r.pts} pts` : '—'}</span><div class="form">${(fm[id] || []).slice(-5).map((f) => `<i class="${f}">${f.toUpperCase()}</i>`).join('')}</div></div>`;
    h += `<h2>Frente a frente</h2><div class="prev">${col(m.home, rh)}<div class="vs">vs</div>${col(m.away, ra)}</div>`;
    if (m.summary) h += `<div class="sum">${String(m.summary).split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
  }
  if (m.video) h += `<a class="btn pri vid" href="${esc(m.video)}" target="_blank" rel="noopener">▶ Ver vídeo do jogo</a>`;

  // Outros jogos da jornada
  const others = c.matches.filter((x) => x.round === m.round && x.id !== m.id && (!m.serie || x.serie === m.serie));
  if (others.length) h += `<h2>Outros jogos da jornada</h2>${others.map((x) => matchCard(c, { ...x, serie: undefined }, false, false)).join('')}`;
  app.innerHTML = h;
}

const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function procurar() {
  app.innerHTML = `<h1>Procurar</h1><div class="sbox"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" type="search" placeholder="Equipa ou competição" autocomplete="off" enterkeyhint="search"></div><div id="qr"></div>`;
}
function procurarRes(q) {
  const box = document.getElementById('qr'); if (!box) return;
  const n = norm(q).trim();
  const teams = []; DB.competitions.forEach((c) => c.teams.forEach((t) => { if (!n || norm(t.name + ' ' + (t.short || '')).includes(n)) teams.push({ c, t }); }));
  const comps = DB.competitions.filter((c) => !n || norm(c.name).includes(n));
  teams.sort((a, b) => a.t.name.localeCompare(b.t.name, 'pt'));
  box.innerHTML = (comps.length ? `<div class="dh">Competições</div><div class="qlist">${comps.map((c) => `<a class="qi" href="#/c/${c.id}">${EMB(30, c.id)}<div class="qt">${esc(c.name)}</div><i>›</i></a>`).join('')}</div>` : '')
    + (teams.length ? `<div class="dh">Equipas</div><div class="qlist">${teams.slice(0, 60).map(({ c, t }) => `<a class="qi" href="${teamHref(c, t.id)}">${CREST(c, t.id, 30)}<div class="qt">${esc(t.name)}<small>${esc(compShort(c))}</small></div><i>›</i></a>`).join('')}</div>` : '')
    + (!teams.length && !comps.length ? `<div class="empty">Nada encontrado para "${esc(q)}". Experimenta outro nome.</div>` : '');
}
document.addEventListener('input', (e) => { if (e.target.id === 'q') procurarRes(e.target.value); });

function groupMatches(root) {
  root.querySelectorAll('a.match').forEach((m) => {
    if (m.parentElement.classList.contains('list')) return;
    const w = document.createElement('div'); w.className = 'list'; m.before(w);
    let n = m;
    while (n && n.matches && n.matches('a.match')) { const nx = n.nextElementSibling; w.appendChild(n); n = nx; }
  });
}

function route() {
  const [, a, b, c, d] = location.hash.split('/');
  const sec = a === 'ligas' || a === 'c' ? 'ligas' : a === 'jogos' ? 'jogos' : a === 'noticias' ? 'noticias' : a === 'conta' || a === 'seguir' ? 'conta' : a === 'procurar' ? '' : 'home';
  document.querySelectorAll('nav a[data-n]').forEach((x) => x.classList.toggle('on', x.dataset.n === sec));
  if (a === 'ligas') ligas();
  else if (a === 'c' && c === 'equipa') equipa(b, d);
  else if (a === 'c' && c === 'jogo') jogo(b, d);
  else if (a === 'c') comp(b, c, d);
  else if (a === 'jogos') jogosAll(b, c);
  else if (a === 'noticias') noticias();
  else if (a === 'procurar') procurar();
  else if (a === 'conta' || a === 'seguir') conta();
  else home();
  app.innerHTML = `<div class="layout"><aside class="side">${sideLeagues(a === 'c' ? b : '')}</aside><div class="mainc">${app.innerHTML}</div></div>`;
  groupMatches(app);
  paintHeroes();
  paintRings();
  if (a === 'procurar') { procurarRes(''); setTimeout(() => document.getElementById('q')?.focus(), 50); }
  window.scrollTo(0, 0);
  document.querySelector('.chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

document.addEventListener('click', (e) => {
  const na = e.target.closest('nav a.on');
  if (na && (location.hash || '#/') === na.getAttribute('href')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const ts = e.target.closest('[data-theme-set]');
  if (ts) { setPref(ts.dataset.themeSet); const y = scrollY; route(); scrollTo(0, y); return; }
  const s = e.target.closest('[data-star]');
  if (s) {
    const f = getFollow(), k = s.dataset.star;
    setFollow(f.includes(k) ? f.filter((x) => x !== k) : [...f, k]);
    s.classList.toggle('on');
    if (s.classList.contains('fbtn')) { const on = s.classList.contains('on'); s.textContent = on ? '★' : '☆'; s.setAttribute('aria-pressed', on); }
    if (location.hash.startsWith('#/conta') || location.hash.startsWith('#/seguir')) { const y = scrollY; route(); scrollTo(0, y); }
    return;
  }
  const g = e.target.closest('[data-go]');
  if (g) location.hash = g.dataset.go;
});

let tx0 = null, ty0 = 0;
document.addEventListener('touchstart', (e) => { if (!/^#\/c\/[^/]+(\/jogos)?(\/\d+)?$/.test(location.hash) || (e.target.closest && e.target.closest('.chips,.compchips,.filt,.tabs'))) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (tx0 === null) return;
  const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
  const btn = document.querySelectorAll('.rnav')[dx > 0 ? 0 : 1];
  if (btn && btn.dataset.go) location.hash = btn.dataset.go;
}, { passive: true });

async function load() {
  try { DB = await (await fetch('/api/data', { cache: 'no-store' })).json(); } catch { app.innerHTML = '<div class="empty">Não foi possível carregar os dados.</div>'; return; }
  route();
}
document.getElementById('refresh').onclick = load;
const navStack = [location.hash || '#/'], scrollMem = {};
window.addEventListener('hashchange', (e) => {
  const prev = navStack[navStack.length - 1];
  scrollMem[prev] = window.scrollY;
  const h = location.hash || '#/';
  const back = navStack.length > 1 && navStack[navStack.length - 2] === h;
  if (back) navStack.pop(); else navStack.push(h);
  if (navStack.length > 50) navStack.splice(0, navStack.length - 50);
  route();
  if (back && scrollMem[h] != null) requestAnimationFrame(() => window.scrollTo(0, scrollMem[h]));
});
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
load();

const LOGO = { dark: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjExIDE0IDI4OCA2OCI+PHBhdGggZD0iTTIxIDE1Ljc1aDcuNmwtOS4xIDE3LjRoLTcuNnoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMzEgMTUuNzVoMTYuMjV2NjUuM0gzMC44OHYtNDcuOUgyMS45eiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGQ9Ik0yMC44OCAzNS4xNWg3Ljk4djQ1LjloLTcuOTh6IiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTU5LjYzIDE2aDIzLjYydjExLjI1SDcyLjYzdjE1LjYyaDEwdjExLjI1aC0xMHYyNi45M2gtMTN6IiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTg1LjYzIDE2aDIzLjYydjExLjI1SDk4LjYzdjE0aDEwLjV2MTEuMzhoLTEwLjV2MTYuNzVoMTAuODd2MTEuNjdIODUuNjN6IiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTExMiAxNmgxNi44NWwzLjk3IDQyLjloLjY4bDQtNDIuOWgxNi42M3Y2NS4wNWgtMTAuMzhWMzguNzVoLS43NWwtNS4yOCA0Mi4zaC04LjU4bC01LjU4LTQyLjNoLS45M3Y0Mi4zSDExMnoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTU3LjUgMTZoMTN2NjUuMDVoLTEzeiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGQ9Ik0xNzMuNjMgMTZoMTQuM2w5LjQyIDQyLjloLjUyVjE2aDEwdjY1LjA1aC0xMy45OWwtOS4zMy00Mi4zaC0uOHY0Mi4zaC0xMC4xMnoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMjExIDE2aDEzdjY1LjA1aC0xM3oiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMjI3LjEzIDE2aDE0LjQzbDkuMTggNDIuOWguNzZWMTZoOS44OHY2NS4wNWgtMTQuMzlsLTkuMjItNDIuM2gtLjUydjQyLjNoLTEwLjEyeiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTI4MS4yNSAxNS4xM2MxMSAwIDE3IDYuMjMgMTcgMTguNnYyOS41NGMwIDEyLjQtNiAxOC42NS0xNyAxOC42NXMtMTYuNzUtNi4yNS0xNi43NS0xOC42NVYzMy43M2MwLTEyLjM3IDUuNzUtMTguNiAxNi43NS0xOC42Wm0wIDExLjI1Yy0yLjk1IDAtMy43NSAxLjk0LTMuNzUgNS40M3YzMy4zOGMwIDMuNjYuOCA1LjU1IDMuNzUgNS41NXM0LjEzLTEuODkgNC4xMy01LjU1VjMxLjgxYzAtMy40OS0xLjE4LTUuNDMtNC4xMy01LjQzWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==", light: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjExIDE0IDI4OCA2OCI+PHBhdGggZD0iTTIxIDE1Ljc1aDcuNmwtOS4xIDE3LjRoLTcuNnoiIGZpbGw9IiMwYTBhMGEiLz48cGF0aCBkPSJNMzEgMTUuNzVoMTYuMjV2NjUuM0gzMC44OHYtNDcuOUgyMS45eiIgZmlsbD0iIzBhMGEwYSIvPjxwYXRoIGQ9Ik0yMC44OCAzNS4xNWg3Ljk4djQ1LjloLTcuOTh6IiBmaWxsPSIjMGEwYTBhIi8+PHBhdGggZD0iTTU5LjYzIDE2aDIzLjYydjExLjI1SDcyLjYzdjE1LjYyaDEwdjExLjI1aC0xMHYyNi45M2gtMTN6IiBmaWxsPSIjMGEwYTBhIi8+PHBhdGggZD0iTTg1LjYzIDE2aDIzLjYydjExLjI1SDk4LjYzdjE0aDEwLjV2MTEuMzhoLTEwLjV2MTYuNzVoMTAuODd2MTEuNjdIODUuNjN6IiBmaWxsPSIjMGEwYTBhIi8+PHBhdGggZD0iTTExMiAxNmgxNi44NWwzLjk3IDQyLjloLjY4bDQtNDIuOWgxNi42M3Y2NS4wNWgtMTAuMzhWMzguNzVoLS43NWwtNS4yOCA0Mi4zaC04LjU4bC01LjU4LTQyLjNoLS45M3Y0Mi4zSDExMnoiIGZpbGw9IiMwYTBhMGEiLz48cGF0aCBkPSJNMTU3LjUgMTZoMTN2NjUuMDVoLTEzeiIgZmlsbD0iIzBhMGEwYSIvPjxwYXRoIGQ9Ik0xNzMuNjMgMTZoMTQuM2w5LjQyIDQyLjloLjUyVjE2aDEwdjY1LjA1aC0xMy45OWwtOS4zMy00Mi4zaC0uOHY0Mi4zaC0xMC4xMnoiIGZpbGw9IiMwYTBhMGEiLz48cGF0aCBkPSJNMjExIDE2aDEzdjY1LjA1aC0xM3oiIGZpbGw9IiMwYTBhMGEiLz48cGF0aCBkPSJNMjI3LjEzIDE2aDE0LjQzbDkuMTggNDIuOWguNzZWMTZoOS44OHY2NS4wNWgtMTQuMzlsLTkuMjItNDIuM2gtLjUydjQyLjNoLTEwLjEyeiIgZmlsbD0iIzBhMGEwYSIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTI4MS4yNSAxNS4xM2MxMSAwIDE3IDYuMjMgMTcgMTguNnYyOS41NGMwIDEyLjQtNiAxOC42NS0xNyAxOC42NXMtMTYuNzUtNi4yNS0xNi43NS0xOC42NVYzMy43M2MwLTEyLjM3IDUuNzUtMTguNiAxNi43NS0xOC42Wm0wIDExLjI1Yy0yLjk1IDAtMy43NSAxLjk0LTMuNzUgNS40M3YzMy4zOGMwIDMuNjYuOCA1LjU1IDMuNzUgNS41NXM0LjEzLTEuODkgNC4xMy01LjU1VjMxLjgxYzAtMy40OS0xLjE4LTUuNDMtNC4xMy01LjQzWiIgZmlsbD0iIzBhMGEwYSIvPjwvc3ZnPg==" };
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
const getPref = () => { try { return localStorage.getItem('onze-theme') || 'auto'; } catch { return 'auto'; } };
const resolveTheme = (p) => (p === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : p);
function applyTheme() {
  const p = getPref(), t = resolveTheme(p);
  document.documentElement.dataset.theme = t; document.documentElement.dataset.pref = p;
  const img = document.querySelector("header.top .logo img"); if (img) img.src = LOGO[t];
  const b = document.getElementById("theme"); if (b) { b.textContent = t === "dark" ? "☀" : "☾"; b.setAttribute('aria-label', t === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'); }
  const m = document.querySelector("meta[name=theme-color]"); if (m) m.content = t === "dark" ? "#090A22" : "#F3F4F8";
}
function setPref(p) { try { localStorage.setItem('onze-theme', p); } catch {} applyTheme(); }
document.getElementById("theme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; setPref(resolveTheme('auto') === t ? 'auto' : t); if (location.hash.startsWith('#/conta')) route(); };
if (mq) (mq.addEventListener ? mq.addEventListener('change', () => { if (getPref() === 'auto') applyTheme(); }) : mq.addListener(() => { if (getPref() === 'auto') applyTheme(); }));
applyTheme();

// ===== Cartão do jogo com degradê nas cores dos dois clubes (tiradas dos emblemas) =====
const _cc = {};
function crestColor(img) {
  const k = img.currentSrc || img.src;
  if (_cc[k]) return _cc[k];
  return (_cc[k] = new Promise((res) => {
    const go = () => {
      try {
        const S = 40, cv = document.createElement('canvas'); cv.width = cv.height = S;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, S, S);
        cx.drawImage(img, 0, 0, S, S);
        const d = cx.getImageData(0, 0, S, S).data, b = {};
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], bl = d[i + 2];
          const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), sat = mx ? (mx - mn) / mx : 0;
          if (sat < 0.4 || mx < 70 || mn > 200) continue;            // ignora branco, preto e cinzentos
          let h = mx === r ? ((g - bl) / (mx - mn)) % 6 : mx === g ? (bl - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
          h = Math.round(((h * 60 + 360) % 360) / 20);              // 18 famílias de cor
          const e = b[h] || (b[h] = { n: 0, r: 0, g: 0, b: 0 }); const w = sat;
          e.n += w; e.r += r * w; e.g += g * w; e.b += bl * w;
        }
        const top = Object.values(b).sort((x, y) => y.n - x.n)[0];
        res(top && top.n > 6 ? [top.r / top.n, top.g / top.n, top.b / top.n] : null);
      } catch { res(null); }
    };
    img.complete && img.naturalWidth ? go() : (img.onload = go, setTimeout(() => res(null), 2500));
  }));
}
function tone([r, g, b]) {  // escurece/satura para o texto branco ler bem
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255; let l = (mx + mn) / 2;
  const d = mx - mn; let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); let h = 0;
  if (d) { h = mx * 255 === r ? ((g - b) / 255 / d) % 6 : mx * 255 === g ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4; h = (h * 60 + 360) % 360; }
  l = Math.min(0.40, Math.max(0.24, l)); s = Math.max(0.5, Math.min(0.85, s));
  return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
}
async function paintHeroes() {
  for (const hero of document.querySelectorAll('.hero')) {
    const imgs = hero.querySelectorAll('.cr img');
    if (imgs.length < 2) continue;
    const [A, B] = await Promise.all([crestColor(imgs[0]), crestColor(imgs[1])]);
    const ca = A ? tone(A) : '#1b1a6b', cb = B ? tone(B) : '#2a2a55';
    hero.style.background = `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.22)),linear-gradient(100deg,${ca} 0%,${cb} 100%)`;
  }
}

// Anel do emblema na página da equipa: cor tirada do próprio emblema
async function paintRings() {
  for (const cr of document.querySelectorAll('.th .cr')) {
    const img = cr.querySelector('img'); if (!img) continue;
    const c = await crestColor(img); if (!c) continue;
    const [r, g, b] = c; const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l0 = (mx + mn) / 2, d = mx - mn;
    let h = 0; if (d) { h = mx * 255 === r ? ((g - b) / 255 / d) % 6 : mx * 255 === g ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4; h = (h * 60 + 360) % 360; }
    cr.style.setProperty('--ring', `hsl(${h.toFixed(0)} 72% ${Math.min(0.55, Math.max(0.42, l0)) * 100}%)`);
  }
}

// ===== Pop-up "Instalar a app no telemóvel?" =====
(function installPrompt() {
  const KEY = 'onze-install-ate';
  const q = new URLSearchParams(location.search);
  const forced = q.has('instalar');                         // ?instalar=1&p=ios|android para pré-visualizar
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const plat = forced && q.get('p') ? q.get('p') : ios ? 'ios' : android ? 'android' : '';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Messenger|TikTok/i.test(ua);
  if (!forced && (!/^https?:/.test(location.protocol) || standalone || !plat)) return;
  try { if (!forced && Date.now() < (+localStorage.getItem(KEY) || 0)) return; } catch {}
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  const later = (days) => { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch {} };
  const close = () => document.querySelector('.inst')?.remove();
  const SHARE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  const DOTS = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  const DOTSH = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  const steps = () => {
    const open = inApp ? `<li>Abre esta página no ${plat === 'ios' ? 'Safari' : 'Chrome'}: toca nos três pontinhos e em <b>Abrir no browser</b>.</li>` : `<li>Abre esta página no ${plat === 'ios' ? '<b>Safari</b>' : '<b>Chrome</b>'}.</li>`;
    return plat === 'ios'
      ? `${open}<li>Toca nos <b>três pontinhos</b> ${DOTSH} (ou no botão <b>Partilhar</b> ${SHARE}), em baixo no ecrã.</li><li>Escolhe <b>Partilhar</b> e, na lista, <b>Adicionar ao ecrã principal</b>.</li><li>Toca em <b>Adicionar</b>. O ícone fica no teu telemóvel como uma app.</li>`
      : `${open}<li>Toca nos <b>três pontinhos</b> ${DOTS}, no canto de cima.</li><li>Escolhe <b>Instalar app</b> (ou <b>Adicionar ao ecrã principal</b>).</li><li>Confirma em <b>Instalar</b>. O ícone fica no teu telemóvel como uma app.</li>`;
  };
  const ask = () => {
    if (document.querySelector('.inst')) return;
    const el = document.createElement('div'); el.className = 'inst'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="inst-card"><img class="inst-ic" src="marca/icone-192.png" alt=""><h3>Instalar a app no telemóvel?</h3><p>Fica no ecrã principal, abre mais depressa e sem a barra do browser.</p><div class="inst-b"><button class="yes">Sim, mostrar como</button><button class="no">Agora não</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector('.no').onclick = () => { later(14); close(); };
    el.addEventListener('click', (e) => { if (e.target === el) { later(14); close(); } });
    el.querySelector('.yes').onclick = async () => {
      if (deferred && plat === 'android') { deferred.prompt(); try { await deferred.userChoice; } catch {} later(90); close(); return; }
      el.querySelector('.inst-card').innerHTML = `<h3>Como instalar</h3><ol class="inst-s">${steps()}</ol><div class="inst-b"><button class="yes ok">Percebi</button></div>`;
      el.querySelector('.ok').onclick = () => { later(90); close(); };
    };
  };
  setTimeout(ask, forced ? 300 : 6000);
})();
