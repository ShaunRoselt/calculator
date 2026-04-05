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
  if (kind === 'graph-view') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 18.5h15M7 6.5v12M7.5 15c2.5-5 4.4-6 5.9-6 1.3 0 2.7 1.1 4.6 4.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'expressions-view') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12M6 12h12M6 16.5h12M4.5 7.5h.01M4.5 12h.01M4.5 16.5h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/></svg>';
  }
  if (kind === 'graph-select') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 5 9.5 7L11 13.5 13.5 19 11.75 20 9 14.5 6 17z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>';
  }
  if (kind === 'graph-share') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6h5v5M19 5l-8.5 8.5M11 7H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'graph-options') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12M6 12h12M6 16.5h12M9 5.5v4M15 10v4M12 14.5v4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'programmer-keypad') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5h2v2H8zm3 0h2v2h-2zm3 0h2v2h-2zM8 9.5h2v2H8zm3 0h2v2h-2zm3 0h2v2h-2zM8 12.5h2v2H8zm3 0h2v2h-2zm3 0h2v2h-2zM8 15.5h2v2H8zm3 0h2v2h-2zm3 0h2v2h-2z" fill="currentColor"/></svg>';
  }
  if (kind === 'programmer-bitflip') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 7.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm9 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-9 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm9 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM9.5 9.5h5M9.5 14.5h5M7.5 11.5v1M16.5 11.5v1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>';
  }
  if (kind === 'bitwise') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5h4v7h-4zM13.5 6.5h4v11h-4zM10.5 12h3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>';
  }
  if (kind === 'bitshift') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 8 4 4-4 4M13 8l4 4-4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>';
  }
  if (kind === 'scientific-trig') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 18.5h14M6.5 18.5V8.25l8 10.25M9 13.5h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>';
  }
  if (kind === 'scientific-function') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5.5c-2.7 0-4.5 1.9-4.5 4.9v8.1M8 9.5h8M8 18.5h8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>';
  }
  return '';
}

export function renderNavIcon(kind) {
  const icons = {
    standard: '<path d="M6 6.5h12v11H6zM8.5 10.5h7M8.5 13.5h2M12 13.5h2M15.5 13.5h0" />',
    scientific: '<path d="M6 8.5h5M6 12h4M6 15.5h5M14.5 7.5l3 3m0-3-3 3M13.5 15.5h5" />',
    graphing: '<path d="M5 17h14M7 6v11M7 15c2-5 4-6 5-6s2 1 5 6" />',
    programmer: '<rect x="5" y="6.5" width="14" height="11" rx="2"/><path d="M8 10.5h8M8 13.5h1.5m2 0H13m2 0h1.5" />',
    date: '<rect x="6" y="7" width="12" height="11" rx="2"/><path d="M9 5.5v3M15 5.5v3M6 10h12" />',
    currency: '<path d="M12 5.5v13M15.5 8.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" />',
    volume: '<path d="M8.5 6.5h7l2 11h-11zM10 10.5h4" />',
    length: '<path d="M6 15.5h12M7.5 12.5v3m3-2v2m3-3v3m3-2v2" />',
    weight: '<path d="M8 9.5h8l1.5 7h-11zM10 9.5a2 2 0 0 1 4 0" />',
    temperature: '<path d="M10 7.5a2 2 0 1 1 4 0v6.2a3.2 3.2 0 1 1-4 0z" />',
    energy: '<path d="M12.5 5.5 8.5 12h3l-1 6 5-7h-3z" />',
    area: '<rect x="7" y="7.5" width="10" height="9" rx="1.5"/><path d="M10 7.5v9M7 11.5h10" />',
    speed: '<path d="M6.5 15.5a5.5 5.5 0 1 1 11 0M12 12l3-2" />',
    time: '<circle cx="12" cy="12" r="6.5"/><path d="M12 8.5v4l2.5 1.5" />',
    power: '<path d="M12 5.5v6M8.5 7.5a5 5 0 1 0 7 0" />',
    data: '<rect x="6" y="6.5" width="12" height="3" rx="1.5"/><rect x="6" y="10.5" width="12" height="3" rx="1.5"/><rect x="6" y="14.5" width="12" height="3" rx="1.5" />',
    pressure: '<path d="M6.5 15.5a5.5 5.5 0 1 1 11 0M12 12l2-3" />',
    angle: '<path d="M7 16.5h10M7 16.5V8l8 8.5" />',
    settings: '<path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0-3 1 .9 1.4-.2.7 1.2 1.3.5-.1 1.4 1 1-.6 1.3.6 1.3-1 1 .1 1.4-1.3.5-.7 1.2-1.4-.2-1 .9-1-.9-1.4.2-.7-1.2-1.3-.5.1-1.4-1-1 .6-1.3-.6-1.3 1-1-.1-1.4 1.3-.5.7-1.2 1.4.2z" />'
  };
  const path = icons[kind];
  if (!path) {
    return '';
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">${path}</g></svg>`;
}
