# 📋 MASTER IMPLEMENTATION TODO — แผนงานปรับปรุงระบบและลดขนาดไฟล์ฉบับสมบูรณ์

> **ผู้วางแผน:** Gemini 3.8 High (Polaris Architecture Reconnaissance)  
> **ผู้ลงมือแก้โค้ด:** Gemini 3.8 Low (Antigravity IDE)  
> **เป้าหมาย:** 
> 1. ปรับปรุง UI/UX และ Business Logic ครบถ้วน (รวม Navbar, Visual Room Selection, My Bookings, กฎห้ามยกเลิก Approved, ลบ Emoji, ลบคำสวัสดี, ลบวันที่จาก Hero, Alert Bar Auto-dismiss)
> 2. หั่นแยก Modular Refactor ลดขนาดไฟล์ `dashboard.ejs` จาก 2,168 บรรทัด เหลือ ~120 บรรทัด (Zero Logic Loss)
> 3. ทุก Task ระบุตำแหน่งไฟล์, บรรทัดจริง, โค้ดเดิมที่ต้องค้นหา (Target Content), และโค้ดใหม่ (Replacement Content) ไว้อย่างชัดเจน 100% เพื่อให้ Gemini 3.8 Low แก้ไขได้ทันทีโดยไม่ต้องเดา

---

## 🛑 กฎเหล็กสำหรับ Gemini 3.8 Low
1. **ทำทีละ Task ตามลำดับ 1 ถึง 15:** ห้ามข้ามขั้นตอน
2. **ห้ามทิ้ง Placeholder เด็ดขาด:** ห้ามเขียน `// ... existing code ...` หรือละทิ้งโค้ดเดิม
3. **ตรวจสอบความปลอดภัย ACL และ Form ID:** 
   - ค่า `room_id` ต้องส่งผ่าน `<input type="hidden" name="room_id" id="form_room_id" required>` เสมอ
   - เมนูที่มีเงื่อนไข (`canBook`, `canViewOwnBookings`, `isApproverRole` ฯลฯ) ต้องครอบด้วย `<% if (...) %>` เสมอ
4. **คงฟังก์ชัน JavaScript ให้เป็น Global:** ห้ามใส่ `type="module"` หรือห่อด้วย IIFE เพราะ HTML ใช้อีเวนต์ `onclick="..."` เรียกตรงๆ
5. **หลังทำเสร็จแต่ละ Task หรือแต่ละ Phase:** ให้รัน `node test/verify_permissions_views.js` และ `npm test` เพื่อตรวจสอบความถูกต้อง

---

## 📑 สรุปสารบัญแผนงาน (Master Checklist)

### 🎨 Phase 1: ปรับปรุง UI/UX และ Business Logic (Tasks 1–10)
- [x] **Task 1:** ยกบล็อกคำนวณสิทธิ์ (`perms`) ให้อยู่ก่อน Navbar ใน `dashboard.ejs`
- [x] **Task 2:** รวมศูนย์ Navbar หลัก (3 แท็บข้อความล้วน + Profile จากชื่อ + โหมดมืดขวาสุด) ใน `dashboard.ejs`
- [x] **Task 3:** ลบแถบแคปซูลลอยเดิม (`desktop-sub-nav`) ใน `dashboard.ejs`
- [x] **Task 4:** คลีน Hero Blue Header (ลบวันที่, ลบคำสวัสดี, ซ่อน Role Requester) ใน `dashboard.ejs`
- [x] **Task 5:** หน้าหลักแสดงเฉพาะการ์ด 3 ตึก (ไม่แสดงการ์ดห้องเดี่ยวๆ) ใน `dashboard.ejs`
- [x] **Task 6:** สร้าง Visual Room Selection Box เด้งใต้ตึกในหน้าจอง (ตัด Dropdown เก่า) ใน `dashboard.ejs`
- [x] **Task 7:** ปรับแท็บ My Bookings (ตัดแท็บทั้งหมด, กรองเฉพาะ Pending, เปลี่ยนชื่อเป็นเสร็จสิ้น, ปรับ Empty State, และล็อกห้ามยกเลิกเมื่อ Approved ทั้ง FE & BE)
- [x] **Task 8:** ตั้งเวลา Alert Bar Auto-Dismiss (3.5 วินาที) ใน `dashboard.ejs`
- [x] **Task 9:** กวาดล้าง Emoji ทั้งระบบ (Action Cards, ตาราง, Profile, Mobile Nav) ใน `dashboard.ejs`
- [x] **Task 10:** เสริมสไตล์ CSS สำหรับ Visual Room Cards, Navbar, และ Animations ใน `src/public/style.css`

