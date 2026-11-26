const CONTROLS = 'button, a[href], summary, input:not([type="hidden"]), select, textarea';
const TEXT_FIELDS = 'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="number"]';
const SURFACES = [
  '.app-shell.nav-open .sidebar',
  '.side-panel.overlay',
  '.settings-select-menu:not([hidden])',
  '.converter-select-menu',
  '.date-native-calendar',
  '.date-native-mode-menu',
  '.graph-expression-style-panel',
  '.graph-settings-panel',
  '.scientific-operator-menu',
  '.graphing-operator-menu'
];
const DIRECTIONS = {
  up: [12, 1, -1],
  down: [13, 1, 1],
  left: [14, 0, -1],
  right: [15, 0, 1]
};
const DEAD_ZONE = 0.55;
const FOCUS_ATTR = 'data-gamepad-focus';

function isVisible(element) {
  return element.checkVisibility({ visibilityProperty: true });
}

function activeSurface(root) {
  for (const selector of SURFACES) {
    const surface = [...root.querySelectorAll(selector)].find(isVisible);
    if (surface) return { selector, surface };
  }
  return { selector: '', surface: root };
}

function getControls(surface) {
  return [...surface.querySelectorAll(CONTROLS)].filter((el) =>
    !el.matches(':disabled, [tabindex="-1"], [aria-disabled="true"]')
    && !el.closest('[inert], [hidden], .surface-scrim, .app-shell:not(.nav-open) .sidebar')
    && isVisible(el)
  );
}

function getFocusKey(el) {
  const data = [...el.attributes]
    .filter(({ name }) => name.startsWith('data-') && !name.startsWith('data-gamepad-') && !name.startsWith('data-tooltip'))
    .map(({ name, value }) => [name, value]);
  return JSON.stringify([el.tagName, el.id, el.getAttribute('name'), el.getAttribute('value'), data,
    data.length || el.id || el.getAttribute('name') ? '' : el.textContent.trim()]);
}

