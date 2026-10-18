// scores.js -- the high score table, over adenosine-score-client.
//
// THE CLIENT IS A LOCAL STORE AND NEVER DIALS OUT ON ITS OWN. Its documented
// entry point, auto(), opens a WebSocket at once and retries for ever on
// failure, which from a file:// page with no backend is a permanent reconnect
// loop. It does not need one: save() writes localStorage before it tries the
// socket and load() falls back to it, so unconnected it is already a complete
// local table.
//
// The arcade opt-in is the global MC_SCORE_OPTS, which the website's
// arcade/shared/score-server.js defines. Present, we connect; absent, we stay
// local. No build flag, no edit, to move between the two.

CA.scores = {

  client: null,
  available: false,
  cached: [],

  init() {
    if (typeof AdScore !== 'object' || !AdScore.ScoreClient) return;
    this.client = new AdScore.ScoreClient();
    try {
      localStorage.setItem(CA.SCORES.storageProbeKey, '1');
      localStorage.removeItem(CA.SCORES.storageProbeKey);
      this.available = true;
    } catch (err) {
      this.available = false;
      return;
    }
    if (window.MC_SCORE_OPTS) {
      try { this.client.auto(window.MC_SCORE_OPTS); } catch (err) { /* stay local */ }
    }
    this.refresh();
  },

  async refresh() {
    if (!this.available) return;
    try {
      const all = await this.client.load(CA.SCORES.game);
      this.cached = Array.isArray(all) ? all.slice(0, CA.SCORES.tableSize) : [];
    } catch (err) {
      this.cached = [];
    }
  },

  qualifies(score) {
    if (!this.available || score <= 0) return false;
    if (this.cached.length < CA.SCORES.tableSize) return true;
    return score > this.cached[this.cached.length - 1].score;
  },

  async save(name, g) {
    if (!this.available) return;
    try {
      await this.client.save(CA.SCORES.game, name, g.score, { floor: g.best, crunch: g.bestChain, character: g.player.character });
    } catch (err) { /* the local write happens first, so nothing is lost */ }
    await this.refresh();
  },
};