### ✂️ Phase 2: Modular Refactor ลดขนาดไฟล์ (ยึดตาม REFACTOR_TODO.md ของ Claude 100%)
- [ ] **Task R0–R7:** ดำเนินการตามไฟล์ [REFACTOR_TODO.md](./REFACTOR_TODO.md) ของ Claude ทุกขั้นตอน (ห้ามแก้ไขไฟล์นั้น)

---

# 🎨 รายละเอียด Phase 1: ปรับปรุง UI/UX และ Business Logic

---

### Task 1: ยกบล็อกคำนวณสิทธิ์ให้อยู่ก่อน Navbar
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** ย้ายจากบรรทัด 289–300 ขึ้นไปวางที่บรรทัด 236 (ก่อน `<!-- Navbar หลัก -->`)

🔍 **โค้ดเดิมที่ต้องตัดออก (บรรทัด 289–300):**
```ejs
    <% 
      const perms = (locals.userPermissions && Array.isArray(locals.userPermissions)) ? locals.userPermissions : [];
      const canApprove = perms.includes('booking.approve');
      const canFacility = perms.includes('facility.checkin') || perms.includes('facility.checkout');
      const canBlockSchedule = perms.includes('room.block_schedule');
      const isAdminUser = user.roleName === 'admin' || perms.includes('acl.manage');
      const isApproverRole = user.roleName === 'approver' || canApprove;
      const isFacilityRole = user.roleName === 'facility' || canFacility;
      const isAdminRole = user.roleName === 'admin' || isAdminUser;
      const canBook = perms.includes('booking.create') || isAdminUser;
      const canViewOwnBookings = perms.includes('booking.read_own') || perms.includes('booking.read_all') || isAdminUser;
    %>
```

✨ **ตำแหน่งใหม่ที่นำไปวาง (เหนือ `<!-- Navbar หลัก -->` บรรทัด ~235):**
```ejs
  <% 
    const perms = (locals.userPermissions && Array.isArray(locals.userPermissions)) ? locals.userPermissions : [];
    const canApprove = perms.includes('booking.approve');
    const canFacility = perms.includes('facility.checkin') || perms.includes('facility.checkout');
    const canBlockSchedule = perms.includes('room.block_schedule');
    const isAdminUser = user.roleName === 'admin' || perms.includes('acl.manage');
    const isApproverRole = user.roleName === 'approver' || canApprove;
    const isFacilityRole = user.roleName === 'facility' || canFacility;
    const isAdminRole = user.roleName === 'admin' || isAdminUser;
    const canBook = perms.includes('booking.create') || isAdminUser;
    const canViewOwnBookings = perms.includes('booking.read_own') || perms.includes('booking.read_all') || isAdminUser;
  %>

  <!-- Navbar หลัก -->
```

---

### Task 2: ปรับปรุง Navbar หลักแบบรวมศูนย์
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด 237–256 (`<nav class="navbar"> ... </nav>`)

🔍 **โค้ดเดิม (บรรทัด 237–256):**
```ejs
  <nav class="navbar">
    <a href="/app" class="nav-brand">RoomReserve</a>
    <div class="nav-links">
      <a href="/app" class="active">หน้าแรกการจอง</a>
      <% if (isAdmin) { %>
        <a href="/admin/acl" style="color: #4f46e5; font-weight: 700;">ตารางสิทธิ์ (ACL)</a>
        <a href="/admin/logs" style="color: #4f46e5;">Audit Logs</a>
        <a href="/admin/users" style="color: #4f46e5;">ผู้ใช้งาน</a>
        <a href="/app/rooms" style="color: #4f46e5;">จัดการห้อง</a>
      <% } %>
      <button type="button" class="theme-toggle-btn" onclick="toggleTheme()" title="สลับโหมดมืด/สว่าง">โหมดมืด</button>
      <div class="user-badge">
        <span><%= user.username %></span>
        <span class="role-pill"><%= user.roleName %></span>
      </div>
      <form action="/logout" method="POST" style="margin: 0;">
        <button type="submit" class="btn btn-outline btn-sm">ออกจากระบบ</button>
      </form>
    </div>
  </nav>
```

