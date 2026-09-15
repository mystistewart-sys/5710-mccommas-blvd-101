/* =========================================================================
   5710 McCommas Blvd #101 — site behaviour
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     ANALYTICS CONFIGURATION
     ---------------------------------------------------------------------
     No measurement IDs were supplied for this property, so nothing is
     loaded and no events are sent. Do NOT paste in another property's IDs.

     To activate, fill in the values below with IDs issued for THIS
     property or for the Mysti Stewart Group / Compass account:

       ga4        'G-XXXXXXXXXX'
       googleAds  'AW-XXXXXXXXX'
       adsLabels  { cta_showing: 'AW-XXXXXXXXX/xxxxxxxxxxxxxxxx', ... }
       metaPixel  'XXXXXXXXXXXXXXX'

     Conversions fire on real visitor actions only — never on page load.
  --------------------------------------------------------------------- */
  var ANALYTICS = {
    ga4: '',
    googleAds: '',
    adsLabels: {},
    metaPixel: ''
  };

  window.dataLayer = window.dataLayer || [];

  function loadAnalytics() {
    var ids = [ANALYTICS.ga4, ANALYTICS.googleAds].filter(Boolean);
    if (ids.length) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ids[0]);
      document.head.appendChild(s);
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      ids.forEach(function (id) { window.gtag('config', id); });
    }
    if (ANALYTICS.metaPixel) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', ANALYTICS.metaPixel);
      window.fbq('track', 'PageView');
    }
  }
  loadAnalytics();

  function track(name, params) {
    var data = Object.assign({ event: name, property: '5710-mccommas-101', mls: '21312626' }, params || {});
    window.dataLayer.push(data);
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, data);
      var label = ANALYTICS.adsLabels[name];
      if (label) window.gtag('event', 'conversion', { send_to: label });
    }
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, data);
  }
  window.msgTrack = track;

  /* Any element carrying data-track fires on activation. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { location: el.getAttribute('data-loc') || 'page' });
  });

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------ Year ------------------------------ */
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ------------------------------ Nav ------------------------------- */
  var nav = $('#nav'), toggle = $('#navToggle'), drawer = $('#drawer');

  function setDrawer(open) {
    if (!drawer || !toggle || !nav) return;
    drawer.hidden = !open;
    nav.setAttribute('data-open', String(open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (toggle) toggle.addEventListener('click', function () { setDrawer(drawer.hidden); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && !drawer.hidden) { setDrawer(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1040) setDrawer(false); });

  /* Scroll-spy */
  var navLinks = $$('.nav__links a');
  var spyTargets = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (spyTargets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ------------------------------ Reveal ----------------------------- */
  function reveal(sel) {
    var els = $$(sel);
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (!en.isIntersecting) return;
        var d = Math.min(i * 70, 280);
        setTimeout(function () { en.target.classList.add('is-in'); }, d);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------- Highlights ---------------------------- */
  var HIGHLIGHTS = [
    ['Two bedrooms, two ensuite baths', 'Each bedroom has its own full bath, so there is no shared-bath compromise between the primary and the second bedroom.'],
    ['A separate den, not a converted bedroom', 'A dedicated 9 × 10 den means a home office or studio without giving up the second bedroom.'],
    ['Single-level, ground-floor living', 'Unit 101 sits on the first floor of a three-story building and is laid out on one level — no interior stairs.'],
    ['A 28-foot open living space', 'Living, dining and kitchen run together across the main space, with windows on more than one wall.'],
    ['Gas cooktop kitchen with a large island', 'Gas cooktop under a vented stainless hood, a full stainless appliance suite, tile backsplash and an island with seating.'],
    ['Polished concrete floors', 'Continuous concrete flooring runs through the living areas — no carpet seams and nothing to refinish.'],
    ['Two covered underground spaces', 'Two assigned, covered spaces in the building’s underground garage, plus a private covered balcony above street level.'],
    ['Lock-and-leave ownership', 'The $457 monthly HOA covers building insurance, structural maintenance and management — no roof, yard or exterior punch list.']
  ];
  var hlGrid = $('#hlGrid');
  if (hlGrid) {
    hlGrid.innerHTML = HIGHLIGHTS.map(function (h, i) {
      return '<article class="hl__item"><span class="hl__n">' + String(i + 1).padStart(2, '0') +
             '</span><h3>' + h[0] + '</h3><p>' + h[1] + '</p></article>';
    }).join('');
    reveal('.hl__item');
  }

  /* ----------------------------- Places ------------------------------ */
  var PLACES = [
    ['Greenville Avenue', 'The Lower Greenville restaurant, patio and nightlife corridor.'],
    ['Mockingbird Station', 'Mixed-use center with shops, dining, a cinema and a DART light rail station.'],
    ['Granada Theater', 'Historic live music venue on Greenville Avenue.'],
    ['The M Streets', 'The adjacent residential district known for its Tudor-style homes.'],
    ['Southern Methodist University', 'Campus just north of the neighborhood, in University Park.'],
    ['White Rock Lake', 'East Dallas lake with a loop trail and surrounding park land.'],
    ['US-75 · Central Expressway', 'Primary north-south freeway access, reached by way of Mockingbird Lane.']
  ];
  var places = $('#places');
  if (places) {
    places.innerHTML = PLACES.map(function (p) {
      return '<li><b>' + p[0] + '</b><span>' + p[1] + '</span></li>';
    }).join('');
  }

  /* ----------------------------- Gallery ----------------------------- */
  var CATS = [
    ['all', 'All 29'],
    ['living', 'Living & Entry'],
    ['kitchen', 'Kitchen & Dining'],
    ['primary', 'Primary Suite'],
    ['bedbath', 'Bedroom, Den & Baths'],
    ['outside', 'Outdoor & Building']
  ];

  /* slug, category, short caption, full alt text */
  var PHOTOS = [
    ['living-open-plan','living','Living room','Open living room looking through to the dining area and kitchen.'],
    ['kitchen-island-wide','kitchen','Kitchen island','Kitchen island with seating beneath glass pendant lights.'],
    ['primary-bedroom','primary','Primary bedroom','Primary bedroom with a window and floor-length drapery.'],
    ['balcony','outside','Private balcony','Covered private balcony with a wrought iron railing.'],
    ['kitchen-island','kitchen','Kitchen','Kitchen with island seating, stainless appliances and track lighting.'],
    ['living-wide','living','Living room','Wide view of the living room, open to the kitchen beyond.'],
    ['primary-bath-vanity','primary','Primary bath','Primary bath with a double vanity, freestanding tub and closet beyond.'],
    ['exterior-front','outside','Building exterior','Street view of the Greenwood Flats building at 5710 McCommas Blvd.'],
    ['living-media','living','Living room','Living room with a media wall and open sightlines.'],
    ['kitchen-wide','kitchen','Kitchen','Wide view of the kitchen with island, range and window.'],
    ['primary-bath-shower','primary','Primary bath','Freestanding soaking tub beside a glass-enclosed tiled shower.'],
    ['bedroom-two','bedbath','Second bedroom','Second bedroom with two beds and a door to its ensuite bath.'],
    ['living-windows','living','Living room','Living room with windows on two walls.'],
    ['dining-door','kitchen','Dining area','Dining area beside windows and the door to the covered balcony.'],
    ['primary-bedroom-ensuite','primary','Primary suite','Primary bedroom with the door to the ensuite bath open.'],
    ['den-flex','bedbath','Den','The separate den — a flex room off the main hall.'],
    ['kitchen-sink','kitchen','Kitchen','Kitchen island with undermount sink, looking toward the dining area.'],
    ['dining','kitchen','Dining area','Dining area with seating for four and natural light.'],
    ['primary-bedroom-closet','primary','Primary suite','Primary bedroom showing the ensuite bath and closet entries.'],
    ['aerial-building','outside','Aerial view','Aerial view of the three-story Greenwood Flats building.'],
    ['living-seating','living','Living room','Living room seating area with windows to the street.'],
    ['kitchen-range','kitchen','Kitchen','Gas range with a vented stainless hood and tile backsplash.'],
    ['bath-secondary','bedbath','Second bath','Second full bath with a tub-shower, tile surround and vanity.'],
    ['entry-hall','living','Entry hall','Entry hall with polished concrete floors leading to the living area.'],
    ['bedroom-two-alt','bedbath','Second bedroom','Second bedroom with a window and two beds.'],
    ['den-flex-door','bedbath','Den','The den with its sliding barn door to the hallway.'],
    ['entry-powder','bedbath','Powder bath','Powder bath off the entry with a pedestal sink.'],
    ['community-walk','outside','Community','Landscaped walkway between the buildings at Greenwood Flats.'],
    ['building-corridor','outside','Building corridor','Interior corridor leading to the front door of Unit 101.']
  ];

  var galBar = $('#galBar'), galGrid = $('#galGrid');

  if (galBar && galGrid) {
    galBar.innerHTML = CATS.map(function (c, i) {
      return '<button class="chip" type="button" data-cat="' + c[0] + '" aria-pressed="' + (i === 0) + '">' + c[1] + '</button>';
    }).join('');

    galGrid.innerHTML = PHOTOS.map(function (p, i) {
      return '<figure style="display:contents"><button class="gal__item" type="button" data-i="' + i + '" data-cat="' + p[1] + '" aria-label="Open photo ' + (i + 1) + ' of ' + PHOTOS.length + ': ' + p[3] + '">' +
        '<picture>' +
          '<source type="image/webp" srcset="/assets/img/gallery/' + p[0] + '-t.webp">' +
          '<img src="/assets/img/gallery/' + p[0] + '-t.jpg" width="800" height="533" loading="' + (i < 4 ? 'eager' : 'lazy') + '" decoding="async" alt="' + p[3] + '">' +
        '</picture>' +
        '<figcaption>' + p[2] + '</figcaption>' +
      '</button></figure>';
    }).join('');

    galBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip'); if (!btn) return;
      var cat = btn.getAttribute('data-cat');
      $$('.chip', galBar).forEach(function (c) { c.setAttribute('aria-pressed', String(c === btn)); });
      $$('.gal__item', galGrid).forEach(function (it) {
        it.hidden = !(cat === 'all' || it.getAttribute('data-cat') === cat);
      });
      track('gallery_filter', { filter: cat });
    });

    galGrid.addEventListener('click', function (e) {
      var it = e.target.closest('.gal__item'); if (!it) return;
      openLb(parseInt(it.getAttribute('data-i'), 10));
    });
  }

  /* ---------------------------- Lightbox ----------------------------- */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbCount = $('#lbCount');
  var lbIndex = 0, lbReturn = null;

  function visibleIdx() {
    return PHOTOS.map(function (_, i) { return i; }).filter(function (i) {
      var el = galGrid && galGrid.querySelector('[data-i="' + i + '"]');
      return el && !el.hidden;
    });
  }

  function renderLb() {
    var p = PHOTOS[lbIndex];
    lbImg.src = '/assets/img/gallery/' + p[0] + '.jpg';
    lbImg.alt = p[3];
    lbCap.innerHTML = '<b>' + p[2] + '</b>' + p[3];
    var list = visibleIdx();
    lbCount.textContent = (list.indexOf(lbIndex) + 1) + ' / ' + list.length;
  }

  function openLb(i) {
    if (!lb) return;
    lbReturn = document.activeElement;
    lbIndex = i; renderLb();
    lb.hidden = false;
    document.body.classList.add('is-locked');
    $('#lbClose').focus();
    track('gallery_open', { photo: PHOTOS[i][0] });
  }
  function closeLb() {
    if (!lb) return;
    lb.hidden = true;
    document.body.classList.remove('is-locked');
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  function stepLb(d) {
    var list = visibleIdx(); if (!list.length) return;
    var at = list.indexOf(lbIndex);
    lbIndex = list[(at + d + list.length) % list.length];
    renderLb();
  }

  if (lb) {
    $('#lbClose').addEventListener('click', closeLb);
    $('#lbPrev').addEventListener('click', function () { stepLb(-1); });
    $('#lbNext').addEventListener('click', function () { stepLb(1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.id === 'lbStage') closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLb(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLb(1); }
      else if (e.key === 'Tab') {
        var f = $$('button', lb);
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* swipe */
    var x0 = null, y0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) stepLb(dx < 0 ? 1 : -1);
      x0 = y0 = null;
    }, { passive: true });
  }

  /* --------------------------- Tax estimator -------------------------- */
  var RATE = 0.0222671; /* combined 2026 Dallas rate, 2.22671% */
  var priceEl = $('#calcPrice'), yEl = $('#calcYear'), mEl = $('#calcMonth');
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function calc() {
    if (!priceEl) return;
    var v = parseFloat(String(priceEl.value).replace(/[^0-9.]/g, '')) || 0;
    v = Math.min(v, 100000000);
    var annual = v * RATE;
    yEl.textContent = v ? usd0.format(annual) : '—';
    mEl.textContent = v ? usd0.format(annual / 12) : '—';
  }
  if (priceEl) {
    var calcTimer;
    priceEl.addEventListener('input', function () {
      calc();
      clearTimeout(calcTimer);
      calcTimer = setTimeout(function () { track('tax_estimator_used'); }, 1200);
    });
    priceEl.addEventListener('blur', function () {
      var v = parseFloat(String(priceEl.value).replace(/[^0-9.]/g, ''));
      if (v) priceEl.value = usd0.format(Math.min(v, 100000000));
      calc();
    });
    calc();
  }

  /* ------------------------------- Map -------------------------------- */
  /* The map is embedded directly and loads itself lazily as the reader nears
     it. Record that it was actually seen, once, so the section still reports
     engagement now that there is no button to click. */
  var mapBox = $('#mapBox');
  if (mapBox && 'IntersectionObserver' in window) {
    var mapSeen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        track('map_viewed');
        mapSeen.disconnect();
      });
    }, { threshold: 0.35 });
    mapSeen.observe(mapBox);
  }

  /* ------------------------------ Form -------------------------------- */
  var form = $('#leadForm'), status = $('#formStatus'), submitBtn = $('#leadSubmit');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var fd = new FormData(form);
      var intent = fd.get('intent') || 'unspecified';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      status.hidden = true;

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fd).toString()
      })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset();
        status.hidden = false;
        status.textContent = 'Thank you — your request is on its way to Mysti. You will hear back shortly. For anything urgent, call or text 214-213-3537.';
        submitBtn.textContent = 'Request Sent';
        track('form_submit_success', { intent: intent });
      })
      .catch(function () {
        status.hidden = false;
        status.textContent = 'Something went wrong sending that. Please call or text Mysti at 214-213-3537, or email mysti.stewart@compass.com.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
        track('form_submit_error', { intent: intent });
      });
    });

    /* Deep-link intents: #contact?intent=valuation etc. set the dropdown. */
    $$('[data-intent]').forEach(function (el) {
      el.addEventListener('click', function () {
        var sel = $('#f-intent');
        if (sel) sel.value = el.getAttribute('data-intent');
      });
    });
  }

  /* --------------------------- Reveal sections ------------------------ */
  reveal('.rv');
})();
