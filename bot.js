require('dotenv').config();
const { Bot, session, InlineKeyboard, webhookCallback } = require('grammy');
const gameManager = require('./game/gameManager');
const tourManager = require('./game/tourManager');
const sb = require('./db/supabase');
const tourBotUI = require('./game/tourBotUI');
const handCricketManager = require('./game/handCricketManager');
const shotManager = require('./game/shotManager');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


const GIF_EVENTS = ["0", "4", "6", "out", "50", "100", "duck", "threewickets", "fivewickets", "hattrick"];
const CCL_GIFS = {};
const COMMENTARY = {};

const MATCHED_SCENES = {
    "0": [
        {
            "gif": "https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUybHM4N29ib3ZkY3JxNDhjbXlkeDAycnFtYWYyM3QxajF2eXltZ2Z4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QtipHdYxYopX3W6vMs/giphy.gif",
            "commentaries": [
                "😶 Dot ball! Pressure builds...",
                "🎯 Tight delivery, no run.",
                "🛑 No run, good fielding!",
                "🤌 'The ball is red, round and weighs about five ounces.'",
                "🥱 Abey saale! Bat pakadna sikh le pehle.",
                "🎤 'He's looking for some runs, but finds only fresh air!'",
                "🤡 Why are you so fat? Only because every time I hit a shot, your sister gives me a biscuit!",
                "🧱 Solid defense, but the scoreboard is crying.",
                "🐢 Faster than a turtle, but slower than the score.",
                "🥱 Waking up for the match? Or just watching the dots?",
                "🤐 Shhh... do you hear that? It's the sound of nothing happening.",
                "😤 Andha hai kya? Clearly missed that!",
                "🧟 Bhootnike! Bowl better than that!",
                "🧊 Ice in the veins, or just frozen at the crease?",
                "🚧 Roadblock! Can't find a way through.",
                "🏏 That bat has more holes than Swiss cheese!",
                "🤷‍♂️ Even my grandma could hit that for a single.",
                "🥶 Chilled out? You need to score, mate!",
                "💤 ZZZ... Wake me up when a run is scored.",
                "Defended with soft hands. No run.",
                "🎯 Bowler is spot on! Right in the blockhole.",
                "🤫 Dead silent. Clean play but no run.",
                "🧐 Batsman is scanning the field, but finding no gaps.",
                "🛡️ Textbook defense! Play and miss.",
                "⚡ Beat him with pace! Beat the outside edge.",
                "Dot ball. The run rate is crying for help.",
                "🤨 Just a tap to short cover. Not in the mood to run."
            ]
        }
    ],
    "1": [
        {
            "gif": null,
            "commentaries": [
                "🏃 Quick single taken.",
                "👟 Running hard for one.",
                "⚡ One run added.",
                "🔥 Fast feet! One run.",
                "🐕 Like a dog chasing a bone!",
                "🚶 Just a gentle stroll for a single.",
                "🔄 Rotating strike like a pro.",
                "👀 Keeping the scoreboard ticking.",
                "🏎️ Zoom! A quick single.",
                "🤝 Teamwork makes the dream work.",
                "🎯 Precision placement for a single.",
                "🤌 'Taking the easy option, one run.'",
                "🌟 Ek gaya! Keep them coming.",
                "💨 Blink and you'll miss the single!",
                "🦊 Crafty running, snatching a run.",
                "🥇 Every run counts in this battle!",
                "🌪️ Speeding through for one.",
                "🔥 Burning up the pitch for a single.",
                "⚡ Scurries through for a quick single.",
                "🤝 A gentle push into the gap for one.",
                "🏃 Soft hands, smart call, easy single.",
                "🏃‍♂️ Quick off the mark, strike rotated.",
                "🎯 Tapped to mid-on and off they go.",
                "👟 Quick scramble to the other end.",
                "💨 Fast running keeps the fielder on toes.",
                "🔄 Rotating the strike, keeping the game moving."
            ]
        }
    ],
    "2": [
        {
            "gif": null,
            "commentaries": [
                "🏃‍♂️ Two runs!",
                "💨 Good running between wickets.",
                "🔥 Two runs scored.",
                "✌️ Double trouble!",
                "🐆 Prowling for those two runs.",
                "🏃🏃 Two more to the tally.",
                "📈 Moving the score along nicely.",
                "🌪️ A whirlwind of running! Two runs.",
                "🛤️ Smooth as silk for a double.",
                "🚀 Pushing hard for the second!",
                "💪 Tagda running! Double taken.",
                "🏹 Two runs harvested from the field.",
                "⚖️ Balancing the risk with two runs.",
                "🌊 Rolling in the runs, two at a time.",
                "🔋 Recharging the total with a double.",
                "🏃‍♂️🏃‍♂️ Exceptional running, they hustle back for a double!",
                "🏏 Driven through the covers, easy two runs.",
                "🐆 Coming back hard for the second run! Excellent hustle.",
                "⚡ Pierced the gap, fielders chase as they grab two.",
                "📈 Score ticks up by two! Nicely played.",
                "🔥 A brace of runs added to the scoreboard.",
                "💪 Great athletic display to complete the second."
            ]
        }
    ],
    "3": [
        {
            "gif": null,
            "commentaries": [
                "🏃‍♂️ Three runs! Great running!",
                "💨 Three runs added.",
                "🔥 Three runs scored.",
                "🦵 Fitness test! Three runs taken.",
                "🥇 A hat-trick of runs in one ball!",
                "🏁 Chasing them down... three runs!",
                "💨 The fielders are getting a workout.",
                "⚡ Blazing speed for a triple!",
                "🥵 Fielder is panting! 3 runs taken.",
                "💥 Gajab running, bhai!",
                "🏃‍♂️🏃‍♂️🏃‍♂️ Non-stop action for three runs!",
                "🎯 Exploiting the gaps beautifully for 3.",
                "🥵 Exhausting! Three runs collected with pure running.",
                "🏏 Beautiful stroke through deep mid-wicket, fielders pull it back.",
                "⚡ Great running between the wickets, absolute sprint for three.",
                "🏃‍♂️🏃‍♂️🏃‍♂️ Swept away, fielders chase and they slide home for a triple!",
                "🔥 Terrific communication, three easy runs.",
                "📈 Pushing the field to its limits, three runs!"
            ]
        }
    ],
    "4": [
        {
            "gif": "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
            "commentaries": [
                "🔥 Cracking four! What a shot!",
                "🏏 Beautiful timing for four runs!",
                "🎸 Rocks the stadium! Four runs!",
                "🎯 Precision of a surgeon. Four runs.",
                "📣 The crowd is loving this boundary!",
                "🏹 Shot through the covers like an arrow!",
                "🧨 Exploded off the bat!",
                "🚁 Helicopter 4? Almost!",
                "🐅 Roaring with power! Four!",
                "🏏 Pure elegance! Driven through extra cover for four!",
                "💥 Cracking sound off the willow, absolute boundary!",
                "🎸 Pierced the infield with surgical precision! Boundary!",
                "⚡ The crowd goes wild as the ball crosses the rope!"
            ]
        },
        {
            "gif": "https://media.giphy.com/media/ANpwXNVebeJ0TK9bTL/giphy.gif",
            "commentaries": [
                "💥 The ball races to the boundary!",
                "🚀 'Like a tracer bullet!'",
                "🔨 Hammered away to the fence!",
                "🤩 'Everything about that was class!'",
                "💸 Easy money! Four runs.",
                "🔥 Timing, no effort. 4 runs.",
                "🥵 Maza aa gaya! What a boundary!",
                "💎 A gem of a boundary. 4 runs.",
                "⚡ 'Absolute lightning to the fence!'",
                "🚀 Fast outfield! The ball races away to the boundary fence.",
                "🎯 Shot of the day! Pristine timing for four.",
                "🔥 Pulled away powerfully! Four runs.",
                "🤩 Absolute class! No need to run for that."
            ]
        }
    ],
    "5": [
        {
            "gif": null,
            "commentaries": [
                "🏃‍♂️ Five runs! Great running and overthrows allow {batsman} to take five!",
                "🔥 Incredible scenes! Good speed between the wickets and a wayward throw gets them 5 runs!",
                "⚡ Hustle, bustle, and overthrows! 5 runs added to the scoreboard for {batsman}!",
                "💨 Magnificent sprint by {batsman} and a wild throw from {bowler}'s team yields 5 runs!",
                "🔄 Overthrows! {batsman} runs hard and gets a bonus boundary on the overthrow! 5 runs!"
            ]
        }
    ],
    "6": [
        {
            "gif": "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif",
            "commentaries": [
                "🚀 Massive six! Into the stands!",
                "🏟️ 'If you're a fan in the top tier, keep your eyes open!'",
                "🦅 Flight 101: Destination Boundary Heights.",
                "🕺 Dance down the track and smash it!",
                "🛰️ NASA just spotted the ball. 6 runs.",
                "💣 Monstruous hit! The ball has disappeared into the night sky.",
                "💥 Helicopter shot! Erupts into a massive sixer."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/kDXtscxqmTgm9XIWXk/giphy.gif",
            "commentaries": [
                "🎉 What a smash! Six runs!",
                "💣 KA-BOOM! Out of the park!",
                "⚡ 'Absolute carnage!'",
                "💥 DHO dala! (Washed them!) Sixer!",
                "🌈 Arcing beautifully into the crowd. 6!",
                "👑 Majestic! Lofted over long-on for a massive six.",
                "🏟️ Stand and deliver! The crowd is catch-hunting in the stands."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/3DHe8wnmz5VKpyucJt/giphy.gif",
            "commentaries": [
                "🔥 Smoked it for a sixer! 🔥",
                "🍿 Get the popcorn, this is a show! 6 runs.",
                "🤴 King of the crease! Huge six.",
                "🔱 God-level hitting! 6 runs.",
                "🌌 THAT IS HUGE! Clean out of the stadium!",
                "🛸 Launch codes entered! That's gone into orbit."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/tBfzeRunuQrP2kuTEb/giphy.gif",
            "commentaries": [
                "🌌 'That's gone into orbit!'",
                "🤯 'He's making them look like schoolboys!'",
                "🧨 Power, timing, and pure disrespect!",
                "🌋 Eruption of power! Out of the stadium!",
                "🚀 High, handsome, and into the third tier! SIX!",
                "🕺 Smacked with sheer authority! 6 runs!"
            ]
        }
    ],
    "50": [
        {
            "gif": "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyYm5ueGVod2Z0MHcxNTF1dWVvY2EzOXo5bGxhcXdxMWFsOWl5Z3d6YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LRsCOm65R3NHVwqiml/giphy.gif",
            "commentaries": [
                "🎉 Half-century! What a milestone!",
                "👑 Class is permanent. 50 runs.",
                "🍾 Pop the champagne! 50 up.",
                "🏅 Quality through and through. 50 runs.",
                "🔥 Masterclass in batting! 50 runs milestone reached."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/uoakmctOIA3ibVo6bZ/giphy.gif",
            "commentaries": [
                "🏆 50 runs scored! Keep it up!",
                "📊 A captain's innings! Half-century.",
                "📈 The graphs are all pointing up!",
                "🏏 Raising the bat! A magnificent half-century!",
                "👏 Standing ovation from the dressing room! 50 up."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/PjSaG1p15sRtBQCTW7/giphy.gif",
            "commentaries": [
                "🔥 Fifty up! Player is on fire!",
                "🌟 Shining bright with a 50.",
                "🦁 Sher hai tu! Magnificent 50.",
                "👑 Playing a key innings, fifty up and well deserved!",
                "🌟 Anchoring the innings beautifully. Golden 50!"
            ]
        }
    ],
    "100": [
        {
            "gif": "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3EyMXE1dzY1dXE0Y3cwMDVzb2p6c3QxbTZ0MTR6aWdvY242ZnRzdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1ugo9PYts0eHIRDG/giphy.gif",
            "commentaries": [
                "🏅 CENTURY! What a magnificent innings!",
                "🔥 Century scored! The crowd erupts!",
                "🏅 Legendary status unlocked. 100!",
                "🎂 A ton of runs! Magnificent.",
                "👑 Badshah of the stadium! 100!",
                "👑 A GLORIOUS CENTURY! Helmets off, arms raised!",
                "🌟 Landmark moment! 100 runs in a sensational display.",
                "Legendary batting! A century to remember."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/1bbvNisg9SBccNc3tx/giphy.gif",
            "commentaries": [
                "🎊 100 runs! A true champion!",
                "🦅 'Touching the sky!' 100 runs.",
                "🔱 The master of the crease. 100 runs.",
                "🙌 Bow down to the centurion!",
                "🔱 Simply unstoppable. 100 runs.",
                "🏆 Pure class! A century of the highest order.",
                "🎉 The stadium rises to applaud a masterful ton!"
            ]
        }
    ],
    "out": [
        {
            "gif": "https://media3.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif",
            "commentaries": [
                "💥 Bowled him! What a delivery!",
                "🚾 Mind the windows on your way out!",
                "🚪 This way to the pavilion, please.",
                "🏏 'You're just a bits and pieces player!'",
                "👻 Disappeared! Like your chances of winning. OUT!",
                "💥 Stumps shattered! Clean bowled, absolute beauty!",
                "🚾 Plumb in front! That's a massive wicket."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
            "commentaries": [
                "😢 Caught out! End of the innings!",
                "🎤 'He's gone! The finger goes up!'",
                "🤫 Silence in the ground. Wicket falls.",
                "💀 GONE! Absolutely clinical.",
                "😵 Stunned! The stumps are flying.",
                "😱 What a catch! Diving at point to dismiss the batsman.",
                "👋 Cheerio, batter! Better luck next time."
            ]
        },
        {
            "gif": "https://media.giphy.com/media/fXcP4RuOgAah2g9dOb/giphy.gif",
            "commentaries": [
                "🚫 Out! The crowd goes silent...",
                "🤡 'Why don't you get some runs, mate?'",
                "💔 Heartbreak! The batter is walking.",
                "💩 Bhai, tujhse na ho payega. OUT!",
                "📉 Career-ending delivery? Maybe!",
                "🚪 Long walk back to the pavilion. OUT!",
                "💀 Silence in the stadium as the star batsman departs!"
            ]
        },
        {
            "gif": "https://media.giphy.com/media/DYbTfb0Gqe148AAcMP/giphy.gif",
            "commentaries": [
                "👋 'Cheerio!' - Off you go.",
                "🚮 Trash disposal complete. Out!",
                "📦 Pack your bags! You're done.",
                "💨 'Snicked it... and taken!'",
                "☝️ GONE! The finger goes up! Bowler celebrates.",
                "😢 Tragic end to the innings. Caught at the boundary."
            ]
        }
    ],
    "duck": [
        {
            "gif": "https://i.giphy.com/XxdrEjbDWnNHJsnWPE.gif",
            "commentaries": [
                "🦆 <b>DUCK!</b> <b>{batsman}</b> is dismissed for a duck! Back to the pavilion without scoring.",
                "🥚 An absolute egg! <b>{batsman}</b> departs for a duck.",
                "😭 A disappointing zero for <b>{batsman}</b>."
            ]
        },
        {
            "gif": "https://i.giphy.com/LO8yQjIRoBQaxCgPT0.gif",
            "commentaries": [
                "🦆 Oh dear! <b>{batsman}</b> walks back with a duck!",
                "🚪 No runs scored, straight back to the bench.",
                "👀 Caught or bowled, it's a zero for <b>{batsman}</b>."
            ]
        },
        {
            "gif": "https://i.giphy.com/kFiDBSmVOYCkuPDgec.gif",
            "commentaries": [
                "🥚 <b>{batsman}</b> got a big fat zero!",
                "🤫 Silence in the ground as the batter departs without scoring.",
                "📉 A quick stay at the crease. OUT for 0!"
            ]
        },
        {
            "gif": "https://i.giphy.com/OoDsb7FHoRTO0OMz2k.gif",
            "commentaries": [
                "🦆 Cheerio! <b>{batsman}</b> got a duck!",
                "🤦‍♂️ An innings to forget for <b>{batsman}</b>.",
                "🚪 Walk of shame for the batter! Out for a duck."
            ]
        }
    ],
    "threewickets": [
        {
            "gif": "https://media.giphy.com/media/RiiCewAJiJbXrsFys3/giphy.gif",
            "commentaries": [
                "🔥 <b>3-WICKET HAUL!</b> <b>{bowler}</b> is on fire with 3 wickets! 🥎",
                "🌟 Fantastic bowling! <b>{bowler}</b> claims their 3rd wicket of the match!"
            ]
        }
    ],
    "fivewickets": [
        {
            "gif": "https://media.giphy.com/media/RiiCewAJiJbXrsFys3/giphy.gif",
            "commentaries": [
                "🖐️ <b>5-WICKET HAUL!</b> Sensational bowling by <b>{bowler}</b>! A day to remember! 🥎",
                "👑 Masterclass! <b>{bowler}</b> completes a glorious 5-wicket haul!"
            ]
        }
    ],
    "hattrick": [
        {
            "gif": "https://media.giphy.com/media/RiiCewAJiJbXrsFys3/giphy.gif",
            "commentaries": [
                "💥 <b>HATTRICK!</b> 3 wickets in 3 consecutive balls for <b>{bowler}</b>! Absolutely unbelievable! 🥳",
                "🔥 Magic from <b>{bowler}</b>! A hat-trick of wickets!"
            ]
        }
    ],
    "out_yorker": [
        {
            "gif": "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
            "commentaries": [
                "💥 <b>CLEAN BOWLED!</b> <b>{bowler}</b> fires in a toe-crushing yorker and disturbs the woodwork! <b>{batsman}</b> is gone!",
                "🪵 The stumps are shattered! A bullet yorker from <b>{bowler}</b> leaves <b>{batsman}</b> flat-footed and clean bowled!",
                "🎯 Right in the blockhole! <b>{bowler}</b> delivers a perfect yorker. <b>{batsman}</b> couldn't get the bat down in time! OUT!"
            ]
        }
    ],
    "out_bouncer": [
        {
            "gif": "https://media.giphy.com/media/fXcP4RuOgAah2g9dOb/giphy.gif",
            "commentaries": [
                "💀 <b>OUT!</b> <b>{bowler}</b> sets up the trap with a vicious bouncer! <b>{batsman}</b> goes for the pull, gets a top-edge, and is caught!",
                "🧤 Caught behind! <b>{batsman}</b> tries to hook/pull <b>{bowler}</b>'s nasty bouncer, but only manages a glove straight to the keeper!",
                "😱 Taken! <b>{batsman}</b> is hurried by the short ball from <b>{bowler}</b> and spoons a simple catch to deep fine leg!"
            ]
        }
    ],
    "out_slower": [
        {
            "gif": "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
            "commentaries": [
                "🐢 <b>DECEIVED BY THE SLOWER ONE!</b> <b>{batsman}</b> swings way too early at <b>{bowler}</b>'s slower ball and gets clean bowled!",
                "🤡 Foiled by lack of pace! <b>{batsman}</b> tries to loft <b>{bowler}</b>'s slower delivery but only chips it straight to mid-on! Caught!",
                "🛑 Soft dismissal! <b>{bowler}</b> rolls their fingers over the ball, and <b>{batsman}</b> lobs it right back to the bowler!"
            ]
        }
    ],
    "out_knuckle": [
        {
            "gif": "https://media.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif",
            "commentaries": [
                "🧙‍♂️ <b>BAMBOOZLED!</b> <b>{bowler}</b> bowls a brilliant knuckle ball. <b>{batsman}</b> had absolutely no clue and is clean bowled!",
                "🤷‍♂️ Played too early! <b>{batsman}</b> is completely out of position by <b>{bowler}</b>'s knuckle ball and gets caught at cover!"
            ]
        }
    ],
    "out_legcutter": [
        {
            "gif": "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
            "commentaries": [
                "⚡ <b>EDGED AND TAKEN!</b> <b>{bowler}</b>'s leg cutter grips, spins away, takes the outside edge of <b>{batsman}</b>'s bat, and goes straight to slips!",
                "🏏 Played inside the line! <b>{batsman}</b> was beaten by the cut from <b>{bowler}</b> and loses their off stump!"
            ]
        }
    ],
    "6_bouncer": [
        {
            "gif": "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif",
            "commentaries": [
                "🚀 <b>HOOKED FOR SIX!</b> <b>{batsman}</b> anticipates the short ball from <b>{bowler}</b> and launches it over deep square leg!",
                "🏟️ Smashed! <b>{batsman}</b> rides the bounce of <b>{bowler}</b>'s bouncer and pulls it high into the crowd for a massive SIX!",
                "💥 Top-class batting! <b>{batsman}</b> greets <b>{bowler}</b>'s short ball with a thunderous hook shot that clears the ropes!"
            ]
        }
    ],
    "6_yorker": [
        {
            "gif": "https://media.giphy.com/media/kDXtscxqmTgm9XIWXk/giphy.gif",
            "commentaries": [
                "🚁 <b>HELICOPTER SHOT!</b> <b>{batsman}</b> digests the yorker from <b>{bowler}</b> and whips it off the pads for a sensational SIX!",
                "🤯 How did that go for six?! <b>{batsman}</b> digs out <b>{bowler}</b>'s yorker and somehow lofts it over the bowler's head for a maximum!"
            ]
        }
    ],
    "6_slower": [
        {
            "gif": "https://media.giphy.com/media/tBfzeRunuQrP2kuTEb/giphy.gif",
            "commentaries": [
                "🍿 <b>SPOTTED EARLY!</b> <b>{batsman}</b> waits for <b>{bowler}</b>'s slower delivery and sends it sailing over long-on for SIX!",
                "💣 Absolute carnage! <b>{batsman}</b> tracks the slower ball and muscles it out of the stadium!"
            ]
        }
    ],
    "4_bouncer": [
        {
            "gif": "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
            "commentaries": [
                "🏏 Hammered away! <b>{batsman}</b> pulls <b>{bowler}</b>'s short ball in front of square for a cracking boundary!",
                "⚡ <b>{batsman}</b> rolls the wrists over the bounce of <b>{bowler}</b>'s bouncer to guide it safely to the fence!"
            ]
        }
    ],
    "4_yorker": [
        {
            "gif": "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
            "commentaries": [
                "🎯 Squeezed past third man! <b>{batsman}</b> digs out the yorker from <b>{bowler}</b> and finds the gap for four!",
                "💎 Elegant! <b>{batsman}</b> opens the face of the bat at the last second to guide the yorker past slips for a boundary!"
            ]
        }
    ],
    "0_yorker": [
        {
            "gif": null,
            "commentaries": [
                "🛡️ Squeezed out! A perfect yorker from <b>{bowler}</b>, but <b>{batsman}</b> manages to block it. No run.",
                "🥵 Toe-crusher! <b>{batsman}</b> barely manages to get the bat down to stop <b>{bowler}</b>'s yorker."
            ]
        }
    ],
    "0_bouncer": [
        {
            "gif": null,
            "commentaries": [
                "💨 Whoosh! <b>{bowler}</b> sends a fast bouncer past <b>{batsman}</b>'s ears. Batsman ducks safely.",
                "beaten by the bounce! <b>{batsman}</b> swings blindly at <b>{bowler}</b>'s bouncer and connects with thin air!"
            ]
        }
    ],
    "0_slower": [
        {
            "gif": null,
            "commentaries": [
                "🧐 Tricked! <b>{batsman}</b> swings way too early at <b>{bowler}</b>'s slower ball. Good change of pace.",
                "🤨 Play and miss! <b>{batsman}</b> was completely fooled by the pace of <b>{bowler}</b>'s delivery."
            ]
        }
    ]
};

process.on('unhandledRejection', (reason) => console.error("Unhandled Rejection:", reason));
process.on('uncaughtException', (error) => console.error("Uncaught Exception:", error));

const startTime = Date.now();
const encounteredGroups = new Set();
const BOT_ADMIN_IDS = new Set(["7361215114", "6268846393"]);

function isBotAdmin(userId) {
  return BOT_ADMIN_IDS.has(String(userId));
}

const bot = new Bot(process.env.BOT_TOKEN);
bot.use(session({ initial: () => ({}) }));

bot.use(async (ctx, next) => {
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    encounteredGroups.add(ctx.chat.id);
    await sb.recordGroupInteraction(ctx.chat.id);
  }
  await next();
});

bot.catch((err) => {
  console.error("Error in bot:", err);
});

tourBotUI(bot, sleep, sendEventUpdate, COMMENTARY, CCL_GIFS, GIF_EVENTS);


try {
  bot.api.setMyCommands([
    { command: 'start', description: 'Welcome message' },
    { command: 'ping', description: 'Check bot status and stats' },
    { command: 'register', description: 'Create account & get coins' },
    { command: 'achievements', description: 'View unlocked achievements' },
    { command: 'addachievement', description: 'Award achievement to a player (Admin only)' },
    { command: 'removeachievement', description: 'Remove an achievement from a player (Admin only)' },
    { command: 'ccl', description: 'Start a 1v1 CCL match' },
    { command: 'tour', description: 'Start a multiplayer Tour match' },
    { command: 'teams', description: 'Show team rosters' },
    { command: 'score', description: 'Show full match scorecard' },
    { command: 'batting', description: '/batting [index] [S/NS]' },
    { command: 'bowling', description: '/bowling [index]' },
    { command: 'remove_player', description: 'Remove player from match' },
    { command: 'adda', description: 'Add player to Team A' },
    { command: 'addb', description: 'Add player to Team B' },
    { command: 'addc', description: 'Add player to Team C (Tri-Series)' },
    { command: 'teamname', description: 'Rename your team' },
    { command: 'set_overs', description: 'Set max overs for Tour/Tri-Series' },
    { command: 'set_wickets', description: 'Set max wickets for Tour/Tri-Series' },
    { command: 'powersurge', description: 'Toggle Power Surge (Tour mode)' },
    { command: 'endtour', description: 'Forcibly end Tour match' },
    { command: 'triseries', description: 'Start a Tri-Series tournament lobby' },
    { command: 'match', description: 'Start specific Tri-Series match' },
    { command: 'tristatus', description: 'View Tri-Series points table' },
    { command: 'freewin', description: 'Award free win to a team (Tri-Series Host)' },
    { command: 'tourhelp', description: 'Show Tour & Tri-Series guide' },
    { command: 'profile', description: 'View your stats' },
    { command: 'mycard', description: 'Show premium player card' },
    { command: 'top', description: 'Show global leaderboards (Runs, Wickets, MVPs, Ducks, Highscores)' },
    { command: 'shot', description: 'Play Shot tactical betting game' },
    { command: 'broadcast', description: 'SuperAdmin: Send broadcast to users and groups' },
    { command: 'broadcast_users', description: 'SuperAdmin: Send broadcast to users DMs' },
    { command: 'broadcast_groups', description: 'SuperAdmin: Send broadcast to groups' },
    { command: 'listgroups', description: 'SuperAdmin: List active groups in DB' },
    { command: 'stopbroadcast', description: 'SuperAdmin: Stop active broadcast' },
    { command: 'revertbroadcast', description: 'SuperAdmin: Revert/delete last broadcast' },
    { command: 'help', description: 'Commands list' }
  ]).catch(e => console.error("setMyCommands error (non-blocking):", e.message));
} catch (e) {
  console.error("Critical error in setMyCommands:", e.message);
}

bot.command('start', async (ctx) => {
  const arg = ctx.message.text.split(' ')[1];
  if (arg === 'tour') {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (tour && tour.state === 'PLAYING') {
          const batTeam = tour[tour.battingTeamId];
          const isStriker = ctx.from.id.toString() === tourManager.getBasePlayerId(batTeam.strikerId);
          const isBowler = ctx.from.id.toString() === tourManager.getBasePlayerId(tour.activeBowlerId);
          
          if (isStriker) {
              return ctx.reply(tour.powerSurge 
                  ? "🏏 You are Batting! Send your shot number as text (0, 1, 2, 3, 4, 5, 6)."
                  : "🏏 You are Batting! Send your shot number as text (0, 1, 2, 3, 4, 6).");
          } else if (isBowler) {
              return ctx.reply(tour.powerSurge
                  ? "⚾ You are Bowling! Send your delivery as text (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle)."
                  : "⚾ You are Bowling! Send your delivery as text (RS, Bouncer, Yorker, Short, Slower, Knuckle).");
          } else {
              return ctx.reply("You are not currently the active striker or bowler in the Tour match.");
          }
      }
      return ctx.reply("You are not currently in an active Tour match play phase.");
  }
  await ctx.reply("🏏 Welcome to HandCricket!\nUse /register to get 4000🪙 coins.");
});

bot.command('ping', async (ctx) => {
  const start = Date.now();
  let userCount = "Unknown";
  try {
    if (sb.supabase) {
      const { count, error } = await sb.supabase
        .from('cricket_users')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        userCount = count;
      }
    }
  } catch (e) {
    console.error("Supabase user count error in ping:", e.message);
  }

  const activeGames = [...gameManager.getAllGames()];
  const activeTours = [...tourManager.getAllTours()];
  const triManager = require('./game/triManager');
  const activeTris = triManager.getAllTriSeries();

  const matchGroups = new Set();
  activeGames.forEach(g => {
    if (g.chatId && g.chatId < 0) {
      matchGroups.add(g.chatId);
    }
  });
  activeTours.forEach(t => {
    if (t.chatId && t.chatId < 0) {
      matchGroups.add(t.chatId);
    }
  });
  activeTris.forEach(tri => {
    if (tri.chatId && tri.chatId < 0) {
      matchGroups.add(tri.chatId);
    }
  });

  const totalGroups = new Set([...encounteredGroups, ...matchGroups]).size;

  const diffMs = Date.now() - startTime;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  let uptimeStr = '';
  if (days > 0) uptimeStr += `${days}d `;
  if (hours > 0 || days > 0) uptimeStr += `${hours}h `;
  uptimeStr += `${minutes}m ${seconds}s`;

  const memUsage = (process.memoryUsage().rss / (1024 * 1024)).toFixed(1);

  const msg = await ctx.reply("🏓 <b>Ponging...</b>", { parse_mode: 'HTML' });
  const latency = Date.now() - start;

  const responseText = `🏓 <b>PONG!</b>\n\n` +
    `⚡ <b>Bot Statistics:</b>\n` +
    `🔹 <b>Uptime:</b> <code>${uptimeStr}</code>\n` +
    `🔹 <b>Memory Usage:</b> <code>${memUsage} MB</code>\n` +
    `🔹 <b>Latency:</b> <code>${latency}ms</code>\n\n` +
    `👥 <b>Users & Groups:</b>\n` +
    `🔹 <b>Registered Users:</b> <code>${userCount}</code>\n` +
    `🔹 <b>Active Groups (Runtime):</b> <code>${totalGroups}</code>\n\n` +
    `🏏 <b>Matches In Progress:</b>\n` +
    `🔹 <b>1v1 Matches:</b> <code>${activeGames.length}</code>\n` +
    `🔹 <b>Tour Lobbies & Matches:</b> <code>${activeTours.length}</code>\n` +
    `🔹 <b>Tri-Series Tournaments:</b> <code>${activeTris.length}</code>\n` +
    `🔹 <b>Total Active Games:</b> <code>${activeGames.length + activeTours.length + activeTris.length}</code>`;

  await ctx.api.editMessageText(ctx.chat.id, msg.message_id, responseText, { parse_mode: 'HTML' });
});

bot.command('register', async (ctx) => {
  const result = await sb.registerUser(ctx.from.id, ctx.from.first_name);
  if (result.success) {
    await ctx.reply(`Registered! 4000🪙 added to your account.`);
  } else {
    await ctx.reply(`⚠️ ${result.error}`);
  }
});

bot.command('achievements', async (ctx) => {
  const args = ctx.message.text.split(' ');
  let targetUserId = ctx.from.id;
  let targetName = ctx.from.first_name;

  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    targetName = ctx.message.reply_to_message.from.first_name;
  } else if (args.length > 1) {
    targetUserId = args[1];
    targetName = `Player ${targetUserId}`;
    try {
      const dbUser = await sb.getUser(targetUserId);
      if (dbUser) {
        targetName = dbUser.first_name;
      }
    } catch (e) {
      console.error("Error looking up user in achievements:", e.message);
    }
  }

  try {
    const achievementsHelper = require('./db/achievements');
    const list = await achievementsHelper.getAchievements(targetUserId);

    if (list.length === 0) {
      return ctx.reply(targetUserId === ctx.from.id 
        ? "🏆 <b>Your Achievements:</b>\nYou haven't unlocked any achievements yet!" 
        : `🏆 <b>Achievements for ${escapeHtml(targetName)}:</b>\nNo achievements unlocked yet.`, 
        { parse_mode: 'HTML' }
      );
    }

    let text = `🏆 <b>Achievements for ${escapeHtml(targetName)}</b> (ID: <code>${targetUserId}</code>):\n\n`;
    list.forEach((item, idx) => {
      const date = new Date(item.awardedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      text += `${idx + 1}. ⭐ <b>${escapeHtml(item.achievement)}</b>\n   <i>Awarded on ${date}</i>\n\n`;
    });

    await ctx.reply(text.trim(), { parse_mode: 'HTML' });
  } catch (err) {
    console.error("Error retrieving achievements:", err);
    await ctx.reply("❌ Failed to retrieve achievements.");
  }
});

bot.command('addachievement', async (ctx) => {
  if (!isBotAdmin(ctx.from.id)) {
    return ctx.reply("❌ Only bot admins can use this command.");
  }

  const args = ctx.message.text.split(' ');
  let targetUserId = null;
  let achievementName = null;

  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    if (args.length < 2) {
      return ctx.reply("ℹ️ Usage: reply to a user's message with <code>/addachievement &lt;achievement description&gt;</code>", { parse_mode: 'HTML' });
    }
    achievementName = args.slice(1).join(' ');
  } else {
    if (args.length < 3) {
      return ctx.reply("ℹ️ Usage: <code>/addachievement &lt;userId&gt; &lt;achievement description&gt;</code>", { parse_mode: 'HTML' });
    }
    targetUserId = args[1];
    achievementName = args.slice(2).join(' ');
  }

  let targetName = `Player ${targetUserId}`;
  try {
    const dbUser = await sb.getUser(targetUserId);
    if (dbUser) {
      targetName = dbUser.first_name;
    }
  } catch (e) {
    console.error("Error looking up user in addachievement:", e.message);
  }

  try {
    const achievementsHelper = require('./db/achievements');
    await achievementsHelper.addAchievement(targetUserId, achievementName, ctx.from.id);
    await ctx.reply(`✅ Successfully awarded achievement <b>"${escapeHtml(achievementName)}"</b> to <b>${escapeHtml(targetName)}</b> (ID: <code>${targetUserId}</code>).`, { parse_mode: 'HTML' });
  } catch (err) {
    console.error("Error adding achievement:", err);
    await ctx.reply("❌ Failed to add achievement. Please check server logs.");
  }
});

bot.command('removeachievement', async (ctx) => {
  if (!isBotAdmin(ctx.from.id)) {
    return ctx.reply("❌ Only bot admins can use this command.");
  }

  const args = ctx.message.text.split(' ');
  let targetUserId = null;
  let identifier = null;

  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    if (args.length < 2) {
      return ctx.reply("ℹ️ Usage: reply to a user's message with <code>/removeachievement &lt;index or exact description&gt;</code>", { parse_mode: 'HTML' });
    }
    identifier = args.slice(1).join(' ');
  } else {
    if (args.length < 3) {
      return ctx.reply("ℹ️ Usage: <code>/removeachievement &lt;userId&gt; &lt;index or exact description&gt;</code>", { parse_mode: 'HTML' });
    }
    targetUserId = args[1];
    identifier = args.slice(2).join(' ');
  }

  let targetName = `Player ${targetUserId}`;
  try {
    const dbUser = await sb.getUser(targetUserId);
    if (dbUser) {
      targetName = dbUser.first_name;
    }
  } catch (e) {
    console.error("Error looking up user in removeachievement:", e.message);
  }

  try {
    const achievementsHelper = require('./db/achievements');
    const res = await achievementsHelper.removeAchievement(targetUserId, identifier);
    if (res.success) {
      await ctx.reply(`✅ Successfully removed achievement matching <b>"${escapeHtml(identifier)}"</b> from <b>${escapeHtml(targetName)}</b> (ID: <code>${targetUserId}</code>).`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ ${res.error || "Failed to remove achievement."}`);
    }
  } catch (err) {
    console.error("Error removing achievement:", err);
    await ctx.reply("❌ Failed to remove achievement. Please check server logs.");
  }
});

bot.command('profile', async (ctx) => {
  try {
      const user = await sb.getUser(ctx.from.id, ctx.from.first_name);
      if (!user) return ctx.reply("⚠️ You need to register first! Send /register");
      
      const careerStats = require('./db/careerStats');
      const stats = await careerStats.getStats(ctx.from.id);
      
      const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(2) : '0.00';
      const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
      const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs.toFixed(2)}*` : '0.00');
      
      await ctx.reply(
        `👤 <b>${user.first_name}'s Profile</b>\n\n` +
        `🆔 ID: <code>${user.user_id}</code>\n` +
        `💰 Purse: ${user.coins}🪙\n\n` +
        `📊 <b>Tour Record:</b>\n` +
        `🏆 MOTM Awards: <b>${stats.motm}</b>\n` +
        `✅ Wins: <b>${stats.wins}</b>  |  ❌ Losses: <b>${stats.losses}</b>\n\n` +
        `🏏 <b>Career Batting:</b>\n` +
        `🔹 Innings: <b>${stats.batting_innings}</b>\n` +
        `🔹 Runs: <b>${stats.runs}</b>\n` +
        `🔹 High Score: <b>${stats.highscore}</b>\n` +
        `🔹 Average: <b>${avgStr}</b>\n` +
        `🔹 Strike Rate: <b>${sr}</b>\n` +
        `🔹 50s: <b>${stats.fifties || 0}</b>  |  100s: <b>${stats.centuries || 0}</b>\n` +
        `🔹 Ducks: <b>${stats.ducks}</b>\n` +
        `🔹 Fours (4s): <b>${stats.fours}</b>  |  Sixes (6s): <b>${stats.sixes}</b>\n\n` +
        `🥎 <b>Career Bowling:</b>\n` +
        `🔹 Innings: <b>${stats.bowling_innings}</b>\n` +
        `🔹 Wickets: <b>${stats.wickets}</b>\n` +
        `🔹 Economy: <b>${econ}</b>\n` +
        `🔹 Best Bowling: <b>${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}</b>\n` +
        `🔹 3w: <b>${stats.threew || 0}</b>  |  5w: <b>${stats.fivew || 0}</b>`,
        { parse_mode: 'HTML' }
      );
  } catch (e) {
      console.error(e);
      await ctx.reply("⚠️ Error loading profile");
  }
});

const activeGenerations = new Set();
const CARD_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown per user

function buildExampleScoreboardMatch() {
  return {
    firstBattingTeamId: 'teamA',
    teamA: {
      name: 'India',
      score: 185,
      wickets: 4,
      bonusRuns: 0,
      penaltyRuns: 0,
      players: [
        { id: 1, first_name: 'Rohit Sharma', runs: 45, balls: 30, wickets: 0, runsConceded: 0, ballsBowled: 0 },
        { id: 2, first_name: 'Virat Kohli', runs: 82, balls: 53, wickets: 0, runsConceded: 0, ballsBowled: 0 },
        { id: 3, first_name: 'Suryakumar', runs: 25, balls: 12, wickets: 0, runsConceded: 0, ballsBowled: 0 },
        { id: 4, first_name: 'Hardik', runs: 12, balls: 8, wickets: 1, runsConceded: 24, ballsBowled: 18 },
        { id: 5, first_name: 'Bumrah', runs: 0, balls: 0, wickets: 3, runsConceded: 18, ballsBowled: 24 },
        { id: 6, first_name: 'Siraj', runs: 0, balls: 0, wickets: 1, runsConceded: 30, ballsBowled: 24 },
        { id: 7, first_name: 'Arshdeep', runs: 0, balls: 0, wickets: 2, runsConceded: 20, ballsBowled: 24 }
      ],
      outPlayers: [1, 3, 4]
    },
    teamB: {
      name: 'Australia',
      score: 160,
      wickets: 7,
      bonusRuns: 0,
      penaltyRuns: 0,
      players: [
        { id: 8, first_name: 'Warner', runs: 30, balls: 20, wickets: 0, runsConceded: 0, ballsBowled: 0 },
        { id: 9, first_name: 'Head', runs: 50, balls: 35, wickets: 0, runsConceded: 0, ballsBowled: 0 },
        { id: 10, first_name: 'Maxwell', runs: 15, balls: 10, wickets: 1, runsConceded: 35, ballsBowled: 24 },
        { id: 11, first_name: 'Stoinis', runs: 20, balls: 15, wickets: 0, runsConceded: 25, ballsBowled: 12 },
        { id: 12, first_name: 'Starc', runs: 5, balls: 5, wickets: 2, runsConceded: 40, ballsBowled: 24 },
        { id: 13, first_name: 'Cummins', runs: 10, balls: 5, wickets: 1, runsConceded: 30, ballsBowled: 24 },
        { id: 14, first_name: 'Zampa', runs: 0, balls: 0, wickets: 0, runsConceded: 25, ballsBowled: 24 }
      ],
      outPlayers: [8, 9, 10, 11, 12, 13]
    },
    innings: 2,
    innings1Balls: 120,
    innings2Balls: 120,
    config: { overs: 20 }
  };
}

bot.command('generate', async (ctx) => {
  try {
      const arg = ctx.match ? ctx.match.trim().toLowerCase() : "";
      if (arg === 'score') {
          await ctx.replyWithChatAction("upload_photo");

          let generateScoreboardImage;
          try {
              const generator = require('./game/scoreboardGenerator');
              generateScoreboardImage = generator.generateScoreboardImage;
          } catch (requireErr) {
              console.error("Failed to require scoreboardGenerator:", requireErr);
              return ctx.reply(`❌ Error loading scoreboard generator: <code>${escapeHtml(requireErr.message)}</code>\n\nStack: <code>${escapeHtml(requireErr.stack)}</code>`, { parse_mode: 'HTML' });
          }

          const { InputFile } = require('grammy');
          const exampleTour = buildExampleScoreboardMatch();
          
          let buffer;
          try {
              buffer = await generateScoreboardImage(exampleTour, "India won by 25 runs", "Virat Kohli");
          } catch (genErr) {
              console.error("Failed to generate scoreboard image:", genErr);
              return ctx.reply(`❌ Error generating scoreboard image: <code>${escapeHtml(genErr.message)}</code>\n\nStack: <code>${escapeHtml(genErr.stack)}</code>`, { parse_mode: 'HTML' });
          }

          if (!buffer) {
              return ctx.reply("❌ Failed to generate example scoreboard image (buffer is empty).");
          }

          await ctx.replyWithPhoto(new InputFile(buffer, 'scorecard.png'));
          return;
      }

      if (ctx.chat.type !== 'private') {
          return ctx.reply(`⚠️ This command can only be used in private DMs with the bot. Send it here: @${ctx.me.username}`);
      }

      if (arg !== 'card') {
          return ctx.reply("⚠️ Usage: <code>/generate card</code> or <code>/generate score</code>", { parse_mode: 'HTML' });
      }

      const now = Date.now();
      const lastUsed = await sb.getCardCooldown(ctx.from.id);
      const isAdmin = isBotAdmin(ctx.from.id);
      if (!isAdmin && now - lastUsed < CARD_COOLDOWN_MS) {
          const remainingMs = CARD_COOLDOWN_MS - (now - lastUsed);
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.ceil((remainingMs % 60000) / 1000);
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          return ctx.reply(`⏳ Please wait <b>${timeStr}</b> before generating another card.`, { parse_mode: 'HTML' });
      }

      if (activeGenerations.has(ctx.from.id)) {
          console.log(`Blocked duplicate /generate card execution for user ${ctx.from.id}`);
          return;
      }
      activeGenerations.add(ctx.from.id);

      await ctx.replyWithChatAction("upload_photo");

      const user = await sb.getUser(ctx.from.id, ctx.from.first_name);
      if (!user) return ctx.reply("⚠️ You need to register first! Send /register");
      
      const careerStats = require('./db/careerStats');
      const stats = await careerStats.getStats(ctx.from.id);

      let avatarBuffer = null;
      try {
          const photos = await ctx.api.getUserProfilePhotos(ctx.from.id, { limit: 1 });
          if (photos && photos.total_count > 0) {
              const fileId = photos.photos[0][0].file_id;
              const file = await ctx.api.getFile(fileId);
              const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
              
              const https = require('https');
              avatarBuffer = await new Promise((resolve, reject) => {
                  const req = https.get(fileUrl, { timeout: 2000 }, (res) => {
                      if (res.statusCode !== 200) {
                          reject(new Error(`Status code: ${res.statusCode}`));
                          return;
                      }
                      const chunks = [];
                      res.on('data', chunk => chunks.push(chunk));
                      res.on('end', () => resolve(Buffer.concat(chunks)));
                      res.on('error', err => reject(err));
                  });
                  req.on('timeout', () => {
                      req.destroy();
                      reject(new Error('Timeout'));
                  });
                  req.on('error', err => reject(err));
              });
          }
      } catch (err) {
          console.error("Failed to download avatar, falling back to silhouette:", err.message);
      }

      const { generateProfileCard } = require('./game/profileCardGenerator');
      const cardBuffer = await generateProfileCard(user, stats, avatarBuffer);

      const { InputFile } = require('grammy');
      await ctx.replyWithPhoto(new InputFile(cardBuffer), {
          caption: `👤 <b>${user.first_name}'s Player Card</b>\n\n<i>This is a preview mockup of the Visual Profile card.</i>`,
          parse_mode: 'HTML'
      });
      
      if (!isAdmin) {
          await sb.setCardCooldown(ctx.from.id, Date.now());
      }
  } catch (err) {
      console.error("Error generating player card:", err);
      await ctx.reply("❌ Failed to generate player card.");
  } finally {
      activeGenerations.delete(ctx.from.id);
  }
});

bot.command('mycard', async (ctx) => {
  try {
      // Removed private chat restriction so it can be used in Group Chats!
      
      const now = Date.now();
      const lastUsed = await sb.getCardCooldown(ctx.from.id);
      const isAdmin = isBotAdmin(ctx.from.id);
      const THIRTY_MINUTES = 30 * 60 * 1000;
      
      // Enforce 30-minute cooldown for all non-admin users to prevent GC spam/lag
      if (!isAdmin && now - lastUsed < THIRTY_MINUTES) {
          const remainingMs = THIRTY_MINUTES - (now - lastUsed);
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.ceil((remainingMs % 60000) / 1000);
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          return ctx.reply(`⏳ Please wait <b>${timeStr}</b> before generating another card.`, { parse_mode: 'HTML' });
      }

      if (activeGenerations.has(ctx.from.id)) {
          console.log(`Blocked duplicate /mycard execution for user ${ctx.from.id}`);
          return;
      }
      activeGenerations.add(ctx.from.id);

      await ctx.replyWithChatAction("upload_photo");

      let targetUserId = ctx.from.id;
      let targetFirstName = ctx.from.first_name;

      const { normalizeStyledText } = require('./game/profileCardGenerator');

      if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
          targetUserId = ctx.message.reply_to_message.from.id;
          targetFirstName = ctx.message.reply_to_message.from.first_name;
      } else {
          const text = ctx.message.text || "";
          const parts = text.trim().split(/\s+/);
          if (parts.length > 1) {
              const arg = parts.slice(1).join(' ');
              if (/^\d+$/.test(arg)) {
                  targetUserId = parseInt(arg);
                  targetFirstName = null;
              } else {
                  // Search user by normalized first_name
                  const { data: allUsers } = await sb.supabase
                      .from('cricket_users')
                      .select('*');
                  
                  if (allUsers && allUsers.length > 0) {
                      const query = arg.toLowerCase();
                      let matched = allUsers.find(u => {
                          const norm = normalizeStyledText(u.first_name || '').toLowerCase();
                          return norm === query;
                      });
                      if (!matched) {
                          matched = allUsers.find(u => {
                              const norm = normalizeStyledText(u.first_name || '').toLowerCase();
                              return norm.includes(query);
                          });
                      }
                      if (matched) {
                          targetUserId = matched.user_id;
                          targetFirstName = matched.first_name;
                      } else {
                          return ctx.reply(`⚠️ No user found with name matching "${arg}"`);
                      }
                  } else {
                      return ctx.reply(`⚠️ No user found with name matching "${arg}"`);
                  }
              }
          }
      }

      // Sync name with TG first_name if available, otherwise just fetch
      const user = await sb.getUser(targetUserId, targetFirstName);
      if (!user) {
          return ctx.reply("⚠️ User not found in database! They need to register first by sending /register");
      }

      const careerStats = require('./db/careerStats');
      const stats = await careerStats.getStats(targetUserId);

      let avatarBuffer = null;
      try {
          const photos = await ctx.api.getUserProfilePhotos(targetUserId, { limit: 1 });
          if (photos && photos.total_count > 0) {
              const fileId = photos.photos[0][0].file_id;
              const file = await ctx.api.getFile(fileId);
              const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
              
              const https = require('https');
              avatarBuffer = await new Promise((resolve, reject) => {
                  const req = https.get(fileUrl, { timeout: 2000 }, (res) => {
                      if (res.statusCode !== 200) {
                          reject(new Error(`Status code: ${res.statusCode}`));
                          return;
                      }
                      const chunks = [];
                      res.on('data', chunk => chunks.push(chunk));
                      res.on('end', () => resolve(Buffer.concat(chunks)));
                      res.on('error', err => reject(err));
                  });
                  req.on('timeout', () => {
                      req.destroy();
                      reject(new Error('Timeout'));
                  });
                  req.on('error', err => reject(err));
              });
          }
      } catch (err) {
          console.error("Failed to download avatar, falling back to silhouette:", err.message);
      }

      const { generateProfileCard } = require('./game/profileCardGenerator');
      const cardBuffer = await generateProfileCard(user, stats, avatarBuffer);

      const { InputFile } = require('grammy');
      await ctx.replyWithPhoto(new InputFile(cardBuffer), {
          caption: `👑 <b>${user.first_name}'s Official Player Card</b>\n\nUse <code>/mycard</code> to generate yours!`,
          parse_mode: 'HTML'
      });
      
      if (!isAdmin) {
          await sb.setCardCooldown(ctx.from.id, Date.now());
      }
  } catch (err) {
      console.error("Error generating player card:", err);
      await ctx.reply("❌ Failed to generate player card.");
  } finally {
      activeGenerations.delete(ctx.from.id);
  }
});


function getTopMenuKeyboard() {
  return new InlineKeyboard()
    .text("🏏 Most Runs", "top_runs").text("🥎 Most Wickets", "top_wickets")
    .row()
    .text("⭐ Most MVPs", "top_mvps").text("🦆 Most Ducks", "top_ducks")
    .row()
    .text("💥 Highest Score", "top_highscores").text("🔥 Best Bowling", "top_bestbowling");
}

bot.command('top', async (ctx) => {
  try {
    await ctx.reply(
      "🏆 <b>GLOBAL LEADERBOARDS</b> 🏆\n\nSelect a category to view the top 10 players:",
      { reply_markup: getTopMenuKeyboard(), parse_mode: 'HTML' }
    );
  } catch (err) {
    console.error("Error displaying top menu:", err);
    await ctx.reply("❌ Failed to open leaderboards.");
  }
});

bot.command('quit', async (ctx) => {
    const userId = ctx.from.id;
    const hLobby = handCricketManager.getLobbyByUserId(userId);
    if (hLobby) {
        handCricketManager.deleteLobby(hLobby.chatId, hLobby.messageId);
        await ctx.api.sendMessage(hLobby.chatId, `🛑 Match ended because <a href="tg://user?id=${userId}">${escapeHtml(ctx.from.first_name)}</a> quit the game.`, { parse_mode: 'HTML' });
        return ctx.reply("You quit the Hand Cricket match.");
    }
    
    const game = gameManager.getUserGame(userId);
    if (game) {
        gameManager.deleteGame(game.id);
        await ctx.api.sendMessage(game.chatId, `🛑 CCL Match ended because <a href="tg://user?id=${userId}">${escapeHtml(ctx.from.first_name)}</a> quit the game.`, { parse_mode: 'HTML' });
        return ctx.reply("You quit the CCL match.");
    }
    
    const tour = tourManager.getUserTour(userId);
    if (tour) {
        if (tour.hostId === userId) {
            tourManager.deleteTour(tour.id);
            await ctx.api.sendMessage(tour.chatId, `🛑 Tour Match ended because the host <a href="tg://user?id=${userId}">${escapeHtml(ctx.from.first_name)}</a> quit the game.`, { parse_mode: 'HTML' });
            return ctx.reply("You quit the Tour match. Lobby deleted.");
        } else {
            const res = tourManager.removePlayer(tour.id, userId, userId);
            if (res.success) {
                await ctx.api.sendMessage(tour.chatId, `🚪 <a href="tg://user?id=${userId}">${escapeHtml(ctx.from.first_name)}</a> left the Tour match.`, { parse_mode: 'HTML' });
                return ctx.reply("You left the Tour match.");
            } else {
                return ctx.reply("❌ " + res.error);
            }
        }
    }
    
    ctx.reply("You are not in any active match.");
});

bot.command('leaderboard', async (ctx) => {
  try {
      const targetUserId = ctx.from.id;
      const type = 'coins';
      const lb = await sb.getLeaderboard(type);
      const userRank = await sb.getUserRank(targetUserId, type);
      
      let text = `🏆 <b>Top 10 by Coins</b> 🏆\n\n`;
      if (lb && lb.length > 0) {
          lb.forEach((u, i) => {
             text += `${i+1}. <b>${escapeHtml(u.first_name || 'Player')}</b> - ${u[type]}🪙\n`;
          });
      } else {
          text += "No records found!\n";
      }
      
      if (userRank && userRank.rank > 0) {
          text += `\nYour Rank: <b>#${userRank.rank}</b> of <b>${userRank.total}</b> (${userRank.value}🪙)`;
      }
      
      const kb = new InlineKeyboard()
        .text("💰 Coins", `lb_coins_${targetUserId}`)
        .text("🏆 Wins", `lb_wins_${targetUserId}`);
        
      await ctx.reply(text, { reply_markup: kb, parse_mode: 'HTML' });
  } catch (e) {
      console.error(e);
      await ctx.reply("⚠️ Config error in leaderboard menu");
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    "📜 <b>CCG HandCricket Commands:</b>\n\n" +
    "🏏 /start - Welcome message\n" +
    "💰 /register - Get 4000 coins\n" +
    "🎮 /cricket - Start a 1v1 Hand Cricket (Buttons)\n" +
    "🎮 /ccl - Start a 1v1 CCL Match (DM-based)\n" +
    "🏆 /tour - Start a Team Tour match\n" +
    "⚙️ /tourconfig - Configure Tour Match\n" +
    "👤 /profile - Your stats\n" +
    "🎴 /mycard - Show premium player card\n" +
    "🔄 /daily - Claim 2000 coins\n" +
    "🏏 /shot [bet] - Play Shot tactical betting game\n" +
    "🏆 /leaderboard - Top players\n" +
    "📜 /rules - Game Rules\n" +
    "🛑 /quit - Leave your current match\n\n" +
    "<i>Admin Commands:</i>\n" +
    "🛑 /endmatch - End 1v1 match\n" +
    "🛑 /endtour - End tour match\n" +
    "➕ /add [id] [amount] - Give coins\n\n" +
    "<i>Super Admin Broadcast:</i>\n" +
    "📢 /broadcast [msg] - Broadcast to users and groups\n" +
    "📢 /broadcast_users [msg] - Broadcast to users DMs\n" +
    "📢 /broadcast_groups [msg] - Broadcast to groups\n" +
    "📁 /listgroups - List active groups in DB\n" +
    "🛑 /stopbroadcast - Stop active broadcast\n" +
    "🗑️ /revertbroadcast - Revert/delete last broadcast",
    { parse_mode: 'HTML' }
  );
});

bot.command('rules', async (ctx) => {
  await ctx.reply(
    "🏏 <b>CCL Game Rules</b>\n\n" +
    "It's a simple 1v1 Hand Cricket game! Here is how it works:\n\n" +
    "<b>Basic Gameplay:</b>\n" +
    "1️⃣ Use /ccl [bet] to start a match in a group.\n" +
    "2️⃣ <b>Batsman</b> picks a number (0, 1, 2, 3, 4, 6).\n" +
    "3️⃣ <b>Bowler</b> picks a delivery which maps to a number:\n" +
    "   • <b>RS</b> = 0 (Regular Speed)\n" +
    "   • <b>Bouncer</b> = 1\n" +
    "   • <b>Yorker</b> = 2\n" +
    "   • <b>Short</b> = 3\n" +
    "   • <b>Slower</b> = 4\n" +
    "   • <b>Knuckle</b> = 6\n\n" +
    "⚠️ <b>Wicket:</b> If the Batsman's number matches the Bowler's delivery number, the Batsman is <b>OUT!</b>\n" +
    "📉 <b>RS-0 Rule:</b> The 'RS' delivery specifically counts as 0 runs. If the batsman picks 0 and the bowler picks RS, it's a wicket.\n\n" +
    "<b>Winning:</b>\n" +
    "Both players get an innings to bat. Whoever scores more runs wins the match and the bet! 🏆\n\n" +
    "🏏 <b>Hand Cricket (Buttons) Rules:</b>\n" +
    "1️⃣ Use /cricket to start a match.\n" +
    "2️⃣ Both players pick a number (1-6) using buttons.\n" +
    "3️⃣ If numbers match, it's OUT! Else runs are added.\n" +
    "4️⃣ Played entirely in one message!",
    { parse_mode: 'HTML' }
  );
});

bot.command('daily', async (ctx) => {
  const result = await sb.claimDaily(ctx.from.id, ctx.from.first_name);
  if (result.success) await ctx.reply(`✅ 2000🪙 added to your account!`);
  else await ctx.reply(`⏳ ${result.error}`);
});

bot.command('cricket', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Hand Cricket must be played in group chats.");
    
    const user = { id: ctx.from.id, first_name: ctx.from.first_name };
    const dbUser = await sb.getUser(user.id, user.first_name);
    if (!dbUser) return ctx.reply("⚠️ You need to /register first!");

    const lobby = handCricketManager.createLobby(ctx.chat.id, user);
    
    const text = `🏏 <b>Hand Cricket Match</b> 🏏\n\n` +
                 `Host: <a href="tg://user?id=${user.id}">${escapeHtml(user.first_name)}</a>\n` +
                 `Waiting for an opponent to join...`;
                 
    const kb = new InlineKeyboard()
        .text("🏏 Join Match", "cric_join");

    const msg = await ctx.reply(text, { reply_markup: kb, parse_mode: 'HTML' });
    handCricketManager.saveLobby(msg.message_id, lobby);
});

bot.command('ccl', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("CCL matches must be played in group chats.");
  
  const args = ctx.message.text.split(' ');
  const bet = parseInt(args[1]) || 0;
  
  if (bet < 0) {
      return ctx.reply("⚠️ Bet amount cannot be negative!");
  }
  
  const user = await sb.getUser(ctx.from.id, ctx.from.first_name);
  if (!user) return ctx.reply("⚠️ You need to /register first!");
  if (user.coins < bet) return ctx.reply(`⚠️ Insufficient coins! You have ${user.coins}🪙`);

  const res = gameManager.createGame(ctx.chat.id, null, { id: ctx.from.id, first_name: ctx.from.first_name }, bet);
  if (!res.success) return ctx.reply("❌ " + res.error);

  const kb = new InlineKeyboard()
    .text("Join Match 🏏", `ccl_join_${res.game.id}`)
    .row()
    .text("Cancel ❌", `ccl_cancel_${res.game.id}`);

  await ctx.reply(
    `🏏 <b>CCL Match Started!</b>\n` +
    `Host: ${escapeHtml(ctx.from.first_name)}\n` +
    `Bet: ${bet}🪙\n\n` +
    `Click below to join!`,
    { reply_markup: kb, parse_mode: 'HTML' }
  );
});

bot.command(['shot', 'sh'], async (ctx) => {
  const args = ctx.message.text.split(/\s+/);
  const bet = parseInt(args[1]);
  
  if (isNaN(bet) || bet <= 0) {
      return ctx.reply("⚠️ Usage: <code>/shot [bet_amount]</code> (e.g. <code>/shot 100</code>)", { parse_mode: 'HTML' });
  }
  
  const user = await sb.getUser(ctx.from.id, ctx.from.first_name);
  if (!user) {
      return ctx.reply("⚠️ You need to register first! Send /register");
  }
  
  if (user.coins < bet) {
      return ctx.reply(`⚠️ Insufficient coins! You have ${user.coins}🪙`);
  }
  
  const game = shotManager.createGame(ctx.from.id, bet);
  
  const text = `🏏 <b>SHOT</b> 🏏\n\n` +
               `👤 <b>Player:</b> ${escapeHtml(ctx.from.first_name)}\n` +
               `💰 <b>Bet Amount:</b> <code>${bet}🪙</code>\n\n` +
               `Choose a zone to play your shot! Find the gaps or the jackpot, and avoid the fielders!\n\n` +
               `1️⃣ Third Man | 2️⃣ Cover | 3️⃣ Long-off\n` +
               `4️⃣ Point | 5️⃣ Straight Drive | 6️⃣ Mid-on\n` +
               `7️⃣ Fine Leg | 8️⃣ Mid-wicket | 9️⃣ Long-on`;
               
  const kb = new InlineKeyboard()
    .text("1", `shot_play_1_${game.gameId}`).text("2", `shot_play_2_${game.gameId}`).text("3", `shot_play_3_${game.gameId}`)
    .row()
    .text("4", `shot_play_4_${game.gameId}`).text("5", `shot_play_5_${game.gameId}`).text("6", `shot_play_6_${game.gameId}`)
    .row()
    .text("7", `shot_play_7_${game.gameId}`).text("8", `shot_play_8_${game.gameId}`).text("9", `shot_play_9_${game.gameId}`);
    
  await ctx.reply(text, { reply_markup: kb, parse_mode: 'HTML' });
});

async function isAdminOrHost(ctx, match) {
    if (ctx.chat.type === 'private') return true;
    if (match && match.hostId === ctx.from.id) return true;
    
    try {
        const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
        return ['creator', 'administrator'].includes(member.status) || ctx.from.id.toString() === "6268846393";
    } catch (e) {
        console.error("Admin check failed:", e);
        return false;
    }
}

bot.command('endmatch', async (ctx) => {
  const match = [...gameManager.getAllGames()].find(m => m.chatId === ctx.chat.id);
  
  if (!match) return ctx.reply("No active 1v1 match found in this chat.");
  
  if (!(await isAdminOrHost(ctx, match))) {
      return ctx.reply("Only the host or an admin can end the match.");
  }

  const kb = new InlineKeyboard()
    .text("Yes, End Match ✅", `confirm_endmatch_yes_${match.id}`)
    .text("No, Continue ❌", `confirm_endmatch_no`);

  await ctx.reply("⚠️ <b>Clear Match?</b>\nAre you sure you want to end this 1v1 match?", { reply_markup: kb, parse_mode: 'HTML' });
});

// Tour commands are implemented interactively in tourBotUI.js

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  if (data === 'shot_noop') {
      return ctx.answerCallbackQuery();
  }

  if (data.startsWith('shot_play_')) {
      const parts = data.split('_');
      const zoneId = parseInt(parts[2]);
      const gameId = parts[3];
      
      const game = shotManager.getGame(gameId);
      if (!game) {
          return ctx.answerCallbackQuery({ text: "⚠️ Game expired or invalid!", show_alert: true });
      }
      
      if (game.userId !== userId) {
          return ctx.answerCallbackQuery({ text: "⚠️ This is not your game!", show_alert: true });
      }
      
      const user = await sb.getUser(userId);
      if (!user) {
          return ctx.answerCallbackQuery({ text: "⚠️ You are not registered!", show_alert: true });
      }
      
      if (user.coins < game.betAmount) {
          return ctx.answerCallbackQuery({ text: `⚠️ Insufficient coins! You have ${user.coins}🪙`, show_alert: true });
      }
      
      const selected = game.board.find(z => z.id === zoneId);
      if (!selected) {
          return ctx.answerCallbackQuery({ text: "⚠️ Invalid zone selected!", show_alert: true });
      }
      
      const multiplier = selected.type.multiplier;
      const winnings = Math.floor(game.betAmount * multiplier);
      const change = winnings - game.betAmount;
      
      await sb.updateCoins(userId, change);
      const updatedUser = await sb.getUser(userId);
      const finalCoins = updatedUser ? updatedUser.coins : user.coins + change;
      
      let outcomeText = "";
      if (selected.type.type === "fielder") {
          outcomeText = `❌ <b>OUT! Caught!</b> You hit it straight to the fielder at <b>${selected.name}</b>. You lost <code>${game.betAmount}🪙</code>.`;
      } else if (selected.type.type === "single") {
          outcomeText = `🏃 <b>Single!</b> Safe shot to <b>${selected.name}</b>. You rotated strike and kept your <code>${game.betAmount}🪙</code>.`;
      } else if (selected.type.type === "gap") {
          outcomeText = `🏏 <b>FOUR!</b> Cracking shot through the gap at <b>${selected.name}</b>! You won <code>${winnings}🪙</code> (Net profit: <code>+${change}🪙</code>).`;
      } else if (selected.type.type === "jackpot") {
          outcomeText = `💥 <b>SIX! JACKPOT!</b> You absolutely launched it over <b>${selected.name}</b>! You won <code>${winnings}🪙</code> (Net profit: <code>+${change}🪙</code>)! 🏆`;
      }
      
      const resultText = `🏏 <b>SHOT RESULT</b> <b>(Bet: ${game.betAmount}🪙)</b> 🏏\n\n` +
                         `👤 <b>Player:</b> ${escapeHtml(ctx.from.first_name)}\n` +
                         `👛 <b>New Balance:</b> <code>${finalCoins}🪙</code>\n\n` +
                         `${outcomeText}`;
                         
      const kb = new InlineKeyboard();
      for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
              const idx = r * 3 + c;
              const z = game.board[idx];
              const isChosen = z.id === zoneId;
              
              let label = "";
              if (z.type.type === "fielder") label = "🔴";
              else if (z.type.type === "single") label = "🟡";
              else if (z.type.type === "gap") label = "🟢";
              else if (z.type.type === "jackpot") label = "⭐";
              
              if (isChosen) {
                  label += " 👈";
              }
              
              kb.text(label, "shot_noop");
          }
          kb.row();
      }
                         
      await ctx.editMessageText(resultText, { reply_markup: kb, parse_mode: 'HTML' });
      shotManager.deleteGame(gameId);
      return ctx.answerCallbackQuery();
  }

  if (data === 'top_menu') {
      await ctx.editMessageText(
          "🏆 <b>GLOBAL LEADERBOARDS</b> 🏆\n\nSelect a category to view the top 10 players:",
          { reply_markup: getTopMenuKeyboard(), parse_mode: 'HTML' }
      );
      return ctx.answerCallbackQuery();
  }

  if (data.startsWith('top_')) {
      try {
          const careerStats = require('./db/careerStats');
          const lists = await careerStats.getTopLists();

          const renderList = (list, key) => {
            const filtered = list.filter(p => (p[key] || 0) > 0);
            if (filtered.length === 0) {
              return `<i>No records yet</i>\n`;
            }
            return filtered.map((p, idx) => {
              const name = p.first_name || `Player ${p.user_id}`;
              return `${idx + 1}. <code>${escapeHtml(name)}</code> - <b>${p[key]}</b>`;
            }).join('\n') + '\n';
          };

          let title = "";
          let listContent = "";

          if (data === 'top_runs') {
              title = "🏏 <b>Top 10 Run Scorers:</b>\n\n";
              listContent = renderList(lists.topRuns, 'runs');
          } else if (data === 'top_wickets') {
              title = "🥎 <b>Top 10 Wicket Takers:</b>\n\n";
              listContent = renderList(lists.topWickets, 'wickets');
          } else if (data === 'top_mvps') {
              title = "⭐ <b>Top 10 MVPs:</b>\n\n";
              listContent = renderList(lists.topMvps, 'motm');
          } else if (data === 'top_ducks') {
              title = "🦆 <b>Top 10 Ducks:</b>\n\n";
              listContent = renderList(lists.topDucks, 'ducks');
          } else if (data === 'top_highscores') {
              title = "💥 <b>Top 10 Highest Scores:</b>\n\n";
              listContent = renderList(lists.topHighscores, 'highscore');
          } else if (data === 'top_bestbowling') {
              title = "🔥 <b>Top 10 Best Bowling Figures:</b>\n\n";
              const filtered = lists.topBestBowling.filter(p => (p.best_wickets || 0) > 0);
              if (filtered.length === 0) {
                  listContent = `<i>No records yet</i>\n`;
              } else {
                  listContent = filtered.map((p, idx) => {
                      const name = p.first_name || `Player ${p.user_id}`;
                      return `${idx + 1}. <code>${escapeHtml(name)}</code> - <b>${p.best_wickets}/${p.best_runs_conceded}</b>`;
                  }).join('\n') + '\n';
              }
          }

          const kb = new InlineKeyboard().text("Back ⬅️", "top_menu");
          await ctx.editMessageText(
              `🏆 <b>GLOBAL LEADERBOARDS</b> 🏆\n\n` + title + listContent,
              { reply_markup: kb, parse_mode: 'HTML' }
          );
      } catch (err) {
          console.error("Error editing top leaderboard:", err);
      }
      return ctx.answerCallbackQuery();
  }

  if (data.startsWith('tour_votehost_')) {
      const tourId = data.split('_')[2];
      const tour = tourManager.getTour(tourId);
      if (!tour || !tour.voteHost.inProgress) return ctx.answerCallbackQuery();
      
      tour.voteHost.yesVotes.add(userId);
      ctx.answerCallbackQuery(`Voted! (${tour.voteHost.yesVotes.size}/${tour.voteHost.totalNeeded})`);

      if (tour.voteHost.yesVotes.size >= tour.voteHost.totalNeeded) {
          tour.voteHost.inProgress = false;
          const kb = new InlineKeyboard().text("I'm Host 🙋‍♂️", `tour_claimhost_${tourId}`);
          await ctx.api.sendMessage(tour.chatId, "✅ <b>Vote Passed!</b>\nThe first person to click below becomes the new Host.", { reply_markup: kb, parse_mode: 'HTML' });
      }
      return;
  }

  if (data.startsWith('tour_claimhost_')) {
      const tourId = data.split('_')[2];
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      tour.hostId = userId;
      await ctx.editMessageText(`🎊 <b>${escapeHtml(ctx.from.first_name)}</b> is the new Host!`, { parse_mode: 'HTML' });
      return;
  }

  if (data.startsWith('tour_overs_')) {
    const parts = data.split('_');
    const tourId = parts[2];
    const overs = parseInt(parts[3]);
    const tour = tourManager.getTour(tourId);
    if (!tour || tour.hostId !== userId) return ctx.answerCallbackQuery({ text: "Only host can set overs.", show_alert: true });
    
    tour.config.overs = overs;
    ctx.answerCallbackQuery(`Overs set to ${overs}!`);
    await ctx.editMessageText(`📊 <b>Match Overs: ${overs}</b>\n\nToss will happen in 10s...`, { parse_mode: 'HTML' });
    
    setTimeout(async () => {
        const kb = new InlineKeyboard().text("Heads", `tour_toss_${tourId}_heads`).text("Tails", `tour_toss_${tourId}_tails`);
        await ctx.api.sendMessage(tour.chatId, `🪙 <b>Toss Time!</b>\nCaptains, choose Heads or Tails!`, { reply_markup: kb, parse_mode: 'HTML' });
    }, 10000);
    return;
  }

  if (data.startsWith('tour_toss_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const choice = parts[3];
      const tour = tourManager.getTour(tourId);
      if (!tour || tour.state !== 'PRE_TOSS') return ctx.answerCallbackQuery();
      if (userId !== tour.teamA.captainId && userId !== tour.teamB.captainId) return ctx.answerCallbackQuery({ text: "Only captains can toss!", show_alert: true });

      const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = choice === tossResult;
      tour.tossWinnerId = userId;
      tour.state = 'TOSS_DECISION';

      ctx.answerCallbackQuery(`The coin landed on ${tossResult}!`);
      const kb = new InlineKeyboard().text("Bat 🏏", `tour_decide_${tourId}_bat`).text("Bowl 🧤", `tour_decide_${tourId}_bowl`);
      await ctx.editMessageText(`🪙 Match Toss: <b>${tossResult.toUpperCase()}</b>\n\n${escapeHtml(ctx.from.first_name)} won the toss! Choose Bat or Bowl:`, { reply_markup: kb, parse_mode: 'HTML' });
      return;
  }

  if (data.startsWith('tour_pickS_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const index = parseInt(parts[3]);
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      
      const res = tourManager.setBatsman(tourId, userId, index, tour[tour.battingTeamId].strikerId ? 'N' : 'S');
      if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
      
      ctx.answerCallbackQuery(`Selected: ${res.player.first_name}`);
      
      if (tour.state === 'SELECT_BATTERS') {
          // Need second batter
          const batT = tour[tour.battingTeamId];
          const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId && p.id !== batT.nonStrikerId);
          const kb = new InlineKeyboard();
          available.forEach(p => kb.text(p.first_name, `tour_pickS_${tourId}_${batT.players.indexOf(p) + 1}`).row());
          await ctx.editMessageText(`🏏 <b>Match Start!</b>\nSelected Opening Batter: ${escapeHtml(res.player.first_name)}\n\nCaptain, select the <b>second batter</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      } else if (tour.state === 'SELECT_BOWLER') {
          // Both batters set, now bowler
          const bowlT = tour[tour.bowlingTeamId];
          const kb = new InlineKeyboard();
          bowlT.players.forEach(p => kb.text(p.first_name, `tour_pickB_${tourId}_${bowlT.players.indexOf(p) + 1}`).row());
          await ctx.editMessageText(`🏏 <b>Batters Set!</b>\nStriker: ${escapeHtml(tour[tour.battingTeamId].players.find(p=>p.id===tour[tour.battingTeamId].strikerId)?.first_name)}\nNon-Striker: ${escapeHtml(tour[tour.battingTeamId].players.find(p=>p.id===tour[tour.battingTeamId].nonStrikerId)?.first_name)}\n\nCaptain, select the <b>Opening Bowler</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      } else {
          try { await ctx.deleteMessage(); } catch(e){}
      }
      return;
  }

  if (data.startsWith('tour_pickB_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const index = parseInt(parts[3]);
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      
      const res = tourManager.setBowler(tourId, userId, index);
      if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
      
      ctx.answerCallbackQuery(`Bowler set: ${res.player.first_name}`);
      await ctx.editMessageText(`🏟 <b>Tournament Start!</b>\nAll players ready. Let the games begin!`, { parse_mode: 'HTML' });
      
      // Trigger initial tag for the first ball
      if (bot.tourTagActive) await bot.tourTagActive(ctx, tour);
      return;
  }

  if (data.startsWith('tour_decide_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const choice = parts[3];
      const tour = tourManager.getTour(tourId);
      if (!tour || tour.state !== 'TOSS_DECISION' || tour.tossWinnerId !== userId) return ctx.answerCallbackQuery();

      const isTeamA = tour.teamA.captainId === userId;
      if (choice === 'bat') {
          tour.battingTeamId = isTeamA ? 'teamA' : 'teamB';
          tour.bowlingTeamId = isTeamA ? 'teamB' : 'teamA';
      } else {
          tour.battingTeamId = isTeamA ? 'teamB' : 'teamA';
          tour.bowlingTeamId = isTeamA ? 'teamA' : 'teamB';
      }

      tour.state = 'SELECT_BATTERS';
      ctx.answerCallbackQuery("Match starting!");
      
      const batT = tour[tour.battingTeamId];
      const kb = new InlineKeyboard();
      batT.players.forEach(p => kb.text(p.first_name, `tour_pickS_${tourId}_${batT.players.indexOf(p) + 1}`).row());
      
      await ctx.editMessageText(`🚀 <b>Match Start!</b>\nTeam Batting: ${tour.battingTeamId === 'teamA' ? 'Team A' : 'Team B'}\n\nCaptain, select your <b>first opening batter</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      return;
  }

  if (data.startsWith('lb_')) {
    const parts = data.split('_');
    const type = parts[1];
    const targetUserId = parts[2] ? parseInt(parts[2]) : userId;
    
    try {
        const lb = await sb.getLeaderboard(type);
        const userRank = await sb.getUserRank(targetUserId, type);
        
        let text = type === 'coins' ? '🏆 <b>Top 10 by Coins</b> 🏆\n\n' : '🏆 <b>Top 10 by Wins</b> 🏆\n\n';
        if (lb && lb.length > 0) {
            lb.forEach((u, i) => {
               text += `${i+1}. <b>${escapeHtml(u.first_name || 'Player')}</b> - ${u[type]}${type === 'coins' ? '🪙' : ' W'}\n`;
            });
        } else {
            text += "No records found!\n";
        }
        
        if (userRank && userRank.rank > 0) {
            const originalUser = await sb.getUser(targetUserId);
            const nameLabel = targetUserId === userId ? "Your Rank" : `${escapeHtml(originalUser?.first_name || 'Player')}'s Rank`;
            text += `\n${nameLabel}: <b>#${userRank.rank}</b> of <b>${userRank.total}</b> (${userRank.value}${type === 'coins' ? '🪙' : ' W'})`;
        }
        
        const kb = new InlineKeyboard()
          .text("💰 Coins", `lb_coins_${targetUserId}`)
          .text("🏆 Wins", `lb_wins_${targetUserId}`);
          
        await ctx.editMessageText(text, { reply_markup: kb, parse_mode: 'HTML' });
    } catch(e) {
        console.error("Leaderboard Error:", e);
    }
    return ctx.answerCallbackQuery();
  }

  if (data.startsWith('ccl_join_')) {
    const gameId = data.split('_')[2];
    const user = await sb.getUser(userId, ctx.from.first_name);
    if (!user) return ctx.answerCallbackQuery({ text: "Register first using /register", show_alert: true });
    
    const tmpGame = gameManager.getGame(gameId);
    if (tmpGame && tmpGame.bet > 0 && user.coins < tmpGame.bet) {
      return ctx.answerCallbackQuery({ text: `Not enough coins! You need ${tmpGame.bet}🪙`, show_alert: true });
    }

    const { success, error, game } = gameManager.joinGame(gameId, { id: userId, first_name: ctx.from.first_name });
    if (!success) return ctx.answerCallbackQuery({ text: error, show_alert: true });
    
    ctx.answerCallbackQuery("Joined!");
    
    const kb = new InlineKeyboard()
        .text("Heads", `ccl_toss_${gameId}_heads`)
        .text("Tails", `ccl_toss_${gameId}_tails`);
        
    await ctx.editMessageText(
        `Match between ${game.players[0].first_name} and ${game.players[1].first_name}!\n${game.players[0].first_name}, choose Heads or Tails for the toss.`,
        { reply_markup: kb }
    );
  }
  else if (data.startsWith('ccl_cancel_')) {
      const gameId = data.split('_')[2];
      const game = gameManager.getGame(gameId);
      if (!game) return ctx.answerCallbackQuery({ text: "Match not found or already ended.", show_alert: true });
      if (userId !== game.players[0].id) return ctx.answerCallbackQuery({ text: "Only the initiator can cancel.", show_alert: true });
      
      gameManager.deleteGame(gameId);
      await ctx.editMessageText("The CCL match has been cancelled by the initiator.");
      ctx.answerCallbackQuery("Match cancelled.");
  }
  else if (data.startsWith('ccl_toss_')) {
    const parts = data.split('_');
    const gameId = parts[2];
    const choice = parts[3]; 
    
    const res = gameManager.handleToss(gameId, userId, choice);
    if (!res) return ctx.answerCallbackQuery({ text: "Invalid toss state or not your turn.", show_alert: true });
    
    ctx.answerCallbackQuery("Tossed!");
    const { game, tossResult, winner } = res;
    
    const kb = new InlineKeyboard()
        .text("Bat 🏏", `ccl_batbowl_${gameId}_bat`)
        .text("Bowl ⚾", `ccl_batbowl_${gameId}_bowl`);
        
    await ctx.editMessageText(
      `The coin landed on ${tossResult}!\n${winner.first_name} won the toss! Choose to Bat or Bowl first.`,
      { reply_markup: kb }
    );
  }
  else if (data.startsWith('ccl_batbowl_')) {
    const parts = data.split('_');
    const gameId = parts[2];
    const choice = parts[3]; 
    
    const game = gameManager.chooseBatBowl(gameId, userId, choice);
    if (!game) return ctx.answerCallbackQuery({ text: "Invalid state or not your choice.", show_alert: true });
    ctx.answerCallbackQuery("Decision made!");
    
    const batP = game.players.find(p => p.id === game.batsmanId);
    const bowlP = game.players.find(p => p.id === game.bowlerId);
    
    await ctx.editMessageText(
      `Match started!\n🏏 Batter: ${batP.first_name}\n🧤 Bowler: ${bowlP.first_name}\n\nBoth players have been sent instructions via DM.`,
      { reply_markup: undefined }
    );
    
    await sendDMInstructions(ctx, game, batP, bowlP);
  }
  else if (data.startsWith('confirm_endmatch_')) {
      const parts = data.split('_');
      if (parts[2] === 'no') return await ctx.editMessageText("End match request cancelled.");
      
      const gameId = parts[3];
      gameManager.deleteGame(gameId);
      await ctx.editMessageText("🛑 1v1 Match has been forcefully ended.");
      ctx.answerCallbackQuery("Match ended.");
  }
  else if (data.startsWith('confirm_endtour_')) {
      const parts = data.split('_');
      if (parts[2] === 'no') return await ctx.editMessageText("End tour request cancelled.");
      
      const tourId = parts[3];
      tourManager.deleteTour(tourId);
      await ctx.editMessageText("🛑 Tour Match has been forcefully ended.");
      ctx.answerCallbackQuery("Tour ended.");
  }

  // --- Hand Cricket Callbacks ---
  if (data.startsWith('cric_')) {
      const messageId = ctx.callbackQuery.message.message_id;
      const lobby = handCricketManager.getLobby(ctx.chat.id, messageId);
      if (!lobby) return ctx.answerCallbackQuery({ text: "Lobby expired.", show_alert: true });

      if (data === 'cric_join') {
          if (lobby.state !== 'LOBBY') return ctx.answerCallbackQuery("Game already started!");
          const joined = handCricketManager.joinLobby(ctx.chat.id, messageId, { id: ctx.from.id, first_name: ctx.from.first_name });
          if (joined) {
              ctx.answerCallbackQuery("Joined!");
              await sendCricketMsg(ctx, lobby);
          } else {
              ctx.answerCallbackQuery({ text: "Match is full or you're already in!", show_alert: true });
          }
      }
      else if (data.startsWith('cric_tosschoice_')) {
          if (ctx.from.id !== lobby.host.id) return ctx.answerCallbackQuery({ text: "Only the host can choose Heads/Tails!", show_alert: true });
          const choice = data.replace('cric_tosschoice_', '');
          const result = handCricketManager.performTossChoice(ctx.chat.id, messageId, choice);
          if (result) {
              ctx.answerCallbackQuery(`Toss flipped! Result: ${result.tossResult}`);
              await sendCricketMsg(ctx, lobby);
          }
      }
      else if (data.startsWith('cric_rolechoice_')) {
          if (ctx.from.id !== lobby.tossWinnerId) return ctx.answerCallbackQuery({ text: "Only the toss winner can select role!", show_alert: true });
          const choice = data.replace('cric_rolechoice_', '');
          const updatedLobby = handCricketManager.selectRole(ctx.chat.id, messageId, choice);
          if (updatedLobby) {
              ctx.answerCallbackQuery(`Elected to ${choice.toUpperCase()} first!`);
              await sendCricketMsg(ctx, updatedLobby);
          }
      }
      else if (data === 'cric_cancel') {
          if (ctx.from.id !== lobby.host.id) return ctx.answerCallbackQuery({ text: "Only the host can cancel!", show_alert: true });
          handCricketManager.deleteLobby(lobby.chatId, messageId);
          await ctx.editMessageText("❌ The Hand Cricket match was cancelled by the host.");
          ctx.answerCallbackQuery("Cancelled.");
      }
      else if (data.startsWith('cric_play_')) {
          const num = parseInt(data.replace('cric_play_', ''));
          const result = handCricketManager.submitMove(ctx.chat.id, messageId, ctx.from.id, num);
          
          if (result.error) return ctx.answerCallbackQuery({ text: result.error, show_alert: true });
          
          if (result.success && !result.allDone) {
              await ctx.answerCallbackQuery(`You picked ${num}! Waiting for opponent...`);
              await sendCricketMsg(ctx, lobby);
          } else if (result.type) {
              ctx.answerCallbackQuery("Both picked!");
              
              let extraMsg = '';
              
              if (result.type === 'OUT_INNINGS_BREAK') {
                  extraMsg += `☝️ <b>OUT!</b> Innings break. Target set: <b>${lobby.target}</b>\n`;
              } else if (result.type === 'OUT_TIE_SUPER_BALL') {
                  extraMsg += `☝️ <b>OUT!</b> Scores tied at <b>${lobby.target - 1}</b>!\n🔥 <b>SUPER BALL TRIGGERED!</b>\n`;
              } else if (result.type === 'OUT_GAME_OVER') {
                  extraMsg += `☝️ <b>OUT!</b> Match over.\n`;
              } else if (result.type === 'CHASE_SUCCESS') {
                  extraMsg += `🎊 <b>TARGET CHASED!</b>\n`;
              } else if (result.type === 'SUPER_BALL_1_DONE') {
                  extraMsg += `👉 Scored: <b>${result.score1} runs</b>\n`;
                  extraMsg += `🔄 Swap roles! Target to win: <b>${result.score1 + 1} runs</b>\n`;
              } else if (result.type === 'SUPER_BALL_OVER') {
                  extraMsg += `👉 Scored: <b>${result.score2} runs</b> (Needed ${result.score1 + 1})\n`;
                  const winner = lobby.players.find(p => p.id === result.winnerId);
                  extraMsg += `🏁 <b>Super Ball Over!</b>\n`;
                  extraMsg += `🏆 <b>Winner:</b> <a href="tg://user?id=${winner.id}">${escapeHtml(winner.first_name)}</a>\n`;
              } else if (result.type === 'SUPER_BALL_TIE_RESTART') {
                  extraMsg += `👉 Scored: <b>${result.score2} runs</b>\n`;
                  extraMsg += `⚖️ <b>Tied again (${result.score1}-${result.score2})!</b>\n🔄 Next Super Ball round starting...\n`;
              } else {
                  extraMsg += `✅ <b>Safe!</b> ${result.batNum} runs added.\n`;
              }
              
              await sendCricketMsg(ctx, lobby, extraMsg);
              
              if (lobby.state === 'FINISHED') {
                  // Record to DB
                  const loserId = lobby.players.find(p => p.id !== lobby.winnerId)?.id;
                  if (lobby.winnerId && loserId) {
                      await sb.recordMatchEnd(lobby.winnerId, loserId, 0); 
                  }
                  handCricketManager.deleteLobby(lobby.chatId, messageId);
              }
          }
      }
      return;
  }
});

async function sendCricketMsg(ctx, lobby, extraMsg = '') {
    const isGameOver = lobby.state === 'FINISHED';
    
    if (extraMsg) {
        lobby.lastBallResult = extraMsg;
    }
    
    let text = '';
    
    if (lobby.state === 'LOBBY') {
        text += `🏏 <b>Hand Cricket Match</b>\n\n`;
        text += `👤 <b>Host:</b> <a href="tg://user?id=${lobby.host.id}">${escapeHtml(lobby.host.first_name)}</a>\n`;
        text += `⏳ Waiting for an opponent to join...`;
        
        const kb = new InlineKeyboard().text("🏏 Join Match", "cric_join");
        return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { reply_markup: kb, parse_mode: 'HTML' }).catch(()=>{});
    }

    if (lobby.state === 'TOSS_CHOOSE_SIDE') {
        const opponent = lobby.players.find(p => p.id !== lobby.host.id);
        text += `🪙 <b>Toss Phase</b> 🪙\n\n`;
        text += `Host: <a href="tg://user?id=${lobby.host.id}">${escapeHtml(lobby.host.first_name)}</a>\n`;
        text += `Opponent: <a href="tg://user?id=${opponent.id}">${escapeHtml(opponent.first_name)}</a>\n\n`;
        text += `👉 <a href="tg://user?id=${lobby.host.id}">${escapeHtml(lobby.host.first_name)}</a>, choose <b>Heads</b> or <b>Tails</b>:`;
        
        const kb = new InlineKeyboard()
            .text("🪙 Heads", "cric_tosschoice_heads")
            .text("🪙 Tails", "cric_tosschoice_tails");
            
        return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { reply_markup: kb, parse_mode: 'HTML' }).catch(()=>{});
    }

    if (lobby.state === 'TOSS_CHOOSE_ROLE') {
        const winner = lobby.players.find(p => p.id === lobby.tossWinnerId);
        const choiceText = lobby.tossChoiceResult.toUpperCase();
        
        text += `🪙 <b>Toss Phase</b> 🪙\n\n`;
        text += `Coin landed on: <b>${choiceText}</b>\n`;
        text += `🏆 Toss won by: <a href="tg://user?id=${winner.id}">${escapeHtml(winner.first_name)}</a>\n\n`;
        text += `👉 <a href="tg://user?id=${winner.id}">${escapeHtml(winner.first_name)}</a>, elect to <b>Bat</b> or <b>Bowl</b>:`;
        
        const kb = new InlineKeyboard()
            .text("🏏 Bat first", "cric_rolechoice_bat")
            .text("🥎 Bowl first", "cric_rolechoice_bowl");
            
        return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { reply_markup: kb, parse_mode: 'HTML' }).catch(()=>{});
    }

    const batPlayer = lobby.players.find(p => p.id === lobby.batsmanId);
    const bowlPlayer = lobby.players.find(p => p.id === lobby.bowlerId);
    
    const currentBatSub = lobby.submissions[lobby.batsmanId];
    const currentBowlSub = lobby.submissions[lobby.bowlerId];

    let batLine = `👤 <b>Bat:</b> <a href="tg://user?id=${batPlayer.id}">${escapeHtml(batPlayer.first_name)}</a>`;
    let bowlLine = `👤 <b>Bowl:</b> <a href="tg://user?id=${bowlPlayer.id}">${escapeHtml(bowlPlayer.first_name)}</a>`;

    if (currentBatSub !== undefined || currentBowlSub !== undefined) {
        if (currentBatSub !== undefined) {
            batLine += ` <i>(chose)</i>`;
        }
        if (currentBowlSub !== undefined) {
            bowlLine += ` <i>(chose)</i>`;
        }
    } else if (lobby.lastMove) {
        batLine += ` chose <b>${lobby.lastMove.batNum}</b>`;
        bowlLine += ` chose <b>${lobby.lastMove.bowlNum}</b>`;
    }

    if (lobby.state === 'SUPER_BALL') {
        text += `🔥 <b>SUPER BALL PHASE</b> 🔥\n`;
        text += `────────────────────\n`;
        text += `${batLine}\n`;
        text += `${bowlLine}\n`;
        text += `────────────────────\n`;
        
        if (lobby.superBallSubState === 'BAT_2') {
            text += `ℹ️ <b>Target:</b> ${lobby.superBallScore1 + 1} runs\n`;
            text += `────────────────────\n`;
        }

        if (lobby.lastBallResult) {
            text += `${lobby.lastBallResult}`;
            text += `────────────────────\n`;
        }

        const batChose = lobby.submissions[lobby.batsmanId] !== undefined;
        if (!batChose) {
            text += `👉 <a href="tg://user?id=${batPlayer.id}">${escapeHtml(batPlayer.first_name)}</a>, choose a number:`;
        } else {
            text += `✅ ${escapeHtml(batPlayer.first_name)} chose. 👉 <a href="tg://user?id=${bowlPlayer.id}">${escapeHtml(bowlPlayer.first_name)}</a>, choose a number:`;
        }

        const kb = new InlineKeyboard()
            .text("1", "cric_play_1").text("2", "cric_play_2").text("3", "cric_play_3").row()
            .text("4", "cric_play_4").text("5", "cric_play_5").text("6", "cric_play_6");

        return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { reply_markup: kb, parse_mode: 'HTML' }).catch(()=>{});
    }

    const overs = Math.floor(lobby.balls / 6);
    const ballsInOver = lobby.balls % 6;
    const oversStr = `${overs}.${ballsInOver}`;

    text += `🏏 <b>Innings ${lobby.innings}</b>\n`;
    text += `📊 <b>Score:</b> ${lobby.currentScore} (${oversStr} ov)${lobby.target ? ` | 🎯 <b>Target:</b> ${lobby.target}` : ''}\n`;
    text += `────────────────────\n`;
    text += `${batLine}\n`;
    text += `${bowlLine}\n`;
    text += `────────────────────\n`;

    if (lobby.lastBallResult) {
        text += `${lobby.lastBallResult}`;
        text += `────────────────────\n`;
    }

    if (isGameOver) {
        const winner = lobby.players.find(p => p.id === lobby.winnerId);
        text += `🏁 <b>GAME OVER!</b>\n`;
        if (winner) {
            text += `🏆 <b>Winner:</b> <a href="tg://user?id=${winner.id}">${escapeHtml(winner.first_name)}</a>\n`;
        } else {
            text += `⚖️ <b>It's a DRAW!</b>\n`;
        }
        
        return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { parse_mode: 'HTML' }).catch(()=>{});
    }

    // Explicit Prompts for sequential choice
    const batChose = lobby.submissions[lobby.batsmanId] !== undefined;
    if (!batChose) {
        text += `👉 <a href="tg://user?id=${batPlayer.id}">${escapeHtml(batPlayer.first_name)}</a>, choose a number:`;
    } else {
        text += `✅ ${escapeHtml(batPlayer.first_name)} chose. 👉 <a href="tg://user?id=${bowlPlayer.id}">${escapeHtml(bowlPlayer.first_name)}</a>, choose a number:`;
    }

    const kb = new InlineKeyboard()
        .text("1", "cric_play_1").text("2", "cric_play_2").text("3", "cric_play_3").row()
        .text("4", "cric_play_4").text("5", "cric_play_5").text("6", "cric_play_6");

    return bot.api.editMessageText(ctx.chat.id, (ctx.callbackQuery?.message?.message_id || lobby.messageId), text, { reply_markup: kb, parse_mode: 'HTML' }).catch(()=>{});
}

