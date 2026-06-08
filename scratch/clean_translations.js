const fs = require('fs');

let bot = fs.readFileSync('bot.js', 'utf8');

const replacements = {
  '"🥱 Abey saale! Bat pakadna sikh le pehle. (Hindi Sledge)",': '"🥱 Abey saale! Bat pakadna sikh le pehle.",',
  '"😤 Andha hai kya? (Are you blind?) Clearly missed that!",': '"😤 Andha hai kya? Clearly missed that!",',
  '"🌟 Ek gaya! (One done!) Keep them coming.",': '"🌟 Ek gaya! Keep them coming.",',
  '"💪 Tagda running! (Strong running!) Double taken.",': '"💪 Tagda running! Double taken.",',
  '"💥 Gajab running, bhai! (Amazing running, brother!)",': '"💥 Gajab running, bhai!",',
  '"🚀 \'Like a tracer bullet!\' - Ravi Shastri mode.",': '"🚀 \'Like a tracer bullet!\'",',
  '"🥵 Maza aa gaya! (I loved it!) What a boundary!",': '"🥵 Maza aa gaya! What a boundary!",',
  '"🦁 Sher hai tu! (You\'re a lion!) Magnificent 50.",': '"🦁 Sher hai tu! Magnificent 50.",',
  '"👑 Badshah of the stadium! (King of the stadium!) 100!",': '"👑 Badshah of the stadium! 100!",',
  '"💩 Bhai, tujhse na ho payega. (Brother, you can\'t do it.) OUT!",': '"💩 Bhai, tujhse na ho payega. OUT!",'
};

let count = 0;
for (const [target, replacement] of Object.entries(replacements)) {
  if (bot.includes(target)) {
    bot = bot.replace(target, replacement);
    count++;
  }
}

if (count > 0) {
  fs.writeFileSync('bot.js', bot);
  console.log(`Cleaned up ${count} commentary strings successfully.`);
} else {
  console.log('No matching strings found to clean.');
}
