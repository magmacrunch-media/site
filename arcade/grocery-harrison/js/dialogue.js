// dialogue.js -- EVERY WORD THE PLAYER READS, in one place.
//
// Edit freely: nothing in here is logic. A few things to know:
//
//   * Every line is in backticks, `like this`, so apostrophes and "quotes"
//     need no escaping. The only characters to avoid inside a line are a
//     backtick itself and ${ .
//   * Each `talk` list is shown one line at a time; add or remove lines as
//     you like. A line wraps in the dialogue box, which holds four rows of
//     about 70 characters. tools/sim.mjs checks every line still fits, and
//     names the one that does not.
//   * After editing, run  node tools/stamp.mjs  (so browsers fetch the new
//     file) and  node tools/sim.mjs  (so a typo is caught here rather than
//     in the game). Or just ask, and it will be done for you.
//
// Per aisle:
//   intro     under the "AISLE 4: CEREAL" banner as the level starts
//   speaker   the name over the dialogue box
//   talk      start  the first conversation, which hands over the item
//             carry  talking again while you carry it
//             loose  talking again after you have dropped it
//             done   once it is home
//   goal      the one-line reminder at the top of the screen, per stage
//   banner    the big card after the first conversation

GH.DIALOGUE = {

  // ---- The opening: how it happened ----------------------------------------
  // One caption per beat of the scene in opening.js, in order: on break, the
  // room, the chord, the hum, the shrink, the way out. Six beats, so keep six
  // lines; each fits the caption box as a dialogue line does.
  opening: [
    `4:12 AM. Break time, in the walk-in cooler behind the dairy aisle.`,
    `Best acoustics in the store, and nobody comes back here at this hour.`,
    `Harrison tries a chord he has never played before.`,
    `The cooler hums it back.`,
    `And the walk-in is suddenly very, very big.`,
    `The shift ends at 6. Somewhere out in the store is a way back to full size.`,
  ],

  // ---- Aisle 4: cereal ------------------------------------------------------
  cereal: {
    intro: `5:00 AM, and you are the size of a cornflake`,
    speaker: `GRANNY GRANOLA`,
    talk: {
      start: [
        `Oh! A tall one. Well. You WERE tall, dear.`,
        `Whatever you played in that walk-in, the whole store heard it. Every aisle.`,
        `My oat ring rolled out of the TOASTED O's box. All the way down here.`,
        `Carry it home for me? It's at the far end of the aisle, up top.`,
        `It's heavier than it looks. Mind the weevils.`,
      ],
      carry: [
        `Up and over the boxes. The TOASTED O's are at the very end.`,
      ],
      loose: [
        `You dropped it! It won't roll home by itself, dear.`,
      ],
      done: [
        `Back in its box! The whole aisle feels tidier.`,
        `Dairy is next door. Bring a sweater. My grandson Ollie is in there somewhere.`,
      ],
    },
    goal: {
      start: `Talk to Granny Granola`,
      carry: `Carry the oat ring to the TOASTED O's`,
      loose: `Pick the oat ring back up!`,
      done: `The cereal aisle is restored`,
    },
    banner: { text: `CARRY THE OAT RING`, sub: `home to the TOASTED O's, far end of the aisle` },
  },

  // ---- Aisle 5: dairy ---------------------------------------------------------
  dairy: {
    intro: `colder in here. much colder.`,
    speaker: `OLLIE OATMILK`,
    talk: {
      start: [
        `Oh, you're Gran's friend! The tiny one. She said you'd come.`,
        `I'm oat milk. They shelve me in DAIRY. I've stopped asking.`,
        `My sister Ally's cap blew off when the fridge door swung open. It landed down here with me.`,
        `She's up on the ALMOND MILK at the far end. Would you carry it up to her?`,
        `Mind the butter, it's slicker than it looks. And when a door opens, lean into it.`,
      ],
      carry: [
        `Ally's at the far end, up top. You can't miss her. She's the one shivering.`,
      ],
      loose: [
        `The cap! It's rolling about somewhere. Don't let the curds have it.`,
      ],
      done: [
        `Ally's capped again! She says thanks. Well. She said "brrr".`,
        `Produce is next door. I hear it rains in there.`,
      ],
    },
    goal: {
      start: `Talk to Ollie Oatmilk`,
      carry: `Carry the cap up to Ally Almond`,
      loose: `Pick the cap back up!`,
      done: `The dairy case is restored`,
    },
    banner: { text: `CARRY THE CAP`, sub: `up to Ally Almond, far end of the case` },
  },

  // ---- Aisle 6: produce ---------------------------------------------------------
  produce: {
    intro: `it is raining indoors. that is the misting system.`,
    speaker: `PETE PEPPER`,
    talk: {
      start: [
        `Hey, little guy! Pete Pepper. Bell, not chili. People get that wrong.`,
        `One of the blueberries busted out of its clamshell and rolled all the way down here.`,
        `They don't like being apart. The clamshell's up top, at the far end of the display.`,
        `Climb the herbs, the basil and the mint. Hold on tight and keep going up.`,
        `And when the misters come on, the lettuce gets slippery. Watch out for fruit flies.`,
      ],
      carry: [
        `Up the vines and over the leaves. The clamshell's at the very end, up top.`,
      ],
      loose: [
        `You dropped the berry! Get it before a fruit fly does.`,
      ],
      done: [
        `Back with the bunch! I could cry. Peppers don't cry. Onions make us.`,
        `Bakery's past the frozen bit, they say. Nobody's been. It's not built yet.`,
      ],
    },
    goal: {
      start: `Talk to Pete Pepper`,
      carry: `Carry the blueberry up to its clamshell`,
      loose: `Pick the blueberry back up!`,
      done: `The produce aisle is restored`,
    },
    banner: { text: `CARRY THE BLUEBERRY`, sub: `up to its clamshell, far end of the display` },
  },

  // ---- The checkout, where sugar is spent --------------------------------------
  // Each item's `name` is its row in the list and `desc` the line under it.
  checkout: {
    title: `CHECKOUT`,
    sign: `CHECKOUT 1 · SUGAR ONLY`,
    speaker: `MARGE MARGARINE`,
    hello: `Sugar? I take sugar. Anything else, I'm not authorised.`,
    short: `You're short, hon. There's more sugar out there. Some of it's hidden.`,
    owned: `You've got that one already. Can't sell you a thing twice.`,
    bought: `Pleasure doing business. Mind how you go.`,
    back: `BACK TO THE DIRECTORY`,
    banked: `SUGAR BANKED`,
    items: {
      heart: { name: `AN EXTRA HEART`, desc: `one more knock before it's back to the price tag` },
      reach: { name: `A LONGER STRUM`, desc: `the guitar carries further` },
      quick: { name: `A QUICKER STRUM`, desc: `less waiting between chords` },
      boots: { name: `BUTTER BOOTS`, desc: `grip on anything slick, butter and wet lettuce alike` },
      bag: { name: `A STURDIER BAG`, desc: `carrying something hurts your jump less` },
      dance: { name: `THE DANCING SONG`, desc: `stunned pests keep dancing a good while longer` },
    },
  },

  // ---- Little words that pop up over Harrison ----------------------------------
  shout: {
    stomp: `BONK`,
    hurt: `OOF`,
    drop: `DROPPED IT!`,
    boing: `BOING`,
    regrab: `GOT IT`,
    checkpoint: `SAVED`,
    grab: `GRAB`,
  },

  // ---- Big cards across the middle of the screen --------------------------------
  // `restored` puts the aisle's name in front of its text: "DAIRY RESTORED".
  banners: {
    fall: { text: `WHOOPS`, sub: `back to the last price tag` },
    squashed: { text: `SQUASHED`, sub: `back to the last price tag` },
    restored: { text: `RESTORED`, sub: `back to how it should be` },
    // The MAGMA CRUNCH secret in the cereal aisle. Keep these vague: they
    // are the only words the secret has.
    magma: { text: `MAGMA CRUNCH`, sub: `something on the back shelf tipped over` },
    bowl: { text: `THE BOWL`, sub: `the prize is inside` },
    prize: { text: `THE PRIZE INSIDE!`, sub: `a MAGMA CRUNCH guitar pick` },
    splash: { text: `SPLOSH`, sub: `back to the rim` },
  },
};