async function sendDMInstructions(ctx, game, batP, bowlP) {
    try {
        await ctx.api.sendMessage(batP.id, "🏏 You're batting! Send your shot number as text (0,1,2,3,4,6).");
        await ctx.api.sendMessage(bowlP.id, "⚾ You're bowling! Send your delivery as text:\nRS, Bouncer, Yorker, Short, Slower, Knuckle");
    } catch(e) {
        console.error("Failed to push DM instructions", e.message);
    }
}


bot.on(['message:text', 'message:caption'], async (ctx, next) => {
  const rawText = ctx.message.text || ctx.message.caption || '';
  if (!rawText.startsWith('/')) return next();
  
  const cmd = rawText.split(/\s+/)[0].replace('/', '').split('@')[0];
  if (!['broadcast', 'broadcast_groups', 'broadcast_users'].includes(cmd)) {
      return next();
  }
  
  if (!isBotAdmin(ctx.from.id)) return;
  
  const match = rawText.match(/^\/\S+\s*/);
  const offsetShift = match ? match[0].length : 0;
  const broadcastMsgText = rawText.slice(offsetShift);
  
  let shouldPin = false;
  let specificTargetIds = null;
  let textToBroadcast = broadcastMsgText;
  let parsedOffset = 0;
  
  while (true) {
      const remainingText = textToBroadcast;
      
      // 1. Match pin flag
      const pinMatch = remainingText.match(/^--?pin(?:\s+|$)/i);
      if (pinMatch) {
          shouldPin = true;
          const consumedLength = pinMatch[0].length;
          parsedOffset += consumedLength;
          textToBroadcast = remainingText.slice(consumedLength);
          continue;
      }
      
      // 2. Match targets flag (e.g. -g or -groups or -u or -users or -target)
      const targetMatch = remainingText.match(/^--(?:groups?|users?|targets?|g|u|t)\s+([-0-9,]+)(?:\s+|$)/i) || 
                          remainingText.match(/^-(?:groups?|users?|targets?|g|u|t)\s+([-0-9,]+)(?:\s+|$)/i);
      if (targetMatch) {
          const idsStr = targetMatch[1];
          specificTargetIds = idsStr.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
          const consumedLength = targetMatch[0].length;
          parsedOffset += consumedLength;
          textToBroadcast = remainingText.slice(consumedLength);
          continue;
      }
      
      break;
  }
  
  const totalOffsetShift = offsetShift + parsedOffset;
  
  const isCaption = !ctx.message.text && ctx.message.caption;
  const rawEntities = isCaption ? ctx.message.caption_entities : ctx.message.entities;
  const adjustedEntities = [];
  if (rawEntities) {
      rawEntities.forEach(ent => {
          if (ent.offset + ent.length <= totalOffsetShift) return;
          
          const newOffset = Math.max(0, ent.offset - totalOffsetShift);
          const newLength = ent.offset >= totalOffsetShift ? ent.length : ent.length - (totalOffsetShift - ent.offset);
          if (newLength > 0) {
              adjustedEntities.push({
                  ...ent,
                  offset: newOffset,
                  length: newLength
              });
          }
      });
  }
  
  const broadcastMsg = convertTelegramToHtml(textToBroadcast, adjustedEntities);
  const replyMsg = ctx.message.reply_to_message;
  
  if (!textToBroadcast && !replyMsg && !isCaption) {
      return ctx.reply(`❌ Please provide a message.\n\n<b>Usage 1:</b> /${cmd} Hello world!\n<b>Usage 2:</b> Reply to ANY message (with bold, images, etc.) with /${cmd} to preserve exact formatting!\n<b>Usage 3:</b> Upload an image/media and write /${cmd} Your caption here!\n\n💡 Add <code>-pin</code> to pin the broadcast message (e.g. <code>/${cmd} -pin Hello!</code>)\n💡 Add <code>-g ID1,ID2</code> to target specific groups (e.g. <code>/${cmd} -g -10012345,-10098765 Hello!</code>)`, { parse_mode: 'HTML' });
  }
  
  let targetIds = [];
  if (cmd === 'broadcast' || cmd === 'broadcast_groups') {
      const groupIds = await sb.getAllGroupIds();
      targetIds.push(...groupIds);
  }
  if (cmd === 'broadcast' || cmd === 'broadcast_users') {
      const userIds = await sb.getAllUserIds();
      targetIds.push(...userIds);
  }
  
  // Unique IDs only
  targetIds = [...new Set(targetIds)];
  
  if (targetIds.length === 0) {
      return ctx.reply("❌ No target chats found in database.");
  }
  
  if (specificTargetIds && specificTargetIds.length > 0) {
      const originalCount = targetIds.length;
      targetIds = targetIds.filter(id => specificTargetIds.includes(id));
      if (targetIds.length === 0) {
          return ctx.reply(`❌ None of the specified target IDs were found in the bot's database.\n\nType <code>/listgroups</code> to see active groups and their IDs.`, { parse_mode: 'HTML' });
      }
  }
  
  const copyCurrent = (isCaption && !replyMsg) ? ctx.message.message_id : null;
  sendBroadcast(ctx, targetIds, broadcastMsg, replyMsg ? replyMsg.message_id : null, copyCurrent, shouldPin)
      .catch(err => console.error("Broadcast Error:", err));
      
  await ctx.reply("✅ <b>Broadcast has been moved to background.</b>\n\nYou can continue using the bot while it sends messages.", { parse_mode: 'HTML' });
});

