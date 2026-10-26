/** Local, session-scoped canvas streaming. No camera or microphone is requested. */
export type KeyState = {
  canvas: { x: number; y: number; w: number; h: number };
  window: { x: number; y: number; w: number; h: number; scroll: number };
  section: {
    handle: string;
    index: number;
    nextHandle?: string;
    transitionProgress: number;
    theatreTime: number;
    totalProgress: number;
  };
};
let session: string;
export const keySession = () => (session ??= crypto.randomUUID());
const channelName = (id: string) => `renaissance-key-${id}`;
const configuration: RTCConfiguration = {
  iceServers: [],
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};
type Message = { type: string; data?: unknown };

export function createKeySender(canvas: HTMLCanvasElement) {
  const channel = new BroadcastChannel(channelName(keySession()));
  let peer: RTCPeerConnection | undefined,
    stream: MediaStream | undefined,
    offerTimer: ReturnType<typeof setInterval> | undefined;
  let live = false,
    disposed = false,
    lastHello = 0,
    pending: RTCIceCandidateInit[] = [];
  const send = (type: string, data?: unknown) => {
    if (!disposed) channel.postMessage({ type, data });
  };
  const visibility = (hidden: boolean) =>
    window.dispatchEvent(
      new CustomEvent("renaissance:key-visibility", { detail: hidden }),
    );
  const close = () => {
    clearInterval(offerTimer);
    peer?.close();
    peer = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    pending = [];
    live = false;
    visibility(false);
  };
  const connect = async () => {
    close();
    const pc = (peer = new RTCPeerConnection(configuration));
    stream = canvas.captureStream(60);
    pc.onicecandidate = (event) => {
      if (event.candidate) send("ice-tx", event.candidate.toJSON());
    };
    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream);
      const parameters = sender.getParameters();
      parameters.encodings = [{ maxBitrate: 5_000_000, maxFramerate: 60 }];
      await sender.setParameters(parameters).catch(() => {});
    }
    await pc.setLocalDescription(await pc.createOffer());
    if (disposed || peer !== pc) return;
    send("offer", pc.localDescription?.toJSON());
    const started = performance.now();
    offerTimer = setInterval(() => {
      if (pc.remoteDescription || performance.now() - started > 10000)
        clearInterval(offerTimer);
      else send("offer", pc.localDescription?.toJSON());
    }, 100);
  };
  channel.onmessage = async ({ data: message }: MessageEvent<Message>) => {
    try {
      if (message.type === "hello") {
        lastHello = performance.now();
        if (!peer) await connect();
      }
      if (message.type === "answer" && peer && !peer.remoteDescription) {
        await peer.setRemoteDescription(
          message.data as RTCSessionDescriptionInit,
        );
        for (const candidate of pending.splice(0))
          await peer.addIceCandidate(candidate);
      }
      if (message.type === "ice-rx") {
        if (peer?.remoteDescription)
          await peer.addIceCandidate(message.data as RTCIceCandidateInit);
        else pending.push(message.data as RTCIceCandidateInit);
      }
      if (message.type === "ready") {
        live = true;
        visibility(true);
      }
      if (message.type === "wheel")
        window.scrollBy({ top: message.data as number, behavior: "instant" });
      if (message.type === "insert")
        window.dispatchEvent(new Event("renaissance:key-insert"));
      if (message.type === "closed") {
        close();
        window.dispatchEvent(new Event("renaissance:key-reset"));
      }
    } catch (error) {
      if (!disposed) console.warn("Key stream negotiation failed", error);
    }
  };
  return {
    frame(state: KeyState) {
      if (peer && performance.now() - lastHello > 6000) {
        close();
        window.dispatchEvent(new Event("renaissance:key-reset"));
      }
      if (peer) send("state", state);
      canvas.dataset.keyConnected = String(live);
    },
    dispose() {
      close();
      disposed = true;
      channel.close();
    },
  };
}

export function createKeyReceiver(
  id: string,
  onState: (state: KeyState) => void,
  onVideo: (video: HTMLVideoElement) => void,
  onError: (error: unknown) => void,
) {
  const channel = new BroadcastChannel(channelName(id));
  const peer = new RTCPeerConnection(configuration),
    video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  let disposed = false,
    negotiating = false;
  const timeout = setTimeout(() => {
    if (!disposed && video.readyState < 2)
      onError(new Error("Main artwork stream timed out"));
  }, 12000);
  const candidates: RTCIceCandidateInit[] = [];
  const send = (type: string, data?: unknown) => {
    if (!disposed) channel.postMessage({ type, data });
  };
  peer.onicecandidate = (event) => {
    if (event.candidate) send("ice-rx", event.candidate.toJSON());
  };
  peer.ontrack = async (event) => {
    clearTimeout(timeout);
    video.srcObject = event.streams[0];
    try {
      await video.play();
      if (!disposed) onVideo(video);
    } catch (error) {
      if (!disposed) onError(error);
    }
  };
  channel.onmessage = async ({ data: message }: MessageEvent<Message>) => {
    try {
      if (message.type === "state") onState(message.data as KeyState);
      if (message.type === "offer" && !negotiating && !peer.remoteDescription) {
        negotiating = true;
        await peer.setRemoteDescription(
          message.data as RTCSessionDescriptionInit,
        );
        for (const candidate of candidates.splice(0))
          await peer.addIceCandidate(candidate);
        await peer.setLocalDescription(await peer.createAnswer());
        send("answer", peer.localDescription?.toJSON());
      }
      if (message.type === "ice-tx") {
        if (peer.remoteDescription)
          await peer.addIceCandidate(message.data as RTCIceCandidateInit);
        else candidates.push(message.data as RTCIceCandidateInit);
      }
    } catch (error) {
      if (!disposed) onError(error);
    }
  };
  const heartbeat = setInterval(() => send("hello"), 1000);
  send("hello");
  return {
    send,
    dispose() {
      send("closed");
      disposed = true;
      clearTimeout(timeout);
      clearInterval(heartbeat);
      channel.close();
      peer.close();
      video.pause();
      video.srcObject = null;
    },
  };
}
