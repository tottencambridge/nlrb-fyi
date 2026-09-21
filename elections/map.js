
(function () {
  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];
  var SAY = {'for': 'A majority voted for a union.',
             'against': 'A majority voted against representation.',
             'open': 'Not settled by the count.'};
  var calm = window.matchMedia &&
             window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  [].forEach.call(document.querySelectorAll('.mapfig'), function (fig) {
    var svg = fig.querySelector('.usmap'), tip = fig.querySelector('.maptip'),
        wrap = fig.querySelector('.mapwrap'), hot = null, pinned = false,
        touch = false, full = svg.getAttribute('viewBox');

    var marks = [].map.call(svg.querySelectorAll('.marks a'), function (a) {
      var m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(a.getAttribute('transform'));
      return {a: a, x: +m[1], y: +m[2],
              kind: a.getAttribute('class').replace('k-', '').split(' ')[0]};
    });

    function nice(iso) {
      var p = iso.split('-');
      return (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0];
    }

    function line(cls, text) {
      var d = document.createElement('div');
      d.className = cls; d.textContent = text; tip.appendChild(d);
      return d;
    }

    function fill(m, withLink) {
      var v = m.a.getAttribute('data-v').split('|');
      tip.textContent = '';
      var votes = v[0] ? v[0].split('/') : [], count;
      if (!votes.length && v[1] === '') {
        count = 'No count in the Board’s export';
      } else {
        count = (votes.length > 1 ? votes.join(' and ') + ' for the unions'
                                  : (votes[0] || 0) + ' for') +
                ' · ' + (v[1] === '' ? 0 : v[1]) + ' against';
      }
      line('v', count);
      line('s', SAY[m.kind] + (v[4] ? ' Challenged ballots could change it.' : ''));
      line('n', m.a.getAttribute('aria-label'));
      line('d', (v[2] ? (+v[2]).toLocaleString() + ' eligible · ' : '') +
                'counted ' + nice(v[3]));
      if (withLink) {
        var go = document.createElement('a');
        go.className = 'go'; go.href = m.a.getAttribute('href');
        go.textContent = 'Go to this count'; tip.appendChild(go);
      }
    }

    function show(m, withLink) {
      if (hot && hot !== m) { hot.a.classList.remove('hot'); }
      hot = m; m.a.classList.add('hot');
      fill(m, withLink);
      tip.hidden = false;
      var w = wrap.getBoundingClientRect(),
          r = m.a.getBoundingClientRect(),
          cx = r.left + r.width / 2 - w.left,
          tw = tip.offsetWidth, th = tip.offsetHeight,
          left = Math.max(6, Math.min(w.width - tw - 6, cx - tw / 2)),
          top = r.top - w.top - th - 10;
      if (top < 4) { top = r.bottom - w.top + 10; }
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }

    function clear() {
      if (hot) { hot.a.classList.remove('hot'); }
      hot = null; pinned = false; tip.hidden = true;
    }

    // The pointer only has to be closest, never dead centre: a unit of four
    // people is a dot a few pixels wide.
    function nearest(ev) {
      var best = null, bd = 28 * 28;
      marks.forEach(function (m) {
        if (m.a.classList.contains('off')) { return; }
        var r = m.a.getBoundingClientRect();
        if (!r.width) { return; }
        var dx = r.left + r.width / 2 - ev.clientX,
            dy = r.top + r.height / 2 - ev.clientY,
            edge = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r.width / 2);
        if (edge * edge < bd) { bd = edge * edge; best = m; }
      });
      return best;
    }

    svg.addEventListener('pointerdown', function (ev) {
      touch = ev.pointerType === 'touch' || ev.pointerType === 'pen';
    });
    svg.addEventListener('pointermove', function (ev) {
      if (touch || pinned) { return; }
      var m = nearest(ev);
      if (m) { show(m, false); svg.classList.add('aim'); }
      else { clear(); svg.classList.remove('aim'); }
    });
    svg.addEventListener('pointerleave', function () {
      if (!pinned) { clear(); } svg.classList.remove('aim');
    });
    svg.addEventListener('click', function (ev) {
      var m = nearest(ev);
      if (touch) {                       // first tap reads, the card's link goes
        ev.preventDefault();
        if (m) { show(m, true); pinned = true; } else { clear(); }
        return;
      }
      if (m && !ev.target.closest('a')) { location.href = m.a.getAttribute('href'); }
      else if (m && ev.target.closest('a') !== m.a) {
        ev.preventDefault(); location.href = m.a.getAttribute('href');
      }
    });
    svg.addEventListener('focusin', function (ev) {
      var a = ev.target.closest('a');
      marks.some(function (m) { if (m.a === a) { show(m, false); return true; } });
    });
    svg.addEventListener('focusout', function () { if (!pinned) { clear(); } });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { clear(); }
    });

    // ---- the size key is drawn at the map's true scale
    function key() {
      var vb = svg.getAttribute('viewBox').split(' ').map(Number),
          inv = Math.pow(vb[2] / 1000, 0.62),
          px = svg.getBoundingClientRect().width / vb[2];
      [].forEach.call(fig.querySelectorAll('.sizekey circle'), function (c) {
        c.setAttribute('r', (c.getAttribute('data-r') * inv * px).toFixed(1));
      });
    }
    key();
    window.addEventListener('resize', key);

    // ---- zoom presets. Marks keep a steady size as the map grows.
    function setView(box) {
      var from = svg.getAttribute('viewBox').split(' ').map(Number),
          to = box.split(' ').map(Number), t0 = null;
      function apply(b) {
        svg.setAttribute('viewBox', b.join(' '));
        svg.style.setProperty('--inv', Math.pow(b[2] / 1000, 0.62).toFixed(3));
      }
      clear();
      if (calm) { apply(to); key(); return; }
      function step(ts) {
        if (t0 === null) { t0 = ts; }
        var k = Math.min(1, (ts - t0) / 420), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        apply(from.map(function (f, i) { return f + (to[i] - f) * e; }));
        if (k < 1) { requestAnimationFrame(step); } else { key(); }
      }
      requestAnimationFrame(step);
    }
    [].forEach.call(fig.querySelectorAll('[data-view]'), function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(fig.querySelectorAll('[data-view]'), function (x) {
          x.classList.toggle('on', x === b);
        });
        setView(b.getAttribute('data-view'));
      });
    });

    // ---- show or hide a kind of mark. Scopes the list under the map too.
    [].forEach.call(fig.querySelectorAll('[data-kind]'), function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true', k = b.getAttribute('data-kind');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        clear();
        marks.forEach(function (m) { if (m.kind === k) { m.a.classList.toggle('off', !on); } });
        [].forEach.call(document.querySelectorAll('.tallies li[data-kind="' + k + '"]'),
          function (li) { li.hidden = !on; });
      });
    });

    // ---- a row in the list lights its mark
    [].forEach.call(document.querySelectorAll('.tallies li[id]'), function (li) {
      var m = null;
      marks.some(function (x) {
        if (x.a.getAttribute('href') === '#' + li.id) { m = x; return true; }
      });
      if (!m) { return; }
      li.addEventListener('mouseenter', function () { m.a.classList.add('hot'); });
      li.addEventListener('mouseleave', function () { if (hot !== m) { m.a.classList.remove('hot'); } });
    });
  });
}());
