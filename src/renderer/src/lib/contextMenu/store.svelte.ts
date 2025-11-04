export type ActionFn<TArgs> = (args: TArgs) => void;

export interface MenuItem<TArgs> {
  label: string;
  action: ActionFn<TArgs>;
  args?: TArgs;
}

interface ContextMenuState<T> {
  isOpen: boolean;
  x: number;
  y: number;
  items: Array<MenuItem<T>>;
}

const menuState = $state<ContextMenuState<unknown>>({
  isOpen: false,
  x: 0,
  y: 0,
  items: [],
});

export function openContextMenu<T extends unknown | undefined>(
  event: MouseEvent,
  items: Array<MenuItem<T>>,
) {
  event.preventDefault();

  const x = event.clientX;
  const y = event.clientY;

  menuState.x = x;
  menuState.y = y;
  menuState.items = items as Array<MenuItem<unknown>>;
  menuState.isOpen = true;
}

export function closeContextMenu() {
  menuState.isOpen = false;
}

export const contextMenu = menuState;
