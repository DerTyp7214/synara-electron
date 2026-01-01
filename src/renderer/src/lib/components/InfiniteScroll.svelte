<script lang="ts" generics="T">
  import { onMount, type Snippet, tick } from "svelte";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import { debugLog } from "$lib/utils/logger";
  import cn from "classnames";

  type LoadFunction = (
    page: number,
    pageSize: number,
  ) => Promise<PagedResponse<T>>;

  interface Props<T> {
    class?: string;
    scrollContainer?: HTMLElement;
    items: T[];
    loadMoreUp: LoadFunction;
    loadMoreDown: LoadFunction;
    pageSize: number;

    initialPageUp?: number;
    initialPageDown?: number;

    nextUpPage?: number;
    nextDownPage?: number;

    hasMoreUp?: boolean;
    hasMoreDown?: boolean;

    renderItem: Snippet<[{ item: T; index: number }]>;
    head?: Snippet;
    loadingUp?: Snippet;
    loadingDown?: Snippet;
    noMoreUp?: Snippet;
    noMoreDown?: Snippet;
    noItems?: Snippet;
  }

  let {
    class: clazz = "",
    scrollContainer = $bindable<HTMLElement>(),
    items = $bindable(),
    loadMoreUp,
    loadMoreDown,
    pageSize,
    initialPageUp = -1,
    initialPageDown = 0,
    nextUpPage = $bindable(initialPageUp),
    nextDownPage = $bindable(initialPageDown),
    hasMoreUp = $bindable(true),
    hasMoreDown = $bindable(true),
    renderItem,
    head,
    loadingUp,
    loadingDown,
    noMoreUp,
    noMoreDown,
    noItems,
  }: Props<T> = $props();

  $effect(() => {
    debugLog("info", "InfiniteScroll effect", {
      items,
      nextUpPage,
      nextDownPage,
      initialPageUp,
      initialPageDown,
      hasMoreUp,
      hasMoreDown,
    });
  });

  let topSentinel = $state<HTMLElement>();
  let bottomSentinel = $state<HTMLElement>();
  let isLoadingUp = $state(false);
  let isLoadingDown = $state(false);
  let observer: IntersectionObserver;
  const rootMargin = "100px";

  async function adjustScrollPosition(oldScrollHeight: number) {
    if (!scrollContainer) return;
    await tick();
    const newScrollHeight = scrollContainer.scrollHeight;
    const scrollDifference = newScrollHeight - oldScrollHeight;
    scrollContainer.scrollTop += scrollDifference;
  }

  async function handleLoadUp() {
    if (isLoadingUp || !scrollContainer || !hasMoreUp || nextUpPage < 0) return;
    isLoadingUp = true;

    const oldScrollHeight = scrollContainer.scrollHeight;

    try {
      const response = await loadMoreUp(nextUpPage, pageSize);

      if (response.data.length > 0) {
        items = [...response.data, ...items];
        await adjustScrollPosition(oldScrollHeight);
      }

      hasMoreUp = response.hasNextPage;
      nextUpPage = response.page - 1;
    } catch (error) {
      debugLog("error", "Error loading content up:", error);
    } finally {
      isLoadingUp = false;
    }
  }

  async function handleLoadDown() {
    if (isLoadingDown || !hasMoreDown || nextDownPage < 0) return;
    isLoadingDown = true;

    try {
      const response = await loadMoreDown(nextDownPage, pageSize);

      if (response.data.length > 0) {
        items = [...items, ...response.data];
      }

      hasMoreDown = response.hasNextPage;
      nextDownPage = response.page + 1;
    } catch (error) {
      debugLog("error", "Error loading content down:", error);
    } finally {
      isLoadingDown = false;
    }
  }

  onMount(() => {
    if (!scrollContainer) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === topSentinel) {
              handleLoadUp();
            } else if (entry.target === bottomSentinel) {
              handleLoadDown();
            }
          }
        });
      },
      {
        root: scrollContainer,
        rootMargin: `${rootMargin} 0px ${rootMargin} 0px`,
        threshold: 0.01,
      },
    );

    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    const checkInitialLoad = () => {
      if (
        scrollContainer &&
        scrollContainer.scrollHeight <= scrollContainer.clientHeight &&
        !isLoadingDown &&
        hasMoreDown
      ) {
        handleLoadDown();
      }
    };
    const timeout = setTimeout(checkInitialLoad, 100);

    return () => {
      if (topSentinel) observer.unobserve(topSentinel);
      if (bottomSentinel) observer.unobserve(bottomSentinel);
      clearTimeout(timeout);
    };
  });

  function key(item: T, index: number) {
    return `${item} - ${index}`;
  }
</script>

<div
  class={cn("flex flex-col overflow-y-scroll", clazz)}
  bind:this={scrollContainer}
>
  {@render head?.()}
  <div bind:this={topSentinel} class="my-1 h-px w-full text-center text-sm">
    {#if isLoadingUp}
      {@render loadingUp?.()}
    {:else if !hasMoreUp && items.length > 0}
      {@render noMoreUp?.()}
    {/if}
  </div>

  {#each items as item, index (key(item, index))}
    {@render renderItem({ item, index })}
  {:else}
    {@render noItems?.()}
  {/each}

  <div bind:this={bottomSentinel} class="my-1 h-px w-full text-center text-sm">
    {#if isLoadingDown}
      {@render loadingDown?.()}
    {:else if !hasMoreDown && items.length > 0}
      {@render noMoreDown?.()}
    {/if}
  </div>
</div>