function focusControl(control) {
  if (!control) return;
  document.querySelector(`[${FOCUS_ATTR}]`)?.removeAttribute(FOCUS_ATTR);
  control.setAttribute(FOCUS_ATTR, '');
  control.focus({ preventScroll: true });
  (control.closest('label') ?? control).scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function findDirectionalControl(current, controls, axis, sign) {
  const edges = (rect) => axis === 0
    ? [rect.left, rect.right, rect.top, rect.bottom]
    : [rect.top, rect.bottom, rect.left, rect.right];
  const [start, end, crossStart, crossEnd] = edges(current.getBoundingClientRect());
  let aligned;
  let nearby;
  for (const control of controls) {
    if (control === current) continue;
    const [nextStart, nextEnd, nextCrossStart, nextCrossEnd] = edges(control.getBoundingClientRect());
    const gap = sign > 0 ? nextStart - end : start - nextEnd;
    if (gap < -1) continue;
    const crossDistance = Math.abs(nextCrossStart + nextCrossEnd - crossStart - crossEnd) / 2;
    const overlaps = nextCrossStart < crossEnd && nextCrossEnd > crossStart;
    if (overlaps && (!aligned || gap < aligned.gap || (gap === aligned.gap && crossDistance < aligned.crossDistance))) {
      aligned = { control, gap, crossDistance };
    }
    const score = gap + 2 * crossDistance;
    if (!nearby || score < nearby.score) nearby = { control, score };
  }
  return aligned?.control ?? nearby?.control;
}

function getDirection(gamepad) {
  return Object.entries(DIRECTIONS).find(([, [button, axis, sign]]) =>
    gamepad.buttons[button]?.pressed || (gamepad.axes[axis] ?? 0) * sign > DEAD_ZONE
  )?.[0];
}

export function installGamepadControls(root, { goBack, panGraph, isCapturingShortcut }) {
  if (!navigator.getGamepads) return { preserveFocus: () => () => {} };

  const focusBySurface = new Map();
  const pressedByGamepad = new Map();
  let gamepadActive = false;
  let frame = 0;
  let lastPoll = 0;
  let editingSelect;

  function stopSelectEditing() {
    if (!editingSelect) return;
    editingSelect.control.selectedIndex = editingSelect.index;
    editingSelect.control.removeAttribute('data-gamepad-selecting');
    editingSelect = undefined;
  }

  function restoreFocus() {
    const { selector, surface } = activeSurface(root);
    const controls = getControls(surface);
    focusControl(controls.find((control) => getFocusKey(control) === focusBySurface.get(selector))
      ?? controls.find((control) => control.matches('[aria-current="page"], [aria-selected="true"]'))
      ?? controls[0]);
  }

  function preserveFocus() {
    if (!gamepadActive) return () => {};
    const { selector, surface } = activeSurface(root);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && surface.contains(focused)) {
      focusBySurface.set(selector, getFocusKey(focused));
    }
    stopSelectEditing();
    return restoreFocus;
  }

  function usePointerOrKeyboard(event) {
    if (!event.isTrusted || !gamepadActive) return;
    stopSelectEditing();
    document.querySelector(`[${FOCUS_ATTR}]`)?.removeAttribute(FOCUS_ATTR);
    gamepadActive = false;
  }

  function move(direction) {
    const [, axis, sign] = DIRECTIONS[direction];
    if (editingSelect) {
      const { control } = editingSelect;
      for (let index = control.selectedIndex + sign; index >= 0 && index < control.length; index += sign) {
        if (control.options[index].matches(':disabled, [hidden]')) continue;
        control.selectedIndex = index;
        break;
      }
      return;
    }
    const { surface } = activeSurface(root);
    const controls = getControls(surface);
    const current = document.activeElement;
    if (!controls.includes(current)) {
      restoreFocus();
      return;
    }
    focusControl(findDirectionalControl(current, controls, axis, sign));
  }

  function activate() {
    const { surface } = activeSurface(root);
    const control = document.activeElement;
    if (!getControls(surface).includes(control)) {
      restoreFocus();
      return;
    }
    if (control instanceof HTMLSelectElement) {
      if (editingSelect?.control === control) {
        const changed = control.selectedIndex !== editingSelect.index;
        editingSelect = undefined;
        control.removeAttribute('data-gamepad-selecting');
        if (changed) control.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        editingSelect = { control, index: control.selectedIndex };
        control.setAttribute('data-gamepad-selecting', '');
      }
    } else if (control.matches(TEXT_FIELDS) && !control.readOnly) {
      const { x, y, width, height } = control.getBoundingClientRect();
      const mode = control.matches('input[type="number"]') ? 3 : control.matches('textarea') ? 1 : 0;
      void window.appWindow?.showGamepadKeyboard?.(mode, [x, y, width, height]);
    } else {
      control.click();
    }
  }

  function poll(timestamp) {
    frame = 0;
    const elapsed = Math.min(32, timestamp - lastPoll);
    lastPoll = timestamp;
    const gamepads = [...navigator.getGamepads()].filter((pad) => pad?.connected && pad.mapping === 'standard');
    for (const gamepad of gamepads) {
      const direction = getDirection(gamepad);
      const confirm = Boolean(gamepad.buttons[0]?.pressed);
      const back = Boolean(gamepad.buttons[1]?.pressed);
      const menu = Boolean(gamepad.buttons[9]?.pressed);
      const previous = pressedByGamepad.get(gamepad.index);
      const moveNow = direction && (direction !== previous?.direction || timestamp >= previous.repeatAt);
      const repeatAt = moveNow ? timestamp + (direction === previous?.direction ? 100 : 350) : previous?.repeatAt;
      pressedByGamepad.set(gamepad.index, { direction, confirm, back, menu, repeatAt });
      if (!document.hasFocus()) continue;

      if (moveNow || (confirm && !previous?.confirm) || (back && !previous?.back) || (menu && !previous?.menu)) {
        gamepadActive = true;
        if (back && !previous?.back) {
          if (editingSelect) stopSelectEditing();
          else goBack();
        } else if (menu && !previous?.menu) {
          stopSelectEditing();
          root.querySelector('.topbar [data-nav-toggle], .topbar [data-settings-back]')?.click();
        } else if (!isCapturingShortcut()) {
          if (moveNow) move(direction);
          if (confirm && !previous?.confirm) activate();
        }
      }

      const x = gamepad.axes[2] ?? 0;
      const y = gamepad.axes[3] ?? 0;
      if (Math.max(Math.abs(x), Math.abs(y)) > DEAD_ZONE && activeSurface(root).surface === root) {
        panGraph(x, y, elapsed);
      }
    }
    if (gamepads.length) wake();
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(poll);
  }

  document.addEventListener('pointerdown', usePointerOrKeyboard, true);
  document.addEventListener('keydown', usePointerOrKeyboard, true);
  window.addEventListener('gamepadconnected', wake);
  window.addEventListener('gamepaddisconnected', ({ gamepad }) => pressedByGamepad.delete(gamepad.index));
  wake();
  return { preserveFocus };
}