✨ **โค้ดใหม่ที่ใส่แทนที่:**
```ejs
  <nav class="navbar">
    <div class="nav-left">
      <a href="/app" class="nav-brand" onclick="switchRequesterView('home'); return false;">RoomReserve</a>
    </div>

    <div class="nav-menu">
      <button type="button" class="desktop-nav-item active" data-view="home" onclick="switchRequesterView('home', this)">
        หน้าแรก
      </button>

      <% if (isApproverRole || isAdminRole) { %>
        <button type="button" class="desktop-nav-item" data-view="approvals" onclick="switchRequesterView('approvals', this)">
          รออนุมัติ
          <% if (pendingApprovals.length > 0) { %>
            <span class="desktop-nav-badge" style="background: #f59e0b;"><%= pendingApprovals.length %></span>
          <% } %>
        </button>
      <% } %>

      <% if (isFacilityRole || isAdminRole) { %>
        <button type="button" class="desktop-nav-item" data-view="facility" onclick="switchRequesterView('facility', this)">
          งานส่งมอบห้อง
          <% if (facilityTasks.length > 0) { %>
            <span class="desktop-nav-badge" style="background: #10b981;"><%= facilityTasks.length %></span>
          <% } %>
        </button>
      <% } %>

      <% if (canBlockSchedule || isAdminRole) { %>
        <button type="button" class="desktop-nav-item" data-view="facility-block" onclick="switchRequesterView('facility-block', this)">
          ปิดซ่อมบำรุง
        </button>
      <% } %>

      <% if (isAdminRole) { %>
        <button type="button" class="desktop-nav-item" data-view="timeline" onclick="switchRequesterView('timeline', this)">
          ผังช่วงเวลา
        </button>
      <% } %>

      <% if (canBook) { %>
        <button type="button" class="desktop-nav-item" data-view="booking" onclick="switchRequesterView('booking', this)">
          จองห้อง
        </button>
      <% } %>

      <% if (canViewOwnBookings) { %>
        <button type="button" class="desktop-nav-item" data-view="mybookings" onclick="switchRequesterView('mybookings', this)">
          การจองของฉัน
          <% if (myBookings.length > 0) { %>
            <span class="desktop-nav-badge"><%= myBookings.length %></span>
          <% } %>
        </button>
      <% } %>
    </div>

    <div class="nav-right">
      <div class="user-badge desktop-nav-item" data-view="profile" onclick="switchRequesterView('profile', this)" role="button" tabindex="0" title="คลิกเพื่อเปิดโปรไฟล์">
        <span><%= user.username %></span>
        <% if (user.roleName !== 'requester') { %>
          <span class="role-pill"><%= user.roleName %></span>
        <% } %>
      </div>
      <button type="button" class="theme-toggle-btn" onclick="toggleTheme()" title="สลับโหมดมืด/สว่าง">โหมดมืด</button>
    </div>
  </nav>
```

---

### Task 3: ลบแถบแคปซูลลอยเดิมออก (`desktop-sub-nav`)
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด ~310–364

🔍 **โค้ดเดิมที่ต้องลบออกทั้งหมด:**
```ejs
      <!-- แถบนำทางด้านบนสำหรับ Desktop Web (Adaptive Desktop Sub-Navigation Bar) -->
      <div class="desktop-sub-nav">
        ...
      </div>
```
*(ลบตั้งแต่คอมเมนต์ `<!-- แถบนำทางด้านบน... -->` จนถึงปิดแท็ก `</div>` ก่อนถึง `<div id="req-view-home" class="req-subview">`)*

---

### Task 4: ปรับปรุง Hero Header (ลบวันที่, ลบคำสวัสดี, ซ่อน Role Requester)
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด ~370–416 (`.hero-blue-header`)

🔍 **โค้ดเดิม (บรรทัด ~370–416):**
```ejs
          <div class="hero-blue-header">
            <div class="hero-top-row">
              <div class="hero-brand-wrap">
                <div class="hero-brand-logo">RR</div>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em;">RoomReserve</div>
                  <div style="font-size: 0.75rem; opacity: 0.85;">Smart Meeting Space</div>
                </div>
              </div>

              <!-- Date Selector & 1-Click Navigator Built right into Hero -->
              <div class="hero-date-badge">
                <span>📅</span>
                <a href="/app?date=<%= todayStr %>" style="color: #fff; text-decoration: <%= isToday ? 'underline' : 'none' %>; font-weight: <%= isToday ? '800' : '600' %>;">วันนี้</a>
                <span style="opacity: 0.4;">|</span>
                <a href="/app?date=<%= nextDateStr %>" style="color: #fff; text-decoration: none; font-weight: 600;">พรุ่งนี้</a>
                <span style="opacity: 0.4;">|</span>
                <form action="/app" method="GET" style="display: inline-flex; align-items: center; margin: 0;">
                  <input type="date" name="date" value="<%= selectedDate %>" min="<%= todayStr %>" onchange="this.form.submit()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: #fff; border-radius: 6px; padding: 2px 6px; font-size: 0.75rem; cursor: pointer; height: 26px;">
                </form>
              </div>
            </div>

            <div class="hero-user-capsule">
              <div class="hero-avatar">
                <%= user.fullName ? user.fullName.charAt(0) : 'U' %>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 0.8rem; opacity: 0.9;">
                <% if (user.roleName === 'approver') { %>
                  ยินดีต้อนรับสู่ระบบพิจารณาอนุมัติคำขอ
                <% } else if (user.roleName === 'facility') { %>
                  ฝ่ายบริหารจัดการและดูแลสถานที่
                <% } else if (user.roleName === 'admin') { %>
                  ศูนย์ควบคุมระบบและการจัดการ (Admin Console)
                <% } else { %>
                  สวัสดี, วันนี้พร้อมจองห้องไหม
                <% } %>
              </div>
                <div style="font-size: 1.15rem; font-weight: 800; line-height: 1.25;"><%= user.fullName %></div>
                <div style="font-size: 0.78rem; opacity: 0.85; margin-top: 0.2rem;">
                  <span>สังกัด: <%= user.department || 'สำนักงานใหญ่' %></span> &bull; 
                  <span class="role-pill" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.7rem; padding: 2px 7px;"><%= user.roleDisplay %></span>
                </div>
              </div>
            </div>
          </div>
```