bot.command('stopbroadcast', async (ctx) => {
  if (!isBotAdmin(ctx.from.id)) return;
  activeBroadcastCancel = true;
  await ctx.reply("⏳ <b>Signal sent to stop the active broadcast.</b>\nIt will cease on the next message iteration.", { parse_mode: 'HTML' });
});

bot.command(['revertbroadcast', 'deletebroadcast'], async (ctx) => {
  if (!isBotAdmin(ctx.from.id)) return;
  
  const messages = await sb.getLastBroadcastMessages();
  if (messages.length === 0) {
      return ctx.reply("❌ No broadcast messages in database to revert, or they have already been reverted.");
  }
  
  const total = messages.length;
  let success = 0;
  let failed = 0;
  
  const statusMsg = await ctx.reply(`🗑️ <b>Reverting last broadcast...</b>\n\nDeleting ${total} messages. Progress: 0/${total}`, { parse_mode: 'HTML' });
  
  for (let i = 0; i < total; i++) {
      const item = messages[i];
      try {
          // Unpin the message if possible first
          await bot.api.unpinChatMessage(item.chatId, item.messageId).catch(() => {});
          // Delete message
          await bot.api.deleteMessage(item.chatId, item.messageId);
          success++;
      } catch (e) {
          failed++;
      }
      
      if (i % 10 === 0 || i === total - 1) {
          try {
              await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id,
                  `🗑️ <b>Reverting last broadcast...</b> (${i + 1}/${total})\n\n` +
                  `✅ Deleted: ${success}\n` +
                  `❌ Failed: ${failed}`,
                  { parse_mode: 'HTML' }
              );
          } catch (e) {}
      }
      
      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Clear the database tracking after reverting
  await sb.clearLastBroadcastMessages();
  
  await ctx.reply(`🏁 <b>Revert Complete</b>\n\n✅ Successfully deleted: ${success}\n❌ Failed/Skipped: ${failed}`, { parse_mode: 'HTML' });
});

