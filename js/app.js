import { ROWS, COLS, SESSIONS, seatKey, seatLabel } from './data.js';
import { loadState, saveState, clearState } from './storage.js';

/* ============ СОСТОЯНИЕ ============ */
const state = {
  currentSessionId: SESSIONS[0].id,
  selectedSeats: [], // [{row, col}]
  name: '',
  bookings: [],
};

/* ============ DOM ============ */
const els = {
  sessionTabs: document.getElementById('sessionTabs'),
  hall: document.getElementById('hall'),
  selectionInfo: document.getElementById('selectionInfo'),
  nameInput: document.getElementById('nameInput'),
  nameError: document.getElementById('nameError'),
  seatsCount: document.getElementById('seatsCount'),
  totalPrice: document.getElementById('totalPrice'),
  confirmBtn: document.getElementById('confirmBtn'),
  confirmError: document.getElementById('confirmError'),
  bookingsList: document.getElementById('bookingsList'),
  resetBtn: document.getElementById('resetBtn'),
  toast: document.getElementById('toast'),
};

/* ============ УТИЛИТЫ ============ */
function showToast(msg, ms = 3000) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), ms);
}

function getSession(id = state.currentSessionId) {
  return SESSIONS.find((s) => s.id === id) || SESSIONS[0];
}

// Занятые места текущего сеанса + занятые подтверждёнными бронями
function getTakenSet() {
  const session = getSession();
  const taken = new Set(session.taken);
  state.bookings
    .filter((b) => b.sessionId === session.id)
    .forEach((b) => b.seats.forEach((s) => taken.add(seatKey(s.row, s.col))));
  return taken;
}

function isSeatSelected(row, col) {
  return state.selectedSeats.some((s) => s.row === row && s.col === col);
}

/* ============ РЕНДЕР СЕАНСОВ ============ */
function renderSessions() {
  els.sessionTabs.innerHTML = '';
  SESSIONS.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'session-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(s.id === state.currentSessionId));
    btn.innerHTML = `
      <span class="time">${s.time}</span>
      <span class="movie">${s.movie}</span>
    `;
    btn.addEventListener('click', () => {
      if (state.currentSessionId === s.id) return;
      state.currentSessionId = s.id;
      state.selectedSeats = [];
      els.nameError.textContent = '';
      els.confirmError.textContent = '';
      renderAll();
    });
    els.sessionTabs.appendChild(btn);
  });
}

/* ============ РЕНДЕР ЗАЛА ============ */
function renderHall() {
  els.hall.innerHTML = '';
  const taken = getTakenSet();

  for (let r = 0; r < ROWS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'hall-row';

    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = r + 1;
    rowEl.appendChild(label);

    for (let c = 0; c < COLS; c++) {
      const key = seatKey(r, c);
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'seat';
      seat.textContent = c + 1;
      seat.dataset.row = r;
      seat.dataset.col = c;

      const selected = isSeatSelected(r, c);
      const occupied = taken.has(key);

      if (occupied) {
        seat.classList.add('taken');
        seat.disabled = true;
        seat.setAttribute('aria-label', `${seatLabel(r, c)} — занято`);
      } else if (selected) {
        seat.classList.add('selected');
        seat.setAttribute('aria-pressed', 'true');
        seat.setAttribute('aria-label', `${seatLabel(r, c)} — выбрано`);
      } else {
        seat.classList.add('free');
        seat.setAttribute('aria-pressed', 'false');
        seat.setAttribute('aria-label', `${seatLabel(r, c)} — свободно`);
      }

      seat.addEventListener('click', () => toggleSeat(r, c, occupied));
      rowEl.appendChild(seat);
    }
    els.hall.appendChild(rowEl);
  }
}

