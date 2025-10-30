<script lang="ts">
  import { listSongs } from "$lib/api/songs.js";
  import SongList from "$lib/components/SongList.svelte";
  import { PlayingSourceType } from "$lib/audio/mediaSession";
  import cn from "classnames";
</script>

<div class={cn("max-h-full w-full flex-1 overflow-y-auto p-8")}>
  <SongList
    getSongs={listSongs}
    playingSource={{
      type: PlayingSourceType.LikedSongs,
      id: "----",
    }}
  />
</div>
