/* Body Balance Score — de vragenlijst zelf. Wordt gebruikt door de klantpagina en door de coachtool.
   BBSIntake.create(root, {draftKey, finishLabel, onBack(), onDone(measurement, meta)}) */
var BBSIntake = (function () {
  'use strict';
  var U = BBSUI, esc = U.esc;

  function create(root, opts) {
    opts = opts || {};
    var S = { sex: null, a: {}, notes: {}, page: 0, notice: '', meta: {} };

    function pages() { return BBS.questions(S.sex).pages.concat([{ t: 'Tot slot', q: [], last: true }]); }
    function total() { return BBS.allQuestions(S.sex).length; }
    function answered() { return BBS.allQuestions(S.sex).filter(function (Q) { return S.a[Q.id] != null; }).length; }
    function pageOpen(pg) { return pg.q.filter(function (Q) { return S.a[Q.id] == null; }).length; }
    function firstOpen() { var P = pages(); for (var p = 0; p < P.length; p++) if (pageOpen(P[p])) return p; return -1; }
    function save() { if (opts.draftKey && S.sex) U.LS.set(opts.draftKey, { v: 3, sex: S.sex, a: S.a, notes: S.notes, page: S.page, meta: S.meta }); }
    function draft() {
      var d = opts.draftKey ? U.LS.get(opts.draftKey) : null;
      if (!d || !d.sex || !d.a || (d.v !== 2 && d.v !== 3)) return null;
      return { sex: d.sex, a: d.a, notes: d.notes || {}, page: d.page || 0, meta: d.meta || { name: d.name, date: d.date, clientId: d.clientId }, steps: BBS.questions(d.sex).pages.length + 1 };
    }
    function clear() { if (opts.draftKey) U.LS.del(opts.draftKey); }
    function measurement() {
      var ht = BBS.fromAnswers(S.sex, S.a), notes = {};
      BBS.NOTE_KEYS.forEach(function (k) { notes[k] = (S.notes[k] || '').trim(); });
      if (!(S.a.diag > 0)) notes.diag = '';
      if (!(S.a.undiag > 0)) notes.chronic = '';
      return { sex: S.sex, date: S.meta.date || U.today(), h: ht.h, t: ht.t, notes: notes, name: S.meta.name || '' };
    }

    function textField(id, key, label, help, rows, max) {
      return '<div class="q"><label class="field" for="' + id + '"><span class="q-t">' + label + '</span>' + (help ? '<span class="q-d">' + help + '</span>' : '') + '</label>' +
        '<textarea id="' + id + '" data-note="' + key + '" rows="' + rows + '" maxlength="' + max + '">' + esc(S.notes[key] || '') + '</textarea></div>';
    }
    function render() {
      var P = pages(), pg = P[S.page];
      var h = '<div class="quiz-head"><div class="qh-inner">';
      h += '<p class="eyebrow">' + esc(opts.eyebrow || 'Body Balance Score · vragenlijst') + '</p>';
      h += '<h2>' + esc(pg.t) + '</h2>';
      h += '<div class="progress" role="progressbar" aria-label="Voortgang" aria-valuemin="1" aria-valuemax="' + P.length + '" aria-valuenow="' + (S.page + 1) + '"><span style="width:' + (100 * (S.page + 1) / P.length).toFixed(1) + '%"></span></div>';
      h += '<p class="qh-sub num">Stap ' + (S.page + 1) + ' van ' + P.length + '</p>';
      h += '</div></div>';
      if (S.page === 0) h += '<p class="instr">Duid aan hoe sterk of hoe vaak je het betreffende ‘symptoom’ <b>in de afgelopen maand</b> hebt ervaren. Kies de best passende optie. Indien niet van toepassing bij jou: kies gewoon <b>Niet</b> of <b>Nooit</b>.</p>';
      h += '<form class="qlist" novalidate>';
      if (pg.last) {
        h += textField('n-meds', 'meds', 'Welke medicatie neem je?', 'Vermeld ook de pil of andere hormonen, schildkliermedicatie en maagzuurremmers. Supplementen mag je ook noteren.', 3, 1500);
        h += '<div class="q"><p class="q-t" id="top-h">Als je drie klachten of uitdagingen mocht kiezen die je graag zou zien verdwijnen, welke zouden dat zijn?</p><p class="q-d">Noteer ze in volgorde: de belangrijkste eerst.</p><ol class="top-in" aria-labelledby="top-h">';
        ['top1', 'top2', 'top3'].forEach(function (k, i) {
          h += '<li><label class="sr" for="n-' + k + '">Klacht ' + (i + 1) + '</label><input type="text" id="n-' + k + '" data-note="' + k + '" maxlength="200" value="' + esc(S.notes[k] || '') + '"></li>';
        });
        h += '</ol></div>';
        h += textField('n-remarks', 'remarks', 'Wil je nog iets kwijt?', 'Klachten die niet in de lijst stonden, wat je al geprobeerd hebt, of iets anders dat ik moet weten.', 5, 2000);
      }
      pg.q.forEach(function (Q) {
        var v = S.a[Q.id], o = U.optsOf(Q);
        var cls = o.length === 2 ? 'two' : o.length > 4 ? 'many' : 'four';
        h += '<fieldset class="q' + (v == null ? '' : ' done') + '" id="q-' + Q.id + '"><legend><span class="q-t">' + esc(Q.t) + '</span>' + (Q.d ? '<span class="q-d">' + esc(Q.d) + '</span>' : '') + '</legend>';
        h += '<div class="seg ' + cls + (Q.o ? ' long' : '') + '">';
        o.forEach(function (lab, i) {
          h += '<label><input type="radio" name="q-' + Q.id + '" id="q-' + Q.id + '-' + i + '" value="' + i + '" data-q="' + Q.id + '"' + (v === i ? ' checked' : '') + '><span>' + esc(lab) + (Q.c && Q.c[i] ? '<small>' + esc(Q.c[i]) + '</small>' : '') + '</span></label>';
        });
        h += '</div>';
        if (Q.u) h += '<label class="unk"><input type="radio" name="q-' + Q.id + '" id="q-' + Q.id + '-u" value="-1" data-q="' + Q.id + '"' + (v === -1 ? ' checked' : '') + '><span>Weet ik niet</span></label>';
        if (Q.txt) h += '<label class="field follow" for="n-' + Q.txt.k + '"' + (v === 1 ? '' : ' hidden') + '><span>' + esc(Q.txt.l) + '</span><textarea id="n-' + Q.txt.k + '" data-note="' + Q.txt.k + '" rows="2" maxlength="1500">' + esc(S.notes[Q.txt.k] || '') + '</textarea></label>';
        h += '</fieldset>';
      });
      h += '</form>';
      h += '<div class="quiz-foot">';
      if (S.notice) h += '<div class="notice" role="alert">' + S.notice + '</div>';
      h += '<div class="row nav-row">';
      h += '<button type="button" class="btn ghost" data-i="prev">' + (S.page === 0 ? 'Terug' : 'Vorige') + '</button>';
      h += S.page < P.length - 1 ? '<button type="button" class="btn primary" data-i="next">Volgende</button>' : '<button type="button" class="btn primary" data-i="finish">' + esc(opts.finishLabel || 'Klaar') + '</button>';
      h += '</div></div>';
      root.innerHTML = h;
    }
    function go(p) { S.page = p; S.notice = ''; render(); U.focusTop(root); save(); }
    function finish(force) {
      var open = total() - answered();
      if (open && !force) {
        S.notice = 'Er staan nog <b>' + open + '</b> vragen open. Die tellen mee als ‘Niet’, ‘Nooit’ of ‘Nee’. <span class="row"><button type="button" class="btn small" data-i="goto-open">Toon de eerste open vraag</button><button type="button" class="btn small primary" data-i="finish-force">Toch ' + esc((opts.finishLabel || 'afronden').toLowerCase()) + '</button></span>';
        render(); var nb = root.querySelector('.notice'); if (nb) nb.scrollIntoView({ block: 'center' }); return;
      }
      if (opts.onDone) opts.onDone(measurement(), S.meta);
    }

    root.addEventListener('change', function (e) {
      var el = e.target;
      if (!el.dataset || !el.dataset.q) return;
      var v = +el.value; S.a[el.dataset.q] = v;
      var fs = el.closest('fieldset'); if (fs) fs.classList.add('done');
      var fl = fs && fs.querySelector('.follow'); if (fl) { fl.hidden = v !== 1; if (v === 1) { var ta = fl.querySelector('textarea'); if (ta) ta.focus(); } }
      save();
    });
    root.addEventListener('input', function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.note) { S.notes[el.dataset.note] = el.value; save(); }
    });
    root.addEventListener('submit', function (e) { e.preventDefault(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]'); if (!b || !root.contains(b)) return;
      var a = b.dataset.i;
      if (a === 'next') go(S.page + 1);
      else if (a === 'prev') { if (S.page === 0) { if (opts.onBack) opts.onBack(); } else go(S.page - 1); }
      else if (a === 'finish') finish(false);
      else if (a === 'finish-force') finish(true);
      else if (a === 'goto-open') { var p = firstOpen(); if (p >= 0) { go(p); var q = root.querySelector('fieldset.q:not(.done)'); if (q) q.scrollIntoView({ block: 'center' }); } }
    });

    return {
      start: function (sex, meta) { S.sex = sex; S.a = {}; S.notes = {}; S.page = 0; S.notice = ''; S.meta = meta || {}; render(); U.focusTop(root); save(); },
      resume: function (d) { S.sex = d.sex; S.a = d.a; S.notes = d.notes || {}; S.meta = d.meta || {}; S.notice = ''; S.page = Math.min(d.page || 0, pages().length - 1); render(); U.focusTop(root); },
      draft: draft, clear: clear, render: render,
      state: function () { return S; }
    };
  }
  return { create: create };
})();
