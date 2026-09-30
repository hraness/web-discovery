import { ImageResponse } from "next/og.js";
import type { SocialImageDetails, SocialImagePage, SocialImageSite } from "./social-image-card.js";
export declare const socialImageSize: {
    readonly height: 630;
    readonly width: 1200;
};
export declare const socialImageContentType = "image/png";
export { CARD_HEIGHT, CARD_PADDING, CARD_WIDTH, TOP_BAR_HEIGHT, BOTTOM_RULE_HEIGHT, createSocialImageCard, createSocialImageElement, defineSocialImageSite, parseSocialImageIcon, plainSocialImageTheme, socialImageAlt, socialImageContrastRatio, SOCIAL_IMAGE_GLYPH_SHARE, SOCIAL_IMAGE_MIN_PALETTE_DISTANCE, socialImageEyebrow, socialImageFit, socialImageFonts, socialImageHeadline, socialImageIconShape, socialImageLayout, socialImageLookAlikes, socialImageMarks, socialImagePalette, socialImagePaletteDistance, socialImagePaletteNames, socialImageSiteDetails, socialImageSitePalette, socialImageTypography, } from "./social-image-card.js";
export type { SocialImageCard, SocialImageDetails, SocialImageFinding, SocialImageFindingCode, SocialImageFit, SocialImageFonts, SocialImageIcon, SocialImageIconShape, SocialImageLayout, SocialImageLookAlike, SocialImageMark, SocialImagePage, SocialImagePalette, SocialImagePaletteName, SocialImageRemoval, SocialImageSite, SocialImageTheme, } from "./social-image-card.js";
export type SocialImageOptions = Readonly<{
    height?: number;
    width?: number;
}>;
export declare function createSocialImageResponse(details: SocialImageDetails, options?: SocialImageOptions): ImageResponse;
export declare function createSiteSocialImageResponse(site: SocialImageSite, page?: SocialImagePage, options?: SocialImageOptions): ImageResponse;
//# sourceMappingURL=social-image.d.ts.map