function toggleSeat(row, col, occupied) {
  if (occupied) return;
  const idx = state.selectedSeats.findIndex((s) => s.row === row && s.col === col);
  if (idx >= 0) {
    state.selectedSeats.splice(idx, 1);
  } else {
    if (state.selectedSeats.length >= COLS) {
      showToast('Нельзя выбрать больше мест, чем в одном ряду.');
      return;
    }
    state.selectedSeats.push({ row, col });
  }
  els.confirmError.textContent = '';
  renderHall();
  renderSelectionInfo();
  updateSummary();
}

/* ============ КАРТОЧКА ВЫБОРА ============ */
function renderSelectionInfo() {
  const session = getSession();
  if (state.selectedSeats.length === 0) {
    els.selectionInfo.innerHTML = '<p class="placeholder">Выберите свободные места на схеме слева.</p>';
    return;
  }
  const chips = state.selectedSeats
    .map(
      (s) => `<span class="chip">Р${s.row + 1}·М${s.col + 1}
        <button type="button" data-row="${s.row}" data-col="${s.col}" aria-label="Убрать ${seatLabel(s.row, s.col)}">×</button>
      </span>`
    )
    .join('');

  els.selectionInfo.innerHTML = `
    <p class="meta" style="color: var(--muted); font-size: 0.85rem; margin-bottom: 0.4rem;">
      ${session.movie} · ${session.time} · цена места ${session.price} ₽
    </p>
    <div class="chips">${chips}</div>
  `;

  els.selectionInfo.querySelectorAll('.chip button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = Number(btn.dataset.row);
      const c = Number(btn.dataset.col);
      toggleSeat(r, c, false);
    });
  });
}

/* ============ ИТОГИ ============ */
function updateSummary() {
  const session = getSession();
  const count = state.selectedSeats.length;
  const total = count * session.price;
  els.seatsCount.textContent = String(count);
  els.totalPrice.textContent = `${total} ₽`;
  els.confirmBtn.disabled = count === 0;
}

/* ============ ПОДТВЕРЖДЕНИЕ ============ */
function handleConfirm() {
  els.nameError.textContent = '';
  els.confirmError.textContent = '';

  // Проверка имени
  const name = els.nameInput.value.trim();
  if (!name) {
    els.nameError.textContent = 'Введите имя зрителя.';
    els.nameInput.focus();
    return;
  }
  if (name.length < 2) {
    els.nameError.textContent = 'Имя должно содержать минимум 2 символа.';
    els.nameInput.focus();
    return;
  }

  // Проверка мест
  if (state.selectedSeats.length === 0) {
    els.confirmError.textContent = 'Выберите хотя бы одно место.';
    return;
  }

  const session = getSession();
  const taken = getTakenSet();

  // Защита от гонки: проверяем, что места всё ещё свободны
  const conflicting = state.selectedSeats.filter((s) => taken.has(seatKey(s.row, s.col)));
  if (conflicting.length > 0) {
    els.confirmError.textContent = 'Некоторые места уже заняты. Выберите другие.';
    state.selectedSeats = state.selectedSeats.filter((s) => !taken.has(seatKey(s.row, s.col)));
    renderHall();
    renderSelectionInfo();
    updateSummary();
    return;
  }

  // Защита от двойного клика: отключаем кнопку сразу
  els.confirmBtn.disabled = true;

  const booking = {
    id: `B${Date.now()}`,
    sessionId: session.id,
    movie: session.movie,
    time: session.time,
    name,
    seats: state.selectedSeats.map((s) => ({ row: s.row, col: s.col })),
    total: state.selectedSeats.length * session.price,
    createdAt: new Date().toISOString(),
  };

  state.bookings.push(booking);

  if (!saveState({ bookings: state.bookings })) {
    showToast('Не удалось сохранить бронь: хранилище недоступно.');
  }

  // Сброс формы
  state.selectedSeats = [];
  els.nameInput.value = '';

  renderAll();
  showToast(`Билет оформлен! Мест: ${booking.seats.length}, сумма: ${booking.total} ₽`);
}

