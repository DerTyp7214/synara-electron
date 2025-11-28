export default {
  us: {
    title: "Synara",

    "player.playingAt": "Playing At {{bitrate}}kbps ({{sampleRate}}kHz)",

    duration: "Duration",

    songs: "Songs",
    "n-songs": "{{amount}} Songs",
    "songs.loadMore": "Load More",
    "songs.all": "All Songs",

    "lastFm.confirmToken": "Confirm when you approved token permissions",

    "likedSongs.title": "Liked Songs",

    "playlists.title": "Playlists",
    "playlists.loadMore": "Load More",

    "setup.title": "Setup",
    "setup.submit": "Submit",
    "setup.apiAddress.placeholder": "Address (e.g. 127.0.0.1:8080)",

    "login.title": "Login",
    "login.submit": "Login",
    "login.username.placeholder": "Username",
    "login.password.placeholder": "Password",

    "play.fetch.title": "Fetching songs",
    "play.fetch.description": "Fetching songs for <b>{{name}}</b>",

    "play.next": "Play Next",
    "play.next.success": "<b>{{songTitle}}</b> is playing next.",
    "play.next.error": "Error adding songs: {{message}}",

    "play.addToQueue": "Add to Queue",
    "play.addToQueue.success": "Added <b>{{songCount}}</b> songs to queue.",
    "play.addToQueue.error": "Error adding songs: {{message}}",

    "search.placeholder": "Search",
  },
} as const;
