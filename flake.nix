{
  description = "Synara Desktop - NixOS Standard Repackager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    dev-metadata = {
      url = "https://github.com/DerTyp7214/synara/releases/download/latest-dev-desktop/dev-desktop.yml";
      flake = false;
    };

    # Change when prod is released
    prod-metadata = {
      url = "https://github.com/DerTyp7214/synara/releases/download/latest-dev-desktop/dev-desktop.yml";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, dev-metadata, prod-metadata }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        parseConfig = ymlPath: isDev:
          let
            content = builtins.readFile ymlPath;
            versionMatch = builtins.match ".*version: ([0-9.-]+).*" content;
            version = builtins.elemAt versionMatch 0;
            tag = "v${version}${if isDev then "-dev-desktop" else "-desktop"}";
            assetMatch = ".*url: (synara-desktop-${version}.AppImage)\n    sha512: ([a-zA-Z0-9+/=]+).*";
            matches = builtins.match assetMatch content;
          in {
            inherit version tag;
            filename = builtins.elemAt matches 0;
            sha512 = builtins.elemAt matches 1;
          };

        mkSynara = { metadata, isDev }:
          let
            conf = parseConfig metadata isDev;
            pname = "synara${if isDev then "-dev" else ""}";
          in
          pkgs.appimageTools.wrapType2 {
            inherit pname;
            inherit (conf) version;

            src = pkgs.fetchurl {
              url = "https://github.com/DerTyp7214/synara/releases/download/${conf.tag}/${conf.filename}";
              hash = "sha512-${conf.sha512}";
            };

            extraPkgs = pkgs: with pkgs; [ 
              libsecret
              fontconfig
              inter
            ];

            extraInstallCommands = ''
              mkdir -p $out/etc/fonts
              ln -s ${pkgs.makeFontsConf { fontDirectories = [ pkgs.inter ]; }} $out/etc/fonts/fonts.conf

              mkdir -p $out/share/applications
              echo "[Desktop Entry]
              Name=Synara Dev
              Exec=${pname} --ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime --no-sandbox %U
              Terminal=false
              Type=Application
              Icon=synara-desktop
              Categories=Network;" > $out/share/applications/${pname}.desktop
            '';
          };
      in {
        packages = {
          default = mkSynara { metadata = prod-metadata; isDev = false; };
          dev = mkSynara { metadata = dev-metadata; isDev = true; };
        };
      }
    );
}