✨ **โค้ดใหม่ที่ใส่แทนที่:**
```ejs
          <div class="hero-blue-header">
            <div class="hero-top-row">
              <div class="hero-brand-wrap">
                <div class="hero-brand-logo">RR</div>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em;">RoomReserve</div>
                  <div style="font-size: 0.75rem; opacity: 0.85;">Smart Meeting Space</div>
                </div>
              </div>
            </div>

            <div class="hero-user-capsule" style="margin-top: 1.25rem;">
              <div class="hero-avatar">
                <%= user.fullName ? user.fullName.charAt(0) : 'U' %>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 1.25rem; font-weight: 800; line-height: 1.25;"><%= user.fullName %></div>
                <div style="font-size: 0.82rem; opacity: 0.85; margin-top: 0.25rem;">
                  <span>สังกัด: <%= user.department || 'สำนักงานใหญ่' %></span>
                  <% if (user.roleName !== 'requester') { %>
                    &bull; <span class="role-pill" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.7rem; padding: 2px 7px;"><%= user.roleDisplay %></span>
                  <% } %>
                </div>
              </div>
            </div>
          </div>
```

---

### Task 5: หน้าหลักแสดงเฉพาะการ์ด 3 ตึก (ไม่แสดงการ์ดห้องเดี่ยวๆ)
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด ~565–610 ใน `#req-view-home`

🔍 **โค้ดเดิม (บรรทัด ~565–610):**
```ejs
          <div class="available-now-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 8px #10b981;"></span>
              <span style="font-size: 1.05rem; font-weight: 800; color: var(--dark);">ห้องว่างตอนนี้</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--muted);"><%= canBook ? 'แตะที่ห้องเพื่อเริ่มจองได้ทันที' : 'ตารางสถานะห้องประชุมวันนี้' %></span>
          </div>

          <div class="available-rooms-list">
            ...
          </div>
```

✨ **โค้ดใหม่ที่ใส่แทนที่:**
```ejs
          <div class="section-title-row" style="margin: 1.5rem 0 0.85rem 0;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span class="live-dot" style="background: #2563eb;"></span>
              <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--dark);">อาคารสถานที่</h3>
            </div>
            <span style="font-size: 0.78rem; color: var(--muted);">เลือกอาคารเพื่อเริ่มจองห้องประชุม</span>
          </div>

          <div class="building-cards-grid" style="margin-bottom: 2rem;">
            <div class="building-card active" onclick="startBookingFlow(null, 1)" style="cursor: pointer;">
              <div class="building-card-img-wrap">
                <img src="/images/building1.jpg" alt="ตึก 1" class="building-card-img" onerror="this.src='/images/building1.jpg'">
              </div>
              <div class="building-card-body">
                <div class="building-card-title">ตึก 1</div>
                <div class="building-card-rooms">ห้อง 101 &bull; ห้อง 102</div>
                <div style="font-size: 0.75rem; color: #2563eb; font-weight: 700; margin-top: 0.35rem;">แตะเพื่อดูห้องและจอง &rarr;</div>
              </div>
            </div>

            <div class="building-card" onclick="startBookingFlow(null, 2)" style="cursor: pointer;">
              <div class="building-card-img-wrap">
                <img src="/images/building2.jpg" alt="ตึก 2" class="building-card-img" onerror="this.src='/images/building2.jpg'">
              </div>
              <div class="building-card-body">
                <div class="building-card-title">ตึก 2</div>
                <div class="building-card-rooms">ห้อง 201 &bull; ห้อง 202</div>
                <div style="font-size: 0.75rem; color: #2563eb; font-weight: 700; margin-top: 0.35rem;">แตะเพื่อดูห้องและจอง &rarr;</div>
              </div>
            </div>

            <div class="building-card" onclick="startBookingFlow(null, 3)" style="cursor: pointer;">
              <div class="building-card-img-wrap">
                <img src="/images/building3.jpg" alt="ตึก 3" class="building-card-img" onerror="this.src='/images/building3.jpg'">
              </div>
              <div class="building-card-body">
                <div class="building-card-title">ตึก 3</div>
                <div class="building-card-rooms">ห้อง 301 &bull; ห้อง 302</div>
                <div style="font-size: 0.75rem; color: #2563eb; font-weight: 700; margin-top: 0.35rem;">แตะเพื่อดูห้องและจอง &rarr;</div>
              </div>
            </div>
          </div>
```

