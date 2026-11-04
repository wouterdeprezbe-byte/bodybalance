/* Body Balance Score — gedeelde inhoud, hulpfuncties en rapportweergave (geen eigen toestand). */
var BBSUI = (function () {
  'use strict';
  var DATA = window.BBS_DATA || JSON.parse(document.getElementById('bbs-data').textContent);
  BBS.init(DATA);

  var CAT = {
    EPD: { nl: 'Oestrogeen- en progesterontekort', en: 'Estrogen/Progesterone Deficiency', g: 'Geslachtshormonen',
      women: 'Een algemene daling van oestrogeen en progesteron, typisch rond de (peri)menopauze of bij langdurige stress. Denk aan opvliegers, nachtelijk zweten, slecht slapen, droogheid en wazig denken.',
      men: 'Ook mannen hebben oestrogeen en progesteron nodig, onder meer voor botten, slaap en temperatuurregeling. Opvliegers, nachtelijk zweten en botverlies wijzen op een tekort.' },
    ED: { nl: 'Oestrogeendominantie', en: 'Estrogen Dominance / Progesterone Deficiency', g: 'Geslachtshormonen',
      women: 'Oestrogeen is relatief hoog tegenover progesteron. Typisch zijn gevoelige of knobbelige borsten, vocht vasthouden, stemmingswisselingen, hevige menstruaties en aankomen rond de heupen.',
      men: 'Oestrogeen is relatief hoog tegenover testosteron, vaak doordat buikvet testosteron omzet in oestrogeen. Typisch zijn prostaat- en plasklachten, een verlaagd libido en vetopslag rond borst en heupen.' },
    LA: { nl: 'Lage androgenen', en: 'Low Androgens (DHEA/Testosterone)', g: 'Geslachtshormonen',
      women: 'Te weinig DHEA en testosteron: minder energie, spiermassa, libido, herstel en veerkracht.',
      men: 'Te weinig DHEA en testosteron: minder energie, drive, spiermassa, libido en erecties, trager herstel.' },
    HA: { nl: 'Hoge androgenen', en: 'High Androgens (DHEA/Testosterone)', g: 'Geslachtshormonen',
      women: 'Te veel androgenen: acne, meer haargroei op gezicht of lichaam, haaruitval op het hoofd. Vaak gelinkt aan insulineresistentie of een PCOS-patroon.',
      men: 'Androgenen die te hoog zijn of te sterk werken: vette huid, acne, prikkelbaarheid en een kort lontje.' },
    LC: { nl: 'Laag cortisol', en: 'Low Cortisol', g: 'Bijnier en stress',
      women: 'De bijnier levert te weinig cortisol, vaak na een lange periode van stress: moeilijk op gang komen, lage bloeddruk of bloedsuiker, allergieën en trek in zoet.',
      men: 'De bijnier levert te weinig cortisol, vaak na een lange periode van stress: opgebrand gevoel, lage bloeddruk of bloedsuiker, allergieën en trek in zoet.' },
    HC: { nl: 'Hoog cortisol', en: 'High Cortisol', g: 'Bijnier en stress',
      women: 'Het lichaam staat langdurig in stressmodus: onrustig of opgejaagd, slecht slapen, prikkelbaar, vergeetachtig en vet rond de buik.',
      men: 'Het lichaam staat langdurig in stressmodus: onrustig of opgejaagd, slecht slapen, minder mentale scherpte en vet rond de buik.' },
    HYPO: { nl: 'Hypometabolisme', en: 'Hypometabolism', g: 'Stofwisseling',
      women: 'Een trage stofwisseling, meestal via de schildklier: snel koud, vermoeid, droog haar, broze nagels, verstopping en moeilijk afvallen.',
      men: 'Een trage stofwisseling, meestal via de schildklier: snel koud, vermoeid, droog haar, broze nagels, verstopping en moeilijk afvallen.' },
    MS: { nl: 'Metabool syndroom', en: 'Metabolic Syndrome', g: 'Stofwisseling',
      women: 'Signalen van insulineresistentie: buikvet, hoge bloeddruk, verhoogde bloedvetten en tintelingen in handen of voeten.',
      men: 'Signalen van insulineresistentie: buikvet, hoge bloeddruk, verhoogde bloedvetten, suikerschommelingen en moeilijkere erecties.' },
    TL: { nl: 'Toxische belasting', en: 'Toxic Load', g: 'Belasting',
      women: 'De totale belasting voor lever, lymfe, darm en immuunsysteem. Hoe voller de ‘regenton’, hoe sneller klachten overlopen.',
      men: 'De totale belasting voor lever, lymfe, darm en immuunsysteem. Hoe voller de ‘regenton’, hoe sneller klachten overlopen.' }
  };
  var SCALE = {
    int: ['Niet', 'Licht', 'Matig', 'Sterk'],
    freq: ['Nooit', '1–2× per maand', 'Wekelijks', 'Dagelijks'],
    occ: ['Nooit', 'Zelden', 'Nu en dan', 'Vaak'],
    yn: ['Nee', 'Ja']
  };
  var STATUS_ICON = { ok: '●', watch: '■', off: '▲', severe: '◆' };
  var NOTE_LABEL = { diag: 'Vastgestelde aandoening(en)', chronic: 'Chronische klachten zonder diagnose', meds: 'Medicatie', remarks: 'Eigen opmerkingen' };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  function fmtDate(iso) { if (!iso) return ''; var p = iso.split('-'); return +p[2] + ' ' + ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][+p[1] - 1] + ' ' + p[0]; }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function pc(f) { return Math.round(f * 100); }
  var LS = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  function optsOf(Q) { return Q.o || SCALE[Q.s === 'opts' ? 'int' : Q.s]; }
  function answerLabel(sex, key, v) {
    var Q = BBS.allQuestions(sex).filter(function (q) { return q.h.indexOf(key) >= 0; })[0];
    if (!Q) return SCALE.int[v];
    if (Q.vm && Q.vm[key]) { var ix = Q.vm[key].indexOf(v); return ix >= 0 ? Q.o[ix] : ''; }
    return optsOf(Q)[v];
  }
  function questionTitle(sex, key, fallback) {
    var Q = BBS.allQuestions(sex).filter(function (q) { return q.h.indexOf(key) >= 0; })[0];
    return Q ? Q.t.replace(/\?$/, '') : fallback;
  }
  function computeSeries(list) {
    return list.map(function (m) { return { m: m, r: BBS.score(m), code: m.code || BBS.encode(m) }; })
      .sort(function (a, b) { return a.m.date < b.m.date ? -1 : a.m.date > b.m.date ? 1 : 0; });
  }
  /* kleurklasse van de totaalscore: t0 (ernstig, donkerrood) tot t4 (in balans, groen) */
  function totalTone(v) { return v >= 85 ? 't4' : v >= 70 ? 't3' : v >= 50 ? 't2' : v >= 30 ? 't1' : 't0'; }
  function totalBadge(v, label) { return '<span class="tbadge ' + totalTone(v) + '">' + esc(label || BBS.totalBand(v).nl) + '</span>'; }
  function statusPill(b) {
    var band = BBS.BANDS.filter(function (x) { return x.id === b; })[0];
    return '<span class="pill ' + b + '"><i aria-hidden="true">' + STATUS_ICON[b] + '</i>' + band.nl + '</span>';
  }
  function deltaChip(now, prev, lowerIsBetter) {
    var d = Math.round(now) - Math.round(prev);
    if (d === 0) return '<span class="delta same" title="Gelijk aan vorige meting">=</span>';
    var better = lowerIsBetter ? d < 0 : d > 0;
    return '<span class="delta ' + (better ? 'better' : 'worse') + '" title="' + (better ? 'Beter' : 'Slechter') + ' dan vorige meting">' + (d < 0 ? '↓' : '↑') + Math.abs(d) + '</span>';
  }
  function ruler(v) {
    var cuts = [0, 30, 50, 70, 85, 100], names = ['Ernstig', 'Sterk', 'Duidelijk', 'Licht', 'In balans'];
    var h = '<div class="ruler" aria-hidden="true"><div class="ruler-track">';
    for (var i = 0; i < 5; i++) h += '<span class="seg-' + i + '" style="left:' + cuts[i] + '%;width:' + (cuts[i + 1] - cuts[i]) + '%"><em>' + names[i] + '</em></span>';
    h += '</div><b class="marker" style="left:' + Math.max(0, Math.min(100, v)) + '%"></b><div class="ruler-ticks num">' + cuts.map(function (c) { return '<span style="left:' + c + '%">' + c + '</span>'; }).join('') + '</div></div>';
    return h;
  }
  function catRow(c, r, pr, sex) {
    var f = r.cats[c], b = r.bands[c], p = pc(f);
    var h = '<details class="cat ' + b + '"><summary>';
    h += '<span class="cat-name"><span class="code">' + c + '</span><span><b>' + esc(CAT[c].nl) + '</b><small>' + esc(CAT[c].en) + '</small></span></span>';
    h += '<span class="cat-bar"><span class="track"><span class="fill" style="width:' + Math.max(1.2, Math.min(100, f * 100)).toFixed(1) + '%"></span></span></span>';
    h += '<span class="cat-val num">' + p + '%' + (pr ? deltaChip(f * 100, pr.cats[c] * 100, true) : '') + '</span>';
    h += statusPill(b);
    h += '</summary><div class="cat-body">';
    h += '<p>' + esc(CAT[c][sex]) + '</p>';
    if (c === 'TL') {
      var top = r.toxBySection.filter(function (s) { return s.pts > 0; }).sort(function (a, b) { return b.pts - a.pts; }).slice(0, 4);
      h += top.length ? '<p class="small">Grootste bijdrage: ' + top.map(function (s) { return esc(s.nl) + ' (' + s.pts + ' pt)'; }).join(', ') + '.</p>' : '';
    } else {
      var parts = r.contrib[c].slice(0, 6);
      if (parts.length) {
        h += '<table class="contrib"><thead><tr><th scope="col">Signaal</th><th scope="col">Antwoord</th><th scope="col" class="num">Bijdrage</th></tr></thead><tbody>';
        parts.forEach(function (p) {
          var ex = (DATA.expl[sex][c] || {})[p.k];
          h += '<tr><td><b>' + esc(questionTitle(sex, p.k, p.nl)) + '</b>' + (ex ? '<small>' + esc(ex) + '</small>' : '') + '</td><td>' + esc(answerLabel(sex, p.k, p.sev)) + '</td><td class="num">+' + n1(p.pts) + '</td></tr>';
        });
        h += '</tbody></table>';
      } else h += '<p class="small">Geen signalen aangeduid voor dit domein.</p>';
    }
    h += '</div></details>';
    return h;
  }
  function notesBlock(nt) {
    nt = nt || {};
    var top = ['top1', 'top2', 'top3'].map(function (k) { return (nt[k] || '').trim(); }).filter(Boolean);
    var rest = ['diag', 'chronic', 'meds', 'remarks'].filter(function (k) { return nt[k]; });
    if (!top.length && !rest.length) return '';
    var h = '<section class="block"><div class="block-h"><h2>Zelf aangegeven</h2><p class="small">Telt niet mee in de score.</p></div><div class="notes-grid">';
    if (top.length) h += '<div class="top3"><h3>Wil het liefst kwijt</h3><ol>' + top.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
    if (rest.length) h += '<dl class="notes">' + rest.map(function (k) { return '<div><dt>' + NOTE_LABEL[k] + '</dt><dd>' + esc(nt[k]) + '</dd></div>'; }).join('') + '</dl>';
    return h + '</div></section>';
  }
  /* het volledige rapport voor de laatste meting van een reeks; opts: {example, name, subtitle} */
  function report(series, opts) {
    opts = opts || {};
    var cur = series[series.length - 1], prev = series.length > 1 ? series[series.length - 2] : null;
    var r = cur.r, sex = cur.m.sex, name = opts.name || cur.m.name || '';
    var h = '';
    if (opts.example) h += '<p class="banner">Voorbeeldrapport met fictieve antwoorden. Zo ziet een rapport eruit na de vragenlijst.</p>';
    h += '<section class="report-hero ' + totalTone(r.bbs) + '">';
    h += '<div class="rh-meta"><p class="eyebrow">Body Balance Score' + (name ? ' · ' + esc(name) : '') + '</p><p class="small">' + esc(fmtDate(cur.m.date)) + ' · ' + (sex === 'women' ? 'Vrouw' : 'Man') + ((opts.total || series.length) > 1 ? ' · meting ' + series.length + ' van ' + (opts.total || series.length) : '') + (opts.subtitle ? ' · ' + esc(opts.subtitle) : '') + '</p></div>';
    h += '<div class="rh-score"><h1 class="score num">' + n1(r.bbs) + '</h1><div class="rh-band">' + totalBadge(r.bbs, r.totalBand) +
      (prev ? '<p class="small">Vorige meting ' + n1(prev.r.bbs) + ' ' + deltaChip(r.bbs, prev.r.bbs, false) + '</p>' : '<p class="small">Total Body Balance Score, op 100</p>') + '</div></div>';
    h += ruler(r.bbs);
    h += '<details class="how"><summary>Hoe wordt deze score berekend?</summary><p>Elk domein krijgt een percentage: de gewogen som van de signalen gedeeld door de maximale score van dat domein. De totaalscore start bij 100, trekt het gemiddelde van de negen domeinen af en daarna strafpunten per domein dat niet in balans is: 2 voor suboptimaal, 5 voor uit balans, 8 voor ernstig. Zo weegt één domein dat sterk ontspoort zwaarder door dan veel kleine signalen.</p><p class="small num">Gemiddelde ' + n1(r.avg) + ' · strafpunten ' + r.penalty + ' (' + r.counts.watch + '× suboptimaal, ' + r.counts.off + '× uit balans, ' + r.counts.severe + '× ernstig)</p></details>';
    h += '</section>';
    h += notesBlock(cur.m.notes);
    h += '<section class="block"><div class="block-h"><h2>Scorekaart</h2><p class="small">Klik op een domein voor de signalen die het meest doorwegen.</p></div>';
    h += '<div class="legend small">' + BBS.BANDS.map(function (b, i) { return '<span><i class="sw ' + b.id + '"></i>' + b.nl + ' <span class="num">' + (i === 0 ? '0–14' : i === 1 ? '15–25' : i === 2 ? '26–49' : '50+') + '%</span></span>'; }).join('') + '</div>';
    var groups = [];
    BBS.ALL.forEach(function (c) { var g = CAT[c].g; if (groups.indexOf(g) < 0) groups.push(g); });
    groups.forEach(function (g) {
      h += '<h3 class="grp">' + esc(g) + '</h3><div class="cats">';
      BBS.ALL.filter(function (c) { return CAT[c].g === g; }).forEach(function (c) { h += catRow(c, r, prev ? prev.r : null, sex); });
      h += '</div>';
    });
    h += '</section>';
    var pats = BBS.patterns(r);
    h += '<section class="block"><div class="block-h"><h2>Kruispatronen</h2><p class="small">Domeinen beïnvloeden elkaar. Deze combinaties springen eruit.</p></div>';
    if (pats.length) {
      h += '<div class="pats">' + pats.map(function (p) {
        return '<article class="pat"><p class="codes">' + p.k.filter(function (c) { return pc(r.cats[c]) >= 15; }).map(function (c) { return '<span class="code">' + c + ' <span class="num">' + pc(r.cats[c]) + '%</span></span>'; }).join('') + '</p><h3>' + esc(p.t) + '</h3><p>' + esc(p.d) + '</p></article>';
      }).join('') + '</div>';
    } else h += '<p class="empty">Geen opvallende combinaties. De domeinen staan los van elkaar of zijn in balans.</p>';
    h += '</section>';
    var cab = BBS.cabral(r.toxTotal);
    var secs = r.toxBySection.slice().sort(function (a, b) { return b.pts / b.max - a.pts / a.max; });
    h += '<section class="block"><div class="block-h"><h2>Waar zit de belasting?</h2><p class="small">Punten van de toxiciteitsscore per lichaamssysteem, tegenover het maximum.</p></div>';
    h += '<div class="tox-sum"><p><b class="num big">' + r.toxTotal + '</b> <span class="small">van ' + DATA.toxMax + ' punten · ' + pc(r.cats.TL) + '% toxische belasting</span></p><p class="small">Volgens de oorspronkelijke toxiciteitsquiz van dr. Cabral: ' + esc(cab.t) + '</p></div>';
    h += '<div class="tox-bars">' + secs.map(function (s) {
      var f = s.max ? s.pts / s.max : 0;
      return '<div class="tb"><span class="tb-l">' + esc(s.nl) + '</span><span class="tb-t"><span style="width:' + (100 * f).toFixed(1) + '%"></span></span><span class="tb-v num">' + s.pts + '<small>/' + s.max + '</small></span></div>';
    }).join('') + '</div></section>';
    var ph = BBS.phases(r), ts = BBS.tests(r);
    h += '<section class="block two-col"><div><div class="block-h"><h2>Aanpak in volgorde</h2><p class="small">Functionele volgorde: eerst ontlasten en stress, dan hormonen en schildklier.</p></div><ol class="phases">' +
      ph.map(function (p) { return '<li><h3>' + esc(p.t) + '</h3><p>' + esc(p.d) + '</p></li>'; }).join('') + '</ol></div>';
    h += '<div><div class="block-h"><h2>Laten bevestigen met labo</h2><p class="small">Symptomen tonen een richting. Een labotest bevestigt.</p></div>' +
      (ts.length ? '<ul class="tests">' + ts.map(function (t) { return '<li><span class="code">' + t.k + '</span><span>' + esc(t.t) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Geen domein vraagt nu om extra testen.</p>') + '</div></section>';
    if (series.length > 1) h += evolution(series);
    return h;
  }
  var DISCLAIMER = '<p class="disclaimer">De Body Balance Score is een hulpmiddel om lichaamssignalen te ordenen en op te volgen. Het is geen medische diagnose en vervangt geen arts of labotest. Gebaseerd op de symptoomcategorieën van ZRT Laboratory en de toxiciteitsquiz van dr. Stephen Cabral.</p>';
  function evolution(series) {
    var h = '<section class="block"><div class="block-h"><h2>Evolutie</h2><p class="small">' + series.length + ' metingen, van ' + esc(fmtDate(series[0].m.date)) + ' tot ' + esc(fmtDate(series[series.length - 1].m.date)) + '.</p></div>';
    h += lineChart(series);
    h += '<div class="tbl-wrap"><table class="evo"><thead><tr><th scope="col">Domein</th>' + series.map(function (s) { return '<th scope="col" class="num">' + esc(fmtDate(s.m.date)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    h += '<tr class="tot"><th scope="row">Totaalscore</th>' + series.map(function (s, i) { return '<td class="num"><i class="tdot ' + totalTone(s.r.bbs) + '" aria-hidden="true"></i>' + n1(s.r.bbs) + (i ? deltaChip(s.r.bbs, series[i - 1].r.bbs, false) : '') + '</td>'; }).join('') + '</tr>';
    BBS.ALL.forEach(function (c) {
      h += '<tr><th scope="row"><span class="code">' + c + '</span> ' + esc(CAT[c].nl) + '</th>' + series.map(function (s, i) {
        var b = s.r.bands[c];
        return '<td class="num"><i class="dot ' + b + '" aria-hidden="true">' + STATUS_ICON[b] + '</i>' + pc(s.r.cats[c]) + '%' + (i ? deltaChip(s.r.cats[c] * 100, series[i - 1].r.cats[c] * 100, true) : '') + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody></table></div></section>';
    return h;
  }
  function lineChart(series) {
    var W = 900, H = 250, L = 36, R = 24, T = 14, B = 30;
    var n = series.length, iw = W - L - R, ih = H - T - B;
    var t0 = Date.parse(series[0].m.date), t1 = Date.parse(series[n - 1].m.date);
    var X = function (i) { return n === 1 || t1 === t0 ? L + iw / 2 : L + iw * (Date.parse(series[i].m.date) - t0) / (t1 - t0); };
    var Y = function (v) { return T + ih * (1 - v / 100); };
    var s = '<figure class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Totaalscore per meting">';
    [[0, 30, 't0'], [30, 50, 't1'], [50, 70, 't2'], [70, 85, 't3'], [85, 100, 't4']].forEach(function (z) {
      s += '<rect class="zone ' + z[2] + '" x="' + L + '" width="' + iw + '" y="' + Y(z[1]) + '" height="' + (Y(z[0]) - Y(z[1])) + '"/>';
    });
    [0, 25, 50, 75, 100].forEach(function (v) { s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    var d = series.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.r.bbs).toFixed(1); }).join(' ');
    s += '<path class="line" d="' + d + '"/>';
    series.forEach(function (p, i) {
      var anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      s += '<text class="ax" x="' + X(i) + '" y="' + (H - 10) + '" text-anchor="' + anchor + '">' + esc(fmtDate(p.m.date)) + '</text>';
      s += '<circle class="pt ' + totalTone(p.r.bbs) + '" cx="' + X(i) + '" cy="' + Y(p.r.bbs) + '" r="5.5"/>';
      s += '<circle class="hit" cx="' + X(i) + '" cy="' + Y(p.r.bbs) + '" r="16" data-tip="' + esc(fmtDate(p.m.date) + ': ' + n1(p.r.bbs) + ' · ' + p.r.totalBand) + '"><title>' + esc(fmtDate(p.m.date) + ': ' + n1(p.r.bbs)) + '</title></circle>';
    });
    s += '</svg><div class="tip" hidden></div><figcaption class="small">Totaalscore per meting (hoger is beter). De achtergrond toont de kleurenschaal.</figcaption></figure>';
    return s;
  }
  function wireChart(root) {
    (root || document).querySelectorAll('.chart').forEach(function (fig) {
      var tip = fig.querySelector('.tip');
      fig.querySelectorAll('.hit').forEach(function (c) {
        var show = function () {
          var fr = fig.getBoundingClientRect(), cr = c.getBoundingClientRect();
          tip.textContent = c.getAttribute('data-tip'); tip.hidden = false;
          var x = cr.left + cr.width / 2 - fr.left, w = tip.offsetWidth;
          tip.style.left = Math.max(0, Math.min(fr.width - w, x - w / 2)) + 'px';
          tip.style.top = (cr.top - fr.top - tip.offsetHeight + 4) + 'px';
        };
        c.addEventListener('mouseenter', show); c.addEventListener('focus', show);
        c.addEventListener('mouseleave', function () { tip.hidden = true; });
      });
    });
  }
  function spark(ser) {
    if (ser.length < 2) return '<span class="spark"></span>';
    var W = 90, H = 28, n = ser.length;
    var pts = ser.map(function (s, i) { return (4 + (W - 8) * i / (n - 1)).toFixed(1) + ',' + (4 + (H - 8) * (1 - s.r.bbs / 100)).toFixed(1); });
    var last = pts[n - 1].split(',');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '"/><circle class="' + totalTone(ser[n - 1].r.bbs) + '" cx="' + last[0] + '" cy="' + last[1] + '" r="3.5"/></svg>';
  }
  function copyText(text, msgEl, srcEl) {
    var sel = function () {
      if (srcEl) { var r = document.createRange(); r.selectNodeContents(srcEl); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      if (msgEl) msgEl.textContent = 'Code geselecteerd. Kopieer met Ctrl+C of ⌘C.';
    };
    try { navigator.clipboard.writeText(text).then(function () { if (msgEl) msgEl.textContent = 'Gekopieerd.'; }, sel); } catch (e) { sel(); }
  }
  function focusTop(root) { window.scrollTo(0, 0); var h = (root || document).querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }

  return { DATA: DATA, CAT: CAT, SCALE: SCALE, STATUS_ICON: STATUS_ICON, $: $, esc: esc, today: today, fmtDate: fmtDate, n1: n1, pc: pc, LS: LS,
    optsOf: optsOf, answerLabel: answerLabel, questionTitle: questionTitle, computeSeries: computeSeries, totalTone: totalTone, totalBadge: totalBadge,
    statusPill: statusPill, deltaChip: deltaChip, report: report, evolution: evolution, wireChart: wireChart, spark: spark, copyText: copyText,
    focusTop: focusTop, DISCLAIMER: DISCLAIMER };
})();
