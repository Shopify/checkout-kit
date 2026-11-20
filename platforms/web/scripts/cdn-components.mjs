// The CDN components and the channels each ships on (cdn-components.json), and the channel a
// CDN build is for. The deploy workflow sets CHECKOUT_KIT_CDN_CHANNEL; anything else (local
// builds, CI, the npm publish workflow's own CDN build) builds for stable, so a component that
// isn't on stable yet is left out unless a build asks for unstable.
import components from "../cdn-components.json" with { type: "json" };

export const CDN_CHANNELS = ["stable", "unstable"];

/** The channel a CDN build is for: CHECKOUT_KIT_CDN_CHANNEL, or `stable` when it's unset. */
export function resolveCdnChannel(value = process.env.CHECKOUT_KIT_CDN_CHANNEL) {
  if (value === undefined || value === "") return "stable";
  if (!CDN_CHANNELS.includes(value)) {
    throw new Error(
      `CHECKOUT_KIT_CDN_CHANNEL must be one of ${CDN_CHANNELS.join(", ")}; got "${value}".`,
    );
  }
  return value;
}

/** Every CDN component, whatever its channels, in build order. */
export function allCdnComponents() {
  for (const { name, channels } of components) {
    const unknown = channels.filter((channel) => !CDN_CHANNELS.includes(channel));
    if (channels.length === 0 || unknown.length > 0) {
      throw new Error(`CDN component ${name} has invalid channels: ${JSON.stringify(channels)}.`);
    }
  }
  return components;
}

/** The CDN components that ship on `channel`, in build order. */
export function cdnComponentsFor(channel) {
  return allCdnComponents().filter(({ channels }) => channels.includes(channel));
}
