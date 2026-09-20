
(function () {
  var box = document.getElementById('q'),
      hits = document.getElementById('hits'),
      note = document.getElementById('hitnote'),
      cache = {}, pending = null, total = 0;

  try { total = Number(box.getAttribute('data-total')) || 0; } catch (e) {}
  idle();

  function idle() {
    note.textContent = total
      ? total.toLocaleString() +
        ' employers and unions are in this site’s copy of the record.'
      : '';
  }

  function norm(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
            .replace(/\s+/g, ' ').trim();
  }

  function shardFor(q) {
    return q.slice(0, 2);
  }

  function load(name, then) {
    if (cache[name]) { then(cache[name]); return; }
    fetch('search/' + name + '.json')
      .then(function (r) { return r.ok ? r.json() : {n: 0, rows: []}; })
      .then(function (j) { cache[name] = j; then(j); })
      .catch(function () {
        note.textContent = 'That part of the search list could not be ' +
          'loaded. The employers page lists every name.';
      });
  }

  function run() {
    var q = norm(box.value);
    hits.innerHTML = '';
    if (q.length < 2) { idle(); return; }
    var name = shardFor(q);
    note.textContent = 'Looking…';
    pending = q;
    load(name, function (shard) {
      if (pending !== q) { return; }
      render(shard, q);
    });
  }

  function render(shard, q) {
    var rows = shard.rows || [], out = [], i, n;
    for (i = 0; i < rows.length; i++) {
      n = norm(rows[i][0]);
      if (n.indexOf(q) === 0) { out.push([0, rows[i]]); }
      else if (n.indexOf(' ' + q) !== -1) { out.push([1, rows[i]]); }
      else if (n.indexOf(q) !== -1) { out.push([2, rows[i]]); }
      if (out.length > 600) { break; }
    }
    out.sort(function (a, b) { return a[0] - b[0] || b[1][2] - a[1][2]; });
    out = out.slice(0, 25);
    hits.innerHTML = '';
    if (!out.length) {
      note.textContent = 'Nothing here matches. That does not mean the ' +
        'Board has nothing: it means this site has not loaded it. Try the ' +
        'Board’s own case search at nlrb.gov.';
      return;
    }
    note.textContent = out.length + ' shown.' +
      (shard.n > rows.length
        ? ' Names beginning "' + q.slice(0, 2) + '" are common here, so only '
          + 'the ' + rows.length.toLocaleString() + ' with the most cases are '
          + 'searched, of ' + shard.n.toLocaleString() + '. The A to Z list '
          + 'has all of them.'
        : '');
    out.forEach(function (row) {
      var e = row[1],
          li = document.createElement('li'),
          a = document.createElement('a');
      a.href = 'employers/' + e[1] + '.html';
      a.innerHTML = '<div class="n"></div><div class="s"></div>';
      a.firstChild.textContent = e[0];
      a.lastChild.textContent = e[2] + (e[2] === 1 ? ' case' : ' cases') +
        (e[3] ? ' · ' + e[3] : '');
      li.appendChild(a);
      hits.appendChild(li);
    });
  }

  box.addEventListener('input', run);
  run();
}());