bot.command('listgroups', async (ctx) => {
  console.log(`[Admin Command] /listgroups triggered by user ID ${ctx.from.id}`);
  if (!isBotAdmin(ctx.from.id)) {
      return ctx.reply("❌ This is a Super Admin only command.");
  }
  const groupIds = await sb.getAllGroupIds();
  if (groupIds.length === 0) {
      return ctx.reply("📁 No groups found in the database.");
  }
  
  const statusMsg = await ctx.reply("⏳ Fetching active group titles...");
  
  // Resolve up to 100 groups in parallel to prevent rate limit issues
  const chunk = groupIds.slice(0, 100); 
  const promises = chunk.map(async (id) => {
      try {
          const chat = await bot.api.getChat(id);
          return { id, title: chat.title || 'Group', success: true };
      } catch (e) {
          return { id, title: 'Unknown Group (Bot kicked/chat inactive)', success: false };
      }
  });
  
  const results = await Promise.all(promises);
  
  let msg = `<b>📁 Active Groups in Database (${results.length}):</b>\n\n`;
  results.forEach(res => {
      msg += `• <b>${escapeHtml(res.title)}</b>\n  <code>${res.id}</code>\n`;
  });
  
  if (groupIds.length > 100) {
      msg += `\n<i>...and ${groupIds.length - 100} more groups in DB.</i>`;
  }
  
  await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, { parse_mode: 'HTML' });
});

