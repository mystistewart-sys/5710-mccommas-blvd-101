/* =========================================================================
   Property Concierge — 5710 McCommas Blvd #101
   Talks to /.netlify/functions/concierge. The API key never reaches
   the browser. Answers are constrained to this property's verified records.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var panel = $('#ai'), log = $('#aiLog'), form = $('#aiForm'),
      input = $('#aiInput'), send = $('#aiSend'), chips = $('#aiChips'),
      openBtn = $('#aiOpen'), closeBtn = $('#aiClose');

  if (!panel || !log || !form) return;

  var track = window.msgTrack || function () {};
  var history = [];
  var busy = false;
  var greeted = false;

  var GREETING =
    'Hello — I can answer questions about 5710 McCommas Blvd #101. Ask me about the ' +
    'HOA, the taxes, the layout, parking or the schools. For anything I cannot ' +
    "confirm, I'll point you to Mysti.";

  var REACH_MYSTI =
    'Mysti Stewart can answer directly — call or text ' +
    '<a href="tel:+12142133537">214-213-3537</a> or email ' +
    '<a href="mailto:mysti.stewart@compass.com">mysti.stewart@compass.com</a>.';

  /* Visitors always get the same calm hand-off to Mysti. The distinction is for
     whoever is debugging: the real cause goes to the console and, for setup
     problems that only an operator can fix, onto the page itself. */
  var OPERATOR_NOTES = {
    not_configured:  'Setup needed: ANTHROPIC_API_KEY is not set on this Netlify deploy.',
    bad_api_key:     'Setup needed: Netlify rejected the Anthropic API key.',
    model_unavailable: 'Setup needed: this Anthropic account cannot reach the configured model.',
    not_deployed:    'Setup needed: the concierge function is not deployed at /.netlify/functions/concierge.'
  };

  function failureHtml(code, detail) {
    var note = OPERATOR_NOTES[code];
    return 'I am not able to reach the concierge service right now. ' + REACH_MYSTI +
           (note ? '<br><br><small><strong>' + esc(note) + '</strong> ' + esc(detail || '') + '</small>' : '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Minimal, safe rendering: paragraphs + the contact links we inject ourselves. */
  function paragraphs(text) {
    return esc(text)
      .split(/\n{2,}|\n/)
      .map(function (t) { return t.trim(); })
      .filter(Boolean)
      .map(function (t) { return '<p>' + t + '</p>'; })
      .join('');
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addAI(html, cls) {
    var d = document.createElement('div');
    d.className = 'msg msg--ai' + (cls ? ' ' + cls : '');
    d.innerHTML = '<b class="who">Concierge</b>' + html;
    log.appendChild(d); scrollDown();
    return d;
  }
  function addMe(text) {
    var d = document.createElement('div');
    d.className = 'msg msg--me';
    d.innerHTML = '<b class="who">You</b>' + esc(text);
    log.appendChild(d); scrollDown();
  }
  function addTyping() {
    var d = document.createElement('div');
    d.className = 'msg msg--ai';
    d.innerHTML = '<b class="who">Concierge</b><span class="dots"><i></i><i></i><i></i></span>';
    log.appendChild(d); scrollDown();
    return d;
  }

  /* ------------------------------ open/close ------------------------------ */
  function open() {
    panel.hidden = false;
    if (openBtn) openBtn.style.display = 'none';
    if (!greeted) { addAI(paragraphs(GREETING)); greeted = true; }
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    panel.hidden = true;
    if (openBtn) { openBtn.style.display = ''; openBtn.focus(); }
  }

  document.querySelectorAll('[data-ai-open]').forEach(function (b) {
    b.addEventListener('click', open);
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  /* ------------------------------ auto-grow ------------------------------ */
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  /* -------------------------------- chips -------------------------------- */
  if (chips) {
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || busy) return;
      ask(b.textContent.trim());
    });
  }

  /* --------------------------------- ask --------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    input.value = '';
    input.style.height = 'auto';
    ask(q);
  });

  function ask(question) {
    if (busy) return;
    busy = true;
    send.disabled = true;
    if (chips) chips.hidden = true;

    addMe(question);
    track('ai_question', { chars: question.length });
    var typing = addTyping();

    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 30000);

    fetch('/.netlify/functions/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, history: history.slice(-8) }),
      signal: ctrl.signal
    })
      .then(function (r) {
        clearTimeout(to);
        return r.text().then(function (raw) {
          var j = null;
          try { j = JSON.parse(raw); } catch (e) { /* not JSON */ }

          /* A non-JSON body means the request never reached the function —
             usually a 404 HTML page because functions were not deployed. */
          if (!j) {
            var e404 = new Error('The concierge endpoint did not return JSON (HTTP ' + r.status + ').');
            e404.code = r.status === 404 ? 'not_deployed' : 'bad_response';
            throw e404;
          }
          if (!r.ok) {
            var err = new Error((j.error || 'HTTP ' + r.status));
            err.code = j.code || 'http_' + r.status;
            throw err;
          }
          return j;
        });
      })
      .then(function (j) {
        typing.remove();
        var answer = (j && j.answer) ? j.answer : '';
        if (!answer) throw new Error('empty');
        addAI(paragraphs(answer));
        history.push({ role: 'user', content: question });
        history.push({ role: 'assistant', content: answer });
        track('ai_answer');
      })
      .catch(function (err) {
        clearTimeout(to);
        typing.remove();
        var code = (err && err.code) || (err && err.name === 'AbortError' ? 'timeout' : 'network_error');
        var detail = (err && err.message) || '';
        // Surfaced for whoever is debugging the deploy; visitors see the hand-off above.
        if (window.console && console.error) {
          console.error('[concierge] request failed —', code + ':', detail);
        }
        addAI(failureHtml(code, detail), 'msg--err');
        track('ai_error', { code: code });
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }
})();
