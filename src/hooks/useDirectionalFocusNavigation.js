import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

function isEditable(element) {
  return element?.matches('input, textarea, select, [contenteditable="true"]');
}

function visibleFocusables() {
  return [...document.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.closest('[inert], [aria-hidden="true"]')) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  });
}

export default function useDirectionalFocusNavigation() {
  useEffect(() => {
    const tvOrRemote = window.matchMedia('(min-width: 1200px) and (hover: none)');
    if (!tvOrRemote.matches) return undefined;

    function moveFocus(event) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || event.defaultPrevented || isEditable(event.target)) return;
      const elements = visibleFocusables();
      if (!elements.length) return;

      const current = document.activeElement;
      const currentRect = current?.getBoundingClientRect?.();
      if (!currentRect || current === document.body || !elements.includes(current)) {
        const first = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? elements[elements.length - 1] : elements[0];
        event.preventDefault();
        first?.focus({ preventScroll: false });
        return;
      }

      const originX = currentRect.left + currentRect.width / 2;
      const originY = currentRect.top + currentRect.height / 2;
      const direction = event.key.slice(5).toLowerCase();
      let nearest = null;
      let nearestScore = Infinity;

      for (const element of elements) {
        if (element === current) continue;
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const dx = x - originX;
        const dy = y - originY;
        const primary = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
        if (primary <= 6) continue;
        const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
        const score = primary + cross * 1.7;
        if (score < nearestScore) {
          nearest = element;
          nearestScore = score;
        }
      }

      if (nearest) {
        event.preventDefault();
        nearest.focus({ preventScroll: false });
      }
    }

    document.addEventListener('keydown', moveFocus);
    return () => document.removeEventListener('keydown', moveFocus);
  }, []);
}