// DM Text Message Handlers
bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next(); 
    
    const userId = ctx.from.id;
    const txt = ctx.message.text.trim();

    const tour = tourManager.getUserTour(userId);
    if (tour && tour.state === 'PLAYING' && bot.tourTextHook) {
        const handled = await bot.tourTextHook(ctx, tour, txt);
        if (handled) return;
    }
    
    const game = gameManager.getUserGame(userId);
    if (!game || game.state !== 'PLAYING') return next(); 
    
    const res = gameManager.submitPlay(game.id, userId, txt);
    if (!res.success) {
        if (res.error === 'Not in game') return;
        return await ctx.reply("❌ " + res.error);
    }

    if (userId.toString() === game.batsmanId?.toString()) {
        await ctx.reply(`✅ You played: ${res.batStr || txt}`);
    } else {
        const bowlVal = res.bowlStr || game.bowlChoice || txt;
        const DELIVERY_NAMES = {
            '0': 'RS', 'rs': 'RS',
            '1': 'Bouncer', 'bouncer': 'Bouncer',
            '2': 'Yorker', 'yorker': 'Yorker',
            '3': 'Short', 'short': 'Short',
            '4': 'Slower', 'slower': 'Slower',
            '6': 'Knuckle', 'knuckle': 'Knuckle'
        };
        const displayName = DELIVERY_NAMES[String(bowlVal).toLowerCase()] || bowlVal;
        await ctx.reply(`✅ You bowled: ${displayName}`); 
    }
    
    if (res.waiting) {
        const batDone = game.batChoice !== null;
        const bowlDone = game.bowlChoice !== null;
        if (!batDone) {
            try { await ctx.api.sendMessage(game.batsmanId, "🏏 Please send your shot number (0,1,2,3,4,6)."); } catch(e){}
        }
        if (!bowlDone) {
            try { await ctx.api.sendMessage(game.bowlerId, "⚾ Please send your delivery as one of:\nRS, Bouncer, Yorker, Short, Slower, Knuckle"); } catch(e){}
        }
        return;
    }
    
    handleRoundResult(ctx, res).catch(err => console.error("Error in handleRoundResult:", err));
});



