import type { Guild, StreamDispatcher } from "discord.js";
import { GungnirClient, GungnirError } from "@gungnir/core";
import { Playbable } from "./Playable";
import { StreamOptions } from "discord.js";

const NOT_CONNECTED = "the client needs to be connected to play music.";
export type PlaylistLooping = "off" | "current" | "playlist";

export class Playlist {
  public readonly client: GungnirClient;
  public constructor(public readonly guild: Guild) {
    this.client = guild.client;
  }

  // state
  public get connected() {
    return !!this.guild.me?.voice.connection;
  }
  #current: Playbable | null = null;
  public get current() {
    return this.#current;
  }
  #playing: boolean = false;
  public get playing() {
    return this.#playing;
  }
  #dispatcher: StreamDispatcher | null = null;
  public get dispatching() {
    return !!this.#dispatcher && !this.#dispatcher.destroyed;
  }
  public streamOptions: StreamOptions = {};

  // volume
  #volume: number = 1;
  public get volume() {
    return this.#volume;
  }
  public set volume(volume) {
    this.#volume = volume;
    this.#dispatcher?.setVolume(volume);
  }

  // looping
  #looping: PlaylistLooping = "off";
  public get looping() {
    return this.#looping
  }
  public set looping(looping) {
    if (!this.playing) return;
    this.#looping = looping;
  }

  // list
  #list: Playbable[] = [];
  public get list() {
    return [...this.#list];
  }
  public add(...playable: Playbable[]) {
    if (!this.connected)
      throw new GungnirError(NOT_CONNECTED);
    this.#list.push(...playable);
    if (!this.playing) this.next();
    return this;
  }
  public remove(...playable: Playbable[]) {
    this.#list = this.#list.filter(p => !playable.includes(p));
    return this;
  }
  public clear() {
    this.#list = [];
    return this;
  }
  public sort(sort: (a: Playbable, b: Playbable) => number) {
    this.#list = this.#list.sort(sort);
    return this;
  }
  public shuffle() {
    return this.sort(() => Math.random() - 0.5);
  }

  // play
  public next() {
    if (!this.connected)
      throw new GungnirError(NOT_CONNECTED);
    if (this.dispatching) {
      this.#looping = this.#looping == "current" ? "off" : this.#looping;
      this.#dispatcher?.end();
    } else {
      this.#current = (this.#looping == "current" ? this.#current : this.#list.shift()) ?? null;
      if (this.#current) {
        this.#playing = true;
        this.#dispatcher = this.guild.me?.voice.connection?.play(this.#current.output, this.streamOptions) as StreamDispatcher;
        this.#dispatcher?.setVolume(this.#volume);
        if (this.#looping != "current")
          this.client.emit("playlistNext", this, this.#current);
        this.#dispatcher
          .on("start", () => this.client.emit("playlistStart", this, this.#current as Playbable))
          .on("error", err => this.client.emit("playlistError", this, this.#current as Playbable, err))
          .on("finish", () => {
            setTimeout(() => {
              this.#dispatcher = null;
              this.client.emit("playlistFinish", this, this.#current as Playbable);
              if (this.#looping == "playlist")
                this.add(this.#current as Playbable);
              this.next();
            }, 500);
          });
      } else {
        this.stop();
        this.client.emit("playlistEmpty", this);
      }
    }
  }
  public stop() {
    this.#list = [];
    if (this.dispatching)
      this.#dispatcher?.end();
    this.#dispatcher = null;
    this.#playing = false;
    this.#current = null;
    this.#looping = "off";
  }
}

declare module "discord.js" {
  interface ClientEvents {
    playlistStart: [Playlist, Playbable];
    playlistFinish: [Playlist, Playbable];
    playlistNext: [Playlist, Playbable];
    playlistError: [Playlist, Playbable, Error];
    playlistEmpty: [Playlist];
  }
}