import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing Delete Role & Permission Functionality in ACL Matrix...');

  // 1. Admin Login
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
    redirect: 'manual'
  });
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Admin login must succeed');

  // 2. Create custom role
  const createRoleRes = await fetch(`${BASE_URL}/admin/roles/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie
    },
    body: new URLSearchParams({
      role_name: 'qa_tester',
      display_name: 'ผู้ทดสอบระบบ (QA)',
      description: 'Role ทดสอบสำหรับการตรวจสอบการลบ'
    }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(createRoleRes.status, 302, 'Role creation must redirect');

  // 3. Create custom permission
  const createPermRes = await fetch(`${BASE_URL}/admin/permissions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie
    },
    body: new URLSearchParams({
      permission_code: 'qa.test.export',
      description: 'สิทธิ์ทดสอบส่งออกผลการทดสอบ',
      category: 'admin'
    }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(createPermRes.status, 302, 'Permission creation must redirect');

  // 4. Fetch /admin/acl and verify UI elements
  const aclRes = await fetch(`${BASE_URL}/admin/acl`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(aclRes.status, 200);
  const aclHtml = await aclRes.text();

  // Verify custom role has delete button
  assert.ok(aclHtml.includes('qa_tester'), 'ACL must include created role qa_tester');
  assert.ok(aclHtml.includes('ผู้ทดสอบระบบ (QA)'), 'ACL must display QA role name');
  assert.ok(aclHtml.includes('action="/admin/roles/'), 'ACL must have delete role form');
  assert.ok(aclHtml.includes('🗑️ ลบ Role'), 'Must show delete role button for qa_tester');

  // Verify custom permission has delete button and badge
  assert.ok(aclHtml.includes('qa.test.export'), 'ACL must include qa.test.export');
  assert.ok(aclHtml.includes('สิทธิ์ทดสอบส่งออกผลการทดสอบ'), 'ACL must include qa perm description');
  assert.ok(aclHtml.includes('badge-custom-acl'), 'Must show custom badge');
  assert.ok(aclHtml.includes('action="/admin/permissions/'), 'ACL must have delete permission form');
  assert.ok(aclHtml.includes('btn-delete-acl'), 'Must use btn-delete-acl class');
  console.log('✔ Custom role and permission render with delete buttons and badges correctly');

  // Extract ID for qa.test.export permission
  const permMatch = aclHtml.match(/\/admin\/permissions\/(\d+)\/delete/);
  assert.ok(permMatch, 'Must find delete permission URL with ID');
  const permId = permMatch[1];

  // Extract ID for qa_tester role
  const roleMatch = aclHtml.match(/\/admin\/roles\/(\d+)\/delete/);
  assert.ok(roleMatch, 'Must find delete role URL with ID');
  const roleId = roleMatch[1];

  // 5. Delete the custom permission
  const delPermRes = await fetch(`${BASE_URL}/admin/permissions/${permId}/delete`, {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.strictEqual(delPermRes.status, 302, 'Delete permission must redirect');
  console.log(`✔ Custom permission ID ${permId} deleted successfully`);

  // 6. Delete the custom role
  const delRoleRes = await fetch(`${BASE_URL}/admin/roles/${roleId}/delete`, {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.strictEqual(delRoleRes.status, 302, 'Delete role must redirect');
  console.log(`✔ Custom role ID ${roleId} deleted successfully`);

  // 7. Verify /admin/acl no longer contains deleted items
  const aclAfterRes = await fetch(`${BASE_URL}/admin/acl`, {
    headers: { Cookie: cookie }
  });
  const aclAfterHtml = await aclAfterRes.text();
  assert.ok(!aclAfterHtml.includes('qa.test.export'), 'Deleted permission must not exist in table');
  assert.ok(!aclAfterHtml.includes('qa_tester'), 'Deleted role must not exist in table');
  console.log('✔ Deleted role and permission are completely gone from ACL matrix');

  console.log('\n🎉 ALL DELETE ROLE & PERMISSION TESTS PASSED 100%!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
