/**
 * RoomReserve Anti-Tamper & Console Security Guard
 * ตรวจจับและป้องกันการเปิด Developer Tools / Inspect Element
 * ดักจับด้วย Debugger Trap + แสดงหน้าต่างป้องกันความปลอดภัย (Security Shield) เมื่อเปิด DevTools
 * อนุญาตให้คลิกขวา (Right Click) ใช้งานได้ตามปกติ 100%
 */
(function() {
  'use strict';

  let isDevToolsDetected = false;
  let overlayElem = null;

  // 1. สร้างหน้าต่างป้องกันความปลอดภัย (DevTools Shield Overlay)
  function createSecurityOverlay() {
    if (document.getElementById('devtools-security-shield')) return;

    overlayElem = document.createElement('div');
    overlayElem.id = 'devtools-security-shield';
    overlayElem.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #0b1120 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      color: #ffffff !important;
      font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      text-align: center !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      backdrop-filter: blur(12px) !important;
    `;

    overlayElem.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; border-radius: 20px; padding: 2.5rem 2rem; max-width: 480px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
        <div style="font-size: 3.5rem; margin-bottom: 1rem; line-height: 1;">🛡️</div>
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #f87171; margin: 0 0 0.75rem 0;">
          ไม่อนุญาตให้เปิด Developer Tools
        </h2>
        <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #fca5a5; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 1.25rem; border: 1px solid rgba(239, 68, 68, 0.3);">
          Anti-Tamper & Security Inspection Guard
        </div>
        <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin: 0 0 1.5rem 0;">
          ระบบตรวจพบการเปิดเครื่องมือผู้พัฒนา (Inspect Element / Console / Sources)<br>
          เพื่อความปลอดภัยของระบบ กรุณา<strong>ปิดหน้าต่าง Developer Tools</strong> เพื่อกลับเข้าใช้งานตามปกติ
        </p>
        <div style="font-size: 0.8rem; color: #64748b;">
          RoomReserve Smart Meeting Space Security System
        </div>
      </div>
    `;

    if (document.body) {
      document.body.appendChild(overlayElem);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(overlayElem);
      });
    }
  }

  function removeSecurityOverlay() {
    const el = document.getElementById('devtools-security-shield');
    if (el) el.remove();
  }

  // 2. ข้อความเตือนความปลอดภัยใน Console (Security Banner)
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

  // 3. ปิดการพิมพ์ console.log, console.info, console.debug ทั่วไปในฝั่งผู้ใช้
  if (typeof window !== 'undefined' && window.console) {
    const noop = function() {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
  }

  // 4. Debugger Trap (Anti-Debugging / Anti-Sources Inspection)
  // เมื่อเปิด DevTools เบราว์เซอร์จะติด trap ที่ debugger ทันที ป้องกันการดู Sources
  function triggerDebuggerTrap() {
    try {
      (function() {
        return false;
      })
      ['constructor']('debugger')
      ['call']();
    } catch (e) {}
  }

  // 5. ตรวจจับการเปิด Developer Tools (Threshold & Timing Detection)
  const threshold = 160;
  function checkDevTools() {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    
    // ตรวจสอบทั้งกรณี Dock ด้านข้าง หรือ Dock ด้านล่าง
    if (widthDiff || heightDiff) {
      if (!isDevToolsDetected) {
        isDevToolsDetected = true;
        createSecurityOverlay();
        showSecurityBanner();
      }
      triggerDebuggerTrap();
    } else {
      if (isDevToolsDetected) {
        isDevToolsDetected = false;
        removeSecurityOverlay();
      }
    }
  }

  // ตรวจสอบเป็นระยะ
  setInterval(checkDevTools, 300);
  window.addEventListener('resize', checkDevTools);

  // ตรวจจับเพิ่มเติมผ่าน Console Getter (สำหรับกรณี Undock ออกเป็นหน้าต่างแยก)
  const checker = document.createElement('div');
  Object.defineProperty(checker, 'id', {
    get: function() {
      if (!isDevToolsDetected) {
        isDevToolsDetected = true;
        createSecurityOverlay();
        showSecurityBanner();
      }
      triggerDebuggerTrap();
      return 'devtools-active';
    }
  });

  setInterval(function() {
    if (typeof console !== 'undefined' && console.dir) {
      try {
        console.dir(checker);
        console.clear();
      } catch (e) {}
    }
  }, 1000);

  // 6. บล็อกคีย์ลัดสำหรับเปิด Inspect / Developer Tools และ View Source (อนุญาตให้คลิกขวาใช้งานได้ตามปกติ)
  document.addEventListener('keydown', function(e) {
    // F12 (Developer Tools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      createSecurityOverlay();
      showSecurityBanner();
      triggerDebuggerTrap();
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
        createSecurityOverlay();
        showSecurityBanner();
        triggerDebuggerTrap();
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
