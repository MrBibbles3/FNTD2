const fs = require("fs");
const readline = require("readline");

const dataPath = "./data/units.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

// find highest ID for rarity inside text
function getMaxId(text, sectionName, rarity) {
  const sectionRegex = new RegExp(`"${sectionName}"\\s*:\\s*{[\\s\\S]*?"units"\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = text.match(sectionRegex);

  if (!match) return 0;

  const unitsBlock = match[1];

  const idMatches = [...unitsBlock.matchAll(
    new RegExp(`{[^}]*"rarity"\\s*:\\s*"${rarity}"[^}]*"id"\\s*:\\s*"(\\d+)"|{[^}]*"id"\\s*:\\s*"(\\d+)"[^}]*"rarity"\\s*:\\s*"${rarity}"`, "g")
  )];

  const ids = idMatches.map(m => Number(m[1] || m[2]));
  return ids.length ? Math.max(...ids) : 0;
}

async function run() {
  while (true) {
    console.log("\n--- Add Units ---");

    let text = fs.readFileSync(dataPath, "utf-8");

    const seasonInput = await ask("Page: ");
    const rarity = (await ask("Rarity: ")).toLowerCase();
    const amount = parseInt(await ask("Amount: "));

    // 🔥 find correct season name (case insensitive)
    const seasonMatch = [...text.matchAll(/"([^"]+)"\s*:\s*{\s*"units"/g)]
      .map(m => m[1])
      .find(name => name.toLowerCase() === seasonInput.toLowerCase());

    if (!seasonMatch) {
      console.log("❌ Page not found!");
      continue;
    }

    const maxId = getMaxId(text, seasonMatch, rarity);
    let currentId = maxId;

    // 🔥 build new lines
    let insertText = "";

    for (let i = 0; i < amount; i++) {
      currentId++;
      insertText += `      { "id": "${currentId}", "rarity": "${rarity}" },\n`;
    }

    // 🔥 insert before closing ]
    const sectionRegex = new RegExp(`("${seasonMatch}"\\s*:\\s*{[\\s\\S]*?"units"\\s*:\\s*\\[)([\\s\\S]*?)(\\])`);

    text = text.replace(sectionRegex, (match, start, middle, end) => {
      return start + middle + insertText + end;
    });

    fs.writeFileSync(dataPath, text);

    console.log(`\n✅ Added ${amount} units to ${seasonMatch}`);
  }
}

run();