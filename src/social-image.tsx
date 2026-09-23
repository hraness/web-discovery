import { ImageResponse } from "next/og.js";

import { LARGE_SOCIAL_IMAGE } from "./discovery.js";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  createSocialImageCard,
} from "./social-image-card.js";
import type { SocialImageDetails } from "./social-image-card.js";

export const socialImageSize = LARGE_SOCIAL_IMAGE;
export const socialImageContentType = "image/png";

export {
  CARD_HEIGHT,
  CARD_PADDING,
  CARD_WIDTH,
  TOP_BAR_HEIGHT,
  BOTTOM_RULE_HEIGHT,
  createSocialImageCard,
  createSocialImageElement,
  plainSocialImageTheme,
  socialImageFonts,
  socialImageHeadline,
  socialImageMarks,
} from "./social-image-card.js";
export type {
  SocialImageCard,
  SocialImageDetails,
  SocialImageFonts,
  SocialImageMark,
  SocialImageTheme,
} from "./social-image-card.js";

export type SocialImageOptions = Readonly<{
  height?: number;
  width?: number;
}>;

export function createSocialImageResponse(
  details: SocialImageDetails,
  options: SocialImageOptions = {},
): ImageResponse {
  const card = createSocialImageCard(details);
  return new ImageResponse(card.element, {
    fonts: [...card.fonts],
    height: options.height ?? CARD_HEIGHT,
    width: options.width ?? CARD_WIDTH,
  });
}
