import { Structures } from "discord.js";

Structures.extend("VoiceChannel", VoiceChannel => class extends VoiceChannel {
  public leave() {
    const me = this.guild.me;
    if (me?.voice.channel != this) return;
    const playlist = this.guild.playlist;
    playlist.stop();
    return super.leave();
  }
});