/* ============ МОИ БРОНИ ============ */
function renderBookings() {
  if (state.bookings.length === 0) {
    els.bookingsList.innerHTML = '<div class="empty-bookings">Пока нет бронирований. Выберите места и подтвердите билет.</div>';
    return;
  }

  els.bookingsList.innerHTML = '';
  // Показываем новые сверху
  const sorted = [...state.bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  sorted.forEach((b) => {
    const card = document.createElement('div');
    card.className = 'booking-card';
    const seatsText = b.seats.map((s) => `Р${s.row + 1}·М${s.col + 1}`).join(', ');
    card.innerHTML = `
      <div class="ticket-no">#${b.id.slice(-4)}</div>
      <div class="booking-body">
        <span class="movie-name">${escapeHtml(b.movie)}</span>
        <span class="meta">${escapeHtml(b.time)} · ${escapeHtml(b.name)}</span>
        <span class="meta">Места: ${seatsText}</span>
        <span class="total">Итого: ${b.total} ₽</span>
      </div>
      <button class="cancel-btn" type="button" data-id="${b.id}">Отменить</button>
    `;
    els.bookingsList.appendChild(card);
  });

  els.bookingsList.querySelectorAll('.cancel-btn').forEach((btn) => {
    btn.addEventListener('click', () => cancelBooking(btn.dataset.id));
  });
}

function cancelBooking(id) {
  const idx = state.bookings.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const [removed] = state.bookings.splice(idx, 1);
  if (!saveState({ bookings: state.bookings })) {
    showToast('Не удалось сохранить изменения: хранилище недоступно.');
  }
  // Если отменённая бронь относится к текущему сеансу — обновляем зал
  renderAll();
  showToast(`Бронь #${removed.id.slice(-4)} отменена. Места снова свободны.`);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============ СБРОС ДЕМО ============ */
function handleReset() {
  if (!window.confirm('Сбросить все бронирования и вернуть зал в исходное состояние?')) return;
  state.bookings = [];
  state.selectedSeats = [];
  els.nameInput.value = '';
  clearState();
  renderAll();
  showToast('Демо сброшено. Все места снова как в начале.');
}

/* ============ ГЛАВНЫЙ РЕНДЕР ============ */
function renderAll() {
  renderSessions();
  renderHall();
  renderSelectionInfo();
  updateSummary();
  renderBookings();
}

/* ============ ИНИЦИАЛИЗАЦИЯ ============ */
function init() {
  const loaded = loadState();
  if (loaded.corrupted) {
    showToast('Данные в localStorage повреждены. Демо запущено с чистого листа.', 5000);
  } else if (loaded.error) {
    showToast('Не удалось прочитать сохранённые данные.', 5000);
  }
  state.bookings = Array.isArray(loaded.bookings) ? loaded.bookings : [];

  // Восстанавливаем выбор сеанса
  state.currentSessionId = SESSIONS[0].id;

  els.nameInput.addEventListener('input', () => {
    els.nameError.textContent = '';
  });
  els.confirmBtn.addEventListener('click', handleConfirm);
  els.resetBtn.addEventListener('click', handleReset);

  // Поддержка клавиатуры в зале: стрелки перемещают фокус
  els.hall.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!target.classList || !target.classList.contains('seat')) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    let nr = row;
    let nc = col;
    if (e.key === 'ArrowRight') nc = Math.min(COLS - 1, col + 1);
    else if (e.key === 'ArrowLeft') nc = Math.max(0, col - 1);
    else if (e.key === 'ArrowDown') nr = Math.min(ROWS - 1, row + 1);
    else if (e.key === 'ArrowUp') nr = Math.max(0, row - 1);
    else return;
    e.preventDefault();
    const next = els.hall.querySelector(`.seat[data-row="${nr}"][data-col="${nc}"]`);
    if (next) next.focus();
  });

  renderAll();
}

init();