import type { Playbable } from "./Playable";
import { GungnirError } from "@gungnir/core";

const SimpleYoutubeApi = require("simple-youtube-api");
import ytdl from "ytdl-core";

export namespace Youtube {

  const APIKEY_UNDEFINED = "you need to define the Youtube API key using 'Youtube.setAPIKey(apiKey: string)'.";

  let youtube: any;
  export function setAPIKey(apiKey: string) {
    youtube = new SimpleYoutubeApi(apiKey);
  }

  export class Video implements Playbable {
    declare public readonly id: string;
    declare public readonly url: string;
    declare public readonly title: string;
    declare public readonly description: string;
    //declare public readonly publishedAt: Date;
    declare public readonly author: Author;
    declare public readonly thumbnailURL: string;
    declare public readonly maxResThumbnailURL: string;
    declare public readonly length: number;
    private constructor(data: Omit<Video, |"output">) {
      Object.assign(this, data);
    }
    public get output() {
      return ytdl(this.url, {filter: "audioonly"});
    }

    public static async fetch(url: string): Promise<Video> {
      const res = await ytdl.getInfo(url);
      return new Video({
        id: res.video_id,
        url: res.video_url,
        title: res.title,
        description: res.description,
        author: {
          name: res.author.name,
          avatarURL: res.author.avatar,
          channelURL: res.author.channel_url,
          verified: res.author.verified
        },
        thumbnailURL: res.thumbnail_url,
        maxResThumbnailURL: res.thumbnail_url?.replace("default.jpg", "maxresdefault.jpg"),
        length: Number(res.length_seconds)*1000
      });
    }
    public static async query(query: string, nb: number = 5): Promise<Video[]> {
      if (!youtube) throw new GungnirError(APIKEY_UNDEFINED);
      const res =	await youtube.searchVideos(query, nb) as {url: string}[];
      return Promise.all(res.map(video => Video.fetch(video.url)));
    }
    public static async queryOne(query: string): Promise<Video | null> {
      const videos = await this.query(query, 1);
      return videos.shift() ?? null;
    }
  }

  export interface Author {
    readonly name: string;
    readonly avatarURL: string;
    readonly channelURL: string;
    readonly verified: boolean;
  }

  export interface Playlist {
    readonly title: string;
    readonly videos: readonly Video[];
  }
  export namespace Playlist {
    export async function fetch(url: string): Promise<Playlist> {
      if (!youtube) throw new GungnirError(APIKEY_UNDEFINED);
    	const playlist = await youtube.getPlaylist(url);
    	const res = await playlist.getVideos() as {url: string}[];
    	const videos = await Promise.all(res.map((video => Video.fetch(video.url))));
    	return {title: playlist.title, videos};
    }
  }
}