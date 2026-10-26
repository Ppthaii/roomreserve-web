let toastTimer = null;

 function switchTab(tabId, btn = null) {
 const viewName = tabId.replace('tab-', '');
 switchRequesterView(viewName, btn);
 }

 let isFinishedHidden = false;

 function toggleHideFinished() {
 isFinishedHidden = !isFinishedHidden;
 const btn = document.getElementById('btnToggleFinished');
 const icon = document.getElementById('toggleFinishedIcon');
 const text = document.getElementById('toggleFinishedText');
 const finishedCount = document.querySelectorAll('.my-booking-row[data-finished="true"]').length;

 const activeChip = document.querySelector('.status-filter-chip.active');
 const currentCat = activeChip ? activeChip.getAttribute('onclick').match(/'([^']+)'/)[1] : 'ALL';
 filterMyBookings(currentCat, activeChip);

 if (btn && icon && text) {
 if (isFinishedHidden) {
 icon.innerText = '';
 text.innerText = `แสดงรายการที่สิ้นสุด (${finishedCount})`;
 btn.style.color = 'var(--primary)';
 btn.style.borderColor = 'var(--primary)';
 } else {
 icon.innerText = '';
 text.innerText = `ซ่อนรายการที่สิ้นสุดแล้ว (${finishedCount})`;
 btn.style.color = 'var(--slate)';
 btn.style.borderColor = 'var(--border)';
 }
 }
 }

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
 } else if (category === 'ALL') {
 show = true;
 }

 row.style.display = show ? '' : 'none';
 if (show) visibleCount++;
 });

 const emptyRow = document.getElementById('myBookingsEmptyFilterRow');
 const emptyTitle = document.getElementById('myBookingsEmptyTitle');
 const emptyDesc = document.getElementById('myBookingsEmptyDesc');
 if (emptyRow) {
 emptyRow.style.display = visibleCount === 0 ? '' : 'none';
 if (emptyTitle && emptyDesc) {
 if (category === 'PENDING') {
 emptyTitle.innerText = 'ไม่มีรายการคำขอที่กำลังดำเนินการ';
 emptyDesc.innerText = 'ไม่มีคำขอที่อยู่ระหว่างรอการอนุมัติในขณะนี้';
 } else if (category === 'APPROVED') {
 emptyTitle.innerText = 'ไม่มีรายการที่ได้รับอนุมัติในขณะนี้';
 emptyDesc.innerText = 'รายการที่ได้รับการอนุมัติแล้วจะแสดงขึ้นที่นี่';
 } else if (category === 'FINISHED') {
 emptyTitle.innerText = 'ไม่มีรายการที่เสร็จสิ้น';
 emptyDesc.innerText = 'ไม่มีประวัติการใช้งานห้องที่เสร็จสิ้น ยกเลิก หรือปฏิเสธ';
 }
 }
 }
 }

 function selectBuilding(buildingNumber, btn) {
 document.querySelectorAll('.building-card, .building-pill, .building-box').forEach(b => b.classList.remove('active'));
 if (btn) {
 btn.classList.add('active');
 } else {
 const targetBtn = document.getElementById(`btn-building-${buildingNumber}`);
 if (targetBtn) targetBtn.classList.add('active');
 }

 const notice = document.getElementById('noBuildingSelectedNotice');
 if (notice) notice.style.display = 'none';

 const container = document.getElementById('roomsContainer');
 if (container) container.style.display = 'block';

 const headerText = document.getElementById('activeBuildingHeaderText');
 if (headerText) {
 const matched = ROOMS.filter(r => getBuildingFromRoom(r) === String(buildingNumber)).map(r => r.room_name);
 const sub = matched.length > 0 ? ` (${matched.join(', ')})` : '';
 headerText.innerText = `ข้อมูลห้องประชุม - ตึก ${buildingNumber}${sub}`;
 }

 document.querySelectorAll('.casual-room-card').forEach(card => {
 const cardBuilding = card.getAttribute('data-building');
 if (cardBuilding === String(buildingNumber)) {
 card.style.display = 'block';
 } else {
 card.style.display = 'none';
 }
 });

 if (container && btn) {
 container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 }
 }

 function getBuildingFromRoom(room) {
 if (!room) return '1';
 const loc = String(room.location || '');
 const name = String(room.room_name || '');
 const locMatch = loc.match(/(?:ตึก|อาคาร|building)\s*([1-9])/i);
 if (locMatch) return locMatch[1];
 const nameMatch = name.match(/(?:ห้อง\s*)?([1-9])\d{2}/i);
 if (nameMatch) return nameMatch[1];
 if (loc.includes('1')) return '1';
 if (loc.includes('2')) return '2';
 if (loc.includes('3')) return '3';
 return '1';
 }

 function checkBookingConflict() {
 const roomSelect = document.getElementById('form_room_id');
 const dateInput = document.getElementById('form_booking_date');
 const startInput = document.getElementById('form_start_time');
 const endInput = document.getElementById('form_end_time');
 const banner = document.getElementById('conflictStatusBanner');
 const submitBtn = document.getElementById('submitBookingBtn');

 if (!roomSelect || !dateInput || !startInput || !endInput || !banner || !submitBtn) return;

 const roomId = Number(roomSelect.value);
 const dateStr = dateInput.value;
 const startTimeStr = startInput.value;
 const endTimeStr = endInput.value;

 if (!startTimeStr || !endTimeStr) return;

 const start = new Date(`${dateStr}T${startTimeStr}:00`);
 const end = new Date(`${dateStr}T${endTimeStr}:00`);

 const room = ROOMS.find(r => Number(r.room_id) === roomId);

 if (room && !room.is_active) {
 banner.className = 'conflict-status-banner is-conflict';
 banner.innerHTML = '<span>ไม่สามารถจองได้: ห้องนี้ถูกระงับการใช้งาน</span>';
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 const guidePill = document.getElementById('slotGuidePill');
 if (guidePill) {
 guidePill.className = 'conflict-status-banner is-conflict';
 guidePill.innerText = 'ห้องนี้ถูกระงับการใช้งาน ไม่เปิดให้จอง';
 }
 return;
 }

 const startH = parseInt(startTimeStr.split(':')[0], 10);
 if (startH >= 18) {
 banner.className = 'conflict-status-banner is-conflict';
 banner.innerHTML = '<span>ไม่สามารถเลือกได้: อาคารปิดทำการเวลา 18:00 น.</span>';
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 return;
 }

 if (end <= start) {
 banner.className = 'conflict-status-banner is-conflict';
 banner.innerHTML = '<span>เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น</span>';
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 return;
 }

 const hardConflict = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < end && bEnd > start;
 });

 const pendingConflict = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (b.status !== 'PENDING_APPROVAL') return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < end && bEnd > start;
 });

 if (hardConflict) {
 banner.className = 'conflict-status-banner is-conflict';
 const statusLabel = hardConflict.status === 'BLOCKED' ? 'ปิดซ่อมบำรุง' : 'มีผู้จองแล้ว';
 banner.innerHTML = `<span>ไม่สามารถเลือกได้: ชนกับ "${hardConflict.title}" (${statusLabel})</span>`;
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 } else if (pendingConflict) {
 const durationHours = Math.round((end - start) / (1000 * 60 * 60));
 banner.className = 'conflict-status-banner is-warning';
 banner.innerHTML = `<span> ช่วงเวลานี้ (${durationHours} ชม.) มีคำขอ "${pendingConflict.title}" รอพิจารณาอยู่ (สามารถยื่นจองชนได้ หัวหน้าจะพิจารณาอนุมัติให้รายการที่เหมาะสม)</span>`;
 submitBtn.disabled = false;
 submitBtn.style.opacity = '1';
 submitBtn.style.cursor = 'pointer';
 } else {
 const durationHours = Math.round((end - start) / (1000 * 60 * 60));
 banner.className = 'conflict-status-banner is-free';
 banner.innerHTML = `<span>ช่วงเวลานี้ว่าง สามารถทำรายการจองได้ (รวม ${durationHours} ชั่วโมง)</span>`;
 submitBtn.disabled = false;
 submitBtn.style.opacity = '1';
 submitBtn.style.cursor = 'pointer';
 }

 const sH = parseInt(startTimeStr.split(':')[0], 10);
 const eH = parseInt(endTimeStr.split(':')[0], 10);
 if (!isNaN(sH) && !isNaN(eH)) {
 rangeStartHour = sH;
 rangeEndHour = eH;
 const guidePill = document.getElementById('slotGuidePill');
 if (guidePill) {
 if (hardConflict) {
 guidePill.className = 'conflict-status-banner is-conflict';
 guidePill.innerText = `ช่วงเวลา ${String(sH).padStart(2,'0')}:00 - ${String(eH).padStart(2,'0')}:00 น. ชนกับรายการที่อนุมัติแล้ว`;
 } else if (pendingConflict) {
 guidePill.className = 'conflict-status-banner is-warning';
 guidePill.innerText = `ช่วงเวลา ${String(sH).padStart(2,'0')}:00 - ${String(eH).padStart(2,'0')}:00 น. มีคิวรออนุมัติ (ยื่นจองชนได้)`;
 } else {
 guidePill.className = 'conflict-status-banner is-free';
 guidePill.innerText = `ช่วงเวลาที่เลือก: ${String(sH).padStart(2,'0')}:00 - ${String(eH).padStart(2,'0')}:00 น. (${eH - sH} ชม.)`;
 }
 }
 if (typeof renderTimeRangePills === 'function') {
 renderTimeRangePills();
 }
 }
 }

 function onStartTimeChange(runConflictCheck = true) {
 const startSelect = document.getElementById('form_start_time');
 const endSelect = document.getElementById('form_end_time');
 if (!startSelect || !endSelect) return;

 const startHour = parseInt(startSelect.value.split(':')[0], 10);
 const endHour = parseInt(endSelect.value.split(':')[0], 10);

 Array.from(endSelect.options).forEach(opt => {
 const optHour = parseInt(opt.value.split(':')[0], 10);
 opt.disabled = optHour <= startHour;
 });

 if (endHour <= startHour) {
 const nextHour = Math.min(18, startHour + 1);
 endSelect.value = `${String(nextHour).padStart(2, '0')}:00`;
 }

 if (runConflictCheck) {
 checkBookingConflict();
 }
 }

 function validateAttendees() {
 const attendeesInput = document.getElementById('form_attendees');
 const roomSelect = document.getElementById('form_room_id');
 const errorMsg = document.getElementById('attendeesErrorMsg');
 const submitBtn = document.getElementById('submitBookingBtn');
 if (!attendeesInput || !roomSelect) return true;

 const roomId = Number(roomSelect.value);
 const room = ROOMS.find(r => Number(r.room_id) === roomId);
 if (!room) return true;

 const maxCap = room.capacity;
 const count = parseInt(attendeesInput.value, 10);

 const maxDisplay = document.getElementById('attendeesMaxDisplay');
 const errorMax = document.getElementById('attendeesErrorMax');
 if (maxDisplay) maxDisplay.innerText = maxCap;
 if (errorMax) errorMax.innerText = maxCap;
 attendeesInput.max = maxCap;

 if (count > maxCap || isNaN(count) || count < 1) {
 if (errorMsg) {
 if (count > maxCap) {
 errorMsg.innerHTML = `จำนวนผู้เข้าร่วม (${count} คน) เกินความจุห้อง (ห้องนี้รับได้สูงสุด ${maxCap} คนเท่านั้น)`;
 } else {
 errorMsg.innerHTML = `กรุณาระบุจำนวนผู้เข้าร่วมอย่างน้อย 1 คน`;
 }
 errorMsg.style.display = 'block';
 }
 attendeesInput.style.borderColor = 'var(--danger)';
 if (submitBtn) {
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 }
 return false;
 } else {
 if (errorMsg) errorMsg.style.display = 'none';
 attendeesInput.style.borderColor = '';
 checkBookingConflict();
 return true;
 }
 }

 function selectRoomAndSlot(roomId, startStr, endStr) {
 const room = ROOMS.find(r => Number(r.room_id) === Number(roomId));
 const roomSelect = document.getElementById('form_room_id');
 const startInput = document.getElementById('form_start_time');
 const endInput = document.getElementById('form_end_time');
 const infoDiv = document.getElementById('modalSelectedRoomInfo');
 const lockedName = document.getElementById('locked_room_name');

 if (roomSelect) roomSelect.value = roomId;
 if (startInput) startInput.value = startStr;
 if (endInput) endInput.value = endStr;

 if (lockedName && room) {
 lockedName.innerHTML = `${room.room_name} <span style="font-weight: normal; color: var(--muted); font-size: 0.8rem;">(${room.location} &bull; จุ ${room.capacity} คน)</span>`;
 }

 if (infoDiv && room) {
 infoDiv.innerHTML = `<strong>${room.room_name}</strong> &bull; ${room.location} &bull; จุ ${room.capacity} คน`;
 selectBuilding(getBuildingFromRoom(room));
 }

 const attendeesInput = document.getElementById('form_attendees');
 const maxDisplay = document.getElementById('attendeesMaxDisplay');
 const errorMax = document.getElementById('attendeesErrorMax');
 if (room && attendeesInput) {
 attendeesInput.max = room.capacity;
 if (parseInt(attendeesInput.value, 10) > room.capacity) {
 attendeesInput.value = Math.min(5, room.capacity);
 }
 }
 if (room && maxDisplay) maxDisplay.innerText = room.capacity;
 if (room && errorMax) errorMax.innerText = room.capacity;
 validateAttendees();

 onStartTimeChange(false);

 document.querySelectorAll('.casual-room-card').forEach(c => c.classList.remove('selected-room'));
 const targetCard = document.getElementById(`room-card-${roomId}`);
 if (targetCard) targetCard.classList.add('selected-room');

 document.querySelectorAll('.slot-interactive-chip').forEach(s => s.classList.remove('slot-selected'));
 const activeChip = document.querySelector(`.slot-interactive-chip[data-room="${roomId}"][data-start="${startStr}"]`);
 if (activeChip) activeChip.classList.add('slot-selected');

 checkBookingConflict();

 switchRequesterView('booking');
 const titleInput = document.getElementById('form_title');
 if (titleInput) {
 setTimeout(() => titleInput.focus(), 150);
 }
 }

 function closeBookingModal(e) {
 const modal = document.getElementById('bookingFormModal');
 if (modal) modal.style.display = 'none';
 }

 function showUnavailableNotice(roomName, startStr, endStr, bookingTitle, slotType) {
 const toast = document.getElementById('slotNoticeToast');
 const text = document.getElementById('slotNoticeText');
 if (!toast || !text) return;

 const typeTh = slotType === 'blocked' ? 'ปิดซ่อมบำรุง' : (slotType === 'pending' ? 'มีคำขอรออนุมัติ' : 'ติดคิวจองแล้ว');
 text.innerHTML = `<strong>เลือกไม่ได้:</strong> ${roomName} ช่วง ${startStr}-${endStr} น. ${typeTh} ("${bookingTitle}")`;
 toast.style.display = 'flex';

 if (toastTimer) clearTimeout(toastTimer);
 toastTimer = setTimeout(() => {
 toast.style.display = 'none';
 }, 3500);
 }

 function onRoomSelectChange() {
 const roomId = document.getElementById('form_room_id').value;
 const room = ROOMS.find(r => Number(r.room_id) === Number(roomId));
 const infoDiv = document.getElementById('modalSelectedRoomInfo');
 if (infoDiv && room) {
 infoDiv.innerHTML = `<strong>${room.room_name}</strong> &bull; ${room.location} &bull; จุ ${room.capacity} คน`;
 selectBuilding(getBuildingFromRoom(room));
 }
 document.querySelectorAll('.casual-room-card').forEach(c => c.classList.remove('selected-room'));
 const targetCard = document.getElementById(`room-card-${roomId}`);
 if (targetCard) targetCard.classList.add('selected-room');
 checkBookingConflict();
 }

 function onDateInputChange() {
 const formDate = document.getElementById('form_booking_date').value;
 if (formDate && formDate !== SELECTED_DATE) {
 window.location.href = `/app?date=${formDate}`;
 } else {
 checkBookingConflict();
 }
 }

 function openFilePreview(fileId, fileName) {
 const fileUrl = `/app/files/${fileId}`;
 document.getElementById('previewFileName').innerText = fileName;
 document.getElementById('previewDownloadBtn').href = fileUrl;
 document.getElementById('previewFrame').src = fileUrl;
 document.getElementById('filePreviewModal').style.display = 'flex';
 }

 function closePreviewModal(e) {
 document.getElementById('filePreviewModal').style.display = 'none';
 document.getElementById('previewFrame').src = 'about:blank';
 }

 function openRejectModal(bookingId, title, requesterName) {
 const modal = document.getElementById('rejectModal');
 const form = document.getElementById('rejectForm');
 const sub = document.getElementById('rejectModalSubTitle');
 const commentInput = document.getElementById('reject_comment_input');

 if (form) form.action = `/app/bookings/${bookingId}/review`;
 if (sub) sub.innerHTML = `คำขอ: <strong>${title}</strong> &bull; โดย ${requesterName}`;
 if (commentInput) commentInput.value = 'ผู้บริหารมีความจำเป็นต้องใช้ห้องประชุมด่วนในช่วงเวลาดังกล่าว';
 if (modal) modal.style.display = 'flex';
 }

 function closeRejectModal(e) {
 if (e && e.target !== e.currentTarget && e.currentTarget.id !== 'rejectModal') return;
 const modal = document.getElementById('rejectModal');
 if (modal) modal.style.display = 'none';
 }

 let rangeStartHour = 9;
 let rangeEndHour = 10;
 let isSettingEnd = false;

 function switchRequesterView(viewName, btnEl = null) {
 if (viewName === 'booking' && !CAN_BOOK) return;
 if (viewName === 'mybookings' && !CAN_VIEW_OWN) return;
 const targetView = document.getElementById('req-view-' + viewName);
 if (!targetView) return;

 document.querySelectorAll('.req-subview').forEach(v => v.style.display = 'none');
 targetView.style.display = 'block';

 document.querySelectorAll('.bottom-nav-item, .desktop-nav-item').forEach(b => {
 if (b.getAttribute('data-view') === viewName) {
 b.classList.add('active');
 } else {
 b.classList.remove('active');
 }
 });

 window.scrollTo({ top: 0, behavior: 'smooth' });

 if (viewName === 'booking') {
 renderTimeRangePills();
 checkBookingConflict();
 } else if (viewName === 'facility-block') {
 if (typeof selectMaintBuilding === 'function') {
 const activeMaintB = document.querySelector('#req-view-facility-block .building-card.active');
 const bNum = activeMaintB ? activeMaintB.id.replace('btn-maint-building-', '') : '1';
 selectMaintBuilding(Number(bNum) || 1);
 }
 }
 }

 function startBookingFlow(roomId = null, buildingNum = null) {
 if (!CAN_BOOK) return;
 switchRequesterView('booking');
 if (buildingNum) {
 selectBuilding(Number(buildingNum));
 } else {

 const roomsBox = document.getElementById('buildingRoomsBox');
 if (roomsBox) roomsBox.style.display = 'none';
 document.querySelectorAll('.building-card').forEach(b => b.classList.remove('active'));
 }
 if (roomId) {
 selectBookingRoom(roomId);
 }
 }

 function onBookingRoomChange() {
 const select = document.getElementById('form_room_id');
 if (!select) return;
 const opt = select.options[select.selectedIndex];
 if (!opt) return;

 const bNum = opt.getAttribute('data-building');
 if (bNum) {
 document.querySelectorAll('.building-card').forEach(b => b.classList.remove('active'));
 const activeCard = document.getElementById(`btn-building-${bNum}`);
 if (activeCard) activeCard.classList.add('active');
 }

 const roomId = Number(select.value);
 const room = ROOMS.find(r => Number(r.room_id) === roomId);
 if (room) {
 const maxDisplay = document.getElementById('attendeesMaxDisplay');
 const attendeesInput = document.getElementById('form_attendees');
 if (maxDisplay) maxDisplay.innerText = room.capacity;
 if (attendeesInput) attendeesInput.max = room.capacity;
 }

 renderTimeRangePills();
 checkBookingConflict();
 }

 function onTimeRangePillClick(hour) {
 const roomSelect = document.getElementById('form_room_id');
 const roomId = roomSelect ? Number(roomSelect.value) : null;
 const room = ROOMS.find(r => Number(r.room_id) === roomId);

 if (room && !room.is_active) {
 const toast = document.getElementById('slotNoticeToast');
 const text = document.getElementById('slotNoticeText');
 if (toast && text) {
 text.innerHTML = `<strong>เลือกไม่ได้:</strong> ห้องนี้ถูกระงับการใช้งาน`;
 toast.style.display = 'flex';
 setTimeout(() => { toast.style.display = 'none'; }, 3000);
 }
 return;
 }

 const pill = document.querySelector(`.time-slot-pill:not(.maint-time-pill)[data-hour="${hour}"]`);
 if (pill && pill.classList.contains('is-booked')) {
 const toast = document.getElementById('slotNoticeToast');
 const text = document.getElementById('slotNoticeText');
 if (toast && text) {
 text.innerHTML = `<strong>เลือกไม่ได้:</strong> ช่วงเวลา ${String(hour).padStart(2,'0')}:00 น. มีคิวจองหรือระงับการใช้งาน`;
 toast.style.display = 'flex';
 setTimeout(() => { toast.style.display = 'none'; }, 3000);
 }
 return;
 }

 const guidePill = document.getElementById('slotGuidePill');

 if (hour === 18) {

 let hasConflict = false;
 const startCheck = (isSettingEnd && rangeStartHour < 18) ? rangeStartHour : 17;
 for (let checkH = startCheck; checkH < 18; checkH++) {
 const checkPill = document.querySelector(`.time-slot-pill:not(.maint-time-pill)[data-hour="${checkH}"]`);
 if (checkPill && checkPill.classList.contains('is-booked')) {
 hasConflict = true;
 break;
 }
 }
 if (hasConflict) {
 const toast = document.getElementById('slotNoticeToast');
 const text = document.getElementById('slotNoticeText');
 if (toast && text) {
 text.innerHTML = `<strong>เลือกไม่ได้:</strong> ช่วงเวลาก่อน 18:00 น. มีคิวจองหรือระงับการใช้งาน`;
 toast.style.display = 'flex';
 setTimeout(() => { toast.style.display = 'none'; }, 3000);
 }
 return;
 }

 if (isSettingEnd && rangeStartHour < 18) {
 rangeEndHour = 18;
 isSettingEnd = false;
 } else {
 rangeStartHour = 17;
 rangeEndHour = 18;
 isSettingEnd = false;
 }
 } else if (!isSettingEnd || hour < rangeStartHour) {

 rangeStartHour = hour;
 rangeEndHour = hour + 1;
 isSettingEnd = true;
 } else if (hour === rangeStartHour && rangeEndHour === hour + 1) {

 isSettingEnd = false;
 } else {

 let hasConflictInBetween = false;
 for (let checkH = rangeStartHour; checkH <= hour; checkH++) {
 const checkPill = document.querySelector(`.time-slot-pill:not(.maint-time-pill)[data-hour="${checkH}"]`);
 if (checkPill && checkPill.classList.contains('is-booked')) {
 hasConflictInBetween = true;
 break;
 }
 }

 if (hasConflictInBetween) {
 rangeStartHour = hour;
 rangeEndHour = hour + 1;
 isSettingEnd = true;
 } else {
 rangeEndHour = hour + 1;
 isSettingEnd = false;
 }
 }

 if (guidePill) {
 guidePill.className = 'conflict-status-banner is-free';
 guidePill.innerText = `ช่วงเวลาที่เลือก: ${String(rangeStartHour).padStart(2,'0')}:00 - ${String(rangeEndHour).padStart(2,'0')}:00 น. (${rangeEndHour - rangeStartHour} ชม.)`;
 }

 const startSelect = document.getElementById('form_start_time');
 const endSelect = document.getElementById('form_end_time');
 if (startSelect) startSelect.value = `${String(rangeStartHour).padStart(2,'0')}:00`;
 if (endSelect) {
 Array.from(endSelect.options).forEach(opt => {
 const optH = parseInt(opt.value.split(':')[0], 10);
 opt.disabled = optH <= rangeStartHour;
 });
 endSelect.value = `${String(rangeEndHour).padStart(2,'0')}:00`;
 }

 renderTimeRangePills();
 checkBookingConflict();
 }

 function renderTimeRangePills() {
 const roomSelect = document.getElementById('form_room_id');
 if (!roomSelect) return;
 const roomId = Number(roomSelect.value);
 const room = ROOMS.find(r => Number(r.room_id) === roomId);

 document.querySelectorAll('.time-slot-pill:not(.maint-time-pill)').forEach(pill => {
 const h = parseInt(pill.getAttribute('data-hour'), 10);
 pill.className = 'time-slot-pill';

 if (room && !room.is_active) {
 pill.classList.add('is-booked');
 pill.title = 'ห้องนี้ถูกระงับการใช้งาน';
 return;
 }

 if (h === 18) {

 const check17 = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 const slotStart = new Date(`${SELECTED_DATE}T17:00:00`);
 const slotEnd = new Date(`${SELECTED_DATE}T18:00:00`);
 return bStart < slotEnd && bEnd > slotStart;
 });
 if (check17) {
 pill.classList.add('is-booked');
 pill.title = 'ช่วงเวลา 17:00-18:00 อนุมัติ/ติดจองแล้ว';
 } else {
 const check17Pending = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (b.status !== 'PENDING_APPROVAL') return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 const slotStart = new Date(`${SELECTED_DATE}T17:00:00`);
 const slotEnd = new Date(`${SELECTED_DATE}T18:00:00`);
 return bStart < slotEnd && bEnd > slotStart;
 });
 if (check17Pending) {
 pill.classList.add('has-pending');
 pill.title = `มีคำขอรออนุมัติ: ${check17Pending.title} (คลิกเพื่อจองชนได้)`;
 }
 }
 } else {
 const hStartStr = `${String(h).padStart(2,'0')}:00`;
 const hEndStr = `${String(h+1).padStart(2,'0')}:00`;
 const slotStart = new Date(`${SELECTED_DATE}T${hStartStr}:00`);
 const slotEnd = new Date(`${SELECTED_DATE}T${hEndStr}:00`);

 const overlap = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < slotEnd && bEnd > slotStart;
 });

 if (overlap) {
 pill.classList.add('is-booked');
 pill.title = overlap.title || 'ติดจอง';
 } else {
 const pendingOverlap = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (b.status !== 'PENDING_APPROVAL') return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < slotEnd && bEnd > slotStart;
 });
 if (pendingOverlap) {
 pill.classList.add('has-pending');
 pill.title = `มีคำขอรออนุมัติ: ${pendingOverlap.title} (คลิกเพื่อจองชนได้)`;
 }
 }
 }

 if (!pill.classList.contains('is-booked')) {
 if (h === rangeStartHour) {
 pill.classList.add('is-start');
 } else if (h === rangeEndHour) {
 pill.classList.add('is-end');
 } else if (h > rangeStartHour && h < rangeEndHour) {
 pill.classList.add('in-range');
 }
 }
 });
 }

 function selectBookingRoom(roomId) {
 const hiddenInput = document.getElementById('form_room_id');
 if (hiddenInput) {
 hiddenInput.value = roomId;
 }

 document.querySelectorAll('.visual-room-card').forEach(c => {
 const match = c.getAttribute('data-room-id') === String(roomId);
 c.classList.toggle('selected', match);
 const radio = c.querySelector('.visual-room-radio');
 if (radio) radio.checked = match;
 });

 const room = ROOMS.find(r => Number(r.room_id) === Number(roomId));
 if (room) {
 const maxDisplay = document.getElementById('attendeesMaxDisplay');
 const attendeesInput = document.getElementById('form_attendees');
 if (maxDisplay) maxDisplay.innerText = room.capacity;
 if (attendeesInput) attendeesInput.max = room.capacity;
 }

 renderTimeRangePills();
 checkBookingConflict();
 }

 const originalSelectBuilding = selectBuilding;
 selectBuilding = function(buildingNumber, btn = null) {
 document.querySelectorAll('.building-card').forEach(b => b.classList.remove('active'));
 if (btn) {
 btn.classList.add('active');
 } else {
 const targetBtn = document.getElementById(`btn-building-${buildingNumber}`);
 if (targetBtn) targetBtn.classList.add('active');
 }

 const roomsBox = document.getElementById('buildingRoomsBox');
 const headerLabel = document.getElementById('buildingRoomsHeaderLabel');
 if (roomsBox) {
 roomsBox.style.display = 'block';
 }
 if (headerLabel) {
 headerLabel.innerText = `ห้องประชุมในตึก ${buildingNumber}:`;
 }

 let visibleCount = 0;
 let firstActiveRoomId = null;
 let firstAnyRoomId = null;
 document.querySelectorAll('.visual-room-card').forEach(c => {
 const b = c.getAttribute('data-building');
 const isMatch = b === String(buildingNumber);
 c.style.display = isMatch ? 'flex' : 'none';
 if (isMatch) {
 visibleCount++;
 const rId = c.getAttribute('data-room-id');
 if (!firstAnyRoomId) firstAnyRoomId = rId;
 const rObj = ROOMS.find(r => Number(r.room_id) === Number(rId));
 if (rObj && rObj.is_active && !firstActiveRoomId) {
 firstActiveRoomId = rId;
 }
 }
 });

 const roomsGrid = document.getElementById('visualRoomsGrid');
 if (roomsGrid) {
 roomsGrid.setAttribute('data-count', String(visibleCount));
 }

 const chosenRoomId = firstActiveRoomId || firstAnyRoomId;
 const hiddenInput = document.getElementById('form_room_id');
 const currentSelected = hiddenInput ? hiddenInput.value : null;
 const currentCard = currentSelected ? document.querySelector(`.visual-room-card[data-room-id="${currentSelected}"]`) : null;
 const isCurrentInBuilding = currentCard && currentCard.getAttribute('data-building') === String(buildingNumber);

 if (!isCurrentInBuilding && chosenRoomId) {
 selectBookingRoom(chosenRoomId);
 } else if (currentSelected) {
 selectBookingRoom(currentSelected);
 }

 renderTimeRangePills();
 checkBookingConflict();

 if (roomsBox && btn) {
 roomsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 }
 };

 document.addEventListener('DOMContentLoaded', () => {

 const flashAlert = document.getElementById('flashSuccessAlert');
 if (flashAlert) {
 setTimeout(() => {
 flashAlert.style.transition = 'opacity 0.4s ease';
 flashAlert.style.opacity = '0';
 setTimeout(() => flashAlert.remove(), 400);
 }, 3500);
 }

 const pendingBtn = document.querySelector('.segmented-item[data-category="PENDING"]');
 const approvedBtn = document.querySelector('.segmented-item[data-category="APPROVED"]');
 const finishedBtn = document.querySelector('.segmented-item[data-category="FINISHED"]');

 const pendingBadge = pendingBtn ? parseInt(pendingBtn.querySelector('.segmented-badge')?.innerText || '0', 10) : 0;
 const approvedBadge = approvedBtn ? parseInt(approvedBtn.querySelector('.segmented-badge')?.innerText || '0', 10) : 0;
 const finishedBadge = finishedBtn ? parseInt(finishedBtn.querySelector('.segmented-badge')?.innerText || '0', 10) : 0;

 if (pendingBadge > 0 && pendingBtn) {
 filterMyBookings('PENDING', pendingBtn);
 } else if (approvedBadge > 0 && approvedBtn) {
 filterMyBookings('APPROVED', approvedBtn);
 } else if (finishedBadge > 0 && finishedBtn) {
 filterMyBookings('FINISHED', finishedBtn);
 } else if (pendingBtn) {
 filterMyBookings('PENDING', pendingBtn);
 }

 checkBookingConflict();
 renderTimeRangePills();

 document.querySelectorAll('.btn-open-reject').forEach(btn => {
 btn.addEventListener('click', function() {
 openRejectModal(this.dataset.bookingId, this.dataset.title, this.dataset.requester);
 });
 });

 const urlParams = new URLSearchParams(window.location.search);
 const bParam = urlParams.get('building');
 if (bParam && ['1', '2', '3'].includes(bParam)) {
 selectBuilding(Number(bParam));
 }

 const viewParam = urlParams.get('view') || urlParams.get('tab');
 if (viewParam) {
 const cleanView = viewParam.replace('tab-', '');
 const validViews = ['home', 'booking', 'mybookings', 'profile', 'approvals', 'facility', 'facility-block', 'timeline'];
 if (validViews.includes(cleanView)) {
 switchRequesterView(cleanView);
 }
 }

 const activeCalCard = document.querySelector('.mini-cal-day-card.active');
 if (activeCalCard) {
 activeCalCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
 }

 if (document.getElementById('btn-maint-building-1')) {
 selectMaintBuilding(1);
 }
 });

 function changeBookingDate(newDate) {
 if (!newDate) return;
 const url = new URL(window.location.href);
 url.searchParams.set('date', newDate);

 const isMaintView = document.getElementById('req-view-facility-block') &&
 document.getElementById('req-view-facility-block').style.display !== 'none';
 if (isMaintView) {
 url.searchParams.set('view', 'facility-block');
 } else {
 url.searchParams.set('view', 'booking');
 }

 const activeBuilding = document.querySelector('.building-card.active');
 if (activeBuilding) {
 const bNum = activeBuilding.id.replace('btn-building-', '').replace('btn-maint-building-', '');
 if (bNum) url.searchParams.set('building', bNum);
 }
 window.location.href = url.toString();
 }

 function navigateMiniCal(direction) {
 const cur = new Date(SELECTED_DATE + 'T00:00:00');
 cur.setDate(cur.getDate() + direction);
 const minDate = new Date(TODAY_STR + 'T00:00:00');
 if (cur < minDate) return;

 const yyyy = cur.getFullYear();
 const mm = String(cur.getMonth() + 1).padStart(2, '0');
 const dd = String(cur.getDate()).padStart(2, '0');
 changeBookingDate(`${yyyy}-${mm}-${dd}`);
 }

 let maintRangeStartHour = 9;
 let maintRangeEndHour = 12;
 let maintIsSettingEnd = false;

 function selectMaintBuilding(buildingNumber, btn = null) {
 document.querySelectorAll('#req-view-facility-block .building-card').forEach(b => b.classList.remove('active'));
 if (btn) {
 btn.classList.add('active');
 } else {
 const targetBtn = document.getElementById(`btn-maint-building-${buildingNumber}`);
 if (targetBtn) targetBtn.classList.add('active');
 }

 const roomsBox = document.getElementById('maintBuildingRoomsBox');
 const headerLabel = document.getElementById('maintBuildingRoomsHeaderLabel');
 if (roomsBox) roomsBox.style.display = 'block';
 if (headerLabel) headerLabel.innerText = `ห้องประชุมในตึก ${buildingNumber}:`;

 let visibleCount = 0;
 let firstActiveRoomId = null;
 let firstAnyRoomId = null;
 document.querySelectorAll('.maint-visual-card').forEach(c => {
 const b = c.getAttribute('data-building');
 const isMatch = b === String(buildingNumber);
 c.style.display = isMatch ? 'flex' : 'none';
 if (isMatch) {
 visibleCount++;
 const rId = c.getAttribute('data-room-id');
 if (!firstAnyRoomId) firstAnyRoomId = rId;
 const rObj = ROOMS.find(r => Number(r.room_id) === Number(rId));
 if (rObj && rObj.is_active && !firstActiveRoomId) {
 firstActiveRoomId = rId;
 }
 }
 });

 const chosenRoomId = firstActiveRoomId || firstAnyRoomId;
 const hiddenInput = document.getElementById('maint_form_room_id');
 const currentSelected = hiddenInput ? hiddenInput.value : null;
 const currentCard = currentSelected ? document.querySelector(`.maint-visual-card[data-room-id="${currentSelected}"]`) : null;
 const isCurrentInBuilding = currentCard && currentCard.getAttribute('data-building') === String(buildingNumber);

 if (!isCurrentInBuilding && chosenRoomId) {
 selectMaintRoom(chosenRoomId);
 } else if (currentSelected) {
 selectMaintRoom(currentSelected);
 }
 }

 function selectMaintRoom(roomId) {
 const hiddenInput = document.getElementById('maint_form_room_id');
 if (hiddenInput) hiddenInput.value = roomId;

 document.querySelectorAll('.maint-visual-card').forEach(c => {
 const match = c.getAttribute('data-room-id') === String(roomId);
 c.classList.toggle('selected', match);
 });

 renderMaintTimeRangePills();
 checkMaintConflict();
 }

 function onMaintTimeRangePillClick(hour) {
 const guidePill = document.getElementById('maintSlotGuidePill');

 if (hour === 18) {
 if (maintIsSettingEnd && maintRangeStartHour < 18) {
 maintRangeEndHour = 18;
 maintIsSettingEnd = false;
 } else {
 maintRangeStartHour = 17;
 maintRangeEndHour = 18;
 maintIsSettingEnd = false;
 }
 } else if (!maintIsSettingEnd || hour < maintRangeStartHour) {
 maintRangeStartHour = hour;
 maintRangeEndHour = hour + 1;
 maintIsSettingEnd = true;
 } else if (hour === maintRangeStartHour && maintRangeEndHour === hour + 1) {
 maintIsSettingEnd = false;
 } else {
 maintRangeEndHour = hour + 1;
 maintIsSettingEnd = false;
 }

 if (guidePill) {
 guidePill.className = 'conflict-status-banner';
 guidePill.style.background = '#fffbeb';
 guidePill.style.color = '#b45309';
 guidePill.style.borderColor = '#fde68a';
 const dur = maintRangeEndHour - maintRangeStartHour;
 guidePill.innerText = `ช่วงเวลาปิดซ่อม: ${String(maintRangeStartHour).padStart(2,'0')}:00 - ${String(maintRangeEndHour).padStart(2,'0')}:00 น. (${dur} ชม.)`;
 }

 const startSelect = document.getElementById('maint_start_time');
 const endSelect = document.getElementById('maint_end_time');
 if (startSelect) startSelect.value = `${String(maintRangeStartHour).padStart(2,'0')}:00`;
 if (endSelect) {
 Array.from(endSelect.options).forEach(opt => {
 const optH = parseInt(opt.value.split(':')[0], 10);
 opt.disabled = optH <= maintRangeStartHour;
 });
 endSelect.value = `${String(maintRangeEndHour).padStart(2,'0')}:00`;
 }

 renderMaintTimeRangePills();
 checkMaintConflict();
 }

 function renderMaintTimeRangePills() {
 const hiddenInput = document.getElementById('maint_form_room_id');
 if (!hiddenInput) return;
 const roomId = Number(hiddenInput.value);

 document.querySelectorAll('.maint-time-pill').forEach(pill => {
 const h = parseInt(pill.getAttribute('data-hour'), 10);
 pill.className = 'time-slot-pill maint-time-pill';

 if (h === 18) {
 const slotStart = new Date(`${SELECTED_DATE}T17:00:00`);
 const slotEnd = new Date(`${SELECTED_DATE}T18:00:00`);
 const overlap = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['PENDING_APPROVAL', 'APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < slotEnd && bEnd > slotStart;
 });
 if (overlap && overlap.status === 'BLOCKED') {
 pill.classList.add('is-booked');
 pill.title = 'ปิดซ่อมอยู่แล้ว';
 }
 } else {
 const hStartStr = `${String(h).padStart(2,'0')}:00`;
 const hEndStr = `${String(h+1).padStart(2,'0')}:00`;
 const slotStart = new Date(`${SELECTED_DATE}T${hStartStr}:00`);
 const slotEnd = new Date(`${SELECTED_DATE}T${hEndStr}:00`);

 const overlap = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['PENDING_APPROVAL', 'APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < slotEnd && bEnd > slotStart;
 });

 if (overlap) {
 if (overlap.status === 'BLOCKED') {
 pill.classList.add('is-booked');
 pill.title = `ปิดซ่อมอยู่แล้ว: ${overlap.title}`;
 } else {
 pill.classList.add('is-booked');
 pill.title = `มีคิวจอง: ${overlap.title} (${overlap.status})`;
 }
 }
 }

 if (!pill.classList.contains('is-booked')) {
 if (h === maintRangeStartHour) {
 pill.classList.add('is-maint-start');
 } else if (h === maintRangeEndHour) {
 pill.classList.add('is-maint-end');
 } else if (h > maintRangeStartHour && h < maintRangeEndHour) {
 pill.classList.add('in-maint-range');
 }
 }
 });
 }

 function checkMaintConflict() {
 const roomInput = document.getElementById('maint_form_room_id');
 const startInput = document.getElementById('maint_start_time');
 const endInput = document.getElementById('maint_end_time');
 const banner = document.getElementById('maintConflictBanner');
 const submitBtn = document.getElementById('maintSubmitBtn');

 if (!roomInput || !startInput || !endInput || !banner || !submitBtn) return;

 const roomId = Number(roomInput.value);
 const room = ROOMS.find(r => Number(r.room_id) === roomId);
 const startTimeStr = startInput.value;
 const endTimeStr = endInput.value;

 if (!startTimeStr || !endTimeStr) return;

 const start = new Date(`${SELECTED_DATE}T${startTimeStr}:00`);
 const end = new Date(`${SELECTED_DATE}T${endTimeStr}:00`);

 if (end <= start) {
 banner.className = 'conflict-status-banner is-conflict';
 banner.innerHTML = '<span>เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น</span>';
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 return;
 }

 const conflict = DAY_BOOKINGS.find(b => {
 if (Number(b.room_id) !== roomId) return false;
 if (!['PENDING_APPROVAL', 'APPROVED', 'IN_USE', 'BLOCKED'].includes(b.status)) return false;
 const bStart = new Date(b.start_time);
 const bEnd = new Date(b.end_time);
 return bStart < end && bEnd > start;
 });

 if (conflict) {
 banner.className = 'conflict-status-banner is-conflict';
 const typeLabel = conflict.status === 'BLOCKED' ? 'ปิดซ่อมอยู่แล้ว' : 'มีคิวจองพนักงาน';
 banner.innerHTML = `<span> ช่วงเวลานี้ชนกับ: "${conflict.title}" (${typeLabel})</span>`;
 submitBtn.disabled = true;
 submitBtn.style.opacity = '0.5';
 submitBtn.style.cursor = 'not-allowed';
 } else {
 const durationHours = Math.round((end - start) / (1000 * 60 * 60));
 banner.className = 'conflict-status-banner is-free';
 banner.innerHTML = `<span> พร้อมทำการบล็อกปิดซ่อมห้อง ${room ? room.room_name : ''} ช่วง ${startTimeStr} - ${endTimeStr} น. (${durationHours} ชั่วโมง)</span>`;
 submitBtn.disabled = false;
 submitBtn.style.opacity = '1';
 submitBtn.style.cursor = 'pointer';
 }

 const sH = parseInt(startTimeStr.split(':')[0], 10);
 const eH = parseInt(endTimeStr.split(':')[0], 10);
 if (!isNaN(sH) && !isNaN(eH)) {
 maintRangeStartHour = sH;
 maintRangeEndHour = eH;
 renderMaintTimeRangePills();
 }
 }

 function onMaintStartTimeChange() {
 const startSelect = document.getElementById('maint_start_time');
 const endSelect = document.getElementById('maint_end_time');
 if (!startSelect || !endSelect) return;

 const startHour = parseInt(startSelect.value.split(':')[0], 10);
 const endHour = parseInt(endSelect.value.split(':')[0], 10);

 Array.from(endSelect.options).forEach(opt => {
 const optHour = parseInt(opt.value.split(':')[0], 10);
 opt.disabled = optHour <= startHour;
 });

 if (endHour <= startHour) {
 const nextHour = Math.min(18, startHour + 1);
 endSelect.value = `${String(nextHour).padStart(2, '0')}:00`;
 }

 checkMaintConflict();
 }

 function blockWholeDayMaint() {
 maintRangeStartHour = 9;
 maintRangeEndHour = 18;
 maintIsSettingEnd = false;
 const startSelect = document.getElementById('maint_start_time');
 const endSelect = document.getElementById('maint_end_time');
 if (startSelect) startSelect.value = '09:00';
 if (endSelect) endSelect.value = '18:00';
 renderMaintTimeRangePills();
 checkMaintConflict();
 }

 function setMaintPresetReason(text) {
 const input = document.getElementById('maint_reason_input');
 if (input) {
 input.value = text;
 input.focus();
 }
 }
