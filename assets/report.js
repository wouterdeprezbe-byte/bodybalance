/* Body Balance Rapport voor de klant: totaalscore, kleurenbalk en scorekaart, plus download als PDF.
   De gegevens staan in de link zelf (#r=...), worden nooit naar een server gestuurd en bevatten geen antwoorden. */
(function () {
  'use strict';
  var CATS = [
    ['EPD', 'Oestrogeen- en progesterontekort', 'Geslachtshormonen'], ['ED', 'Oestrogeendominantie', 'Geslachtshormonen'],
    ['LA', 'Lage androgenen', 'Geslachtshormonen'], ['HA', 'Hoge androgenen', 'Geslachtshormonen'],
    ['LC', 'Laag cortisol', 'Bijnier en stress'], ['HC', 'Hoog cortisol', 'Bijnier en stress'],
    ['HYPO', 'Hypometabolisme', 'Stofwisseling'], ['MS', 'Metabool syndroom', 'Stofwisseling'],
    ['DG', 'Verstoorde spijsvertering', 'Spijsvertering'], ['TL', 'Toxische belasting', 'Belasting']
  ];
  /* volgorde van de scores in de link: versie 1 (9 domeinen) en versie 2 (met spijsvertering) */
  var ORDER = { 1: ['EPD', 'ED', 'LA', 'HA', 'LC', 'HC', 'HYPO', 'MS', 'TL'], 2: ['EPD', 'ED', 'LA', 'HA', 'LC', 'HC', 'HYPO', 'MS', 'DG', 'TL'] };
  var BANDS = [{ id: 'ok', max: 14, nl: 'In balans', c: '#4F8A4B', soft: '#DCE8D3' }, { id: 'watch', max: 25, nl: 'Suboptimaal', c: '#D69A1A', soft: '#F6E8C6' },
    { id: 'off', max: 49, nl: 'Uit balans', c: '#C2552F', soft: '#F4DED4' }, { id: 'severe', max: 100, nl: 'Ernstige disbalans', c: '#8C2323', soft: '#EED3D1' }];
  var ZONES = [{ to: 30, nl: 'Ernstig', full: 'Ernstig uit balans', c: '#7E1F22', ink: '#FFFFFF' }, { to: 50, nl: 'Sterk', full: 'Sterk uit balans', c: '#C2452D', ink: '#FFFFFF' },
    { to: 70, nl: 'Duidelijk', full: 'Duidelijk uit balans', c: '#E28A2B', ink: '#16293A' }, { to: 85, nl: 'Licht', full: 'Licht uit balans', c: '#9FB23A', ink: '#16293A' },
    { to: 100.01, nl: 'In balans', full: 'Sterk in balans', c: '#3F8A4A', ink: '#FFFFFF' }];
  var INK = '#16293A', MUTED = '#7D6B5C', LINE = '#E3DED6', TRACK = '#EEEAE3';
  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function dmy(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function longDate(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0] : ''; }
  function band(pct) { for (var i = 0; i < BANDS.length; i++) if (pct <= BANDS[i].max) return BANDS[i]; return BANDS[3]; }
  function zone(v) { for (var i = 0; i < ZONES.length; i++) if (v < ZONES[i].to) return i; return 4; }
  function cats(d) { return CATS.filter(function (c) { return c[0] in d.p; }); }
  function groups(d) { var g = []; cats(d).forEach(function (c) { if (g.indexOf(c[2]) < 0) g.push(c[2]); }); return g; }

  function parse() {
    var m = /[#&]r=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return null;
    try {
      var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var d = JSON.parse(new TextDecoder().decode(bytes));
      var order = d && (d.v === 1 || d.v === 2) ? ORDER[d.v] : null;
      if (!order || !Array.isArray(d.c) || d.c.length !== order.length || typeof d.t !== 'number') return null;
      d.p = {};
      order.forEach(function (k, i) { d.p[k] = Math.max(0, Math.min(100, Math.round(+d.c[i] || 0))); });
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
  function tiles(d) {
    var t = [['Geslacht', d.s === 'men' ? 'Man' : 'Vrouw']];
    if (d.b) t.push(['Geboortedatum', dmy(d.b)]);
    t.push(['Datum intake', dmy(d.d)]);
    return t;
  }
  function render(d) {
    var z = ZONES[zone(d.t)], A = base();
    var h = '<div class="rp-actions"><button type="button" class="btn primary" id="pdf-btn">Download als PDF</button></div>';
    h += '<article class="rp-sheet" aria-label="Body Balance Rapport">';
    h += '<header class="rp-head"><img class="rp-logo" src="' + A + 'logo-on-dark.svg" alt="The Next Level Health Project" width="508" height="243"><div class="rp-rule" aria-hidden="true"></div>' +
      '<h1>Body Balance <em>Rapport</em></h1><p class="rp-name">' + esc(d.n) + '</p><dl class="rp-tiles">' +
      tiles(d).map(function (t) { return '<div><dt>' + t[0] + '</dt><dd>' + t[1] + '</dd></div>'; }).join('') + '</dl></header>';
    h += '<section class="rp-score"><p class="rp-label">Total Body Balance Score</p><div class="rp-num"><span class="num">' + n1(d.t) + '</span><span class="rp-pill" style="background:' + z.c + ';color:' + z.ink + '">' + z.full + '</span><small>op 100</small></div>' + rulerHtml(d.t) + '</section>';
    h += '<section class="rp-card"><h2 class="rp-h2"><span class="rp-icon" aria-hidden="true"><img src="' + A + 'mark-on-dark.svg" alt=""></span>Scorekaart</h2><p class="rp-legend">' + BANDS.map(function (b, i) { return '<span><i style="background:' + b.c + '"></i>' + b.nl + ' ' + (i === 0 ? '0–14%' : i === 1 ? '15–25%' : i === 2 ? '26–49%' : '50%+') + '</span>'; }).join('') + '</p>';
    groups(d).forEach(function (g) {
      h += '<h3>' + esc(g) + '</h3><ul>';
      cats(d).forEach(function (c) {
        if (c[2] !== g) return;
        var p = d.p[c[0]], b = band(p);
        h += '<li><span class="rp-name-cat"><b>' + esc(c[1]) + '</b> <span class="rp-code">' + c[0] + '</span><small style="color:' + b.c + '">● ' + b.nl + '</small></span>' +
          '<span class="rp-bar"><span style="width:' + Math.max(p, 1) + '%;background:' + b.c + '"></span></span><span class="rp-pct num">' + p + '%</span></li>';
      });
      h += '</ul>';
    });
    h += '</section><footer class="rp-foot"><span>nextlevelhealth.me</span><span>' + esc(String(d.n || '').toUpperCase()) + ' · ' + dmy(d.d) + '</span></footer></article>';
    $('#main').innerHTML = h;
    $('#pdf-btn').addEventListener('click', function () { downloadPdf(d, this); });
  }

  /* ---------------- PDF ---------------- */
  function load(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function base() { var s = document.querySelector('script[src*="report.js"]'); return s ? s.src.replace(/report\.js.*$/, '') : 'assets/'; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  function buildPdf(d) {
    var J = window.jspdf.jsPDF, doc = new J({ unit: 'mm', format: 'a4', compress: true }), IMG = window.BBS_PDF_IMG;
    window.BBS_PDF_FONTS.forEach(function (f) { doc.addFileToVFS(f.file, f.data); doc.addFont(f.file, f.family, f.style); });
    var L = 18, R = 192, CW = R - L, SAND = '#F8F2E7', DEEP = '#16293A', CLAY = '#B4674A', TILE = '#273848', RULE = '#3A4A59', MUTE_D = '#9FB0BC';
    function fill(c) { doc.setFillColor.apply(doc, rgb(c)); }
    function color(c) { doc.setTextColor.apply(doc, rgb(c)); }
    function draw(c) { doc.setDrawColor.apply(doc, rgb(c)); }
    function font(fam, st, size) { doc.setFont(fam, st); doc.setFontSize(size); }
    function text(t, x, y, o) { doc.text(String(t), x, y, o || {}); }
    // letterspatiëring 0.16em zoals in het design system; jsPDF past charSpace toe in mm, dus breedte zelf berekenen
    function label(t, x, y, c, o) {
      var size = 6.5, cs = 0.16 * size * 0.3528, str = String(t).toUpperCase();
      font('Plex', 'normal', size); color(c); doc.setCharSpace(0);
      var w = doc.getTextWidth(str) + cs * (str.length - 1);
      doc.setCharSpace(cs); text(str, o && o.align === 'right' ? x - w : x, y); doc.setCharSpace(0);
    }

    // kopkaart zoals het bloedlabo-rapport
    var cx = 12, cy = 12, cw = 186, ch = 68;
    fill(DEEP); doc.roundedRect(cx, cy, cw, ch, 1.8, 1.8, 'F');
    doc.saveGraphicsState();
    doc.roundedRect(cx, cy, cw, ch, 1.8, 1.8, null); doc.clip(); doc.discardPath();
    fill('#22374A'); doc.circle(cx + cw - 6, cy + 4, 34, 'F');
    doc.restoreGraphicsState();
    var lw = 36, lh = lw / IMG.logoRatio;
    doc.addImage(IMG.logo, 'PNG', L, cy + 7, lw, lh);
    draw(RULE); doc.setLineWidth(0.25); doc.line(L, cy + 9 + lh, R, cy + 9 + lh);
    var ty = cy + 9 + lh + 10.5;
    font('ArchivoW', 'normal', 21); color(SAND); text('Body Balance ', L, ty);
    var tw = doc.getTextWidth('Body Balance '); color('#E0A32E'); text('Rapport', L + tw, ty);
    font('Instrument', 'normal', 10.5); color(SAND); text(doc.splitTextToSize(String(d.n || ''), CW)[0] || '', L, ty + 6.5);
    var T = tiles(d), gap = 3, tw2 = (CW - gap * (T.length - 1)) / T.length, ty2 = ty + 10;
    T.forEach(function (t, i) {
      var x = L + i * (tw2 + gap);
      fill(TILE); doc.roundedRect(x, ty2, tw2, 12.5, 1.2, 1.2, 'F');
      label(t[0], x + 3.5, ty2 + 4.6, MUTE_D);
      font('Instrument', 'bold', 10); color(SAND); text(t[1], x + 3.5, ty2 + 9.6);
    });

    // totaalscore
    var z = ZONES[zone(d.t)], ys = cy + ch + 9;
    label('Total Body Balance Score', L, ys, MUTED);
    font('ArchivoW', 'bold', 42); color(INK); var num = n1(d.t); text(num, L - 0.5, ys + 16);
    var nx = L + doc.getTextWidth(num) + 6;
    font('Instrument', 'bold', 10); var pw = doc.getTextWidth(z.full) + 9;
    fill(z.c); doc.roundedRect(nx, ys + 4, pw, 7.5, 3.75, 3.75, 'F'); color(z.ink); text(z.full, nx + 4.5, ys + 9.1);
    font('Instrument', 'normal', 8.5); color(MUTED); text('op 100', nx, ys + 16);

    // kleurenbalk
    var yb = ys + 24, bh = 7, from = 0;
    ZONES.forEach(function (zz, i) {
      var to = Math.min(100, zz.to), x = L + CW * from / 100, w = CW * (to - from) / 100;
      fill(zz.c); doc.rect(x + (i ? 0.4 : 0), yb, w - (i ? 0.4 : 0), bh, 'F');
      font('Plex', 'normal', 6.3); color(zz.ink); doc.setCharSpace(0.25); text(zz.nl.toUpperCase(), x + 2, yb + 4.6); doc.setCharSpace(0);
      from = to;
    });
    var mx = L + CW * Math.max(0, Math.min(100, d.t)) / 100;
    fill(INK); doc.triangle(mx - 2.5, yb - 4, mx + 2.5, yb - 4, mx, yb - 0.6, 'F');
    font('Plex', 'normal', 6.3); color(MUTED);
    [0, 30, 50, 70, 85, 100].forEach(function (t) { text(String(t), L + CW * t / 100, yb + bh + 4, { align: t === 0 ? 'left' : t === 100 ? 'right' : 'center' }); });

    // scorekaart
    var y = yb + bh + 13;
    fill(DEEP); doc.roundedRect(L, y - 6, 8, 8, 1.2, 1.2, 'F'); doc.addImage(IMG.mark, 'PNG', L + 1.2, y - 4.8, 5.6, 5.6);
    font('ArchivoW', 'normal', 15); color(INK); text('Scorekaart', L + 11, y);
    y += 6.5; var lx = L;
    BANDS.forEach(function (b, i) {
      var lab = b.nl + ' ' + (i === 0 ? '0–14%' : i === 1 ? '15–25%' : i === 2 ? '26–49%' : '50%+');
      fill(b.c); doc.circle(lx + 1.1, y - 1.1, 1.1, 'F');
      font('Instrument', 'normal', 8); color(INK); text(lab, lx + 3.3, y); lx += doc.getTextWidth(lab) + 8.5;
    });
    y += 7;
    var bx = 112, bw = 62;
    var rowH = cats(d).length > 9 ? 10.2 : 10.8, grpGap = cats(d).length > 9 ? 4.5 : 4;
    groups(d).forEach(function (g) {
      label(g, L, y, MUTED);
      y += 2.3;
      cats(d).forEach(function (c) {
        if (c[2] !== g) return;
        var p = d.p[c[0]], b = band(p);
        draw(LINE); doc.setLineWidth(0.25); doc.line(L, y, R, y);
        font('Instrument', 'bold', 10.5); color(INK); text(c[1], L, y + 5.2);
        var cw2 = doc.getTextWidth(c[1]); label(c[0], L + cw2 + 1.8, y + 5.2, MUTED);
        font('Instrument', 'bold', 8); color(b.c); fill(b.c); doc.circle(L + 0.9, y + 8.4, 0.9, 'F'); text(b.nl, L + 3, y + 9.3);
        fill(TRACK); doc.roundedRect(bx, y + 4, bw, 3, 1.5, 1.5, 'F');
        fill(b.c); doc.roundedRect(bx, y + 4, Math.max(3, bw * p / 100), 3, 1.5, 1.5, 'F');
        font('ArchivoW', 'bold', 11.5); color(INK); text(p + '%', R, y + 6.6, { align: 'right' });
        y += rowH;
      });
      y += grpGap;
    });

    // voet zoals het bloedlabo-rapport
    draw(CLAY); doc.setLineWidth(0.3); doc.line(L, 282, R, 282);
    label('nextlevelhealth.me', L, 286.5, MUTED);
    label(String(d.n || '') + ' · ' + dmy(d.d), R, 286.5, MUTED, { align: 'right' });
    doc.setProperties({ title: 'Body Balance Rapport – ' + (d.n || ''), author: 'The Next Level Health Project', subject: 'Body Balance Rapport' });
    return doc;
  }
  function fileName(d) { return ('Body Balance Rapport - ' + (d.n || 'klant') + ' - ' + d.d).replace(/[\\/:*?"<>|]+/g, '') + '.pdf'; }
  function downloadPdf(d, btn) {
    var b = base(); btn.disabled = true; var lab = btn.textContent; btn.textContent = 'PDF maken…';
    var need = [];
    if (!window.jspdf) need.push(load(b + 'vendor/jspdf.umd.min.js'));
    if (!window.BBS_PDF_FONTS) need.push(load(b + 'vendor/pdf-fonts.js'));
    if (!window.BBS_PDF_IMG) need.push(load(b + 'vendor/pdf-img.js'));
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