---

### Task 6: กล่อง Visual Room Selection ในหน้าจองห้อง (แทนที่ Dropdown เก่า)
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด ~680–715 และส่วนสคริปต์ ~2040–2075

🔍 **ขั้นตอนที่ 1 (ใส่กล่องเลือกห้องด้วยรูปใต้ตึก บรรทัด ~687):**
วางโค้ดนี้ต่อจากปิดแท็ก `</div>` ของ `.building-cards-grid`:
```html
          <div id="buildingRoomsBox" style="margin-bottom: 1.25rem;">
            <div style="font-size: 0.92rem; font-weight: 800; color: var(--dark); margin-bottom: 0.65rem;">
              เลือกห้องประชุมในอาคารนี้:
            </div>
            <div class="visual-rooms-grid" id="visualRoomsGrid">
              <% rooms.forEach(room => { 
                let bNum = '1';
                if (room.location && room.location.includes('2')) bNum = '2';
                else if (room.location && room.location.includes('3')) bNum = '3';
                else if (room.room_name && (room.room_name.includes('201') || room.room_name.includes('202'))) bNum = '2';
                else if (room.room_name && (room.room_name.includes('301') || room.room_name.includes('302'))) bNum = '3';
              %>
                <div class="visual-room-card" data-room-id="<%= room.room_id %>" data-building="<%= bNum %>" onclick="selectBookingRoom('<%= room.room_id %>')">
                  <img src="/images/building<%= bNum %>.jpg" alt="<%= room.room_name %>" class="visual-room-img" onerror="this.src='/images/building1.jpg'">
                  <div class="visual-room-info">
                    <div class="visual-room-name"><%= room.room_name %></div>
                    <div class="visual-room-sub"><%= room.location %> &bull; รองรับ <%= room.capacity %> ที่นั่ง</div>
                  </div>
                  <div class="visual-room-radio">✓</div>
                </div>
              <% }) %>
            </div>
          </div>
```

🔍 **ขั้นตอนที่ 2 (ตัด Dropdown ในฟอร์มออก ใส่ Input Hidden แทน บรรทัด ~694–712):**
ค้นหา:
```ejs
              <!-- เลือกระบุห้องในตึกนี้ -->
              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--dark); display: block; margin-bottom: 0.4rem;">
                  ห้องประชุมที่เลือก *
                </label>
                <select name="room_id" id="form_room_id" class="form-control" onchange="onBookingRoomChange()" required style="font-weight: 700; padding: 0.6rem 0.85rem;">
                  ...
                </select>
              </div>
```
แทนที่ด้วย:
```html
              <!-- รหัสห้องประชุมที่เลือก (ซิงก์จาก Visual Room Selection Box) -->
              <input type="hidden" name="room_id" id="form_room_id" required>
```

🔍 **ขั้นตอนที่ 3 (ปรับ JavaScript บรรทัด ~2040–2075):**
แทนที่ `selectBuilding` และเพิ่ม `selectBookingRoom`:
```javascript
    function selectBuilding(buildingNumber, btn = null) {
      document.querySelectorAll('.building-card').forEach(b => b.classList.remove('active'));
      if (btn) {
        btn.classList.add('active');
      } else {
        const targetBtn = document.getElementById(`btn-building-${buildingNumber}`);
        if (targetBtn) targetBtn.classList.add('active');
      }

      let firstRoomId = null;
      const cards = document.querySelectorAll('.visual-room-card');
      cards.forEach(card => {
        const isMatch = card.dataset.building === String(buildingNumber);
        card.style.display = isMatch ? 'flex' : 'none';
        if (isMatch && !firstRoomId) {
          firstRoomId = card.dataset.roomId;
        }
      });

      const currentRoomId = document.getElementById('form_room_id').value;
      const currentCard = document.querySelector(`.visual-room-card[data-room-id="${currentRoomId}"]`);
      if (currentCard && currentCard.dataset.building === String(buildingNumber)) {
        selectBookingRoom(currentRoomId);
      } else if (firstRoomId) {
        selectBookingRoom(firstRoomId);
      }
    }

    function selectBookingRoom(roomId) {
      const hiddenInput = document.getElementById('form_room_id');
      if (hiddenInput) hiddenInput.value = roomId;

      document.querySelectorAll('.visual-room-card').forEach(c => {
        if (c.dataset.roomId === String(roomId)) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });

      renderTimeRangePills();
      checkBookingConflict();
    }
```

