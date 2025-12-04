import { store } from "./settings";
import { app } from "electron";
import path from "node:path";
import { mkdirSync } from "fs";
import { Song } from "../shared/types/beApi";
import * as fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { UUID } from "node:crypto";
import { fileTypeFromFile } from "file-type";

class OfflineHandler {
  private readonly downloadDir: string;
  private readonly metadataDir: string;

  constructor() {
    this.downloadDir =
      store.get("downloadDir") ?? path.join(app.getPath("music"), "synara");
    this.metadataDir = path.join(app.getPath("userData"), "offline/metadata");

    this.initialize();
  }

  private initialize(): void {
    mkdirSync(this.metadataDir, { recursive: true });
    mkdirSync(this.downloadDir, { recursive: true });
  }

  private getImageUrl<K extends string | undefined>(imageId: K): K {
    if (!imageId) return undefined as K;

    const apiBase = store.get("apiBase");
    if (!apiBase) return undefined as K;

    const url = new URL(`/image/byId/${imageId}`, apiBase);
    return url.toString() as K;
  }

  private getStreamUrl<K extends string | undefined>(songId: K): K {
    if (!songId) return undefined as K;

    const apiBase = store.get("apiBase");
    if (!apiBase) return undefined as K;

    const url = new URL(`/stream/${songId}`, apiBase);
    return url.toString() as K;
  }

  private songMetadataDir() {
    const songsPath = path.join(this.metadataDir, "songs");
    mkdirSync(songsPath, { recursive: true });
    return songsPath;
  }

  private imageMetadataDir() {
    const imagesPath = path.join(this.metadataDir, "images");
    mkdirSync(imagesPath, { recursive: true });
    return imagesPath;
  }

  async downloadSong(song: Song, logback: (log: string) => void) {
    logback(`Saving metadata for song: ${song.title} (${song.id})`);
    await fs.writeFile(
      path.join(this.songMetadataDir(), song.id),
      JSON.stringify(song),
      "utf-8",
    );

    for (const image of new Set(
      [
        song.coverId,
        ...song.artists.map((a) => a.imageId),
        song.album?.coverId,
        ...(song.album?.artists?.map((a) => a.imageId) ?? []),
      ].filter((i) => i !== undefined),
    )) {
      logback(`Downloading image: ${image}`);
      await fs.writeFile(
        path.join(this.imageMetadataDir(), image),
        await fetch(this.getImageUrl(image)).then((res) => res.bytes()),
      );
    }

    logback(`Downloading song: ${song.title} (${song.id})`);
    await fs.writeFile(
      path.join(this.downloadDir, song.id),
      await fetch(this.getStreamUrl(song.id)).then((r) => r.bytes()),
    );
  }

  async loadSong(songId: Song["id"]): Promise<Song | null> {
    try {
      const metadataPath = path.join(this.songMetadataDir(), songId);
      if (!existsSync(metadataPath)) return null;

      const metadata: Song = JSON.parse(
        await fs.readFile(metadataPath, "utf-8"),
      );

      const songFile = path.join(this.downloadDir, songId);
      if (!existsSync(songFile)) return null;

      return metadata;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    }
  }

  async loadSongFile(songId: Song["id"], request: Request) {
    try {
      const songFile = path.join(this.downloadDir, songId);
      if (!existsSync(songFile)) return null;

      const fileStats = await fs.stat(songFile);

      const totalLength = fileStats.size;
      const rangeHeader = request.headers.get("Range");

      let start = 0;
      let end = totalLength - 1;
      let statusCode = 200;

      const responseHeaders = new Headers({
        "Content-type": "application/octet-stream",
        "Accept-Ranges": "bytes",
      });

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

        if (start >= totalLength || start < 0 || end < start) {
          return new Response("Requested Range Not Satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${totalLength}` },
          });
        }

        const chunkSize = end - start + 1;

        responseHeaders.set("Content-Length", chunkSize.toString());
        responseHeaders.set(
          "Content-Range",
          `bytes ${start}-${end}/${totalLength}`,
        );
        statusCode = 206;
      } else {
        responseHeaders.set("Content-Length", totalLength.toString());
        statusCode = 200;
      }

      const nodeStream = Readable.from(
        createReadStream(songFile, { start, end }),
      );

      const webStream = Readable.toWeb(
        nodeStream,
      ) as ReadableStream<Uint8Array>;

      return new Response(webStream, {
        status: statusCode,
        headers: responseHeaders,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    }
  }

  async loadImage(imageId: UUID) {
    try {
      const imagePath = path.join(this.imageMetadataDir(), imageId);
      if (!existsSync(imagePath)) return null;

      const nodeStream = Readable.from(createReadStream(imagePath));
      const webStream = Readable.toWeb(
        nodeStream,
      ) as ReadableStream<Uint8Array>;

      const fileType = await fileTypeFromFile(imagePath);

      return new Response(webStream, {
        status: 200,
        headers: {
          "Content-Type": fileType?.mime ?? "image/png",
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    }
  }
}

export default new OfflineHandler();
