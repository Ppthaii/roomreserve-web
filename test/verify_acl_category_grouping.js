import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:3000';

console.log('Testing Dynamic ACL Matrix category grouping...');

// 1. Verify template files contain category grouping logic
const aclEjs = fs.readFileSync(path.join(__dirname, '../src/views/admin/acl.ejs'), 'utf8');
const adminControllerJs = fs.readFileSync(path.join(__dirname, '../src/controllers/adminController.js'), 'utf8');
const aclCss = fs.readFileSync(path.join(__dirname, '../src/public/acl.css'), 'utf8');
const aclJs = fs.readFileSync(path.join(__dirname, '../src/public/acl.js'), 'utf8');

// Assertions on adminController.js
assert.ok(adminControllerJs.includes('CATEGORY_DEFINITIONS'), 'Controller must define CATEGORY_DEFINITIONS');
assert.ok(adminControllerJs.includes('groupedPermissions'), 'Controller must pass groupedPermissions');
assert.ok(adminControllerJs.includes('categoryKey: catKey'), 'Controller must group by categoryKey');

// Assertions on acl.ejs
assert.ok(aclEjs.includes('category-filter-toolbar'), 'EJS must render category-filter-toolbar');
assert.ok(aclEjs.includes('cat-filter-btn'), 'EJS must render cat-filter-btn');
assert.ok(aclEjs.includes('acl-category-header-row'), 'EJS must render category header rows');
assert.ok(aclEjs.includes('acl-category-title'), 'EJS must render category title');
assert.ok(aclEjs.includes('acl-category-count-badge'), 'EJS must render category count badge');
assert.ok(aclEjs.includes('cat-pill'), 'EJS must render cat-pill on permission rows');
assert.ok(aclEjs.includes('aclSearchInput'), 'EJS must include search input');

// Assertions on acl.css
assert.ok(aclCss.includes('.category-filter-toolbar'), 'CSS must style category filter toolbar');
assert.ok(aclCss.includes('.acl-category-header-row td'), 'CSS must style category header rows');
assert.ok(aclCss.includes('.cat-badge-admin'), 'CSS must style admin category badge');
assert.ok(aclCss.includes('.cat-badge-booking'), 'CSS must style booking category badge');

// Assertions on acl.js
assert.ok(aclJs.includes('applyAclFilters'), 'JS must implement applyAclFilters');
assert.ok(aclJs.includes('currentCategoryFilter'), 'JS must track currentCategoryFilter');
assert.ok(aclJs.includes('aclSearchInput'), 'JS must listen to search input');

console.log('✔ Static template and asset checks passed!');

// 2. Fetch /admin/acl as Admin
async function testHttpRender() {
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
    redirect: 'manual'
  });
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Admin login must set cookie');

  const aclRes = await fetch(`${BASE_URL}/admin/acl`, {
    headers: { cookie }
  });
  assert.strictEqual(aclRes.status, 200, 'Must return 200 for /admin/acl');
  const html = await aclRes.text();

  // Verify categories rendered in table
  assert.ok(html.includes('การจัดการระบบและความปลอดภัย'), 'Must show admin category title');
  assert.ok(html.includes('การจัดการห้องประชุมและทรัพยากร'), 'Must show room category title');
  assert.ok(html.includes('การจองห้องและการอนุมัติ'), 'Must show booking category title');
  assert.ok(html.includes('การดูแลสถานที่และปฏิบัติการ'), 'Must show facility category title');
  assert.ok(html.includes('เอกสารและไฟล์แนบ'), 'Must show file category title');

  // Verify header rows and counts
  assert.ok(html.includes('acl-category-header-row'), 'Must have acl-category-header-row in rendered HTML');
  assert.ok(html.includes('acl-category-count-badge'), 'Must have count badges');

  // Verify category filter buttons
  assert.ok(html.includes('data-filter="admin"'), 'Must have filter button for admin');
  assert.ok(html.includes('data-filter="booking"'), 'Must have filter button for booking');
  assert.ok(html.includes('data-filter="all"'), 'Must have filter button for all');

  // Verify checkboxes still intact
  assert.ok(html.includes('acl-checkbox'), 'Must have acl-checkbox');
  assert.ok(html.includes('data-perm-code="booking.create"'), 'Must have booking.create checkbox');

  console.log('✔ Live HTTP render tests passed: All categories grouped and rendered beautifully!');
  console.log('\n======================================================');
  console.log('🎉 ALL ACL CATEGORY GROUPING TESTS PASSED!');
  console.log('======================================================');
}

testHttpRender().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