---

### Task 7: ปรับปรุงแท็บและสิทธิ์ยกเลิกใน "การจองของฉัน" (My Bookings)
* **ไฟล์ 1:** `src/views/dashboard.ejs` (บรรทัด ~850–875, 953, 963–971, 1495–1530)
* **ไฟล์ 2:** `src/controllers/bookingController.js` (บรรทัด ~250)

🔍 **จุดที่ 1 (ตัดแท็บ "ทั้งหมด", กำลังดำเนินการเหลือ Pending, เปลี่ยนชื่อ "เสร็จสิ้น" ใน `dashboard.ejs` บรรทัด ~850–875):**
แทนที่แถบแท็บ Segmented Control ด้วย:
```ejs
                <div class="segmented-control-container" role="tablist" aria-label="กรองสถานะคำขอ">
                  <button type="button" class="segmented-item active" data-category="PENDING" onclick="filterMyBookings('PENDING', this)" title="รอหัวหน้างานอนุมัติ">
                    <span class="segmented-label">กำลังดำเนินการ</span>
                    <span class="segmented-badge <%= pendingCount > 0 ? 'badge-pending' : '' %>"><%= pendingCount %></span>
                  </button>
                  <button type="button" class="segmented-item" data-category="APPROVED" onclick="filterMyBookings('APPROVED', this)" title="อนุมัติแล้ว และพร้อมใช้งาน">
                    <span class="segmented-label">อนุมัติแล้ว</span>
                    <span class="segmented-badge <%= (approvedCount + inUseCount) > 0 ? 'badge-approved' : '' %>"><%= approvedCount + inUseCount %></span>
                  </button>
                  <button type="button" class="segmented-item" data-category="FINISHED" onclick="filterMyBookings('FINISHED', this)" title="รายการที่เสร็จสิ้น หรือยกเลิก/ปฏิเสธ">
                    <span class="segmented-label">เสร็จสิ้น</span>
                    <span class="segmented-badge"><%= finishedCount %></span>
                  </button>
                </div>
```

🔍 **จุดที่ 2 (ล็อกห้ามยกเลิกเมื่อ Approved ใน Frontend - `dashboard.ejs` บรรทัด 953):**
ค้นหา:
```ejs
<% if (['PENDING_APPROVAL', 'APPROVED'].includes(b.status)) { %>
```
แทนที่ด้วย:
```ejs
<% if (b.status === 'PENDING_APPROVAL') { %>
```

🔍 **จุดที่ 3 (ปรับปรุง Empty State ใน `dashboard.ejs` บรรทัด 963–971):**
แทนที่ด้วย:
```html
                    <tr id="myBookingsEmptyFilterRow" style="display: none;">
                      <td colspan="4" style="text-align: center; padding: 3rem 1.5rem; color: var(--muted);">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem;">
                          <div id="myBookingsEmptyTitle" style="font-weight: 700; color: var(--slate); font-size: 0.95rem;">ไม่มีรายการคำขอในหมวดหมู่นี้</div>
                          <div id="myBookingsEmptyDesc" style="font-size: 0.82rem; color: var(--muted);">คำขอที่อยู่ในสถานะนี้จะแสดงที่นี่</div>
                        </div>
                      </td>
                    </tr>
```

