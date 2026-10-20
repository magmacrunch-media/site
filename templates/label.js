/* ── label.js — shared template for by-label pages ── */
/* Requires: window.__LABEL_CONFIG = { MB_ID, NAME, accent?, STATIC_SECTIONS? } */

(function() {
    var config = window.__LABEL_CONFIG;
    if (!config || !config.MB_ID) return;

    var MB_ID = config.MB_ID;
    var ENTITY_MAP = window.__ENTITY_MAP || {};
    var contentEl = document.getElementById('content');
    var idsEl = document.getElementById('contrib-ids');

    /* This label's entry in archive/by-label/labels-data.js, and the rest of
       the family, so the page can say what the label is and link its siblings. */
    var FAMILY = (window.__LABEL_FAMILY && window.__LABEL_FAMILY.labels) || [];
    var SELF = FAMILY.filter(function(l) { return l.mbid === MB_ID; })[0] || null;

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /* ── HELPERS ── */

    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        var path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function formatDate(d) {
        if (!d) return '';
        return d.split('-')[0];
    }

    function dateRange(begin, end, ended) {
        var b = formatDate(begin);
        var e = ended ? formatDate(end) : 'present';
        if (!b && e === 'present') return 'present';
        if (!b) return e;
        if (b === e) return b;
        return b + ' \u2014 ' + e;
    }

    function renderSection(title, html, summary) {
        if (!html) return '';
        return '<div class="section">' +
            '<div class="section-divider"></div>' +
            '<div class="section-title">// ' + title + ' //</div>' +
            (summary ? '<div class="lbl-section-summary">' + summary + '</div>' : '') +
            html +
            '</div>';
    }

    /* "2023-07-12" -> "Jul 12"; a bare year or year-month says only what it knows. */
    function monthDay(d) {
        var p = (d || '').split('-');
        if (p.length < 2) return '';
        var m = MONTHS[parseInt(p[1], 10) - 1] || '';
        return p.length > 2 ? m + ' ' + parseInt(p[2], 10) : m;
    }

    /* Rows already sorted by .sort, rendered under a heading per year. */
    function byYear(rows, rowHtml) {
        var html = '';
        var current = null;
        rows.forEach(function(row) {
            var year = row.sort ? row.sort.slice(0, 4) : 'undated';
            if (year !== current) {
                if (current !== null) html += '</ul>';
                html += '<div class="lbl-year">' + esc(year) + '</div><ul class="simple-list lbl-dated">';
                current = year;
            }
            html += rowHtml(row);
        });
        return html ? html + '</ul>' : '';
    }

    function plural(n, one, many) {
        return n + ' ' + (n === 1 ? one : many);
    }

    function yearSpan(rows) {
        var years = rows.map(function(r) { return r.sort ? r.sort.slice(0, 4) : null; }).filter(Boolean);
        if (!years.length) return '';
        var lo = years[0], hi = years[years.length - 1];
        return lo === hi ? lo : lo + '\u2013' + hi;
    }

    /* The label's intro and its siblings, between the header and the content. */
    function renderIntro() {
        if (!SELF) return;
        var header = document.querySelector('.contrib-header');
        if (!header || document.querySelector('.lbl-intro')) return;
        var parent = SELF.parent ? FAMILY.filter(function(l) { return l.slug === SELF.parent; })[0] : null;
        var siblings = FAMILY.filter(function(l) { return l !== SELF; }).map(function(l) {
            return '<a href="../' + l.slug + '/" class="lbl-sib' + (l.associated ? ' lbl-sib-assoc' : '') + '">' +
                esc(l.name) + '<span class="lbl-sib-kind">' + esc(l.kind) + '</span></a>';
        }).join('');
        header.insertAdjacentHTML('afterend',
            '<p class="lbl-intro">' + esc(SELF.blurb) +
            (parent ? ' <span class="lbl-intro-part">part of <a href="../' + parent.slug + '/">' + esc(parent.name) + '</a>.</span>' : '') +
            '</p>' +
            '<nav class="lbl-siblings" aria-label="other labels">' +
            '<a href="../" class="lbl-sib lbl-sib-all">\u2190 all labels</a>' + siblings + '</nav>');
    }


    function renderStaticLabelEntry(item) {
        var dates = item.dates ? esc(item.dates) : '';
        var roleTags = '';
        if (item.roles && item.roles.length > 0) {
            roleTags = '<div class="entry-instruments">' +
                '<div class="label">roles</div>' +
                item.roles.map(function(r) {
                    return '<span class="instrument-tag">' + esc(r) + '</span>';
                }).join('') +
                '</div>';
        }
        var desc = '';
        if (item.description) {
            desc = '<div class="entry-description">' + item.description + '</div>';
        }
        var body = roleTags || desc ? '<div class="entry-body">' + roleTags + desc + '</div>' : '';
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + esc(item.name) + '</span>' +
                (dates ? '<span class="entry-dates">' + dates + '</span>' : '') +
            '</summary>' +
            body +
            '</details>';
    }

    function renderStaticSection(section) {
        if (!section.items || section.items.length === 0) return '';
        var items = section.items.map(function(item) {
            return renderStaticLabelEntry(item);
        }).join('');
        return renderSection(section.title, items);
    }

    function renderStaticSections() {
        var staticSections = config.STATIC_SECTIONS || (SELF && SELF.sections);
        if (!staticSections || staticSections.length === 0) return '';
        return staticSections.map(renderStaticSection).join('');
    }

    function renderEntry(target, roles, begin, end, ended, type) {
        var dates = dateRange(begin, end, ended);
        var link = archiveLink(target.id, target.name, type || 'artist');
        var roleTags = '';
        if (roles && roles.length > 0) {
            roleTags = '<div class="entry-instruments"><div class="label">roles</div>' +
                roles.map(function(r) {
                    return '<span class="instrument-tag">' + esc(r) + '</span>';
                }).join('') + '</div>';
        }
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' + roleTags + '</div>' +
            '</details>';
    }

    function mergeRels(rels) {
        var begins = rels.map(function(r) { return r.begin; }).filter(Boolean).sort();
        var begin = begins[0] || null;
        var ends = rels.map(function(r) { return r.end; });
        var end = ends.indexOf(null) !== -1 ? null : ends.filter(Boolean).sort().reverse()[0];
        var ended = rels.every(function(r) { return r.ended; });
        return { begin: begin, end: end, ended: ended };
    }

    function creditLink(target, type) {
        var path = type === 'work' ? 'work' : type === 'recording' ? 'recording' : 'release';
        return '<a href="https://musicbrainz.org/' + path + '/' + target.id + '" target="_blank" rel="noopener">' + esc(target.title) + '</a>';
    }

    /* ── CONSTANTS ── */

    var PERSONNEL_TYPES = [
        'label founder', 'founder', 'owner', 'executive position at',
        'employed by', 'producer position at', 'engineer position at', 'creative position at'
    ];

    var ROLE_DISPLAY = {
        'label founder': 'founder',
        'founder': 'founder',
        'owner': 'owner',
        'executive position at': 'executive',
        'employed by': 'employed by',
        'producer position at': 'producer',
        'engineer position at': 'engineer',
        'creative position at': 'creative',
        'artists and repertoire persons': 'A&R'
    };

    /* ── RENDER ── */

    function render(artistData, labelData, eventData, recordingData, workData, releaseData) {
        var artistRels = artistData.relations || [];
        var labelRels = labelData.relations || [];
        var eventRels = eventData.relations || [];
        var html = '';

        /* Personnel + Signed Artists (relationship-level filtering — artist can appear in both) */
        var allArtistRels = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist;
        });

        var personnelRels = allArtistRels.filter(function(r) {
            return PERSONNEL_TYPES.indexOf(r.type) !== -1;
        });
        var signedRels = allArtistRels.filter(function(r) {
            return PERSONNEL_TYPES.indexOf(r.type) === -1;
        });

        function groupByArtist(rels) {
            var groups = {};
            rels.forEach(function(r) {
                var id = r.artist.id;
                if (!groups[id]) groups[id] = { artist: r.artist, rels: [] };
                groups[id].rels.push(r);
            });
            return Object.keys(groups).map(function(id) {
                var g = groups[id];
                var merged = mergeRels(g.rels);
                var roles = [];
                g.rels.forEach(function(r) {
                    var display = ROLE_DISPLAY[r.type] || r.type;
                    if (roles.indexOf(display) === -1) roles.push(display);
                });
                return { target: g.artist, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
        }

        function sortEntries(entries) {
            entries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
        }

        /* Personnel section */
        var personnelEntries = groupByArtist(personnelRels);
        sortEntries(personnelEntries);
        if (personnelEntries.length > 0) {
            const items = personnelEntries.map(function(e) {
                return renderEntry(e.target, e.roles, e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('personnel', items);
        }

        /* Signed artists section */
        var signedEntries = groupByArtist(signedRels);
        sortEntries(signedEntries);
        if (signedEntries.length > 0) {
            const items = signedEntries.map(function(e) {
                return renderEntry(e.target, e.roles, e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('signed artists', items);
        }

        /* Structure: where the label sits: what it owns, who owns it, who
           distributes it. One section of short rows rather than a section per
           relationship, since each of these is usually one or two names. */
        function isLabelRel(r) { return r['target-type'] === 'label' && r.label; }
        var structure = [];

        var owns = labelRels.filter(function(r) {
            return isLabelRel(r) && r.type === 'label ownership' && r.direction === 'forward';
        }).map(function(r) { return archiveLink(r.label.id, r.label.name, 'label'); });
        if (owns.length) structure.push(['owns', owns]);

        var ownedBy = labelRels.filter(function(r) {
            return isLabelRel(r) && r.type === 'label ownership' && r.direction === 'backward';
        }).map(function(r) { return { name: r.label.name, id: r.label.id, type: 'label' }; });
        artistRels.forEach(function(r) {
            if (r['target-type'] === 'artist' && r.artist && r.type === 'owner' && r.direction === 'backward' &&
                !ownedBy.some(function(e) { return e.name === r.artist.name; })) {
                ownedBy.push({ name: r.artist.name, id: r.artist.id, type: 'artist' });
            }
        });
        if (ownedBy.length) structure.push(['owned by', ownedBy.map(function(e) { return archiveLink(e.id, e.name, e.type); })]);

        var distributedBy = labelRels.filter(function(r) {
            return isLabelRel(r) && r.type === 'label distribution';
        }).map(function(r) { return archiveLink(r.label.id, r.label.name, 'label'); });
        if (distributedBy.length) structure.push(['distributed by', distributedBy]);

        labelRels.filter(function(r) {
            return isLabelRel(r) && r.type !== 'label ownership' && r.type !== 'label distribution';
        }).forEach(function(r) {
            structure.push([r.type, [archiveLink(r.label.id, r.label.name, 'label')]]);
        });

        if (structure.length) {
            html += renderSection('structure', '<dl class="lbl-structure">' + structure.map(function(row) {
                return '<dt>' + esc(row[0]) + '</dt><dd>' + row[1].join(', ') + '</dd>';
            }).join('') + '</dl>');
        }

        /* Events presented */
        var presentedEvents = eventRels.filter(function(r) {
            return r['target-type'] === 'event' && r.event && r.type === 'presented';
        });
        if (presentedEvents.length > 0) {
            var eventGroups = {};
            presentedEvents.forEach(function(r) {
                var id = r.event.id;
                if (!eventGroups[id]) eventGroups[id] = { event: r.event, rels: [] };
                eventGroups[id].rels.push(r);
            });
            var eventEntries = Object.keys(eventGroups).map(function(id) {
                var g = eventGroups[id];
                var merged = mergeRels(g.rels);
                return { event: g.event, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            eventEntries.sort(function(a, b) {
                return (a.begin || b.event['life-span']?.begin || 'zzzz').localeCompare(b.begin || a.event['life-span']?.begin || 'zzzz');
            });
            const items = eventEntries.map(function(e) {
                var eventDate = e.event['life-span']?.begin || e.begin;
                return '<li><a href="https://musicbrainz.org/event/' + esc(e.event.id) + '" target="_blank" rel="noopener">' + esc(e.event.name) + '</a>' +
                    (eventDate ? ' <span class="credit-sub">' + esc(formatDate(eventDate)) + '</span>' : '') +
                    (e.event.disambiguation ? ' <span class="credit-sub">(' + esc(e.event.disambiguation) + ')</span>' : '') +
                    '</li>';
            }).join('');
            html += renderSection('events presented', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Associated places */
        var placeRels = artistRels.filter(function(r) {
            return r['target-type'] === 'place' && r.place;
        });
        var placeGroups = {};
        placeRels.forEach(function(r) {
            var id = r.place.id;
            if (!placeGroups[id]) placeGroups[id] = { place: r.place, rels: [] };
            placeGroups[id].rels.push(r);
        });
        var placeEntries = Object.keys(placeGroups).map(function(id) {
            var g = placeGroups[id];
            var merged = mergeRels(g.rels);
            var roles = [];
            g.rels.forEach(function(r) {
                var t = r.type.replace(' position', '');
                if (roles.indexOf(t) === -1) roles.push(t);
            });
            return { place: g.place, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
        });
        placeEntries.sort(function(a, b) {
            return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
        });
        if (placeEntries.length > 0) {
            const items = placeEntries.map(function(e) {
                return renderEntry(e.place, e.roles, e.begin, e.end, e.ended, 'place');
            }).join('');
            html += renderSection('associated places', items);
        }

        /* Releases: one row per MusicBrainz release, by its own release date.
           Two editions sharing a title (a 2023 reissue and a 2024 remaster) are
           two rows, and the year shown is the release's, not the copyright
           relationship's: those were all "2023" for records made years before.
           scripts/label-summary.mjs counts the same way for the index. */
        if (releaseData && releaseData.relations) {
            var releaseById = {};
            releaseData.relations.forEach(function(r) {
                if (r['target-type'] !== 'release' || !r.release) return;
                var g = releaseById[r.release.id];
                if (!g) g = releaseById[r.release.id] = { release: r.release, types: [] };
                if (g.types.indexOf(r.type) === -1) g.types.push(r.type);
            });
            var releaseRows = Object.keys(releaseById).map(function(id) {
                var g = releaseById[id];
                return { release: g.release, sort: g.release.date || '', types: g.types };
            });
            releaseRows.sort(function(a, b) {
                return (a.sort || '9999').localeCompare(b.sort || '9999') ||
                    a.release.title.localeCompare(b.release.title);
            });
            if (releaseRows.length > 0) {
                var releaseHtml = byYear(releaseRows, function(row) {
                    var notes = [];
                    if (row.release.disambiguation) notes.push(row.release.disambiguation);
                    if (row.types.length === 1 && row.types[0] === 'manufactured') notes.push('manufactured');
                    return '<li><span class="lbl-when">' + esc(monthDay(row.sort)) + '</span>' +
                        creditLink(row.release, 'release') +
                        notes.map(function(n) { return '<span class="lbl-note">' + esc(n) + '</span>'; }).join('') +
                        '</li>';
                });
                var span = yearSpan(releaseRows);
                html += renderSection('releases', releaseHtml,
                    plural(releaseRows.length, 'release', 'releases') + (span ? ', ' + span : ''));
            }
        }

        /* Works: grouped by the year on the relationship, which for a publisher
           is when the song came under it. "named after" is not a work this
           label holds: it is where the label's name comes from, and the header
           says so instead. */
        if (workData && workData.relations) {
            var workById = {};
            workData.relations.forEach(function(r) {
                if (r['target-type'] !== 'work' || !r.work || r.type === 'named after work') return;
                var g = workById[r.work.id];
                if (!g) g = workById[r.work.id] = { work: r.work, rels: [], types: [] };
                g.rels.push(r);
                if (g.types.indexOf(r.type) === -1) g.types.push(r.type);
            });
            var workRows = Object.keys(workById).map(function(id) {
                var g = workById[id];
                return { work: g.work, sort: mergeRels(g.rels).begin || '', types: g.types };
            });
            /* Undated works go last, under their own heading. */
            workRows.sort(function(a, b) {
                return (a.sort || '9999').localeCompare(b.sort || '9999') ||
                    a.work.title.localeCompare(b.work.title);
            });
            if (workRows.length > 0) {
                /* Name a relationship type only when the works differ in it; on a
                   publisher every row says "publishing" and the word is noise. */
                var allTypes = [];
                workRows.forEach(function(row) {
                    row.types.forEach(function(t) { if (allTypes.indexOf(t) === -1) allTypes.push(t); });
                });
                var workHtml = byYear(workRows, function(row) {
                    var notes = allTypes.length > 1 ? row.types : [];
                    if (row.work.disambiguation) notes = notes.concat([row.work.disambiguation]);
                    return '<li>' + creditLink(row.work, 'work') +
                        notes.map(function(n) { return '<span class="lbl-note">' + esc(n) + '</span>'; }).join('') +
                        '</li>';
                });
                var dated = workRows.filter(function(r) { return r.sort; });
                var wspan = yearSpan(dated);
                html += renderSection('works', workHtml,
                    plural(workRows.length, 'work', 'works') + (wspan ? ', ' + wspan : '') +
                    (dated.length < workRows.length ? ' (' + (workRows.length - dated.length) + ' undated)' : ''));
            }
        }

        if (!html) {
            html = '<div class="error-msg">no relationships found</div>';
        }

        contentEl.innerHTML = html + renderStaticSections();

        /* Where the name comes from, in the header beside the type and year. */
        var namedAfter = ((workData && workData.relations) || []).filter(function(r) {
            return r.type === 'named after work' && r.work;
        })[0];
        var metaEl = document.querySelector('.contrib-meta');
        if (namedAfter && metaEl && !metaEl.querySelector('.lbl-named')) {
            metaEl.insertAdjacentHTML('beforeend', '<span class="lbl-named"> \u00b7 named after the song ' +
                creditLink(namedAfter.work, 'work') + '</span>');
        }
    }

    /* ── FETCH WITH RATE LIMITING ── */

    function fetchMB(url) {
        if (window.__mcPageAborted) return Promise.reject(new Error('page navigated away'));
        return fetch(url).then(function(res) {
            if (!res.ok) throw new Error('API error: ' + res.status);
            return res.json();
        });
    }

    function delay(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    /* ── CACHE ── */
    var _cache = null;
    function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return Promise.resolve(); }
        return fetch('../../../archive/_cache/labels/' + MB_ID + '.json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(j) { if (j && j.fetchedAt) _cache = j; })
            .catch(function() {});
    }
    function cachedFetch(inc) {
        if (_cache && _cache.responses && _cache.responses[inc]) {
            return Promise.resolve(_cache.responses[inc]);
        }
        return fetchMB('https://musicbrainz.org/ws/2/label/' + MB_ID + '?fmt=json&inc=' + inc);
    }

    renderIntro();

    loadCache().then(function() {
        return cachedFetch('artist-rels');
    }).then(function(artistData) {
            var ids = [];
            if (artistData.isnis && artistData.isnis.length) ids.push('ISNI: ' + artistData.isnis[0]);
            if (artistData.ipis && artistData.ipis.length) ids.push('IPI: ' + artistData.ipis[0]);
            if (ids.length) idsEl.textContent = ids.join(' \u00b7 ');

            /* Label type and years active */
            var meta = [];
            if (artistData.type) meta.push(artistData.type.toLowerCase());
            else if (SELF && SELF.kind) meta.push(SELF.kind);
            var ls = artistData['life-span'];
            if (ls && ls.begin) {
                var beginYear = ls.begin.split('-')[0];
                if (ls.ended && ls.end) {
                    meta.push(beginYear + ' \u2014 ' + ls.end.split('-')[0]);
                } else {
                    meta.push('est ' + beginYear);
                }
            }
            if (meta.length) {
                idsEl.insertAdjacentHTML('beforebegin',
                    '<div class="contrib-meta">' + meta.join(' \u00b7 ') + '</div>');
            }

            var useCache = _cache && _cache.responses;
            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                return cachedFetch('label-rels');
            }).then(function(labelData) {
                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                    return cachedFetch('event-rels');
                }).then(function(eventData) {
                    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                        return cachedFetch('recording-rels');
                    }).then(function(recordingData) {
                        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                            return cachedFetch('work-rels');
                        }).then(function(workData) {
                            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                                return cachedFetch('release-rels');
                            }).then(function(releaseData) {
                                render(artistData, labelData, eventData, recordingData, workData, releaseData);
                            });
                        });
                    });
                });
            });
        })
        .catch(function(e) {
            contentEl.innerHTML = '<div class="error-msg">failed to load from MusicBrainz<br><span style="opacity:0.6;font-size:7px">' + esc(e.message) + '</span></div>' + renderStaticSections();
        });
})();
