/* Body Balance Score — klantpagina: welkom, vragenlijst, versturen, bedankt. De klant ziet geen scores. */
(function () {
  'use strict';
  var U = BBSUI, esc = U.esc, $ = U.$, CFG = window.NLH_BBS_CFG || {};
  var main = $('#main');
  var S = { view: 'welcome', err: '', pending: null, firstName: '' };
  var intake = BBSIntake.create(main, {
    draftKey: CFG.draftKey || 'nlh-bbs-draft', finishLabel: 'Verstuur mijn antwoorden', feedback: !!CFG.trial,
    onBack: function () { show('welcome'); },
    onDone: function (m, meta) {
      m.code = BBS.encode(m);
      var st = intake.state();
      S.pending = { code: m.code, name: meta.name, email: meta.email, consent: true, website: meta.website || '',
        answers: st.a, feedback: String(st.notes.feedback || '').trim().slice(0, 1500),
        minutes: meta.started ? Math.max(1, Math.round((Date.now() - meta.started) / 60000)) : null };
      S.firstName = String(meta.name || '').split(' ')[0];
      send();
    }
  });
  function coach() { return CFG.coachName || 'je coach'; }
  function Coach() { var c = coach(); return c.charAt(0).toUpperCase() + c.slice(1); }
  function show(v) { S.view = v; render(); U.focusTop(main); }
  function render() {
    if (S.view === 'quiz') return intake.render();
    main.innerHTML = S.view === 'welcome' ? viewWelcome() : S.view === 'sending' ? viewSending() : S.view === 'thanks' ? viewThanks() : viewError();
  }

  function viewWelcome() {
    var d = intake.draft(), p = U.LS.get(CFG.profileKey || 'nlh-bbs-profile') || {}, user = CFG.user || null;
    var name = user ? user.name : (p.name || ''), email = user ? user.email : (p.email || '');
    var h = '<section class="hero"><p class="eyebrow">The Next Level Health Project' + (CFG.trial ? ' \u00b7 proefversie' : '') + '</p><h1>Body Balance-vragenlijst</h1>';
    h += '<p class="lede">Deze vragenlijst brengt in kaart hoe je lichaam zich de voorbije maand voelde: energie, slaap, stress, spijsvertering, hormonen en meer. Op basis van je antwoorden berekent ' + esc(coach()) + ' je Body Balance Score en bespreekt die met jou.</p>';
    h += '<p class="meta"><span>± 15 minuten</span><span>13 thema’s</span><span>tussendoor stoppen kan</span></p></section>';
    h += '<section class="card start intake-start" aria-labelledby="start-h"><h2 id="start-h">Over jou</h2>';
    if (d) h += '<div class="resume"><p><b>Je was al bezig.</b> Je zat aan stap ' + (d.page + 1) + ' van ' + d.steps + '.</p><div class="row"><button type="button" class="btn primary" data-p="resume">Verder invullen</button><button type="button" class="btn ghost" data-p="discard">Opnieuw beginnen</button></div></div>';
    h += '<form id="welcome-form" class="stack" novalidate>';
    h += '<label class="field"><span>Voornaam en naam</span><input id="w-name" type="text" autocomplete="name" required maxlength="120" value="' + esc(name) + '"></label>';
    h += '<label class="field"><span>E-mailadres</span><input id="w-email" type="email" autocomplete="email" required maxlength="190" value="' + esc(email) + '"' + (user ? ' readonly' : '') + '><small class="hint">Zo koppelt ' + esc(coach()) + ' je antwoorden aan je vorige metingen.</small></label>';
    h += '<fieldset class="field"><legend>Je lichaam</legend><div class="seg two" role="radiogroup">' +
      '<label><input type="radio" name="w-sex" id="w-sex-w" value="women"' + (p.sex === 'women' ? ' checked' : '') + '><span>Vrouw</span></label>' +
      '<label><input type="radio" name="w-sex" id="w-sex-m" value="men"' + (p.sex === 'men' ? ' checked' : '') + '><span>Man</span></label></div>' +
      '<small class="hint">Een deel van de vragen verschilt voor vrouwen en mannen.</small></fieldset>';
    h += '<label class="hp" aria-hidden="true">Website<input id="w-website" type="text" tabindex="-1" autocomplete="off"></label>';
    h += '<label class="check"><input id="w-consent" type="checkbox"><span>Ik geef toestemming om mijn antwoorden, ook gezondheidsgegevens, te bewaren. Enkel ' + esc(coach()) + ' kan ze bekijken, om mij te begeleiden.' +
      (CFG.privacyUrl ? ' <a href="' + esc(CFG.privacyUrl) + '" target="_blank" rel="noopener">Privacyverklaring</a>' : '') + '</span></label>';
    h += '<p class="form-err" id="w-err" role="alert"></p><button class="btn primary big" type="submit">Start de vragenlijst</button></form></section>';
    return h;
  }
  function viewSending() {
    return '<section class="status-card" aria-live="polite"><div class="spinner" aria-hidden="true"></div><h2>Je antwoorden worden verstuurd…</h2><p class="small">Even geduld, sluit dit venster nog niet.</p></section>';
  }
  function viewThanks() {
    return '<section class="status-card done"><p class="eyebrow">Body Balance-vragenlijst</p><h1>Bedankt' + (S.firstName ? ', ' + esc(S.firstName) : '') + '!</h1>' +
      '<p class="lede">Je antwoorden zijn goed ontvangen. ' + esc(Coach()) + ' bekijkt je resultaten en bespreekt ze met je.</p>' +
      (CFG.homeUrl ? '<p><a class="btn primary" href="' + esc(CFG.homeUrl) + '">Terug naar de website</a></p>' : '') + '</section>';
  }
  function viewError() {
    return '<section class="status-card"><h2>Versturen lukte niet</h2><p>' + esc(S.err) + ' Je antwoorden zijn niet verloren.</p>' +
      '<div class="row"><button type="button" class="btn primary" data-p="retry">Probeer opnieuw</button><button type="button" class="btn ghost" data-p="back-quiz">Terug naar de vragen</button></div>' +
      '<div class="fallback"><p class="small">Blijft het mislukken? Kopieer dan deze code en stuur ze naar ' + esc(coach()) + '. Ze bevat al je antwoorden.</p>' +
      '<div class="codebox"><code id="code-text">' + esc(S.pending ? S.pending.code : '') + '</code><button type="button" class="btn" data-p="copy">Kopieer code</button></div><p class="small" id="copy-msg" role="status"></p></div></section>';
  }

  function send(retried) {
    show('sending');
    S.pending.nonce = CFG.nonce || '';
    if (!CFG.submitUrl && CFG.trial) { S.err = 'Het verzendadres is nog niet ingesteld.'; show('error'); return; }
    fetch(CFG.submitUrl || location.pathname + location.search, { method: 'POST', headers: { 'Content-Type': CFG.submitType || 'application/json' }, credentials: 'same-origin', body: JSON.stringify(S.pending) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) { intake.clear(); S.pending = null; show('thanks'); }
        else if (!retried && res.j && res.j.code === 'nonce' && res.j.nonce) { CFG.nonce = res.j.nonce; send(true); }
        else { S.err = (res.j && res.j.message) || 'De server gaf een foutmelding.'; show('error'); }
      })
      .catch(function () { S.err = 'Er is geen verbinding met de server.'; show('error'); });
  }

  main.addEventListener('submit', function (e) {
    if (e.target.id !== 'welcome-form') return;
    e.preventDefault();
    var err = $('#w-err'), name = $('#w-name').value.trim(), email = $('#w-email').value.trim();
    var sexEl = main.querySelector('input[name="w-sex"]:checked');
    if (name.length < 2) { err.textContent = 'Vul je naam in.'; $('#w-name').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Vul een geldig e-mailadres in.'; $('#w-email').focus(); return; }
    if (!sexEl) { err.textContent = 'Kies of je de vragen voor een vrouw of een man wil invullen.'; return; }
    if (!$('#w-consent').checked) { err.textContent = 'Vink de toestemming aan om verder te gaan.'; return; }
    U.LS.set(CFG.profileKey || 'nlh-bbs-profile', { name: name, email: email, sex: sexEl.value });
    S.view = 'quiz';
    intake.start(sexEl.value, { name: name, email: email, date: U.today(), website: $('#w-website').value, started: Date.now() });
  });
  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    var a = b.dataset.p;
    if (a === 'resume') { var d = intake.draft(); if (!d) return render(); S.view = 'quiz'; intake.resume(d); }
    else if (a === 'discard') { intake.clear(); render(); }
    else if (a === 'retry') send(false);
    else if (a === 'back-quiz') { var dr = intake.draft(); S.view = 'quiz'; if (dr) intake.resume(dr); else intake.render(); }
    else if (a === 'copy') U.copyText($('#code-text').textContent, $('#copy-msg'), $('#code-text'));
  });
  render();
})();
