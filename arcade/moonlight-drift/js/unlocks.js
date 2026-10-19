// Pilot unlocks - web and iOS only.
//
// A new player starts with the first STARTING_PILOTS of the roster, in the
// order index.html registers them, and every DRIFTS_PER_PILOT obstacles they
// pass, across every run and both modes, unlocks the next. Progress is
// lifetime rather than a best score, so it rewards playing at all and nobody
// is stuck behind a run they cannot make. No purchase reaches any of it.
//
// The Wii, tui and Roblox versions keep the whole roster open: this is a layer
// around the game, not a rule of it, and lives only in web/ (and the App Store
// build derived from it).
//
// Loaded after every characters/*.js file, because it needs the whole roster;
// which is also why it restores the saved pilot (see the bottom of the file).

const STARTING_PILOTS = 4;
const DRIFTS_PER_PILOT = 15;
const UNLOCK_KEY = 'drift_unlocks';

// { drifted: lifetime obstacles passed, kept: pilot ids open regardless }
function readUnlocks() {
    try {
        const raw = JSON.parse(localStorage.getItem(UNLOCK_KEY));
        if (raw && typeof raw.drifted === 'number' && Array.isArray(raw.kept)) {
            return raw;
        }
    } catch (e) {
        // Unreadable, private mode, or storage disabled: start fresh.
    }
    return { drifted: 0, kept: [] };
}

let unlocks = readUnlocks();

function saveUnlocks() {
    try {
        localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
    } catch (e) {
        // The progress still counts for this session.
    }
}

function pilotOrder() {
    return getAllCharacters().map((c) => c.id);
}

// Lifetime obstacles a pilot needs; 0 for a starting pilot.
function pilotUnlockAt(id) {
    const i = pilotOrder().indexOf(id);
    if (i < STARTING_PILOTS) return 0;
    return (i - STARTING_PILOTS + 1) * DRIFTS_PER_PILOT;
}

function isPilotUnlocked(id) {
    return unlocks.kept.includes(id) || unlocks.drifted >= pilotUnlockAt(id);
}

function lifetimeDrifted() {
    return unlocks.drifted;
}

// Add obstacles passed; returns the pilots this opened, in roster order.
function recordDrifted(count) {
    const before = pilotOrder().filter(isPilotUnlocked);
    unlocks.drifted += count;
    saveUnlocks();
    return pilotOrder().filter((id) => isPilotUnlocked(id) && !before.includes(id));
}

function keepPilot(id) {
    if (!unlocks.kept.includes(id)) {
        unlocks.kept.push(id);
        saveUnlocks();
    }
}

// characters/index.js calls loadSavedCharacter() before any character file
// has registered, so it never found the saved pick and every load started on
// the default. Called again here, with the roster complete.
loadSavedCharacter();

// Somebody who picked a pilot before unlocks existed keeps it: locking a
// player out of the pilot they were flying would be taking something away.
if (!isPilotUnlocked(getCurrentCharacter())) {
    keepPilot(getCurrentCharacter());
}
