import { Structures } from "discord.js";
import { Playlist } from "../Playlist";

declare module "discord.js" {
  interface Guild {
    readonly playlist: Playlist;
  }
}

Structures.extend("Guild", Guild => class extends Guild {
  public readonly playlist: Playlist = new Playlist(this);
});