const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'packages/app-user/src'));

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Match bg-black (but not bg-black/50 or bg-black-...) that doesn't have text-white
  // A simple way is to replace all occurrences of `bg-black` with `bg-black text-white`.
  // First, we find classNames containing bg-black.
  let original = content;
  
  // Replace `bg-black` which is surrounded by quotes, spaces or backticks,
  // and NOT followed by `/` or `-`
  // But wait, if it already has `text-white` in the same string, we might duplicate it.
  // Let's do a simple replace: `bg-black` -> `bg-black text-white`,
  // then `text-white text-white` -> `text-white`
  
  // Regex to match className="..." or className={`...`} containing bg-black
  // It's safer to just replace `bg-black` that is bounded by word boundaries or space,
  // not followed by `/`.
  
  content = content.replace(/(?<!-)\bbg-black\b(?!\/|-)/g, 'bg-black text-white');
  
  // Now fix any duplicates of text-white in the same line or nearby
  content = content.replace(/text-white(\s+text-white)+/g, 'text-white');
  
  // Some places might have `text-white` before `bg-black`, creating `text-white bg-black text-white`.
  // Let's clean that up per line:
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('text-white')) {
      // replace multiple text-white with single text-white
      let parts = lines[i].split('text-white');
      if (parts.length > 2) {
         // there are duplicates on this line
         // We can reconstruct it: just remove all but the first text-white.
         // Actually, string replace all 'text-white' with empty, then add one at the end of className.
         // Simpler: Just regex replace all occurrences after the first one.
         // But the simplest fix is to leave duplicates, CSS doesn't care if a class is repeated!
         // class="bg-black text-white text-white" is perfectly valid CSS.
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
  }
});

console.log(`Updated ${count} files.`);
