const fs = require('fs');

const botContent = fs.readFileSync('bot.js', 'utf8');

// Extract the COMMENTARY declaration block using brace matching
const commentaryStart = botContent.indexOf('const COMMENTARY = {');
let openBraces = 0;
let commentaryEnd = -1;
for (let i = commentaryStart; i < botContent.length; i++) {
    if (botContent[i] === '{') openBraces++;
    if (botContent[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            commentaryEnd = i + 1;
            break;
        }
    }
}

const commentaryCode = botContent.slice(commentaryStart, commentaryEnd);

// Eval it to get the JS object
let COMMENTARY;
const commentaryCodeClean = commentaryCode.replace('const COMMENTARY =', 'COMMENTARY =');
eval(commentaryCodeClean);

const CCL_GIFS = {
    "0": [
        "https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUybHM4N29ib3ZkY3JxNDhjbXlkeDAycnFtYWYyM3QxajF2eXltZ2Z4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QtipHdYxYopX3W6vMs/giphy.gif"
    ],
    "4": [
        "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
        "https://media.giphy.com/media/ANpwXNVebeJ0TK9bTL/giphy.gif"
    ],
    "6": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif",
        "https://media.giphy.com/media/kDXtscxqmTgm9XIWXk/giphy.gif",
        "https://media.giphy.com/media/3DHe8wnmz5VKpyucJt/giphy.gif",
        "https://media.giphy.com/media/tBfzeRunuQrP2kuTEb/giphy.gif"
    ],
    "out": [
        "https://media3.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif",
        "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
        "https://media.giphy.com/media/fXcP4RuOgAah2g9dOb/giphy.gif",
        "https://media.giphy.com/media/DYbTfb0Gqe148AAcMP/giphy.gif"
    ],
    "50": [
        "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyYm5ueGVod2Z0MHcxNTF1dWVvY2EzOXo5bGxhcXdxMWFsOWl5Z3d6YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LRsCOm65R3NHVwqiml/giphy.gif",
        "https://media.giphy.com/media/uoakmctOIA3ibVo6bZ/giphy.gif",
        "https://media.giphy.com/media/PjSaG1p15sRtBQCTW7/giphy.gif"
    ],
    "100": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3EyMXE1dzY1dXE0Y3cwMDVzb2p6c3QxbTZ0MTR6aWdvY242ZnRzdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1ugo9PYts0eHIRDG/giphy.gif",
        "https://media.giphy.com/media/1bbvNisg9SBccNc3tx/giphy.gif"
    ]
};

// Helper to chunk array into N parts
function chunkArray(arr, n) {
    const chunks = Array.from({ length: n }, () => []);
    arr.forEach((item, index) => {
        chunks[index % n].push(item);
    });
    return chunks;
}

const MATCHED_SCENES = {};

// For "0", "4", "6", "out", "50", "100", we have GIFs
const gifKeys = ["0", "4", "6", "out", "50", "100"];
gifKeys.forEach(key => {
    const gifs = CCL_GIFS[key];
    const commentaries = COMMENTARY[key] || [];
    const chunks = chunkArray(commentaries, gifs.length);
    MATCHED_SCENES[key] = gifs.map((gif, idx) => ({
        gif,
        commentaries: chunks[idx]
    }));
});

// For "1", "2", "3", "5" we don't have GIFs
const noGifKeys = ["1", "2", "3"];
noGifKeys.forEach(key => {
    MATCHED_SCENES[key] = [
        {
            gif: null,
            commentaries: COMMENTARY[key] || []
        }
    ];
});

// Special custom commentaries for "5" runs (overthrows/runs)
MATCHED_SCENES["5"] = [
    {
        gif: null,
        commentaries: [
            "🏃‍♂️ Five runs! Great running and overthrows allow {batsman} to take five!",
            "🔥 Incredible scenes! Good speed between the wickets and a wayward throw gets them 5 runs!",
            "⚡ Hustle, bustle, and overthrows! 5 runs added to the scoreboard for {batsman}!",
            "💨 Magnificent sprint by {batsman} and a wild throw from {bowler}'s team yields 5 runs!",
            "🔄 Overthrows! {batsman} runs hard and gets a bonus boundary on the overthrow! 5 runs!"
        ]
    }
];

// Let's generate the code string
const code = `const MATCHED_SCENES = ${JSON.stringify(MATCHED_SCENES, null, 4)};`;
fs.writeFileSync('scratch/generated_matched_scenes.js', code);
console.log('Successfully generated MATCHED_SCENES in scratch/generated_matched_scenes.js!');
