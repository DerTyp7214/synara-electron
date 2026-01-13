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

        pname = "synara-desktop";
        version = "latest";

        runtimeLibs = with pkgs; [
          gtk3 nspr nss atk at-spi2-atk dbus pango cairo libdrm libGL 
          mesa vulkan-loader expat alsa-lib libxkbcommon pixman zlib 
          glib libsecret libpulseaudio systemd libuuid cups
          xorg.libX11 xorg.libXcomposite xorg.libXdamage xorg.libXext 
          xorg.libXfixes xorg.libXrandr stdenv.cc.cc.lib libgbm
          gsettings-desktop-schemas
        ];
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          inherit pname version;

          src = pkgs.fetchurl {
            url = "https://github.com/DerTyp7214/synara/releases/download/latest-dev-desktop/synara-desktop.tar.gz";
            sha256 = "sha256-QALbnqiw+rbrIzju5cky+JZL5EmW3Yl9zesp/WIyY6M=";
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
              exec = pname;
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
      });
}