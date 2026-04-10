let tooltipElement = null;
let activeTooltipTarget = null;

export function prepareTooltipTargets(root = document) {
  root.querySelectorAll('[title]').forEach((element) => {
    const title = element.getAttribute('title');
    if (!title) {
      return;
    }
    if (!element.dataset.tooltip) {
      element.dataset.tooltip = title;
    }
    element.removeAttribute('title');
  });
}

export function installTooltipHandling() {
  if (tooltipElement) {
    return;
  }

  tooltipElement = document.createElement('div');
  tooltipElement.className = 'app-tooltip';
  tooltipElement.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltipElement);

  document.addEventListener('pointerover', handlePointerOver);
  document.addEventListener('pointerout', handlePointerOut);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);
  document.addEventListener('pointerdown', hideTooltip, true);
  document.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', handleResize);
}

function handlePointerOver(event) {
  const target = findTooltipTarget(event.target);
  if (!target) {
    hideTooltip();
    return;
  }
  showTooltip(target);
}

function handlePointerOut(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const originTarget = findTooltipTarget(event.target);
  const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
  if (originTarget && relatedTarget && originTarget.contains(relatedTarget)) {
    return;
  }

  if (activeTooltipTarget && relatedTarget instanceof Element) {
    const nextTooltipTarget = findTooltipTarget(relatedTarget);
    if (nextTooltipTarget === activeTooltipTarget) {
      return;
    }
  }

  hideTooltip();
}

function handleFocusIn(event) {
  const target = findTooltipTarget(event.target);
  if (!target) {
    return;
  }
  showTooltip(target);
}

function handleFocusOut(event) {
  const nextTarget = event.relatedTarget instanceof Element ? findTooltipTarget(event.relatedTarget) : null;
  if (nextTarget && nextTarget === activeTooltipTarget) {
    return;
  }
  hideTooltip();
}

function handleResize() {
  if (activeTooltipTarget) {
    positionTooltip(activeTooltipTarget);
  }
}

function findTooltipTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const candidate = target.closest('button, [role="button"], [data-action], [data-graph-zoom], [data-toggle-panel], [data-nav-toggle], [data-settings-back], [data-close-surface], [data-set-mode], [data-memory-op], [data-memory-recall], [data-memory-delete], [data-history-index], [data-history-tab], [data-graph-select], [data-graph-view], [data-converter-swap], [data-converter-active-field], [data-converter-action], [data-currency-action], [data-graph-edit-action], [data-graph-insert]');
  if (!candidate) {
    return null;
  }

  return getTooltipText(candidate) ? candidate : null;
}

function getTooltipText(element) {
  return element?.dataset.tooltip || '';
}

function showTooltip(target) {
  const text = getTooltipText(target);
  if (!tooltipElement || !text) {
    hideTooltip();
    return;
  }

  activeTooltipTarget = target;
  tooltipElement.textContent = text;
  tooltipElement.classList.add('visible');
  positionTooltip(target);
}

function positionTooltip(target) {
  if (!tooltipElement) {
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const margin = 8;
  let left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
  let top = targetRect.top - tooltipRect.height - margin;

  left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

  if (top < 8) {
    top = targetRect.bottom + margin;
  }

  tooltipElement.style.left = `${left}px`;
  tooltipElement.style.top = `${top}px`;
}

function hideTooltip() {
  activeTooltipTarget = null;
  if (!tooltipElement) {
    return;
  }
  tooltipElement.classList.remove('visible');
}