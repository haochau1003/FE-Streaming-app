/**
 * Map a normalized point (in source-image coords, 0..1) to a pixel point
 * inside a container that displays the source with `contentFit="cover"`.
 *
 * `cover` scales the source so it FILLS the container; the side with the
 * larger required scale wins, and the opposite side is cropped equally on
 * both ends. The visible region of the source is a centered sub-rectangle,
 * but in container coords the *whole* source rectangle is drawn — parts
 * just lie outside the container. We can therefore simply map normalized
 * coords through the scale/offset and (optionally) clamp to the container.
 */
export function mapCoverCoords(
  normX: number,
  normY: number,
  srcAspect: number, // srcW / srcH (e.g. 16/9 ≈ 1.778)
  dstW: number,
  dstH: number,
): { x: number; y: number } {
  // Pick the scale that makes the source FILL the container.
  // dstW / srcW = dstW / (1 * srcAspect)  for unit-height source
  // dstH / srcH = dstH / 1                for unit-height source
  // cover = max of the two
  const sx = dstW / srcAspect; // scaled height if we fit by width
  const sy = dstH;             // scaled height if we fit by height

  const scaleH = Math.max(sx, sy); // final source height in container px
  const scaleW = scaleH * srcAspect;

  // Centered placement: top-left of scaled source inside container
  const offsetX = (dstW - scaleW) / 2;
  const offsetY = (dstH - scaleH) / 2;

  const x = clamp(normX * scaleW + offsetX, 0, dstW);
  const y = clamp(normY * scaleH + offsetY, 0, dstH);
  return { x, y };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
