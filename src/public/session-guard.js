/**
 * RoomReserve Client-Side Session & Inactivity Guard + Live ACL Sync
 * ตรวจจับความเงียบ (Inactivity), ตรวจสอบ Heartbeat เซสชัน และดักจับการเปลี่ยนแปลงสิทธิ์ ACL สด
 */
(function() {
  // เวลา Inactivity Timeout (30 นาที สอดคล้องกับ Server Session)
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
  const HEARTBEAT_INTERVAL_MS = 60 * 1000; // ตรวจสอบเซสชันทุก 60 วินาที

  let lastActivityTime = Date.now();
  let isRedirecting = false;

  function redirectToLogin(reason = 'expired') {
    if (isRedirecting) return;
    isRedirecting = true;
    console.warn('[SessionGuard] กำลังนำทางกลับไปยังหน้า Login...');
    window.location.href = '/login';
  }

  // รีเซ็ตเวลากิจกรรมล่าสุดเมื่อผู้ใช้ขยับเมาส์หรือกดปุ่ม
  function resetActivity() {
    lastActivityTime = Date.now();
  }

  const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetActivity, { passive: true });
  });

  // 1. ตรวจจับการไม่มีการเคลื่อนไหวของผู้ใช้ (Client-side Inactivity Timer)
  setInterval(() => {
    const idleTime = Date.now() - lastActivityTime;
    if (idleTime >= INACTIVITY_TIMEOUT_MS) {
      redirectToLogin('expired');
    }
  }, 10000);

  // 2. Heartbeat ตรวจสอบความถูกต้องของเซสชันบนเซิร์ฟเวอร์
  async function checkSessionHealth() {
    if (isRedirecting) return;
    try {
      const res = await fetch('/api/session-status?_nocache=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (res.status === 401) {
        redirectToLogin('expired');
      }
    } catch (e) {
      // เซิร์ฟเวอร์อาจกำลังรีสตาร์ตชั่วคราว ให้รอรอบถัดไป
    }
  }

  setInterval(checkSessionHealth, HEARTBEAT_INTERVAL_MS);

  // 3. Global Fetch Interceptor ดักจับ 401 ของทุกคำขอในหน้าเว็บ
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response && response.status === 401 && !isRedirecting) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      // ยกเว้นหน้า login ไม่ต้อง redirect ซ้ำ
      if (!url.includes('/login')) {
        redirectToLogin('expired');
      }
    }
    return response;
  };

  // 4. Live ACL Synchronization Watcher (ตรวจสอบตาราง ACL เปลี่ยนแปลง)
  let currentAclVersion = null;
  async function checkAclSync() {
    try {
      const res = await fetch('/api/acl-version?_nocache=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (currentAclVersion === null) {
          currentAclVersion = data.version;
        } else if (data.version !== currentAclVersion) {
          currentAclVersion = data.version;
          console.log('[ACL-Sync] สิทธิ์ของระบบถูกเปลี่ยนแปลงโดยผู้ดูแลระบบ กำลังรีเฟรชหน้าจอ...');
          window.location.reload();
        }
      }
    } catch (e) {}
  }

  setInterval(checkAclSync, 5000);
  window.addEventListener('focus', checkAclSync);
})();