async function sendEventUpdate(ctx, chatId, eventKey, batsmanName = "Batsman", bowlerName = "Bowler", isDuck = false) {
  let scenes = MATCHED_SCENES[eventKey] || [];
  if (scenes.length === 0) {
      if (eventKey.startsWith("out_")) {
          scenes = MATCHED_SCENES["out"] || [];
      } else if (eventKey.includes("_")) {
          const baseRunKey = eventKey.split("_")[0];
          scenes = MATCHED_SCENES[baseRunKey] || [];
      }
  }
  if (scenes.length === 0) return;

  const scene = scenes[Math.floor(Math.random() * scenes.length)];
  let text = (scene.commentaries && scene.commentaries.length > 0)
      ? scene.commentaries[Math.floor(Math.random() * scene.commentaries.length)]
      : "";

  text = text.replace(/{batsman}/g, batsmanName).replace(/{bowler}/g, bowlerName);

  if (eventKey.startsWith("out") && isDuck) {
      text += "\n🦆 <b>Dismissed for a duck!</b>";
  }

  if (scene.gif) {
      try {
          await ctx.api.sendAnimation(chatId, scene.gif, { caption: text, parse_mode: 'HTML' });
          return;
      } catch(e) {
          console.log("GIF send failed", e.message);
      }
  }
  if (text) await ctx.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
}

