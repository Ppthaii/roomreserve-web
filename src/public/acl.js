// acl.js - สคริปต์จัดการสิทธิ์ ACL (Toggle Checkbox, Modals, Live Toast)

// ดักจับ Event เมื่อมีการคลิก Checkbox ทุกตัวในตาราง
document.querySelectorAll('.acl-checkbox').forEach(box => {
  box.addEventListener('change', async function() {
    const roleId = this.getAttribute('data-role-id');
    const permissionId = this.getAttribute('data-permission-id');
    const permCode = this.getAttribute('data-perm-code');
    const roleName = this.getAttribute('data-role-name');
    const granted = this.checked;

    // Effect ขณะกำลังบันทึก
    this.style.opacity = '0.5';

    try {
      const res = await fetch('/admin/acl/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          role_id: roleId,
          permission_id: permissionId,
          granted: granted
        })
      });

      const data = await res.json();
      this.style.opacity = '1';

      if (res.ok) {
        const actionText = granted ? 'เปิดสิทธิ์' : 'เพิกถอนสิทธิ์';
        showToast(`${actionText} "${permCode}" ให้ ${roleName} สำเร็จทันที!`);
      } else {
        // หาก Server ปฏิเสธ (เช่น ล็อกสิทธิ์ Admin) ให้คืนค่าเดิม
        this.checked = !granted;
        showToast(`${data.error || 'เกิดข้อผิดพลาด'}`, true);
      }
    } catch (err) {
      this.style.opacity = '1';
      this.checked = !granted;
      showToast(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้`, true);
    }
  });
});

function toggleModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
  }
}

function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
