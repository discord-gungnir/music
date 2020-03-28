import type { VoiceConnection } from "discord.js";

export type PlayableOutput = Parameters<typeof VoiceConnection.prototype.play>[0];

export interface Playbable {
  readonly output: PlayableOutput;
}