/**
 * RoomReserve Anti-Tamper & Console Security Guard
 * ป้องกันการเปิด Developer Tools / Inspect Element ทางคีย์ลัด (F12, Ctrl+Shift+I, Ctrl+U)
 * ปิดการทำงานของ Console และแสดงคำเตือนความปลอดภัยในแท็บ Console
 * อนุญาตให้คลิกขวา (Right Click) ใช้งานได้ตามปกติ 100% โดยไม่บล็อกหน้าจอผู้ใช้
 */
(function() {
  'use strict';

  // 1. ข้อความเตือนความปลอดภัยใน Console (Security Banner)
  function showSecurityBanner() {
    if (typeof console !== 'undefined' && console.clear) {
      try {
        console.clear();
        console.log(
          "%c⛔ หยุด! (STOP!) ไม่อนุญาตให้เข้าถึง (ACCESS RESTRICTED)\n%cระบบรักษาความปลอดภัยและป้องกันการดัดแปลง (Anti-Tamper Guard) กำลังทำงาน\n%cไม่อนุญาตให้ตรวจสอบ หรือคัดลอก Source Code ใดๆ ทั้งสิ้น",
          "color: #ef4444; font-size: 26px; font-weight: 900; padding: 4px 0;",
          "color: #f59e0b; font-size: 14px; font-weight: bold; margin-top: 4px;",
          "color: #ffffff; background: #dc2626; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 6px;"
        );
      } catch (err) {}
    }
  }

  // แสดงผลเตือนทันทีเมื่อสคริปต์โหลด
  showSecurityBanner();

  // ล้าง Console เป็นระยะเพื่อป้องกันการแอบดู Log หรือแทรกแซงโค้ด
  setInterval(showSecurityBanner, 2500);

  // 2. ปิดการพิมพ์ console.log, console.info, console.warn, console.debug, console.table ในฝั่งเบราว์เซอร์
  if (typeof window !== 'undefined' && window.console) {
    const noop = function() {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.warn = noop;
    window.console.debug = noop;
    window.console.table = noop;
  }

  // 3. บล็อกคีย์ลัดสำหรับเปิด Inspect / Developer Tools และ View Source (อนุญาตให้คลิกขวาใช้งานได้ตามปกติ 100%)
  document.addEventListener('keydown', function(e) {
    // F12 (Developer Tools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityBanner();
      return false;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
    if (isCtrlOrCmd && e.shiftKey) {
      const keyUpper = (e.key || '').toUpperCase();
      if (keyUpper === 'I' || keyUpper === 'J' || keyUpper === 'C' || 
          e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityBanner();
        return false;
      }
    }

    // Ctrl+U (View Page Source)
    if (isCtrlOrCmd && ((e.key || '').toUpperCase() === 'U' || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S (Save Webpage)
    if (isCtrlOrCmd && ((e.key || '').toUpperCase() === 'S' || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

})();

