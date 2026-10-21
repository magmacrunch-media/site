// ui/midi.js: a MIDI keyboard.
//
// Two sources, one menu. In a browser it is Web MIDI (Chrome, Edge and
// Firefox), which shows a permission prompt, so nothing is asked until MIDI
// keyboard is clicked; once allowed, later launches connect on their own. On
// the desktop it is the app's own MIDI (PunchRoll.fs, over midir in Rust),
// the same on every platform, since the macOS and Linux webviews have no Web
// MIDI. With neither, the row stays hidden.
//
// It turns messages into three calls the page makes the meaning of: down(id,
// note, velocity) and up(id), where id names the key on that input, and
// allUp() for "all notes off" or an input coming and going. Which input to
// listen to is a pref, kept by name, since Web MIDI's port ids are not
// stable across launches.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});

    const ALL = 'all';
    const OFF = 'off';
    // How often the desktop looks for keyboards plugged in or out: midir has
    // no notice of it on every platform, so the list is read again.
    const POLL_MS = 2000;

    /**
     * Web MIDI. Ports are { id, name }; `changed` hears an input plugged in
     * or out as (name, connected).
     */
    function webSource() {
        let access = null;
        return {
            async open() {
                access = await navigator.requestMIDIAccess({ sysex: false });
            },
            ports: () => [...access.inputs.values()]
                .filter((i) => i.state !== 'disconnected')
                .map((i) => ({ id: i.id, name: i.name || i.id })),
            listen(ids, message) {
                for (const input of access.inputs.values()) {
                    input.onmidimessage = ids.includes(input.id) ? (e) => message(input.id, e.data) : null;
                }
            },
            watch(changed) {
                access.onstatechange = (e) => {
                    const p = e && e.port;
                    if (p && p.type === 'input') changed(p.name || 'A MIDI input', p.state === 'connected');
                };
            },
            // Allowed before: Web MIDI can say so without prompting. Where it
            // cannot, wait for the click rather than prompt unasked.
            async allowed() {
                if (!navigator.permissions || !navigator.permissions.query) return false;
                try {
                    return (await navigator.permissions.query({ name: 'midi' })).state === 'granted';
                } catch {
                    return false;
                }
            },
        };
    }

    /** The desktop's MIDI, through the bridge. A port's id is its name. */
    function nativeSource(fs) {
        let names = [];
        let message = null;
        return {
            async open() {
                names = await fs.midiInputs();
                await fs.onMidi((m) => { if (message) message(m.port, m.data); });
            },
            ports: () => names.map((n) => ({ id: n, name: n })),
            listen(ids, fn) {
                message = fn;
                return fs.midiListen(ids);
            },
            watch(changed) {
                setInterval(async () => {
                    let now;
                    try { now = await fs.midiInputs(); } catch { return; }
                    const came = now.filter((n) => !names.includes(n));
                    const went = names.filter((n) => !now.includes(n));
                    names = now;
                    for (const n of came) changed(n, true);
                    for (const n of went) changed(n, false);
                }, POLL_MS);
            },
            // No prompt on the desktop: asked for once, it connects on launch.
            allowed: async () => true,
        };
    }

    /**
     * @param opts.row     the panel row, hidden unless there is a source
     * @param opts.button  turns MIDI on (in a browser, asks for access)
     * @param opts.select  the input menu, shown once it is on
     * @param opts.prefs   a MagmaKit prefs store; `midi` (turned on before) and
     *                     `midiInput` (a device name, '' for all, null for off)
     * @param opts.say     (message) => void, the status line
     * @param opts.down    (id, note, velocity 0..1) => void
     * @param opts.up      (id) => void
     * @param opts.allUp   () => void
     */
    function create(opts) {
        const { row, button, select, prefs, say } = opts;
        const source = App.fs && App.fs.midiInputs ? nativeSource(App.fs)
            : typeof navigator.requestMIDIAccess === 'function' ? webSource() : null;
        if (!source) return { supported: false };
        row.hidden = false;
        let ready = false;

        function message(port, data) {
            const m = App.midi.parse(data);
            if (!m) return;
            if (m.kind === 'on') opts.down(`${port}:${m.note}`, m.note, m.velocity);
            else if (m.kind === 'off') opts.up(`${port}:${m.note}`);
            else opts.allUp();
        }

        /** Listen to the menu's choice: every input, one, or none. */
        function bind() {
            const c = select.value || ALL;
            const ids = c === OFF ? [] : source.ports().map((p) => p.id).filter((id) => c === ALL || id === c);
            Promise.resolve(source.listen(ids, message)).catch((err) => say(`MIDI: ${err}`));
        }

        /** Rebuild the menu from the inputs there now, keeping the saved choice. */
        function fill() {
            const saved = (prefs.read() || {}).midiInput;
            const ports = source.ports();
            select.textContent = '';
            const add = (value, text) => {
                const o = document.createElement('option');
                o.value = value;
                o.textContent = text;
                select.append(o);
            };
            add(ALL, ports.length ? 'All MIDI inputs' : 'MIDI: no inputs yet');
            for (const p of ports) add(p.id, p.name);
            add(OFF, 'MIDI off');
            const named = ports.find((p) => p.name === saved);
            select.value = saved === null ? OFF : named ? named.id : ALL;
            bind();
        }

        async function connect(quiet) {
            try {
                await source.open();
            } catch (err) {
                if (!quiet) say(`MIDI is not available: ${err && err.message ? err.message : err}.`);
                return;
            }
            ready = true;
            prefs.patch({ midi: true });
            button.hidden = true;
            select.hidden = false;
            fill();
            source.watch((name, connected) => {
                opts.allUp();
                fill();
                say(`${name} ${connected ? 'connected' : 'disconnected'}.`);
            });
            if (quiet) return;
            const ports = source.ports();
            say(ports.length
                ? `MIDI: listening to ${ports.length === 1 ? ports[0].name : `${ports.length} inputs`}. Keys play the current track; with Step entry on, they enter notes.`
                : 'MIDI is on, but no keyboard is plugged in yet: it will appear when one is.');
        }

        button.addEventListener('click', () => connect(false));
        select.addEventListener('change', () => {
            if (!ready) return;
            opts.allUp();
            const c = select.value;
            const port = source.ports().find((p) => p.id === c);
            prefs.patch({ midiInput: c === OFF ? null : port ? port.name : '' });
            bind();
            say(c === OFF ? 'MIDI off.' : `MIDI: listening to ${port ? port.name : 'every input'}.`);
            select.blur();
        });

        if ((prefs.read() || {}).midi) source.allowed().then((ok) => { if (ok) connect(true); });

        return { supported: true };
    }

    App.midiInput = { create };
}());
