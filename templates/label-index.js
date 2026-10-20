/* ── label-index.js: the by-label index, drawn as the family it is ── */
/*
 * Requires archive/by-label/labels-data.js (window.__LABEL_FAMILY) loaded first.
 * Draws the labels that own nothing above the ones they own, then the
 * associated ones apart, so "four labels" reads as one label with two branches
 * and a partner rather than four unrelated peers.
 *
 * Counts come from archive/_cache/labels/summary.json, which
 * scripts/label-summary.mjs writes from the caches. The cards render without
 * it, so a missing summary costs the numbers and nothing else.
 */
(function () {
    var family = window.__LABEL_FAMILY;
    var tree = document.getElementById('label-tree');
    var noteEl = document.getElementById('label-note');
    if (!family || !tree) return;

    var labels = family.labels;

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function plural(n, one, many) {
        return n + ' ' + (n === 1 ? one : many);
    }

    function stats(label, summary) {
        var out = [];
        var s = summary && summary[label.mbid];
        if (s) {
            if (s.releases) out.push(plural(s.releases, 'release', 'releases'));
            if (s.works) out.push(plural(s.works, 'work', 'works'));
            if (s.events) out.push(plural(s.events, 'event', 'events'));
        }
        (label.sections || []).forEach(function (sec) {
            var n = (sec.items || []).length;
            if (!n) return;
            out.push(sec.title === 'games' ? plural(n, 'game', 'games') : n + ' ' + sec.title);
        });
        return out;
    }

    function card(label, summary, cls) {
        var s = summary && summary[label.mbid];
        var est = s && s.begin ? 'est ' + s.begin.slice(0, 4) : '';
        var st = stats(label, summary);
        return '<a href="' + label.slug + '/" class="fam-card ' + (cls || '') + '">' +
            '<span class="fam-name">' + esc(label.name.toUpperCase()) + '</span>' +
            '<span class="fam-kind">' + esc(label.kind) + (est ? ' \u00b7 ' + est : '') + '</span>' +
            '<span class="fam-blurb">' + esc(label.blurb) + '</span>' +
            (st.length ? '<span class="fam-stats">' + st.map(esc).join(' \u00b7 ') + '</span>' : '') +
            '</a>';
    }

    function render(summary) {
        var html = '';
        labels.filter(function (l) { return !l.parent && !l.associated; }).forEach(function (root) {
            var kids = labels.filter(function (l) { return l.parent === root.slug; });
            html += '<div class="fam-group">' + card(root, summary, 'fam-root');
            if (kids.length) {
                html += '<div class="fam-children">' + kids.map(function (k) {
                    return '<div class="fam-branch">' + card(k, summary, 'fam-child') + '</div>';
                }).join('') + '</div>';
            }
            html += '</div>';
        });
        var assoc = labels.filter(function (l) { return l.associated; });
        if (assoc.length) {
            html += '<h2 class="fam-heading">// associated //</h2>' +
                '<p class="fam-sub">not part of the label, but sharing releases or people with it</p>' +
                '<div class="fam-assoc">' + assoc.map(function (l) { return card(l, summary, 'fam-other'); }).join('') + '</div>';
        }
        tree.innerHTML = html;

        if (noteEl) {
            var dates = summary ? Object.keys(summary).map(function (k) { return summary[k].fetchedAt; }).filter(Boolean).sort() : [];
            var when = dates.length ? new Date(dates[0]) : null;
            var asOf = when && !isNaN(when) ? ' as of ' + when.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toLowerCase() : '';
            noteEl.textContent = 'people, releases and works come from MusicBrainz' + asOf +
                '. the arcade\u2019s games are listed here by hand, from the ware pages.';
        }
    }

    render(null);
    fetch('../_cache/labels/summary.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.labels && document.body.contains(tree)) render(j.labels); })
        .catch(function () {});
})();
