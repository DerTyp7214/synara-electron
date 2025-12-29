export default {
  us: {
    title: "Synara",

    "player.playingAt": "Playing At {{bitrate}}kbps ({{sampleRate}}kHz)",

    duration: "Duration",

    logout: "Logout",

    paused: "Paused",

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

    "settings.title": "Settings",
    "settings.check": "Check",
    "settings.apply": "Apply",

    "settings.main": "Main",
    "settings.tidalSync": "Tidal Sync",
    "settings.audioVisualizer": "Audio Visualizer",

    "settings.tidalSync.login": "Login with Tidal",
    "settings.tidalSync.confirm": "Confirm when authenticated with Tidal.",
    "settings.tidalSync.authorized": "Tidal is authorized",

    "settings.synara.session": "Session",
    "settings.default": "Default: {{value}}",
    "settings.apiBase": "API Base",
    "settings.lastFmApiKey": "LastFM API Key",
    "settings.lastFmSharedSecret": "LastFM Shared Secret",
    "settings.hideOnClose": "Hide on Close",
    "settings.discordRpc": "Discord RPC",
    "settings.lastFm": "Music Scrobbling",
    "settings.lastFm.login": "Login",
    "settings.lastFm.logout": "Logout",
    "settings.lastFmSession": "LastFM Session",
    "settings.listenBrainzToken": "ListenBrainz Token",
    "settings.cleanTitles": "Clean Titles",
    "settings.downloadDir": "Download Directory",
    "settings.particleMultiplier": "Particle Multiplier (0 = disabled)",
    "settings.velocityMultiplier": "Velocity Multiplier",

    "downloads.queue": "Download queue",
    "downloads.notAuthenticated": "TDN is not authenticated.",
    "downloads.login": "Login TDN",
    "downloads.noLogs": "No logs.",

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

    "delete.song": "Delete Song",
    "delete.song.confirm":
      "Are you sure you want to delete this song ({{title}})?",
    "delete.album": "Delete Album",
    "delete.album.confirm":
      "Are you sure you want to delete this album ({{name}})?",

    "search.placeholder": "Search",
  },
} as const;
