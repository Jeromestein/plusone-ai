"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Rive } from "@rive-app/webgl2";

export type RiveConfig = {
  src?: string;
  source?: { url: string };
  artboard?: string;
  stateMachines?: string;
  aspectRatio?: string;
  mobileAspectRatio?: string;
  description?: string;
  viewModelName?: string;
  textRunMap?: Record<string, string>;
  assetsMap?: Record<string, { url: string; isFont?: boolean }>;
  fonts?: { url: string }[];
  fallbackImage?: { url: string } | null;
  fallbackImageMobile?: { url: string } | null;
  posterImage?: { image?: { url: string } } | null;
  posterImageMobile?: { image?: { url: string } } | null;
};

export function RiveArtwork({
  config,
  className = "",
}: {
  config: RiveConfig;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<Rive | null>(null);
  const [near, setNear] = useState(false),
    [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
      },
      { rootMargin: "350px" },
    );
    if (container.current) observer.observe(container.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    if (
      !near ||
      !canvas.current ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let disposed = false;
    const controller = new AbortController();
    setReady(false);
    let instance: Rive | undefined;
    const resize = new ResizeObserver(() =>
      instance?.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio, 2)),
    );
    if (container.current) resize.observe(container.current);
    import("@rive-app/webgl2")
      .then((module) => {
        if (disposed) return;
        module.RuntimeLoader.setWasmFallbackUrl(null);
        module.RuntimeLoader.setWasmUrl(
          "/mirror/unpkg.com/@rive-app/webgl2@2.37.2/rive.wasm",
        );
        instance = new module.Rive({
          canvas: canvas.current!,
          src: config.src || config.source?.url || "",
          artboard: config.artboard,
          stateMachines: config.stateMachines || "State Machine 1",
          autoplay: true,
          autoBind: false,
          useOffscreenRenderer: true,
          layout: new module.Layout({
            fit: module.Fit.Contain,
            alignment: module.Alignment.Center,
          }),
          assetLoader: (asset, bytes) => {
            if (bytes.length) return false;
            const mapped = config.assetsMap?.[asset.name];
            const url =
              mapped?.url ||
              (asset.isFont
                ? config.fonts?.find((f) =>
                    f.url.toLowerCase().includes(asset.name.toLowerCase()),
                  )?.url || config.fonts?.[0]?.url
                : undefined);
            if (!url) return false;
            fetch(url, { signal: controller.signal })
              .then((r) => r.arrayBuffer())
              .then(async (buffer) => {
                const decoded = asset.isFont
                  ? await module.decodeFont(new Uint8Array(buffer))
                  : await module.decodeImage(new Uint8Array(buffer));
                if (!disposed) {
                  if (asset.isFont)
                    (
                      asset as unknown as {
                        setFont(value: typeof decoded): void;
                      }
                    ).setFont(decoded);
                  else
                    (
                      asset as unknown as {
                        setRenderImage(value: typeof decoded): void;
                      }
                    ).setRenderImage(decoded);
                }
                decoded.unref();
              })
              .catch(() => {});
            return true;
          },
          onLoad: () => {
            if (disposed || !instance) return;
            if (config.viewModelName) {
              const model = instance.viewModelByName(config.viewModelName);
              const instanceName = model?.instanceNames.find(
                (name) =>
                  name.toLowerCase() === (mobile ? "mobile" : "desktop"),
              );
              const value = instanceName
                ? model?.instanceByName(instanceName)
                : model?.defaultInstance();
              if (value) instance.bindViewModelInstance(value);
            }
            for (const [path, text] of Object.entries(
              config.textRunMap || {},
            )) {
              const parts = path.split("/");
              const name = parts.pop()!;
              if (parts.length)
                instance.setTextRunValueAtPath(name, text, parts.join("/"));
              else instance.setTextRunValue(name, text);
            }
            instance.resizeDrawingSurfaceToCanvas(
              Math.min(devicePixelRatio, 2),
            );
            setReady(true);
          },
        });
        runtime.current = instance;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      controller.abort();
      resize.disconnect();
      instance?.cleanup();
      runtime.current = null;
    };
  }, [near, mobile, config]);
  const hover = (value: boolean) => {
    const input = runtime.current
      ?.stateMachineInputs(config.stateMachines || "State Machine 1")
      ?.find((i) => i.name === "mouseOver");
    if (input) input.value = value;
  };
  const poster =
    (mobile
      ? config.posterImageMobile?.image?.url || config.fallbackImageMobile?.url
      : undefined) ||
    config.posterImage?.image?.url ||
    config.fallbackImage?.url;
  const ratio =
    (mobile ? config.mobileAspectRatio : undefined) ||
    config.aspectRatio ||
    "16:9";
  return (
    <div
      ref={container}
      className={`native-rive ${className}`}
      style={{ "--rive-ratio": ratio.replace(":", "/") } as CSSProperties}
      data-rive-status={ready ? "ready" : near ? "loading" : "idle"}
      onPointerEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
      role="img"
      aria-label={config.description || "Product demonstration"}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="native-rive-poster"
          style={{ opacity: ready ? 0 : 1 }}
          loading="lazy"
        />
      )}
      <canvas ref={canvas} style={{ opacity: ready ? 1 : 0 }} />
    </div>
  );
}
