import { derived, type Writable } from "svelte/store";

export function objectPropertyStore<T, K extends keyof T>(
  store: Writable<T>,
  propertyName: K,
) {
  const derivedStore = derived(store, ($store) => $store[propertyName]);
  const { subscribe } = derivedStore;

  function set(newValue: T[K]) {
    store.update(($store) => {
      return {
        ...$store,
        [propertyName]: newValue,
      };
    });
  }

  function update(updaterFn: (currentValue: T[K]) => T[K]) {
    store.update(($store) => {
      const currentValue = $store[propertyName];
      const newValue = updaterFn(currentValue);

      return {
        ...$store,
        [propertyName]: newValue,
      };
    });
  }

  return {
    subscribe,
    set,
    update,
  };
}
