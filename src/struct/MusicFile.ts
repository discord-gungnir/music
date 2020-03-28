import { Playbable } from "./Playable";

export class MusicFile implements Playbable {
  private constructor() {

  }
  public get output() {
    return "a";
  }

  public static async fetch(): Promise<MusicFile> {
    return new MusicFile();
  }
}