/* Body Balance Score — rekenkern (pure functies, geen DOM).
   Methode: ZRT-symptoomcategorieën (gewogen score / max. score), gewichten
   herberekend op 30 ZRT-voorbeeldcases, plus spijsvertering (voorlopig, uit de
   spijsverteringssignalen), toxische belasting (Cabral-quiz) en de Total Body
   Balance Score van Wouter Deprez. */
var BBS = (function () {
  'use strict';
  var D = null;
  var CATS = ['EPD', 'ED', 'LA', 'HA', 'LC', 'HC', 'HYPO', 'MS'];
  var ALL = CATS.concat(['DG', 'TL']);
  var BANDS = [
    { id: 'ok', max: 14, nl: 'In balans', hint: 'Laag risico' },
    { id: 'watch', max: 25, nl: 'Suboptimaal', hint: 'Preventieve ondersteuning aangewezen' },
    { id: 'off', max: 49, nl: 'Uit balans', hint: 'Disfunctie aanwezig, aandacht vereist' },
    { id: 'severe', max: 1e9, nl: 'Ernstige disbalans', hint: 'Dringend een intensieve aanpak' }
  ];
  var PENALTY = { ok: 0, watch: 2, off: 5, severe: 8 };
  var TOTAL_BANDS = [
    { min: 85, nl: 'Sterk in balans' },
    { min: 70, nl: 'Licht uit balans' },
    { min: 50, nl: 'Duidelijk uit balans' },
    { min: 30, nl: 'Sterk uit balans' },
    { min: -1, nl: 'Ernstig uit balans' }
  ];
  var EPOCH = Date.UTC(2020, 0, 1);

  function init(data) { D = data; return api; }
  function items(sex) { return D.q[sex]; }
  function toxItems() {
    var out = [];
    D.tox.forEach(function (s, si) { s.items.forEach(function (it) { out.push({ s: si, code: s.code, en: it.en, nl: it.nl, d: it.d, t: it.t }); }); });
    return out;
  }
  function bandOf(frac) {
    var r = Math.round(frac * 100);
    for (var i = 0; i < BANDS.length; i++) if (r <= BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  function totalBand(v) {
    for (var i = 0; i < TOTAL_BANDS.length; i++) if (v >= TOTAL_BANDS[i].min) return TOTAL_BANDS[i];
  }
  function toxPoints(it, v) {
    if (v == null) return 0;
    if (it.t === 'freq') return v;
    if (it.t === 'yn3') return v ? 3 : 0;
    return v ? 10 : 0;
  }
  function toxMaxOf(it) { return it.t === 'yn10' ? 10 : 3; }

  /* m = {sex, h:[0..3|null per item], t:[...per tox item]} */
  function score(m) {
    var q = items(m.sex), tx = toxItems();
    var res = { sex: m.sex, cats: {}, contrib: {}, bands: {} };
    CATS.forEach(function (c, ci) {
      var den = 0, num = 0, parts = [];
      q.forEach(function (it, i) {
        var w = it.w[ci]; if (!w) return;
        den += w;
        var s = m.h[i] || 0;
        if (s > 0) { num += w * s / 3; parts.push({ i: i, k: it.k, nl: it.nl, sev: s, w: w }); }
      });
      var frac = den ? num / den : 0;
      parts.forEach(function (p) { p.pts = 100 * p.w * p.sev / 3 / den; });
      parts.sort(function (a, b) { return b.pts - a.pts; });
      res.cats[c] = frac; res.contrib[c] = parts;
    });
    var tot = 0, bySec = D.tox.map(function (s) { return { code: s.code, nl: s.nl, pts: 0, max: 0, n: 0 }; });
    tx.forEach(function (it, i) {
      var p = toxPoints(it, m.t[i]); tot += p;
      bySec[it.s].pts += p; bySec[it.s].max += toxMaxOf(it); if (p > 0) bySec[it.s].n++;
    });
    res.toxTotal = tot; res.toxBySection = bySec;
    res.cats.TL = Math.min(1, tot / D.toxMax);
    res.contrib.TL = [];
    /* spijsvertering (voorlopig): gewogen spijsverteringssignalen, zelfde methode als de ZRT-domeinen */
    var dden = 0, dnum = 0, dparts = [], tix = {};
    tx.forEach(function (it, i) { tix[it.en] = i; });
    (D.dg || []).forEach(function (g) {
      var i = tix[g.en]; if (i == null) return;
      dden += g.w;
      var s = m.t[i] || 0;
      if (s > 0) { dnum += g.w * s / 3; dparts.push({ k: g.en, nl: tx[i].nl, sev: s, w: g.w, q: toxQuestion(m.sex, g.en) }); }
    });
    dparts.forEach(function (p) { p.pts = 100 * p.w * p.sev / 3 / dden; });
    dparts.sort(function (a, b) { return b.pts - a.pts; });
    res.cats.DG = dden ? dnum / dden : 0;
    res.contrib.DG = dparts;
    var sum = 0, pen = 0, counts = { ok: 0, watch: 0, off: 0, severe: 0 };
    ALL.forEach(function (c) {
      var b = bandOf(res.cats[c]); res.bands[c] = b.id; counts[b.id]++;
      sum += res.cats[c] * 100; pen += PENALTY[b.id];
    });
    var avg = sum / ALL.length;
    res.avg = avg; res.penalty = pen; res.counts = counts;
    res.bbs = Math.max(0, Math.round((100 - avg - pen) * 10) / 10);
    res.totalBand = totalBand(res.bbs).nl;
    return res;
  }

  /* ---------- resultaatcode: compacte, deelbare weergave van alle antwoorden ---------- */
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function toB64(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      var chunk = B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
      s += chunk.slice(0, i + 2 >= bytes.length ? (bytes.length - i === 1 ? 2 : 3) : 4);
    }
    return s;
  }
  function fromB64(s) {
    var out = [], buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s[i]); if (v < 0) throw new Error('Ongeldig teken in de code');
      buf = (buf << 6) | v; bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return out;
  }
  /* versie 2: antwoorden + vrije tekst (aandoening, klachten, medicatie, opmerkingen) */
  var NOTE_KEYS = ['diag', 'chronic', 'meds', 'remarks', 'top1', 'top2', 'top3'];
  var NOTE_KEYS_V2 = NOTE_KEYS.slice(0, 4);
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(s));
    return unescape(encodeURIComponent(s)).split('').map(function (c) { return c.charCodeAt(0); });
  }
  function fromUtf8(b) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(new Uint8Array(b));
    return decodeURIComponent(escape(String.fromCharCode.apply(null, b)));
  }
  function encode(m) {
    var q = items(m.sex), tx = toxItems();
    var bits = [];
    function put(v, n) { for (var k = n - 1; k >= 0; k--) bits.push((v >> k) & 1); }
    var day = Math.max(0, Math.round((Date.parse(m.date + 'T00:00:00Z') - EPOCH) / 864e5));
    put(3, 8); put(m.sex === 'men' ? 1 : 0, 8); put(day, 16);
    q.forEach(function (_, i) { put(Math.max(0, m.h[i] || 0), 2); });
    tx.forEach(function (it, i) { if (it.t === 'freq') put(Math.max(0, m.t[i] || 0), 2); });
    tx.forEach(function (it, i) { if (it.t !== 'freq') put(m.t[i] > 0 ? 1 : 0, 1); });
    while (bits.length % 8) bits.push(0);
    var bytes = [];
    for (var b = 0; b < bits.length; b += 8) { var v = 0; for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k]; bytes.push(v); }
    var notes = m.notes || {};
    NOTE_KEYS.forEach(function (k) {
      var u = utf8(String(notes[k] || '').slice(0, 2000));
      bytes.push((u.length >> 8) & 255, u.length & 255);
      Array.prototype.push.apply(bytes, u);
    });
    var cs = bytes.reduce(function (a, x) { return (a + x) & 255; }, 0);
    bytes.push(cs ^ 0x5a);
    return 'BBS.' + toB64(bytes);
  }
  function decode(code) {
    var s = String(code || '').trim().replace(/\s+/g, '').replace(/^BBS\.?/i, '');
    if (s.length < 20) throw new Error('Deze code is te kort. Kopieer de volledige resultaatcode.');
    var bytes = fromB64(s);
    var cs = bytes.pop();
    var sum = bytes.reduce(function (a, x) { return (a + x) & 255; }, 0);
    if ((sum ^ 0x5a) !== cs) throw new Error('Deze code klopt niet. Controleer of ze volledig en ongewijzigd is.');
    var ver = bytes[0];
    if (ver < 1 || ver > 3) throw new Error('Onbekende versie van de resultaatcode.');
    var pos = 0, all = [];
    bytes.forEach(function (x) { for (var k = 7; k >= 0; k--) all.push((x >> k) & 1); });
    function get(n) { var v = 0; for (var k = 0; k < n; k++) v = (v << 1) | all[pos++]; return v; }
    get(8);
    var sex = get(8) === 1 ? 'men' : 'women';
    var day = get(16);
    var date = new Date(EPOCH + day * 864e5).toISOString().slice(0, 10);
    var q = items(sex), tx = toxItems();
    var h = q.map(function () { return get(2); });
    var t = new Array(tx.length);
    tx.forEach(function (it, i) { if (it.t === 'freq') t[i] = get(2); });
    tx.forEach(function (it, i) { if (it.t !== 'freq') t[i] = get(1); });
    var notes = {};
    if (ver >= 2) {
      var bp = Math.ceil(pos / 8);
      (ver === 2 ? NOTE_KEYS_V2 : NOTE_KEYS).forEach(function (k) {
        var len = (bytes[bp] << 8) | bytes[bp + 1]; bp += 2;
        notes[k] = len ? fromUtf8(bytes.slice(bp, bp + len)) : ''; bp += len;
      });
    }
    return { sex: sex, date: date, h: h, t: t, notes: notes };
  }

  /* ---------- van vragen naar scores: elke vraag voedt een of meer hormonale en/of toxiciteitsitems ---------- */
  function questions(sex) { return D.questions[sex]; }
  /* id van de vraag die een toxiciteitsitem voedt (voor de weergave van de signalen) */
  function toxQuestion(sex, en) {
    if (!D.questions) return null;
    var Q = allQuestions(sex).filter(function (q) { return (q.x || []).indexOf(en) >= 0; })[0];
    return Q ? Q.id : null;
  }
  function allQuestions(sex) { var out = []; D.questions[sex].pages.forEach(function (p) { p.q.forEach(function (q) { out.push(q); }); }); return out; }
  function fromAnswers(sex, a) {
    var q = items(sex), tx = toxItems();
    var hi = {}, ti = {};
    q.forEach(function (it, i) { hi[it.k] = i; });
    tx.forEach(function (it, i) { ti[it.en] = i; });
    var h = q.map(function () { return 0; }), t = tx.map(function () { return 0; });
    var val = function (id) { var v = a[id]; return v == null || v < 0 ? 0 : v; };
    allQuestions(sex).forEach(function (Q) {
      var v = val(Q.id);
      Q.h.forEach(function (k) { h[hi[k]] = Q.vm && Q.vm[k] ? (a[Q.id] == null || a[Q.id] < 0 ? 0 : Q.vm[k][a[Q.id]]) : v; });
      Q.x.forEach(function (k) { t[ti[k]] = tx[ti[k]].t === 'freq' ? v : (v ? 1 : 0); });
    });
    D.questions[sex].derive.forEach(function (r) {
      if (r.h) h[hi[r.h]] = Math.max.apply(null, r.max.map(val));
      if (r.t) t[ti[r.t]] = r.any.some(function (id) { return val(id) > 0; }) ? 1 : 0;
    });
    return { h: h, t: t };
  }

  /* ---------- kruispatronen ---------- */
  function pct(res, c) { return Math.round(res.cats[c] * 100); }
  function patterns(res) {
    var f = res.sex === 'women', out = [];
    var up = function (c) { return pct(res, c) >= 15; };
    var hi = function (c) { return pct(res, c) >= 26; };
    if (up('HC') && up('LC')) out.push({ k: ['HC', 'LC'], t: 'Ontregelde cortisolcurve',
      d: 'Zowel signalen van hoog als van laag cortisol. Vaak verloopt de dagcurve omgekeerd: moeizaam op gang in de ochtend, onrustig of opgejaagd ’s avonds. Dat past bij een HPA-as die al langer onder druk staat (weerstandsfase).' });
    if (f && up('EPD') && up('ED')) out.push({ k: ['EPD', 'ED'], t: 'Progesteron is de zwakke schakel',
      d: 'Tekort- en dominantiesignalen tegelijk wijzen meestal op progesteron dat sneller daalt dan oestrogeen. Typisch in de perimenopauze en versterkt door stress, omdat het lichaam dan voorrang geeft aan cortisol.' });
    if (!f && up('ED') && (up('LA') || up('MS'))) out.push({ k: ['ED', 'LA', 'MS'], t: 'Testosteron wordt omgezet naar oestrogeen',
      d: 'Relatief veel oestrogeen samen met lage androgenen of metabole signalen. Buikvet bevat aromatase, het enzym dat testosteron omzet in oestrogeen. Buikvet afbouwen helpt beide kanten.' });
    if (up('HYPO') && (up('HC') || up('LC'))) out.push({ k: ['HYPO', 'HC', 'LC'], t: 'Stress remt de schildklier',
      d: 'Een ontregelde stressas vertraagt de omzetting van T4 naar het actieve T3. Dat geeft een trage stofwisseling, koude handen en voeten en vermoeidheid, ook bij normale TSH-waarden.' });
    if (up('LA') && up('HC')) out.push({ k: ['LA', 'HC'], t: 'Stress gaat ten koste van DHEA en testosteron',
      d: 'Bij chronische stress gaan bouwstenen eerder naar cortisol dan naar DHEA en testosteron (‘pregnenolone steal’). Dat merk je aan minder energie, drive, libido en herstel.' });
    if (up('TL') && up('ED')) out.push({ k: ['TL', 'ED'], t: 'Trage oestrogeenafbraak',
      d: 'Een hoge toxische belasting vraagt veel van de lever. Als fase II-detox (glucuronidatie, sulfatie) achterloopt, wordt oestrogeen trager afgebroken en ontstaat er sneller dominantie.' });
    if (up('TL') && up('HYPO')) out.push({ k: ['TL', 'HYPO'], t: 'Belasting remt de stofwisseling',
      d: 'Ontsteking en toxines (zware metalen, slechte darmflora) kunnen de schildklierfunctie en de T3-omzetting in lever en darm verstoren.' });
    if (up('MS') && up('HC')) out.push({ k: ['MS', 'HC'], t: 'Cortisol stuurt de bloedsuiker',
      d: 'Langdurig hoog cortisol verhoogt bloedsuiker en insuline. Dat bevordert buikvet en insulineresistentie, wat op zijn beurt weer stress geeft aan het lichaam.' });
    if (f && up('HA') && up('MS')) out.push({ k: ['HA', 'MS'], t: 'Insuline en androgenen',
      d: 'Een hoge insuline zet de eierstokken aan tot meer androgeenproductie. Acne, haargroei en buikvet samen met metabole signalen passen bij een PCOS-achtig patroon.' });
    if (hi('LC') && up('LA') && !up('HC')) out.push({ k: ['LC', 'LA'], t: 'Uitputtingspatroon',
      d: 'Laag cortisol en lage androgenen zonder duidelijke hoge stresssignalen: de bijnier schiet tekort. Herstel vraagt rust, regelmaat en een stabiele bloedsuiker eerder dan extra prikkels.' });
    if (up('DG') && (up('HC') || up('LC'))) out.push({ k: ['DG', 'HC', 'LC'], t: 'Stress en spijsvertering',
      d: 'Stress zet de vertering op een laag pitje: minder maagzuur en verteringsenzymen, een tragere of juist onrustige darm en een gevoeliger darmwand. Omgekeerd stuurt een onrustige darm ook stresssignalen naar het brein (darm-hersen-as).' });
    if (up('DG') && up('ED')) out.push({ k: ['DG', 'ED'], t: 'Darm en oestrogeenafbraak',
      d: 'De lever voert oestrogeen af via de darm. Een verstoorde darmflora kan het daar weer vrijmaken, waarna het opnieuw in omloop komt. Verstopping versterkt dat en zo ontstaat sneller dominantie.' });
    return out;
  }

  /* ---------- aanpak in fasen (functionele volgorde: ontlasten, stress, metabool, hormonen, schildklier) ---------- */
  function phases(res) {
    var p = function (c) { return Math.round(res.cats[c] * 100); };
    var out = [];
    if (p('TL') >= 15) out.push({ t: 'Ontlasten: lever, darm en lymfe', k: ['TL'],
      d: 'Eerst de ‘regenton’ leegmaken: een begeleide detox van 7 tot 21 dagen, voldoende vezels en water, dagelijks bewegen en zweten. Zo komt er ruimte voor de volgende stappen.' });
    if (p('DG') >= 15) out.push({ t: 'Spijsvertering herstellen', k: ['DG'],
      d: 'Rustig en aan tafel eten, goed kauwen, voldoende vezels en water. Nagaan welke voedingsmiddelen klachten geven en de darm gericht herstellen, eventueel op basis van een stoelgangsonderzoek.' });
    if (p('HC') >= 15 || p('LC') >= 15) out.push({ t: 'Stressas en slaap herstellen', k: ['HC', 'LC'],
      d: 'Vast slaapritme, ademhaling en ontspanning, ochtendlicht, regelmatig eten. Adaptogenen kunnen helpen, in overleg met je coach. Zonder deze basis stabiliseren de hormonen niet.' });
    if (p('MS') >= 15) out.push({ t: 'Bloedsuiker en metabolisme', k: ['MS'],
      d: 'Eiwitrijk ontbijt, minder snelle suikers en alcohol, krachttraining en een korte wandeling na de maaltijd.' });
    if (['EPD', 'ED', 'LA', 'HA'].some(function (c) { return p(c) >= 15; })) out.push({ t: 'Geslachtshormonen in balans', k: ['EPD', 'ED', 'LA', 'HA'],
      d: res.sex === 'women'
        ? 'Oestrogeenafbraak ondersteunen (lever, darm, kruisbloemige groenten) en progesteron de kans geven om te herstellen. Vaak verbetert dit al vanzelf zodra stress en belasting dalen.'
        : 'Testosteron ondersteunen via slaap, krachttraining, zink en gezonde vetten, en de omzetting naar oestrogeen beperken door buikvet af te bouwen.' });
    if (p('HYPO') >= 15) out.push({ t: 'Schildklier en energie', k: ['HYPO'],
      d: 'Selenium, zink, jodium en ijzer via voeding. Pas gericht ondersteunen nadat stress en leverbelasting aangepakt zijn.' });
    if (!out.length) out.push({ t: 'Onderhouden', k: [], d: 'Alle domeinen scoren in balans. Blijf je basisgewoonten volhouden en meet opnieuw over 6 tot 12 maanden.' });
    return out;
  }

  var TESTS = {
    EPD: 'Oestrogeen en progesteron (speeksel- of DUTCH-urinetest, juist getimed in de cyclus)',
    ED: 'Oestrogeen-/progesteronverhouding en oestrogeenmetabolieten (DUTCH)',
    LA: 'DHEA-S, (vrij) testosteron en SHBG',
    HA: 'DHEA-S, (vrij) testosteron, SHBG en nuchtere insuline',
    LC: 'Cortisoldagprofiel (4-punts speeksel of DUTCH), eventueel ontwakingsrespons (CAR)',
    HC: 'Cortisoldagprofiel (4-punts speeksel of DUTCH)',
    HYPO: 'Volledig schildklierpanel: TSH, vrij T4, vrij T3, reverse T3, anti-TPO en anti-TG',
    MS: 'Nuchtere glucose en insuline (HOMA-IR), HbA1c, lipidenprofiel, middelomtrek en bloeddruk',
    DG: 'Uitgebreid stoelgangsonderzoek (darmflora, calprotectine, pancreaselastase), bij vermoeden een SIBO-ademtest of coeliakieserologie',
    TL: 'Lever- en nierwaarden, eventueel haarmineralenanalyse (HTMA) of zware metalen'
  };
  function tests(res) {
    var seen = {}, out = [];
    ALL.forEach(function (c) {
      if (Math.round(res.cats[c] * 100) >= 15 && !seen[TESTS[c]]) { seen[TESTS[c]] = 1; out.push({ k: c, t: TESTS[c] }); }
    });
    return out;
  }
  function cabral(points) {
    if (points < 10) return { stage: 1, t: 'Fase 1 (0–9 punten): weinig belasting, een seizoensdetox van 7 dagen volstaat.' };
    if (points < 20) return { stage: 2, t: 'Fase 2 (10–19 punten): verborgen belasting, een detox van 7, 14 of 21 dagen is aangewezen.' };
    return { stage: 3, t: 'Fase 3 (20+ punten): duidelijke belasting, een 21-daagse detox wordt aangeraden, daarna seizoensgebonden.' };
  }

  var api = { init: init, items: items, toxItems: toxItems, score: score, encode: encode, decode: decode,
    questions: questions, allQuestions: allQuestions, fromAnswers: fromAnswers, toxQuestion: toxQuestion, NOTE_KEYS: NOTE_KEYS,
    patterns: patterns, phases: phases, tests: tests, cabral: cabral, bandOf: bandOf, totalBand: totalBand,
    BANDS: BANDS, PENALTY: PENALTY, TOTAL_BANDS: TOTAL_BANDS, CATS: CATS, ALL: ALL };
  return api;
})();
if (typeof module !== 'undefined') module.exports = BBS;