🔍 **จุดที่ 4 (ปรับปรุงฟังก์ชัน `filterMyBookings()` ใน `dashboard.ejs` บรรทัด 1495–1530):**
```javascript
    function filterMyBookings(category, btn) {
      document.querySelectorAll('.segmented-item, .status-filter-chip').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');

      let visibleCount = 0;
      const rows = document.querySelectorAll('.my-booking-row');
      rows.forEach(row => {
        const rowCat = row.getAttribute('data-category');
        const isFin = row.getAttribute('data-finished') === 'true';

        let show = false;
        if (category === 'PENDING') {
          show = (rowCat === 'PENDING');
        } else if (category === 'APPROVED') {
          show = (rowCat === 'APPROVED' || rowCat === 'IN_USE');
        } else if (category === 'FINISHED') {
          show = isFin;
        }

        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      const emptyRow = document.getElementById('myBookingsEmptyFilterRow');
      const emptyTitle = document.getElementById('myBookingsEmptyTitle');
      const emptyDesc = document.getElementById('myBookingsEmptyDesc');
      if (emptyRow) {
        emptyRow.style.display = visibleCount === 0 ? '' : 'none';
        if (visibleCount === 0 && emptyTitle && emptyDesc) {
          if (category === 'PENDING') {
            emptyTitle.textContent = 'ไม่มีคำขอที่กำลังดำเนินการ';
            emptyDesc.textContent = 'คุณสามารถเริ่มจองห้องประชุมใหม่ได้ที่เมนู "จองห้อง"';
          } else if (category === 'APPROVED') {
            emptyTitle.textContent = 'ไม่มีรายการที่ได้รับการอนุมัติ';
            emptyDesc.textContent = 'คำขอที่ผ่านการอนุมัติแล้วจะแสดงที่นี่';
          } else if (category === 'FINISHED') {
            emptyTitle.textContent = 'ไม่มีรายการที่เสร็จสิ้น';
            emptyDesc.textContent = 'คำขอที่ใช้งานเสร็จสิ้น หรือถูกยกเลิก/ปฏิเสธจะแสดงที่นี่';
          }
        }
      }
    }
```

🔍 **จุดที่ 5 (ล็อกการยกเลิกใน Backend - `src/controllers/bookingController.js` บรรทัด 250):**
ค้นหา:
```javascript
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถยกเลิกคำขอที่สิ้นสุดแล้วได้')}`);
    }
```
แทนที่ด้วย:
```javascript
    if (booking.status !== 'PENDING_APPROVAL' && req.session.roleName !== 'admin') {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถยกเลิกได้ เนื่องจากคำขอได้รับการอนุมัติแล้ว (สามารถยกเลิกได้เฉพาะคำขอที่รออนุมัติเท่านั้น)')}`);
    }
```

---

### Task 8: ตั้งเวลา Alert Bar Auto-Dismiss (3.5 วินาที)
* **ไฟล์:** `src/views/dashboard.ejs`
* **ตำแหน่ง:** บรรทัด ~258–265 และในสคริปต์ `DOMContentLoaded`

🔍 **โค้ดเดิม (บรรทัด ~258–265):**
```ejs
  <div class="container">
    <% if (success) { %>
      <div class="alert alert-success"><%= success %></div>
    <% } %>
    <% if (error) { %>
      <div class="alert alert-danger"><%= error %></div>
    <% } %>
```

✨ **โค้ดใหม่ที่ใส่แทนที่:**
```ejs
  <div class="container">
    <% if (success) { %>
      <div id="flashSuccessAlert" class="alert alert-success" style="display: flex; justify-content: space-between; align-items: center; transition: opacity 0.5s ease;">
        <span><%= success %></span>
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.25rem; line-height: 1; cursor: pointer; color: inherit; padding: 0 0.5rem;" title="ปิดการแจ้งเตือน">&times;</button>
      </div>
    <% } %>
    <% if (error) { %>
      <div class="alert alert-danger" style="display: flex; justify-content: space-between; align-items: center;">
        <span><%= error %></span>
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.25rem; line-height: 1; cursor: pointer; color: inherit; padding: 0 0.5rem;" title="ปิดการแจ้งเตือน">&times;</button>
      </div>
    <% } %>
```

ใน `DOMContentLoaded` (บรรทัด ~2071+) เพิ่ม:
```javascript
    const successAlert = document.getElementById('flashSuccessAlert');
    if (successAlert) {
      setTimeout(() => {
        successAlert.style.opacity = '0';
        setTimeout(() => successAlert.remove(), 500);
      }, 3500);
    }
