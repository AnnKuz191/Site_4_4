// Данные приложения: сеансы и зал
export const ROWS = 4;
export const COLS = 6;

// Цена места для каждого сеанса
export const SESSIONS = [
  {
    id: 'session-1',
    time: '18:00',
    movie: 'Очень странные дела: Финал',
    price: 450,
    // индексы занятых мест (row-col) для первого сеанса
    taken: ['0-1', '0-4', '1-2', '2-5', '3-0', '3-3', '1-5'],
  },
  {
    id: 'session-2',
    time: '21:30',
    movie: 'Очень странные дела: Финал',
    price: 520,
    taken: ['0-0', '0-5', '1-1', '1-4', '2-0', '2-3', '3-2', '3-5'],
  },
];

export function seatKey(row, col) {
  return `${row}-${col}`;
}

export function seatLabel(row, col) {
  return `Ряд ${row + 1}, место ${col + 1}`;
}