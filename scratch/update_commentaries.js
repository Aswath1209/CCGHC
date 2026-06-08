const fs = require('fs');

let bot = fs.readFileSync('bot.js', 'utf8');

// Find MATCHED_SCENES block
const startIdx = bot.indexOf('const MATCHED_SCENES = {');
let openBraces = 0;
let endIdx = -1;
for (let i = startIdx; i < bot.length; i++) {
    if (bot[i] === '{') openBraces++;
    if (bot[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            endIdx = i + 1;
            break;
        }
    }
}

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find MATCHED_SCENES block in bot.js");
    process.exit(1);
}

const matchedCode = bot.slice(startIdx, endIdx);

// Eval it to get the object
let MATCHED_SCENES;
const matchedCodeClean = matchedCode.replace('const MATCHED_SCENES =', 'MATCHED_SCENES =');
eval(matchedCodeClean);

const replacements = {
  "0": {
    "😶 Dot ball! Pressure builds...": "😶 Dot ball! Pressure builds on {batsman}...",
    "🎯 Tight delivery, no run.": "🎯 Tight delivery from {bowler}, no run.",
    "🛑 No run, good fielding!": "🛑 No run, good fielding to stop {batsman}!",
    "🧱 Solid defense, but the scoreboard is crying.": "🧱 Solid defense by {batsman}, but the scoreboard is crying.",
    "🐢 Faster than a turtle, but slower than the score.": "🐢 {batsman} is playing slower than a turtle.",
    "🤐 Shhh... do you hear that? It's the sound of nothing happening.": "🤐 Shhh... {bowler} bowls, and nothing happens.",
    "😤 Andha hai kya? (Are you blind?) Clearly missed that!": "😤 Andha hai kya, {batsman}? Clearly missed {bowler}'s ball!",
    "🧊 Ice in the veins, or just frozen at the crease?": "🧊 Ice in the veins, or is {batsman} just frozen?",
    "🚧 Roadblock! Can't find a way through.": "🚧 Roadblock! {batsman} can't find a way through {bowler}'s field.",
    "🤷‍♂️ Even my grandma could hit that for a single.": "🤷‍♂️ Even my grandma could hit {bowler}'s ball for a single, {batsman}.",
    "🥶 Chilled out? You need to score, mate!": "🥶 Chilled out, {batsman}? You need to score, mate!",
    "Defended with soft hands. No run.": "Defended with soft hands by {batsman}. No run.",
    "🎯 Bowler is spot on! Right in the blockhole.": "🎯 {bowler} is spot on! Right in the blockhole.",
    "🤫 Dead silent. Clean play but no run.": "🤫 Dead silent. {batsman} plays it clean but no run.",
    "🧐 Batsman is scanning the field, but finding no gaps.": "🧐 {batsman} is scanning the field, but finding no gaps.",
    "🛡️ Textbook defense! Play and miss.": "🛡️ Textbook defense! {batsman} plays and misses.",
    "⚡ Beat him with pace! Beat the outside edge.": "⚡ {bowler} beats {batsman} with pace!",
    "🤨 Just a tap to short cover. Not in the mood to run.": "🤨 {batsman} taps it to short cover, not running."
  },
  "1": {
    "🏃 Quick single taken.": "🏃 Quick single taken by {batsman}.",
    "👟 Running hard for one.": "👟 {batsman} is running hard for one.",
    "⚡ One run added.": "⚡ One run added to the score.",
    "🔥 Fast feet! One run.": "🔥 Fast feet by {batsman}! One run.",
    "🚶 Just a gentle stroll for a single.": "🚶 Just a gentle stroll for {batsman} to take a single.",
    "🔄 Rotating strike like a pro.": "🔄 {batsman} rotates strike like a pro.",
    "👀 Keeping the scoreboard ticking.": "👀 {batsman} keeps the scoreboard ticking.",
    "🏎️ Zoom! A quick single.": "🏎️ Zoom! {batsman} scrambles for a quick single.",
    "🎯 Precision placement for a single.": "🎯 Precision placement by {batsman} for a single.",
    "💨 Blink and you'll miss the single!": "💨 Blink and you'll miss {batsman}'s single!",
    "🦊 Crafty running, snatching a run.": "🦊 Crafty running by {batsman}, snatching a run.",
    "🌪️ Speeding through for one.": "🌪️ {batsman} speeding through for one.",
    "🔥 Burning up the pitch for a single.": "🔥 {batsman} is burning up the pitch for a single.",
    "⚡ Scurries through for a quick single.": "⚡ {batsman} scurries through for a quick single.",
    "🤝 A gentle push into the gap for one.": "🤝 A gentle push into the gap by {batsman} for one.",
    "🏃 Soft hands, smart call, easy single.": "🏃 Soft hands, smart call, easy single for {batsman}.",
    "🏃‍♂️ Quick off the mark, strike rotated.": "🏃‍♂️ {batsman} is quick off the mark, strike rotated.",
    "🎯 Tapped to mid-on and off they go.": "🎯 Tapped to mid-on by {batsman} and off they go.",
    "👟 Quick scramble to the other end.": "👟 Quick scramble by {batsman} to the other end.",
    "💨 Fast running keeps the fielder on toes.": "💨 Fast running by {batsman} keeps the fielder on toes.",
    "🔄 Rotating the strike, keeping the game moving.": "🔄 {batsman} rotates the strike, keeping the game moving."
  },
  "2": {
    "🏃‍♂️ Two runs!": "🏃‍♂️ Two runs for {batsman}!",
    "💨 Good running between wickets.": "💨 Good running between wickets by {batsman}.",
    "🔥 Two runs scored.": "🔥 Two runs scored by {batsman}.",
    "✌️ Double trouble!": "✌️ Double trouble! {batsman} grabs two.",
    "🏃🏃 Two more to the tally.": "🏃🏃 Two more to the tally for {batsman}.",
    "📈 Moving the score along nicely.": "📈 {batsman} moves the score along nicely.",
    "🌪️ A whirlwind of running! Two runs.": "🌪️ A whirlwind of running! Two runs for {batsman}.",
    "🛤️ Smooth as silk for a double.": "🛤️ {batsman} goes smooth as silk for a double.",
    "🚀 Pushing hard for the second!": "🚀 {batsman} is pushing hard for the second!",
    "💪 Tagda running! (Strong running!) Double taken.": "💪 Tagda running by {batsman}! Double taken.",
    "⚖️ Balancing the risk with two runs.": "⚖️ {batsman} balances the risk with two runs.",
    "🏃‍♂️🏃‍♂️ Exceptional running, they hustle back for a double!": "🏃‍♂️🏃‍♂️ Exceptional running, {batsman} hustles back for a double!",
    "🏏 Driven through the covers, easy two runs.": "🏏 Driven through the covers by {batsman}, easy two runs.",
    "🐆 Coming back hard for the second run! Excellent hustle.": "🐆 {batsman} coming back hard for the second run! Excellent hustle.",
    "⚡ Pierced the gap, fielders chase as they grab two.": "⚡ {batsman} pierced the gap, fielders chase as they grab two.",
    "📈 Score ticks up by two! Nicely played.": "📈 Score ticks up by two! Nicely played by {batsman}.",
    "🔥 A brace of runs added to the scoreboard.": "🔥 A brace of runs added to the scoreboard by {batsman}.",
    "💪 Great athletic display to complete the second.": "💪 Great athletic display by {batsman} to complete the second."
  },
  "3": {
    "🏃‍♂️ Three runs! Great running!": "🏃‍♂️ Three runs! Great running by {batsman}!",
    "💨 Three runs added.": "💨 Three runs added by {batsman}.",
    "🔥 Three runs scored.": "🔥 Three runs scored by {batsman}.",
    "🦵 Fitness test! Three runs taken.": "🦵 Fitness test! Three runs taken by {batsman}.",
    "🏁 Chasing them down... three runs!": "🏁 Fielder chasing them down... three runs to {batsman}!",
    "⚡ Blazing speed for a triple!": "⚡ Blazing speed by {batsman} for a triple!",
    "🥵 Fielder is panting! 3 runs taken.": "🥵 Fielder is panting! 3 runs taken by {batsman}.",
    "🏃‍♂️🏃‍♂️🏃‍♂️ Non-stop action for three runs!": "🏃‍♂️🏃‍♂️🏃‍♂️ Non-stop action by {batsman} for three runs!",
    "🎯 Exploiting the gaps beautifully for 3.": "🎯 {batsman} exploits the gaps beautifully for 3.",
    "🥵 Exhausting! Three runs collected with pure running.": "🥵 Exhausting! Three runs collected by {batsman} with pure running.",
    "🏏 Beautiful stroke through deep mid-wicket, fielders pull it back.": "🏏 Beautiful stroke by {batsman} through deep mid-wicket, fielders pull it back.",
    "⚡ Great running between the wickets, absolute sprint for three.": "⚡ Great running between the wickets, absolute sprint by {batsman} for three.",
    "🏃‍♂️🏃‍♂️🏃‍♂️ Swept away, fielders chase and they slide home for a triple!": "🏃‍♂️🏃‍♂️🏃‍♂️ Swept away by {batsman}, they slide home for a triple!",
    "🔥 Terrific communication, three easy runs.": "🔥 Terrific communication, three easy runs for {batsman}.",
    "📈 Pushing the field to its limits, three runs!": "📈 {batsman} pushing the field to its limits, three runs!"
  },
  "4": {
    "🔥 Cracking four! What a shot!": "🔥 Cracking four from {batsman}! What a shot!",
    "💥 The ball races to the boundary!": "💥 The ball off {batsman}'s bat races to the boundary!",
    "🏏 Beautiful timing for four runs!": "🏏 Beautiful timing from {batsman} for four runs!",
    "🎸 Rocks the stadium! Four runs!": "🎸 {batsman} rocks the stadium! Four runs!",
    "🔨 Hammered away to the fence!": "🔨 Hammered away to the fence by {batsman}!",
    "🎯 Precision of a surgeon. Four runs.": "🎯 Precision of a surgeon from {batsman}. Four runs.",
    "🤩 'Everything about that was class!'": "🤩 'Everything about that was class from {batsman}!'",
    "💸 Easy money! Four runs.": "💸 Easy money for {batsman}! Four runs.",
    "🏹 Shot through the covers like an arrow!": "🏹 Shot by {batsman} through the covers like an arrow!",
    "🔥 Timing, no effort. 4 runs.": "🔥 Timing, no effort from {batsman}. 4 runs.",
    "🧨 Exploded off the bat!": "🧨 Exploded off {batsman}'s bat!",
    "💎 A gem of a boundary. 4 runs.": "💎 A gem of a boundary from {batsman}. 4 runs.",
    "🐅 Roaring with power! Four!": "🐅 {batsman} roaring with power! Four!",
    "🏏 Pure elegance! Driven through extra cover for four!": "🏏 Pure elegance from {batsman}! Driven through extra cover for four!",
    "🚀 Fast outfield! The ball races away to the boundary fence.": "🚀 Fast outfield! The ball races away from {batsman}'s bat to the fence.",
    "💥 Cracking sound off the willow, absolute boundary!": "💥 Cracking sound off {batsman}'s willow, absolute boundary!",
    "🎯 Shot of the day! Pristine timing for four.": "🎯 Shot of the day! Pristine timing by {batsman} for four.",
    "🎸 Pierced the infield with surgical precision! Boundary!": "🎸 {batsman} pierced the infield with surgical precision! Boundary!",
    "🔥 Pulled away powerfully! Four runs.": "🔥 Pulled away powerfully by {batsman}! Four runs."
  },
  "6": {
    "🚀 Massive six! Into the stands!": "🚀 Massive six from {batsman}! Into the stands!",
    "🎉 What a smash! Six runs!": "🎉 What a smash by {batsman}! Six runs!",
    "🔥 Smoked it for a sixer! 🔥": "🔥 {batsman} smoked it for a sixer! 🔥",
    "🌌 'That's gone into orbit!'": "🌌 'That's gone into orbit from {batsman}!'",
    "🏟️ 'If you're a fan in the top tier, keep your eyes open!'": "🏟️ {batsman} sends it to the top tier! Keep your eyes open!",
    "💣 KA-BOOM! Out of the park!": "💣 KA-BOOM! {batsman} hits it out of the park!",
    "🍿 Get the popcorn, this is a show! 6 runs.": "🍿 Get the popcorn, {batsman} is putting on a show! 6 runs.",
    "🤯 'He's making them look like schoolboys!'": "🤯 '{batsman} is making {bowler} look like a schoolboy!'",
    "🤴 King of the crease! Huge six.": "🤴 {batsman} is the king of the crease! Huge six.",
    "🧨 Power, timing, and pure disrespect!": "🧨 Power, timing, and pure disrespect from {batsman}!",
    "🕺 Dance down the track and smash it!": "🕺 {batsman} dances down the track and smashes it!",
    "💥 DHO dala! (Washed them!) Sixer!": "💥 {batsman} ne DHO dala! Sixer!",
    "🔱 God-level hitting! 6 runs.": "🔱 God-level hitting by {batsman}! 6 runs.",
    "🌋 Eruption of power! Out of the stadium!": "🌋 Eruption of power from {batsman}! Out of the stadium!",
    "🛰️ NASA just spotted the ball. 6 runs.": "🛰️ NASA just spotted {batsman}'s ball. 6 runs.",
    "🌈 Arcing beautifully into the crowd. 6!": "🌈 {batsman}'s shot arcs beautifully into the crowd. 6!",
    "🌌 THAT IS HUGE! Clean out of the stadium!": "🌌 THAT IS HUGE! {batsman} hits it clean out of the stadium!",
    "🚀 High, handsome, and into the third tier! SIX!": "🚀 High, handsome from {batsman}, and into the third tier! SIX!",
    "💣 Monstruous hit! The ball has disappeared into the night sky.": "💣 Monstruous hit by {batsman}! The ball has disappeared.",
    "👑 Majestic! Lofted over long-on for a massive six.": "👑 Majestic from {batsman}! Lofted over long-on for a massive six.",
    "🛸 Launch codes entered! That's gone into orbit.": "🛸 Launch codes entered by {batsman}! That's gone into orbit.",
    "🕺 Smacked with sheer authority! 6 runs!": "🕺 Smacked by {batsman} with sheer authority! 6 runs!",
    "💥 Helicopter shot! Erupts into a massive sixer.": "💥 Helicopter shot from {batsman}! Erupts into a massive sixer."
  },
  "out": {
    "💥 Bowled him! What a delivery!": "💥 Bowled him! What a delivery by {bowler} to dismiss {batsman}!",
    "😢 Caught out! End of the innings!": "😢 Caught out! {batsman} falls to {bowler}'s delivery!",
    "🚫 Out! The crowd goes silent...": "🚫 Out! {batsman} is out off {bowler}'s bowling!",
    "👋 'Cheerio!' - Off you go.": "👋 'Cheerio!' - Off you go, {batsman}.",
    "🚾 Mind the windows on your way out!": "🚾 Mind the windows on your way out, {batsman}!",
    "🚮 Trash disposal complete. Out!": "🚮 {bowler} disposes {batsman}. Out!",
    "🚪 This way to the pavilion, please.": "🚪 {batsman}, this way to the pavilion, please.",
    "🤫 Silence in the ground. Wicket falls.": "🤫 Silence in the ground as {batsman} departs.",
    "💔 Heartbreak! The batter is walking.": "💔 Heartbreak! {batsman} is walking back.",
    "📦 Pack your bags! You're done.": "📦 Pack your bags, {batsman}! You're done.",
    "🏏 'You're just a bits and pieces player!'": "🏏 '{batsman} is just a bits and pieces player!' - sledge.",
    "💀 GONE! Absolutely clinical.": "💀 {batsman} is GONE! Absolutely clinical from {bowler}.",
    "💩 Bhai, tujhse na ho payega. (Brother, you can't do it.) OUT!": "💩 {batsman}, tujhse na ho payega. OUT!",
    "💨 'Snicked it... and taken!'": "💨 Snicked by {batsman}... and taken off {bowler}!",
    "😵 Stunned! The stumps are flying.": "😵 {batsman} is stunned! The stumps are flying thanks to {bowler}.",
    "☝️ GONE! The finger goes up! Bowler celebrates.": "☝️ GONE! The finger goes up for {batsman}! {bowler} celebrates.",
    "💥 Stumps shattered! Clean bowled, absolute beauty!": "💥 Stumps shattered! {bowler} clean bowls {batsman}!",
    "😱 What a catch! Diving at point to dismiss the batsman.": "😱 What a catch! Diving to dismiss {batsman} off {bowler}'s delivery.",
    "🚪 Long walk back to the pavilion. OUT!": "🚪 Long walk back for {batsman}. OUT!",
    "😢 Tragic end to the innings. Caught at the boundary.": "😢 Tragic end for {batsman}. Caught at the boundary off {bowler}.",
    "🚾 Plumb in front! That's a massive wicket.": "🚾 {batsman} is plumb in front! Massive wicket for {bowler}.",
    "👋 Cheerio, batter! Better luck next time.": "👋 Cheerio, {batsman}! Better luck next time against {bowler}.",
    "💀 Silence in the stadium as the star batsman departs!": "💀 Silence as {batsman} departs off {bowler}'s bowling!"
  }
};

for (const key of Object.keys(replacements)) {
  const map = replacements[key];
  if (MATCHED_SCENES[key]) {
    MATCHED_SCENES[key].forEach(scene => {
      scene.commentaries = scene.commentaries.map(comm => {
        if (map[comm]) {
          return map[comm];
        }
        return comm;
      });
    });
  }
}

const updatedCode = `const MATCHED_SCENES = ${JSON.stringify(MATCHED_SCENES, null, 4)};`;
bot = bot.slice(0, startIdx) + updatedCode + bot.slice(endIdx);

fs.writeFileSync('bot.js', bot);
console.log("MATCHED_SCENES successfully updated with player names!");
