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
    'Hi — I can answer questions about 5710 McCommas Blvd #101 using the listing ' +
    'and the Dallas appraisal district record for this unit. Ask me about the HOA, ' +
    'the taxes, the layout, parking or the schools. For anything I cannot confirm, ' +
    "I'll point you to Mysti.";

  var CONTACT_FALLBACK =
    'I am not able to reach the concierge service right now. Mysti Stewart can answer ' +
    'directly — call or text <a href="tel:+12142133537">214-213-3537</a> or email ' +
    '<a href="mailto:mysti.stewart@compass.com">mysti.stewart@compass.com</a>.';

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
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j && j.error ? j.error : 'HTTP ' + r.status);
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
      .catch(function () {
        clearTimeout(to);
        typing.remove();
        addAI(CONTACT_FALLBACK, 'msg--err');
        track('ai_error');
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }
})();
