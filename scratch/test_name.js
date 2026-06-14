const name = "𝗣𝗥𝗔𝗧𝗘𝗘𝗞𓆪ꪾ°‌⋆";
for (let i = 0; i < name.length; i++) {
  console.log(`Char ${i}: ${name[i]} -> U+${name.codePointAt(i).toString(16)}`);
}