// 
// Process full over/ball delay sequence in GC
//
async function handleRoundResult(ctx, res) {
  const { game, batNum, bowlNum, batStr, bowlStr, isWicket, inningsEnded, matchEnded, tie, hit50, hit100 } = res;
  const batsmanP = game.players.find(p => p.id === game.batsmanId);
  const bowlerP = game.players.find(p => p.id === res.originalBowlerId);
  const chatId = game.chatId;

  const over = Math.floor((res.ballsThisRound - 1) / 6);
  const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;

  const cleanBatsman = escapeHtml(batsmanP?.first_name || 'Batsman');
  const cleanBowler = escapeHtml(bowlerP?.first_name || 'Bowler');

  try {
    await ctx.api.sendMessage(chatId, `Over ${over + 1}`);
    await ctx.api.sendMessage(chatId, `Ball ${ballInOver}`);
    await sleep(2500);
    
    await ctx.api.sendMessage(chatId, `${cleanBowler} bowls a ${bowlStr} delivery!`);
    await sleep(2500);

    if (isWicket) {
        await sendEventUpdate(ctx, chatId, "out", cleanBatsman, cleanBowler);
    } else {
        await sendEventUpdate(ctx, chatId, batStr, cleanBatsman, cleanBowler);
    }
    await sleep(1000);
    
    // Display correct score (if innings just ended, show score1)
    if (res.inningsEnded) {
        const newBatP = game.players.find(p => p.id === game.batsmanId);
        const cleanNewBat = escapeHtml(newBatP?.first_name || 'Batsman');
        await ctx.api.sendMessage(chatId, `☝️ <b>WICKET!</b> First innings ends.\nFinal Score: ${game.score1}\nTarget for ${cleanNewBat}: ${game.score1 + 1}`, { parse_mode: 'HTML' });
    } else {
        const currentScore = game.innings === 1 ? game.score1 : game.score2;
        const targetText = game.target ? ` (Target: ${game.target})` : (game.innings === 2 ? ` (Target: ${game.score1 + 1})` : "");
        await ctx.api.sendMessage(chatId, `📊 Scorecard: ${currentScore}/${game.innings === 1 ? 0 : 0} ${targetText}`);
    }

    // Pacing delay to keep it readable but fast
    await sleep(1500);

    // End conditions
    if (isWicket) {
        if (inningsEnded) {
            game.halfCenturyAnnounced = false;
            game.centuryAnnounced = false;
            // Send instructions again for new innings
            const nBatP = game.players.find(p => p.id === game.batsmanId);
            const nBowlP = game.players.find(p => p.id === game.bowlerId);
            await sendDMInstructions(ctx, game, nBatP, nBowlP);
        }
    } else {
        if (hit50) {
            await sendEventUpdate(ctx, chatId, "50", cleanBatsman, cleanBowler);
            await ctx.api.sendMessage(chatId, "🎉 Half-century! Keep it up!");
        }
        if (hit100) {
            await sendEventUpdate(ctx, chatId, "100", cleanBatsman, cleanBowler);
            await ctx.api.sendMessage(chatId, "🏆 Century! Amazing innings!");
        }
    }
    
    if (matchEnded) {
        if (tie) {
            await ctx.api.sendMessage(chatId, "🤝 The match is a tie!");
        } else {
            const winnerP = game.players.find(p => p.id === res.winnerId);
            const cleanWinner = escapeHtml(winnerP?.first_name || 'Player');
            await ctx.api.sendMessage(chatId, `🏆 <b>${cleanWinner} won the match!</b> 🎉`, { parse_mode: 'HTML' });
            if (game.bet > 0) {
                await ctx.api.sendMessage(chatId, `💰 ${game.bet}🪙 coins transferred to ${cleanWinner} as bet winnings!`);
            }
            await sb.recordMatchEnd(res.winnerId, res.loserId, game.bet);
        }
        gameManager.deleteGame(game.id);
    } else if (!inningsEnded) {
        // Round continuous!
        const batP = game.players.find(p => p.id === game.batsmanId);
        const bowlP = game.players.find(p => p.id === game.bowlerId);
        try {
            await ctx.api.sendMessage(batP.id, "🏏 Send your shot number (0,1,2,3,4,6):");
            await ctx.api.sendMessage(bowlP.id, "⚾ Send your delivery as one of:\nRS, Bouncer, Yorker, Short, Slower, Knuckle");
        } catch(e) {}
    }
  } finally {
    if (!matchEnded) {
        game.processingBall = false;
    }
  }
}

