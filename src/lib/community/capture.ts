export interface NoiseObservation {
  capturedAt: string;
  duration: number;
  sampleRate: number;
  samples: number;
  dbfs: number | null;
  peak: number;
  processing: string;
}
interface MeterMessage { count: number; rms: number; peak: number; done: boolean }

export async function captureNoise(signal: AbortSignal, onProgress: (seconds: number) => void): Promise<NoiseObservation> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) {
    throw new Error('Este navegador no permite esta observación. Prueba un navegador actualizado con micrófono y HTTPS.');
  }
  const context = new AudioContext();
  let stream: MediaStream | undefined;
  let node: AudioWorkletNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  let rejectCapture: (reason: Error) => void = () => {};
  const interrupted = () => rejectCapture(new Error('Observación interrumpida. No se guardó una lectura parcial. Puedes volver a empezar.'));
  const hidden = () => { if (document.hidden) interrupted(); };
  const stateChanged = () => { if (context.state !== 'running') interrupted(); };
  const cleanup = () => {
    finished = true;
    clearTimeout(watchdog);
    signal.removeEventListener('abort', interrupted);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('pagehide', interrupted);
    window.removeEventListener('alzavoz:escape', interrupted);
    context.removeEventListener('statechange', stateChanged);
    stream?.getTracks().forEach(track => { track.removeEventListener('ended', interrupted); track.removeEventListener('mute', interrupted); track.stop(); });
    source?.disconnect();
    if (node) { node.port.onmessage = null; node.port.close(); node.disconnect(); }
    void context.close().catch(() => {});
  };
  try {
    return await new Promise<NoiseObservation>((resolve, reject) => {
      rejectCapture = reject;
      if (signal.aborted || document.hidden) { interrupted(); return; }
      signal.addEventListener('abort', interrupted, { once: true });
      document.addEventListener('visibilitychange', hidden);
      window.addEventListener('pagehide', interrupted);
      window.addEventListener('alzavoz:escape', interrupted);
      watchdog = setTimeout(() => reject(new Error('No llegó permiso o señal a tiempo. Revisa el micrófono y vuelve a empezar.')), 30000);
      // Start resume in the user gesture, before awaiting permission or loading the worklet.
      const resumed = context.resume();
      const media = navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      void media.then(value => { if (finished || signal.aborted) value.getTracks().forEach(track => track.stop()); else stream = value; }, () => {});
      void (async () => {
        try {
          await Promise.all([resumed, media, context.audioWorklet.addModule('/audio/noise-meter.js')]);
          if (finished || signal.aborted) return;
          if (!stream || context.state !== 'running' || document.hidden) { interrupted(); return; }
          const track = stream.getAudioTracks()[0];
          if (!track || track.readyState !== 'live' || track.muted) { interrupted(); return; }
          track.addEventListener('ended', interrupted);
          track.addEventListener('mute', interrupted);
          context.addEventListener('statechange', stateChanged);
          const settings = track.getSettings();
          const processing = (['echoCancellation', 'noiseSuppression', 'autoGainControl'] as const)
            .map(key => `${key}: ${settings[key] === false ? 'desactivado' : settings[key] === true ? 'activo' : 'no informado'}`).join(' · ');
          const capturedAt = new Date().toISOString();
          source = context.createMediaStreamSource(stream);
          node = new AudioWorkletNode(context, 'alzavoz-noise-meter', { channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1] });
          node.onprocessorerror = interrupted;
          node.port.onmessage = (event: MessageEvent<MeterMessage>) => {
            if (finished || signal.aborted) return;
            const data = event.data;
            onProgress(data.count / context.sampleRate);
            if (data.done) resolve({ capturedAt, duration: data.count / context.sampleRate, sampleRate: context.sampleRate, samples: data.count,
              dbfs: data.rms > 0 ? 20 * Math.log10(data.rms) : null, peak: data.peak, processing });
          };
          source.connect(node);
          // Processor writes only zeros to its output: no microphone playback/feedback.
          node.connect(context.destination);
          clearTimeout(watchdog);
          watchdog = setTimeout(() => reject(new Error('La captura no completó 15 segundos de señal. Vuelve a intentarlo.')), 20000);
        } catch (error) {
          const name = error instanceof DOMException ? error.name : '';
          reject(new Error(name === 'NotAllowedError' ? 'Permiso de micrófono denegado. Puedes habilitarlo en el navegador y reintentar.' :
            name === 'NotFoundError' ? 'No se encontró un micrófono. Conecta uno y reintenta.' : 'No se pudo iniciar el micrófono. Comprueba que esté disponible y reintenta.'));
        }
      })();
    });
  } finally { cleanup(); }
}
