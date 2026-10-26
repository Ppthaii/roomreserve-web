/**
 * RoomReserve Anti-Tamper & Console Security Guard
 * ป้องกันการเปิด Developer Tools / Inspect Element, บล็อกคีย์ลัด F12/Ctrl+Shift+I/Ctrl+U 
 * แสดงข้อความเตือนใน Console (อนุญาตให้คลิกขวาใช้งานได้ตามปกติ)
 */
(function() {
  'use strict';

  // 1. ข้อความเตือนความปลอดภัยใน Console (Security Banner)
  function showSecurityBanner() {
    if (typeof console !== 'undefined' && console.clear) {
      try {
        console.clear();
        console.log(
          "%c⛔ หยุด! (STOP!)\n%cหน้านี้เป็นฟังก์ชันเบราว์เซอร์สำหรับนักพัฒนาเท่านั้น (Developer Tools)\n%cไม่อนุญาตให้เข้าถึง หรือคัดลอก/วางโค้ดใดๆ ที่นี่โดยเด็ดขาด\n%cระบบรักษาความปลอดภัยและป้องกันการดัดแปลง (Anti-Tamper Guard) กำลังทำงาน",
          "color: #ef4444; font-size: 32px; font-weight: 900; -webkit-text-stroke: 1px black; padding: 4px 0;",
          "color: #f59e0b; font-size: 15px; font-weight: bold; margin-top: 4px;",
          "color: #ffffff; background: #dc2626; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: bold; margin-top: 6px;",
          "color: #94a3b8; font-size: 12px; font-style: italic; margin-top: 6px;"
        );
      } catch (err) {}
    }
  }

  // แสดงผลเตือนทันทีเมื่อสคริปต์โหลด
  showSecurityBanner();

  // ล้าง Console และแสดงเตือนซ้ำเป็นระยะ ป้องกันการดู Log หรือแทรกแซงโค้ด
  setInterval(showSecurityBanner, 2000);

  // 2. ปิดการพิมพ์ console.log, console.info, console.debug ทั่วไปในฝั่งผู้ใช้
  if (typeof window !== 'undefined' && window.console) {
    const noop = function() {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
  }

  // 3. บล็อกคีย์ลัดสำหรับเปิด Inspect / Developer Tools และ View Source (อนุญาตให้คลิกขวาใช้งานได้ตามปกติ)
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
