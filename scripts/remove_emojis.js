const fs = require('fs');
const path = require('path');

// Target files to remove emojis
const targetFiles = [
  'src/views/admin/acl.ejs',
  'src/views/admin/users.ejs',
  'src/views/error.ejs',
  'src/views/partials/dashboard/approvals.ejs',
  'src/views/partials/dashboard/facility_tasks.ejs',
  'src/views/partials/dashboard/maintenance.ejs',
  'src/views/partials/navbar.ejs',
  'src/views/rooms.ejs',
  'src/public/console-guard.js',
  'src/public/dashboard.js',
  'src/public/slides.html',
  'docs/presentation.html'
];

// Emoji regex covering Unicode emoji ranges and variation selectors
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{FE0E}]/gu;

for (const relPath of targetFiles) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Specific text cleanups for smoother sentence flow
  content = content
    // Specific icon spans
    .replace(/<span class="cat-filter-icon">🔘<\/span>/g, '')
    .replace(/<span class="acl-search-icon">🔍<\/span>/g, '')
    .replace(/<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍<\/div>/g, '')
    .replace(/<div style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.6;">✨<\/div>/g, '')
    .replace(/<div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.7;">✅<\/div>/g, '')
    .replace(/<div style="font-size: 3.5rem; margin-bottom: -0.5rem;">🏛️<\/div>/g, '')
    .replace(/<div class="card-icon">[^<]+<\/div>/g, '')
    // Replace all remaining emojis
    .replace(emojiRegex, '')
    // Clean up double spaces created by emoji removal
    .replace(/  +/g, ' ');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Cleaned emojis from: ${relPath}`);
}

console.log('\nEmoji removal completed.');
