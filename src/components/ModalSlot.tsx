import type { ReactNode } from 'react';

/**
 * @modal slot wrapper — простая обёртка, гарантирующая что Drawer
 * корректно позиционируется как fixed overlay.
 *
 * Drawer внутри имеет `position: fixed; inset-0; z-50`. Чтобы
 * `position: fixed` работал относительно viewport, родительский
 * stacking-context должен быть body.
 *
 * В layout.tsx @modal slot рендерится рядом с <main> как sibling.
 * Поскольку body имеет flex-col (раньше) или просто блочный layout,
 * fixed children работают корректно.
 *
 * Этот компонент оставлен как no-op wrapper для будущего расширения
 * (например, добавления глобальных обработчиков клавиш).
 */
export function ModalSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}