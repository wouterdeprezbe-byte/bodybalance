/* Body Balance Rapport voor de klant: totaalscore, kleurenbalk en scorekaart, plus download als PDF.
   De gegevens staan in de link zelf (#r=...), worden nooit naar een server gestuurd en bevatten geen antwoorden. */
(function () {
  'use strict';
  var CATS = [
    ['EPD', 'Oestrogeen- en progesterontekort', 'Geslachtshormonen'], ['ED', 'Oestrogeendominantie', 'Geslachtshormonen'],
    ['LA', 'Lage androgenen', 'Geslachtshormonen'], ['HA', 'Hoge androgenen', 'Geslachtshormonen'],
    ['LC', 'Laag cortisol', 'Bijnier en stress'], ['HC', 'Hoog cortisol', 'Bijnier en stress'],
    ['HYPO', 'Hypometabolisme', 'Stofwisseling'], ['MS', 'Metabool syndroom', 'Stofwisseling'],
    ['TL', 'Toxische belasting', 'Belasting']
  ];
  var BANDS = [{ id: 'ok', max: 14, nl: 'In balans', c: '#4F8A4B', soft: '#DCE8D3' }, { id: 'watch', max: 25, nl: 'Suboptimaal', c: '#D69A1A', soft: '#F6E8C6' },
    { id: 'off', max: 49, nl: 'Uit balans', c: '#C2552F', soft: '#F4DED4' }, { id: 'severe', max: 100, nl: 'Ernstige disbalans', c: '#8C2323', soft: '#EED3D1' }];
  var ZONES = [{ to: 30, nl: 'Ernstig', full: 'Ernstig uit balans', c: '#7E1F22', ink: '#FFFFFF' }, { to: 50, nl: 'Sterk', full: 'Sterk uit balans', c: '#C2452D', ink: '#FFFFFF' },
    { to: 70, nl: 'Duidelijk', full: 'Duidelijk uit balans', c: '#E28A2B', ink: '#16293A' }, { to: 85, nl: 'Licht', full: 'Licht uit balans', c: '#9FB23A', ink: '#16293A' },
    { to: 100.01, nl: 'In balans', full: 'Sterk in balans', c: '#3F8A4A', ink: '#FFFFFF' }];
  var INK = '#16293A', INK2 = '#3D4F60', MUTED = '#7D6B5C', LINE = '#DFE4E9', TRACK = '#E9EDF1', OCHRE = '#E0A32E';
  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function dmy(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function longDate(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0] : ''; }
  function band(pct) { for (var i = 0; i < BANDS.length; i++) if (pct <= BANDS[i].max) return BANDS[i]; return BANDS[3]; }
  function zone(v) { for (var i = 0; i < ZONES.length; i++) if (v < ZONES[i].to) return i; return 4; }
  function groups() { var g = []; CATS.forEach(function (c) { if (g.indexOf(c[2]) < 0) g.push(c[2]); }); return g; }

  function parse() {
    var m = /[#&]r=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return null;
    try {
      var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var d = JSON.parse(new TextDecoder().decode(bytes));
      if (!d || d.v !== 1 || !Array.isArray(d.c) || d.c.length !== 9 || typeof d.t !== 'number') return null;
      d.c = d.c.map(function (x) { return Math.max(0, Math.min(100, Math.round(+x || 0))); });
      d.t = Math.max(0, Math.min(100, d.t));
      return d;
    } catch (e) { return null; }
  }

  /* ---------------- scherm ---------------- */
  function rulerHtml(v) {
    var h = '<div class="rp-ruler"><b class="rp-marker" style="left:' + v + '%" aria-hidden="true"></b><div class="rp-track">', from = 0;
    ZONES.forEach(function (z, i) { var to = Math.min(100, z.to); h += '<span style="width:' + (to - from) + '%;background:' + z.c + ';--zi:' + z.ink + '"' + (i === zone(v) ? ' class="on"' : '') + '>' + z.nl + '</span>'; from = to; });
    return h + '</div><div class="rp-ticks"><span style="left:0">0</span><span style="left:30%">30</span><span style="left:50%">50</span><span style="left:70%">70</span><span style="left:85%">85</span><span style="left:100%">100</span></div></div>';
  }
  function render(d) {
    var z = ZONES[zone(d.t)];
    var h = '<article class="rp-sheet" aria-label="Body Balance Rapport">';
    h += '<header class="rp-head"><p class="rp-eyebrow">NextLevelHealth Coaching</p><h1>Body Balance Rapport</h1></header>';
    h += '<dl class="rp-meta"><div><dt>Naam</dt><dd>' + esc(d.n) + '</dd></div><div><dt>Geslacht</dt><dd>' + (d.s === 'men' ? 'Man' : 'Vrouw') + '</dd></div>' +
      (d.b ? '<div><dt>Geboortedatum</dt><dd>' + dmy(d.b) + '</dd></div>' : '') + '<div><dt>Datum intake</dt><dd>' + dmy(d.d) + '</dd></div></dl>';
    h += '<section class="rp-score"><p class="rp-label">Total Body Balance Score</p><div class="rp-num"><span class="num">' + n1(d.t) + '</span><span class="rp-pill" style="background:' + z.c + ';color:' + z.ink + '">' + z.full + '</span><small>op 100</small></div>' + rulerHtml(d.t) + '</section>';
    h += '<section class="rp-card"><h2>Scorekaart</h2><p class="rp-legend">' + BANDS.map(function (b, i) { return '<span><i style="background:' + b.c + '"></i>' + b.nl + ' ' + (i === 0 ? '0–14%' : i === 1 ? '15–25%' : i === 2 ? '26–49%' : '50%+') + '</span>'; }).join('') + '</p>';
    groups().forEach(function (g) {
      h += '<h3>' + esc(g) + '</h3><ul>';
      CATS.forEach(function (c, i) {
        if (c[2] !== g) return;
        var p = d.c[i], b = band(p);
        h += '<li><span class="rp-name"><b>' + esc(c[1]) + '</b> <span class="rp-code">' + c[0] + '</span><small style="color:' + b.c + '">● ' + b.nl + '</small></span>' +
          '<span class="rp-bar"><span style="width:' + Math.max(p, 1) + '%;background:' + b.c + '"></span></span><span class="rp-pct num">' + p + '%</span></li>';
      });
      h += '</ul>';
    });
    h += '</section><footer class="rp-foot">Rapport gegenereerd door NextLevelHealth Coaching op ' + longDate(d.d) + '.</footer></article>';
    $('#main').innerHTML = h;
    $('#nav').innerHTML = '<button type="button" class="btn primary small" id="pdf-btn">Download als PDF</button>';
    $('#pdf-btn').addEventListener('click', function () { downloadPdf(d, this); });
  }

  /* ---------------- PDF ---------------- */
  function load(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function base() { var s = document.querySelector('script[src*="report.js"]'); return s ? s.src.replace(/report\.js.*$/, '') : 'assets/'; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  function buildPdf(d) {
    var J = window.jspdf.jsPDF, doc = new J({ unit: 'mm', format: 'a4', compress: true });
    window.BBS_PDF_FONTS.forEach(function (f) { doc.addFileToVFS(f.file, f.data); doc.addFont(f.file, f.family, f.style); });
    var W = 210, L = 18, R = 192, CW = R - L;
    function fill(c) { doc.setFillColor.apply(doc, rgb(c)); }
    function color(c) { doc.setTextColor.apply(doc, rgb(c)); }
    function font(fam, st, size) { doc.setFont(fam, st); doc.setFontSize(size); }
    function text(t, x, y, o) { doc.text(String(t), x, y, o || {}); }

    // kop
    fill(INK); doc.rect(0, 0, W, 30, 'F');
    fill(OCHRE); doc.triangle(W - 22, 0, W, 0, W, 22, 'F');
    font('Plex', 'normal', 7.5); color(OCHRE); doc.setCharSpace(0.6); text('NEXTLEVELHEALTH COACHING', L, 12); doc.setCharSpace(0);
    font('Archivo', 'bold', 21); color('#FFFFFF'); text('Body Balance Rapport', L, 23);

    // gegevens
    var meta = [['Naam', d.n], ['Geslacht', d.s === 'men' ? 'Man' : 'Vrouw']];
    if (d.b) meta.push(['Geboortedatum', dmy(d.b)]);
    meta.push(['Datum intake', dmy(d.d)]);
    meta.forEach(function (m, i) {
      var x = L + (i % 2) * (CW / 2), y = 41 + Math.floor(i / 2) * 13;
      font('Plex', 'normal', 6.5); color(MUTED); doc.setCharSpace(0.4); text(m[0].toUpperCase(), x, y); doc.setCharSpace(0);
      font('Instrument', 'bold', 11); color(INK); text(doc.splitTextToSize(String(m[1] || ''), CW / 2 - 6)[0] || '', x, y + 5.5);
    });
    var y0 = 41 + Math.ceil(meta.length / 2) * 13 - 2;
    doc.setDrawColor.apply(doc, rgb(LINE)); doc.setLineWidth(0.3); doc.line(L, y0, R, y0);

    // totaalscore
    var z = ZONES[zone(d.t)], ys = y0 + 10;
    font('Plex', 'normal', 7); color(MUTED); doc.setCharSpace(0.5); text('TOTAL BODY BALANCE SCORE', L, ys); doc.setCharSpace(0);
    font('Archivo', 'bold', 44); color(INK); var num = n1(d.t); text(num, L - 0.6, ys + 17);
    var nx = L + doc.getTextWidth(num) + 6;
    font('Instrument', 'bold', 10); var pw = doc.getTextWidth(z.full) + 8;
    fill(z.c); doc.roundedRect(nx, ys + 4.5, pw, 7.5, 3.75, 3.75, 'F'); color(z.ink); text(z.full, nx + 4, ys + 9.6);
    font('Instrument', 'normal', 8.5); color(INK2); text('op 100', nx, ys + 17);

    // kleurenbalk
    var yb = ys + 27, bh = 7.5, from = 0;
    ZONES.forEach(function (zz, i) {
      var to = Math.min(100, zz.to), x = L + CW * from / 100, w = CW * (to - from) / 100;
      fill(zz.c); doc.rect(x + (i ? 0.4 : 0), yb, w - (i ? 0.4 : 0), bh, 'F');
      font('Plex', 'normal', 6.5); color(zz.ink); text(zz.nl, x + 2, yb + 4.9);
      from = to;
    });
    var mx = L + CW * Math.max(0, Math.min(100, d.t)) / 100;
    fill(INK); doc.triangle(mx - 2.6, yb - 4.2, mx + 2.6, yb - 4.2, mx, yb - 0.6, 'F');
    font('Plex', 'normal', 6.5); color(MUTED);
    [0, 30, 50, 70, 85, 100].forEach(function (t) { text(String(t), L + CW * t / 100, yb + bh + 4.2, { align: t === 0 ? 'left' : t === 100 ? 'right' : 'center' }); });

    // scorekaart
    var y = yb + bh + 16;
    font('Archivo', 'bold', 15); color(INK); text('Scorekaart', L, y);
    y += 6; var lx = L;
    BANDS.forEach(function (b, i) {
      var lab = b.nl + ' ' + (i === 0 ? '0–14%' : i === 1 ? '15–25%' : i === 2 ? '26–49%' : '50%+');
      fill(b.c); doc.circle(lx + 1.2, y - 1.1, 1.2, 'F');
      font('Instrument', 'normal', 8); color(INK2); text(lab, lx + 3.4, y); lx += doc.getTextWidth(lab) + 9;
    });
    y += 7;
    var bx = 112, bw = 62;
    groups().forEach(function (g) {
      font('Plex', 'normal', 7); color(MUTED); doc.setCharSpace(0.5); text(g.toUpperCase(), L, y); doc.setCharSpace(0);
      y += 2.5;
      CATS.forEach(function (c, i) {
        if (c[2] !== g) return;
        var p = d.c[i], b = band(p);
        doc.setDrawColor.apply(doc, rgb(LINE)); doc.line(L, y, R, y);
        font('Instrument', 'bold', 10.5); color(INK); text(c[1], L, y + 5.4);
        var cw = doc.getTextWidth(c[1]); font('Plex', 'normal', 6.5); color(MUTED); text(c[0], L + cw + 1.8, y + 5.4);
        font('Instrument', 'bold', 8); color(b.c); fill(b.c); doc.circle(L + 0.9, y + 8.6, 0.9, 'F'); text(b.nl, L + 3, y + 9.6);
        fill(TRACK); doc.roundedRect(bx, y + 4.2, bw, 3, 1.5, 1.5, 'F');
        fill(b.c); doc.roundedRect(bx, y + 4.2, Math.max(3, bw * p / 100), 3, 1.5, 1.5, 'F');
        font('Instrument', 'bold', 11.5); color(INK); text(p + '%', R, y + 6.8, { align: 'right' });
        y += 12;
      });
      y += 4;
    });

    // voet
    doc.setDrawColor.apply(doc, rgb(LINE)); doc.line(L, 281, R, 281);
    font('Instrument', 'normal', 8); color(MUTED); text('Rapport gegenereerd door NextLevelHealth Coaching op ' + longDate(d.d) + '.', L, 286);
    doc.setProperties({ title: 'Body Balance Rapport – ' + (d.n || ''), author: 'NextLevelHealth Coaching', subject: 'Body Balance Rapport' });
    return doc;
  }
  function fileName(d) { return ('Body Balance Rapport - ' + (d.n || 'klant') + ' - ' + d.d).replace(/[\\/:*?"<>|]+/g, '') + '.pdf'; }
  function downloadPdf(d, btn) {
    var b = base(); btn.disabled = true; var lab = btn.textContent; btn.textContent = 'PDF maken…';
    var need = [];
    if (!window.jspdf) need.push(load(b + 'vendor/jspdf.umd.min.js'));
    if (!window.BBS_PDF_FONTS) need.push(load(b + 'vendor/pdf-fonts.js'));
    Promise.all(need).then(function () { buildPdf(d).save(fileName(d)); })
      .catch(function () { alertBox('De PDF kon niet gemaakt worden. Probeer het opnieuw.'); })
      .then(function () { btn.disabled = false; btn.textContent = lab; });
  }
  function alertBox(msg) { var p = document.createElement('p'); p.className = 'notice'; p.setAttribute('role', 'alert'); p.textContent = msg; $('#main').prepend(p); }

  window.BBSReport = { parse: parse, buildPdf: buildPdf, fileName: fileName };
  var d = parse();
  if (d) render(d);
  else $('#main').innerHTML = '<section class="status-card"><h1>Geen rapport gevonden</h1><p>Deze link bevat geen geldige rapportgegevens. Open het rapport via de knop in de e-mail.</p></section>';
})();