```

---

### Task 9: กวาดล้าง Emoji ทั้งระบบ
* **ไฟล์:** `src/views/dashboard.ejs`
* **สิ่งที่ต้องทำ:**
  1. ลบ Emoji ใน Action Cards ทั้งหมด (บรรทัด ~432–503) เช่น `✅`, `🔧`, `🛠️`, `📊`, `🛡️`, `📜`, `🏢` ให้เป็นข้อความสะอาดตา
  2. ลบ Emoji ในปุ่มเริ่มจองห้อง: เปลี่ยน `<span style="font-size: 1.15rem;">📅</span> เริ่มจองห้อง` เป็น `เริ่มจองห้อง` (บรรทัด ~513)
  3. ลบ Emoji ใน Subview จองห้อง: ลบ `<span>📅</span>` (บรรทัด ~637) และลบ `🏢` ใน `เลือกอาคาร:`
  4. ลบ Emoji ในตารางการจองของฉัน: ลบ `📅`, `⏰`, `📎` (บรรทัด ~884, 918, 928)
  5. ในหน้าโปรไฟล์ `#req-view-profile`: ลบ Emoji ใน Admin Shortcuts (บรรทัด ~1035–1046) และปรับปุ่มออกจากระบบเป็น:
     ```html
     <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
       <form action="/logout" method="POST" style="margin: 0;">
         <button type="submit" class="btn btn-danger" style="width: 100%; padding: 0.75rem 1.5rem; font-size: 0.95rem; font-weight: 700; border-radius: 10px; cursor: pointer;">
           ออกจากระบบ (Logout)
         </button>
       </form>
     </div>
     ```
  6. ใน `<nav class="mobile-bottom-nav">` (บรรทัด ~2103–2164): ลบแท็ก `<span class="nav-icon">...</span>` ที่มี emoji ทั้งหมดออก ให้เหลือเฉพาะชื่อเมนู

---

### Task 10: เสริมสไตล์ CSS ใน `src/public/style.css`
* **ไฟล์:** `src/public/style.css`
* **ตำแหน่ง:** เพิ่มท้ายไฟล์

✨ **โค้ด CSS ที่ต้องเพิ่มท้ายไฟล์:**
```css
/* 1. Visual Room Selection Box */
.visual-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.85rem;
  margin-top: 0.5rem;
}

.visual-room-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  user-select: none;
}

.visual-room-card:hover {
  border-color: #93c5fd;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}

.visual-room-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.15);
}

[data-theme="dark"] .visual-room-card.selected {
  background: #1e293b;
  border-color: #3b82f6;
}

.visual-room-img {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.visual-room-info {
  flex: 1;
  min-width: 0;
}

.visual-room-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--dark);
}

.visual-room-sub {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.2rem;
}

.visual-room-radio {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: transparent;
  transition: all 0.2s;
  flex-shrink: 0;
}

.visual-room-card.selected .visual-room-radio {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

/* 2. Unified Navbar & Clickable User Badge */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  border: 1px solid transparent;
}

.user-badge:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.user-badge.active {
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.user-badge.active .role-pill {
  background: #ffffff !important;
  color: #2563eb !important;
}

[data-theme="dark"] .user-badge {
  background: #1e293b;
  color: #f8fafc;
}

[data-theme="dark"] .user-badge:hover {
  background: #334155;
}

[data-theme="dark"] .user-badge.active {
  background: #3b82f6 !important;
  color: #ffffff !important;
}
```

---

# ✂️ Phase 2: Modular Refactor ลดขนาดโค้ด (ยึดตาม REFACTOR_TODO.md ของ Claude 100%)

> **คำสั่งเด็ดขาด:** สำหรับงานลดขนาดไฟล์ (Modular Refactor) ให้ทำตามแผนงานที่ **Claude** ได้ออกแบบไว้อย่างละเอียดในไฟล์ [REFACTOR_TODO.md](./REFACTOR_TODO.md) ตั้งแต่ **Task R0 ถึง R7** ทุกตัวอักษร **ห้ามแก้ไข ดัดแปลง หรือเขียนทับไฟล์ `REFACTOR_TODO.md` นั้นเด็ดขาด**

---

### สรุปขั้นตอนจาก REFACTOR_TODO.md ของ Claude:
1. **R0 — Baseline ก่อนเริ่ม:** ตรวจสอบ Smoke Test 6/6 และบันทึกจำนวน Element DOM ของแต่ละ Role
2. **R1 — แยก CSS Inline:** ย้าย `<style>` L21–156 ใน `dashboard.ejs` ไปที่ `src/public/dashboard.css`
3. **R2 — แยก JS ของ `acl.ejs`:** ย้าย `<script>` L301–393 ไปที่ `src/public/acl.js`
4. **R3 — แยก JS ของ `dashboard.ejs`:** ย้าย `<script>` L1452–2100 ไปที่ `src/public/dashboard.js` พร้อมทำ Data Bridge สำหรับ 5 ตัวแปร Server
5. **R4 — สร้าง Partial `head.ejs`:** รวมแท็ก `<head>` ใช้ร่วมกัน 6 ไฟล์
6. **R5 — สร้าง Partial `navbar.ejs`:** ใช้ร่วมกัน 4 ไฟล์ Admin
7. **R6 — หั่น Subviews ของ `dashboard.ejs`:** แยก Subviews ออกเป็น Partials ย่อย
8. **R7 — Verify รวมทั้งระบบ:** รัน `npm test` และตรวจสอบการทำงานทุก Role ครบถ้วน
