export function renderWindowControlIcon(kind) {
  if (kind === 'minimize') {
    return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5h8" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="1.1"/></svg>';
  }
  if (kind === 'maximize') {
    return '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.25" y="2.25" width="7.5" height="7.5" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
  }
  return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="1.1"/></svg>';
}

export function renderToolbarIcon(kind) {
  if (kind === 'back') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6.5 4.5 12l5.5 5.5M5.25 12h14.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>';
  }
  if (kind === 'menu') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.75h16M4 12h16M4 17.25h16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
  }
  if (kind === 'history') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.75 8.5A8.5 8.5 0 1 1 12 20.5a8.47 8.47 0 0 1-6.01-2.49M4.75 4.75V9.5h4.75M12 7v5l3 1.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'standard') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h7a2 2 0 0 1 2 2v7m-11 6 6.5-6.5M11 19.5H4.5V13m7.5-8.5h7.5v7.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'backspace') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8L4 12l6-5Zm2.5 3 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>';
  }
  if (kind === 'dismiss') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
  }
  return '';
}
