/* global AudioWorkletProcessor, registerProcessor, sampleRate */
// Only scalar summaries leave the audio thread. Raw samples are never retained.
class NoiseMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.count = 0;
    this.squares = 0;
    this.peak = 0;
    this.nextUpdate = sampleRate / 4;
    this.target = sampleRate * 15;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length && this.count < this.target; i++) {
      const value = channel[i];
      this.squares += value * value;
      this.peak = Math.max(this.peak, Math.abs(value));
      this.count++;
    }
    const done = this.count === this.target;
    if (done || this.count >= this.nextUpdate) {
      this.port.postMessage({ count: this.count, rms: Math.sqrt(this.squares / this.count), peak: this.peak, done });
      this.nextUpdate += sampleRate / 4;
    }
    return !done;
  }
}
registerProcessor('alzavoz-noise-meter', NoiseMeter);
