import assert from 'node:assert';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing User Creation & Deletion (User CRUD)...');

  // 1. Admin login
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
    redirect: 'manual'
  });
  const adminCookie = loginRes.headers.get('set-cookie');
  assert.ok(adminCookie, 'Admin login must succeed');

  // 2. Fetch /admin/users and verify UI elements
  const usersPageRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: adminCookie }
  });
  assert.strictEqual(usersPageRes.status, 200);
  const usersHtml = await usersPageRes.text();
  assert.ok(usersHtml.includes('modal-add-user'), 'Page must contain modal-add-user form');
  assert.ok(usersHtml.includes('+ เพิ่มผู้ใช้งานใหม่'), 'Page must contain add user button');
  console.log('✔ /admin/users has create user UI elements');

  // 3. Create new user
  const newUsername = 'tester_' + Date.now();
  const newPassword = 'mypassword123';
  const createRes = await fetch(`${BASE_URL}/admin/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: adminCookie
    },
    body: new URLSearchParams({
      username: newUsername,
      password: newPassword,
      full_name: 'นายทดสอบ บัญชีใหม่',
      department: 'ฝ่ายนวัตกรรม',
      role_id: '1' // Requester
    }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(createRes.status, 302, 'Create user must redirect');
  console.log(`✔ User ${newUsername} created successfully`);

  // 4. Test login with newly created user credentials
  const newLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: newUsername, password: newPassword }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(newLoginRes.status, 302, 'New user login must redirect');
  assert.strictEqual(newLoginRes.headers.get('location'), '/app', 'New user must redirect to /app');
  const userCookie = newLoginRes.headers.get('set-cookie');
  assert.ok(userCookie, 'New user must receive session cookie');
  console.log(`✔ Newly created user ${newUsername} logged in successfully!`);

  // 5. Verify /admin/users shows the new user with delete button
  const updatedUsersRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: adminCookie }
  });
  const updatedUsersHtml = await updatedUsersRes.text();
  assert.ok(updatedUsersHtml.includes(newUsername), 'Users page must list new user');
  
  // Extract user ID for deletion
  const delRegex = new RegExp(`/admin/users/(\\d+)/delete[^>]*>[^<]*<button[^>]*>[^<]*🗑️ ลบ`, 'i');
  const match = updatedUsersHtml.match(delRegex);
  assert.ok(match, 'Must find delete button for users');

  // Search specifically for this user's delete form
  const userRowRegex = new RegExp(`<strong>${newUsername}</strong>[\\s\\S]*?/admin/users/(\\d+)/delete`, 'i');
  const userMatch = updatedUsersHtml.match(userRowRegex);
  assert.ok(userMatch, `Must find delete form specifically for ${newUsername}`);
  const newUserId = userMatch[1];

  // 6. Delete the new user
  const delRes = await fetch(`${BASE_URL}/admin/users/${newUserId}/delete`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.strictEqual(delRes.status, 302, 'Delete user must redirect');
  console.log(`✔ User ID ${newUserId} (${newUsername}) deleted successfully`);

  // 7. Verify deleted user cannot login anymore
  const delLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: newUsername, password: newPassword }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(delLoginRes.status, 302);
  assert.ok(delLoginRes.headers.get('location').includes('error='), 'Deleted user login must fail');
  console.log(`✔ Deleted user is completely prevented from logging in`);

  // 8. Test deleting own account is prevented
  const selfDelRes = await fetch(`${BASE_URL}/admin/users/1/delete`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    redirect: 'manual'
  });
  assert.strictEqual(selfDelRes.status, 302);
  assert.ok(selfDelRes.headers.get('location').includes('error='), 'Deleting self must redirect with error');
  console.log('✔ Self-deletion security guard verified');

  console.log('\n🎉 ALL USER CRUD & SECURITY TESTS PASSED 100%!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
