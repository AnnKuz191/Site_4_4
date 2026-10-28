// Работа с localStorage: один ключ приложения
const KEY = 'hawkins-cinema-demo-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { bookings: [] };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.bookings)) {
      return { bookings: [], corrupted: true };
    }
    return { bookings: data.bookings };
  } catch (e) {
    return { bookings: [], corrupted: true, error: e.message };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch (e) {
    return false;
  }
}