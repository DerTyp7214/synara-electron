{
  description = "Synara Desktop Binary Flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, utils }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        loadMeta = file: if builtins.pathExists file
          then builtins.fromJSON (builtins.readFile file)
          else { version = "latest"; url = ""; hash = ""; };

        metaStable = loadMeta ./metadata.json;
        metaDev = loadMeta ./metadata-dev.json;

        pname = "synara-desktop";

        runtimeLibs = with pkgs; [
          gtk3 nspr nss atk at-spi2-atk dbus pango cairo libdrm libGL
          mesa vulkan-loader expat alsa-lib libxkbcommon pixman zlib
          glib libsecret libpulseaudio systemd libuuid cups
          xorg.libX11 xorg.libXcomposite xorg.libXdamage xorg.libXext
          xorg.libXfixes xorg.libXrandr stdenv.cc.cc.lib libgbm
          gsettings-desktop-schemas
        ];

        mkSynara = meta: pkgs.stdenv.mkDerivation {
          inherit pname;
          version = meta.version;

          src = pkgs.fetchurl {
            url = meta.url;
            hash = meta.hash;
          };

          nativeBuildInputs = with pkgs; [
            autoPatchelfHook
            makeWrapper
            wrapGAppsHook3
            copyDesktopItems
          ];

          buildInputs = runtimeLibs;
          dontBuild = true;

          desktopItems = [
            (pkgs.makeDesktopItem {
              name = "synara";
              exec = "synara-desktop";
              icon = "synara-desktop";
              desktopName = "Synara";
              genericName = "Synara";
              comment = "Synara Desktop application.";
              categories = [ "Network" "Application" "AudioVideo" "Audio" "Video" ];
              terminal = false;
              startupNotify = true;
              startupWMClass = "synara";
              mimeTypes = [ "x-scheme-handler/synara" ];
              extraConfig = {
                "X-PulseAudio-Properties" = "media.role=music";
              };
            })
          ];

          installPhase = ''
            runHook preInstall

            mkdir -p $out/share/$pname
            cp -r . $out/share/$pname/

            mkdir -p $out/share/icons/hicolor/512x512/apps
            mkdir -p $out/share/icons/hicolor/scalable/apps

            cp $out/share/$pname/resources/app.asar.unpacked/resources/icon.png \
               $out/share/icons/hicolor/512x512/apps/synara-desktop.png || true

            cp $out/share/$pname/resources/app.asar.unpacked/resources/icon.svg \
               $out/share/icons/hicolor/scalable/apps/synara-desktop.svg || true

            autoPatchelf $out/share/$pname

            mkdir -p $out/bin
            makeWrapper $out/share/$pname/synara-desktop $out/bin/$pname \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath runtimeLibs}" \
              --add-flags "--enable-features=WaylandWindowDecorations" \
              --add-flags "--ozone-platform-hint=auto" \
              --add-flags "--enable-wayland-ime" \
              --add-flags "--no-sandbox"

            runHook postInstall
          '';
        };
      in
      {
        packages = {
          default = if metaStable.url != "" then mkSynara metaStable else mkSynara metaDev;
          synara = mkSynara metaStable;
          synara-dev = mkSynara metaDev;
        };
      });
}
