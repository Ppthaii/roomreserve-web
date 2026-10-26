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

// ====================================================================
// ระบบกรองหมวดหมู่สิทธิ์และการค้นหาแบบ Real-time (Category & Search Filter)
// ====================================================================
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

function applyAclFilters() {
  const permRows = document.querySelectorAll('.acl-perm-row');
  const catHeaders = document.querySelectorAll('.acl-category-header-row');
  const emptyRow = document.getElementById('aclEmptyRow');
  const catVisibleCounts = {};

  let totalVisible = 0;

  permRows.forEach(row => {
    const rowCategory = row.getAttribute('data-category') || 'general';
    const code = (row.getAttribute('data-code') || '').toLowerCase();
    const desc = (row.getAttribute('data-desc') || '').toLowerCase();

    const matchesCategory = (currentCategoryFilter === 'all' || rowCategory === currentCategoryFilter);
    const matchesSearch = !currentSearchQuery || code.includes(currentSearchQuery) || desc.includes(currentSearchQuery);

    if (matchesCategory && matchesSearch) {
      row.style.display = '';
      totalVisible++;
      catVisibleCounts[rowCategory] = (catVisibleCounts[rowCategory] || 0) + 1;
    } else {
      row.style.display = 'none';
    }
  });

  // ซ่อน/แสดง Category Header Rows ตามจำนวนแถวที่มองเห็นในหมวดหมู่นั้น
  catHeaders.forEach(header => {
    const cat = header.getAttribute('data-category');
    if (catVisibleCounts[cat] && catVisibleCounts[cat] > 0) {
      header.style.display = '';
    } else {
      header.style.display = 'none';
    }
  });

  // แสดงแจ้งเตือนกรณีไม่พบข้อมูล
  if (emptyRow) {
    emptyRow.style.display = (totalVisible === 0) ? '' : 'none';
  }
}

// ผูก Event ปุ่มเลือกหมวดหมู่
document.querySelectorAll('.cat-filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentCategoryFilter = this.getAttribute('data-filter') || 'all';
    applyAclFilters();
  });
});

// ผูก Event ค้นหาข้อความ
const searchInput = document.getElementById('aclSearchInput');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    currentSearchQuery = this.value.trim().toLowerCase();
    applyAclFilters();
  });
}

