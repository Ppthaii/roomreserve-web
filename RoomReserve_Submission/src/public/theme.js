(function() {
  const saved = localStorage.getItem('roomreserve_theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('roomreserve_theme', next);
  updateThemeButtons();
}

function updateThemeButtons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.innerHTML = isDark ? 'โหมดสว่าง' : 'โหมดมืด';
    btn.setAttribute('title', isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด');
  });
}

document.addEventListener('DOMContentLoaded', updateThemeButtons);

(function() {
  let initialBoot = null;
  let isChecking = false;

  async function checkLiveReload() {
    if (isChecking) return;
    isChecking = true;
    try {
      const res = await fetch('/__dev_ping?_nocache=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (initialBoot === null) {
          initialBoot = data.bootTime;
        } else if (data.bootTime !== initialBoot) {
          console.log('[LiveReload] เซิร์ฟเวอร์อัปเดตแล้ว! กำลังรีเฟรชหน้าจอให้อัตโนมัติ...');
          window.location.reload();
          return;
        }
      }
    } catch (e) {

    } finally {
      isChecking = false;
    }
  }

  setInterval(checkLiveReload, 1000);
  checkLiveReload();
})();
