import { useEffect, useRef } from 'react';

/**
 * Atrapa el foco dentro de un diálogo mientras está abierto y lo restaura
 * al elemento que lo abrió al cerrarse.
 *
 * Sin esto, un `aria-modal="true"` sin focus trap anuncia una garantía que el
 * código no cumple: al tabular, el foco escapa al fondo de la página y el
 * usuario de teclado queda perdido.
 */
export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onEscape?: () => void,
) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const root = containerRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    // Mueve el foco al primer control utilizable al abrir.
    const focusFirst = () => {
      const focusables = getFocusable();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (containerRef.current) {
        containerRef.current.focus();
      }
    };

    const rafId = window.setTimeout(focusFirst, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !containerRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !containerRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(rafId);
      document.removeEventListener('keydown', handleKeyDown, true);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [isOpen, onEscape]);

  return containerRef;
}