// --- Admin Broadcast Commands ---

function convertTelegramToHtml(text, entities) {
    if (!entities || entities.length === 0) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    const startTags = Array.from({ length: text.length + 1 }, () => []);
    const endTags = Array.from({ length: text.length + 1 }, () => []);
    
    entities.forEach(ent => {
        let startTag = '';
        let endTag = '';
        switch (ent.type) {
            case 'bold':
                startTag = '<b>';
                endTag = '</b>';
                break;
            case 'italic':
                startTag = '<i>';
                endTag = '</i>';
                break;
            case 'underline':
                startTag = '<u>';
                endTag = '</u>';
                break;
            case 'strikethrough':
                startTag = '<s>';
                endTag = '</s>';
                break;
            case 'code':
                startTag = '<code>';
                endTag = '</code>';
                break;
            case 'pre':
                startTag = '<pre>';
                endTag = '</pre>';
                break;
            case 'text_link':
                startTag = `<a href="${ent.url}">`;
                endTag = '</a>';
                break;
            case 'spoiler':
                startTag = '<tg-spoiler>';
                endTag = '</tg-spoiler>';
                break;
            case 'blockquote':
                startTag = '<blockquote>';
                endTag = '</blockquote>';
                break;
        }
        if (startTag) {
            startTags[ent.offset].push({ tag: startTag, len: ent.length });
            endTags[ent.offset + ent.length].push({ tag: endTag, len: ent.length });
        }
    });
    
    let result = '';
    for (let i = 0; i <= text.length; i++) {
        const closing = endTags[i];
        if (closing && closing.length > 0) {
            closing.sort((a, b) => a.len - b.len);
            closing.forEach(c => result += c.tag);
        }
        
        const opening = startTags[i];
        if (opening && opening.length > 0) {
            opening.sort((a, b) => b.len - a.len);
            opening.forEach(o => result += o.tag);
        }
        
        if (i < text.length) {
            const char = text[i];
            if (char === '<') result += '&lt;';
            else if (char === '>') result += '&gt;';
            else if (char === '&') result += '&amp;';
            else result += char;
        }
    }
    
    return result;
}

let activeBroadcastCancel = false;  // Flag to cancel active broadcast

async function sendBroadcast(ctx, targetIds, messageText, replyMessageId, copyCurrentMessageWithCaption = null, shouldPin = false) {
    let success = 0;
    let failed = 0;
    const total = targetIds.length;
    
    // Clear last broadcast tracking in DB and reset cancel flag
    await sb.clearLastBroadcastMessages();
    activeBroadcastCancel = false;
    
    let statusMsg;
    try {
        statusMsg = await ctx.reply(`🚀 <b>Broadcast Started</b>\n\nTargeting ${total} chats. I will update this message with progress.`, { parse_mode: 'HTML' });
    } catch (e) {
        console.error("Failed to send initial broadcast status:", e);
        return;
    }
    
    for (let i = 0; i < total; i++) {
        // Check cancel flag
        if (activeBroadcastCancel) {
            try {
                await bot.api.sendMessage(ctx.chat.id, `🛑 <b>Broadcast Cancelled by Super Admin</b>\n\n✅ Success: ${success}\n❌ Failed: ${failed}`, { parse_mode: 'HTML' });
            } catch (e) {}
            // Reset flag
            activeBroadcastCancel = false;
            break;
        }

        const targetId = targetIds[i];
        try {
            let sentMsgId;
            if (replyMessageId) {
                // Using copyMessage perfectly preserves formatting, bold, quotes, links, and even photos/videos!
                const res = await bot.api.copyMessage(targetId, ctx.chat.id, replyMessageId);
                sentMsgId = res.message_id;
            } else if (copyCurrentMessageWithCaption) {
                // Copy the uploaded media message but override caption to strip command prefix
                const res = await bot.api.copyMessage(targetId, ctx.chat.id, copyCurrentMessageWithCaption, {
                    caption: messageText,
                    parse_mode: 'HTML'
                });
                sentMsgId = res.message_id;
            } else {
                // Standard text broadcast, no default "Announcement" prefix
                const res = await bot.api.sendMessage(targetId, messageText, { parse_mode: 'HTML' });
                sentMsgId = res.message_id;
            }
            
            if (sentMsgId) {
                await sb.saveBroadcastMessage(targetId, sentMsgId);
            }
            
            // Pin the message in both groups and private chats if requested
            if (shouldPin) {
                await bot.api.pinChatMessage(targetId, sentMsgId).catch(() => {});
            }
            success++;
        } catch (e) {
            failed++;
        }
        
        // Update status UI every 10 messages or at the end (less frequent updates save API calls)
        if (i % 10 === 0 || i === total - 1) {
            try { 
                await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, 
                    `🚀 <b>Broadcasting...</b> (${i + 1}/${total})\n\n` +
                    `✅ Success: ${success}\n` +
                    `❌ Failed: ${failed}\n\n` +
                    `<i>Bot remains active for other users during this process.</i>`, 
                    { parse_mode: 'HTML' }
                ); 
            } catch (e) {}
        }
        
        // Small delay to avoid rate limits (100ms = 10 msgs/sec)
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Only send completion message if we didn't cancel early
    if (!activeBroadcastCancel) {
        try {
            await bot.api.sendMessage(ctx.chat.id, `🏁 <b>Broadcast Complete</b>\n\n✅ Success: ${success}\n❌ Failed: ${failed}`, { parse_mode: 'HTML' });
        } catch (e) {}
    }
}

const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Cricket Bot is safely running!'));

const PORT = process.env.PORT || 3001;
const isRender = process.env.RENDER === "true";

if (isRender) {
  // Use Webhooks on Render to prevent 409 getUpdates conflicts
  console.log("Running in Render environment. Configuring webhook...");
  app.use('/webhook', webhookCallback(bot, "express"));
  
  app.listen(PORT, async () => {
    console.log(`Web server listening on port ${PORT}`);
    try {
      const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
      console.log(`Setting webhook to ${webhookUrl}...`);
      await bot.api.setWebhook(webhookUrl);
      console.log("Webhook set successfully!");
    } catch (err) {
      console.error("Failed to set webhook:", err);
    }
  });
} else {
  // Use Long Polling locally
  console.log("Running in local environment. Configuring polling...");
  
  app.listen(PORT, () => {
    console.log(`Dummy web server running on port ${PORT}`);
  });

  async function startBotWithRetry() {
    try {
      console.log("Cricket Bot is starting polling...");
      await bot.start({
        onStart: (botInfo) => {
          console.log(`Bot @${botInfo.username} started successfully!`);
        }
      });
    } catch (err) {
      console.error("Error occurred during bot polling:", err);
      const errMsg = err.description || err.message || "";
      if (errMsg.includes("Conflict") || errMsg.includes("terminated by other getUpdates")) {
        console.log("Conflict detected (another instance is running). Retrying in 10 seconds...");
        setTimeout(startBotWithRetry, 10000);
      } else {
        console.log("Polling error. Retrying in 15 seconds...");
        setTimeout(startBotWithRetry, 15000);
      }
    }
  }

  startBotWithRetry();
}

console.log("Cricket Bot Final Code is now LIVE!");

process.once("SIGINT", () => {
  console.log("SIGINT received, stopping bot...");
  if (!isRender) bot.stop();
  process.exit(0);
});
process.once("SIGTERM", () => {
  console.log("SIGTERM received, stopping bot...");
  if (!isRender) bot.stop();
  process.exit(0);
});
