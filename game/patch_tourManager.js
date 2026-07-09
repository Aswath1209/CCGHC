const fs = require('fs');

let content = fs.readFileSync('tourManager.js', 'utf8');

// 1. Add fs and path requires at the top if not exists
if (!content.includes("const STATE_FILE")) {
    content = content.replace("const crypto = require('crypto');", `const crypto = require('crypto');\nconst fs = require('fs');\nconst path = require('path');\n\nconst STATE_FILE = path.join(__dirname, '../db/tour_state.json');\n`);
}

// 2. Add saveState and loadState functions
const saveStateFunc = `
function saveState() {
  try {
    const data = {
      tours: Array.from(tours.entries()),
      userTourMap: Array.from(userTourMap.entries()),
      chatTourMap: Array.from(chatTourMap.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save tour state:", e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data.tours) {
        tours.clear();
        data.tours.forEach(([k, v]) => tours.set(k, v));
      }
      if (data.userTourMap) {
        userTourMap.clear();
        data.userTourMap.forEach(([k, v]) => userTourMap.set(k, v));
      }
      if (data.chatTourMap) {
        chatTourMap.clear();
        data.chatTourMap.forEach(([k, v]) => chatTourMap.set(k, v));
      }
    }
  } catch (e) {
    console.error("Failed to load tour state:", e);
  }
}

loadState();
`;

if (!content.includes("function saveState()")) {
    content = content.replace("function createTour(chatId, hostUser, name = '') {", saveStateFunc + "\nfunction createTour(chatId, hostUser, name = '') {");
}

// 3. Add saveState() calls before return in state-modifying functions.
// We can use regex to find the end of functions, but it's easier to just string replace returns inside the functions.
// Actually, it's safer to just expose saveState and call it from outside, or replace specific patterns.

// Let's replace module.exports to expose saveState
content = content.replace("calculateMOTM\n};", "calculateMOTM, saveState\n};");

// In `createTour`:
content = content.replace("return { success: true, tour };", "saveState();\n  return { success: true, tour };");

// In `joinTeam`:
content = content.replace("return { success: true, left: true, tour };", "saveState();\n            return { success: true, left: true, tour };");
content = content.replace("return { success: true, tour };", "saveState();\n    return { success: true, tour };");

// In `appointCaptain`:
content = content.replace("return true;\n}", "saveState();\n    return true;\n}");

// In `renameTeam`:
content = content.replace("return { success: true, teamName: team.name };", "saveState();\n    return { success: true, teamName: team.name };");

// In `removePlayer`:
content = content.replace("return { success: true, player, tour, clearedActive };", "saveState();\n    return { success: true, player, tour, clearedActive };");

// In `startTour`:
content = content.replace("tour.state = 'TOSS';\n    return { success: true, tour };", "tour.state = 'TOSS';\n    saveState();\n    return { success: true, tour };");

// In `handleToss`:
content = content.replace("tour.state = 'CHOOSE';\n    return { tour, tossResult, winnerTeam: won ? 'A' : 'B' };", "tour.state = 'CHOOSE';\n    saveState();\n    return { tour, tossResult, winnerTeam: won ? 'A' : 'B' };");

// In `setBatsman`:
content = content.replace("return { success: true, player };\n}", "saveState();\n    return { success: true, player };\n}");

// In `setBowler`:
content = content.replace("return { success: true, player };\n}", "saveState();\n    return { success: true, player };\n}");

// In `adjustRuns`:
content = content.replace("return { teamName: team.name, total: team.penaltyRuns + team.bonusRuns };\n}", "saveState();\n    return { teamName: team.name, total: team.penaltyRuns + team.bonusRuns };\n}");

// In `rebatPlayer`:
content = content.replace("team.players.push(rebatObj);\n    return rebatObj;\n}", "team.players.push(rebatObj);\n    saveState();\n    return rebatObj;\n}");

// In `triggerLMS`:
content = content.replace("return { success: true, tour };\n}", "saveState();\n    return { success: true, tour };\n}");

// In `submitPlay`:
content = content.replace("return { success: true, ...res };\n}", "saveState();\n    return { success: true, ...res };\n}");

// In `deleteTour`:
content = content.replace("tours.delete(tourId);\n}", "tours.delete(tourId);\n    saveState();\n}");

fs.writeFileSync('tourManager.js', content);
console.log('tourManager.js patched');
