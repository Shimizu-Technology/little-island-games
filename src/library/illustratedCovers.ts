import React from "react";
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";

const fillBox = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: "100%",
  height: "100%",
} as const;

/**
 * Static literal require thunks keep Metro asset discovery 100% deterministic
 * for all 11 Warm Island Storybook Library category covers without eager import cost.
 */
export const libraryCoverThunks = {
  ocean: (): ImageSourcePropType => require("../../assets/art/library/ocean.webp"),
  guam: (): ImageSourcePropType => require("../../assets/art/library/guam.webp"),
  animals: (): ImageSourcePropType => require("../../assets/art/library/animals.webp"),
  space: (): ImageSourcePropType => require("../../assets/art/library/space.webp"),
  weather: (): ImageSourcePropType => require("../../assets/art/library/weather.webp"),
  body: (): ImageSourcePropType => require("../../assets/art/library/body.webp"),
  machines: (): ImageSourcePropType => require("../../assets/art/library/machines.webp"),
  plants: (): ImageSourcePropType => require("../../assets/art/library/plants.webp"),
  books: (): ImageSourcePropType => require("../../assets/art/library/books.webp"),
  "island-history": (): ImageSourcePropType => require("../../assets/art/library/island-history.webp"),
  faith: (): ImageSourcePropType => require("../../assets/art/library/faith.webp"),
} as const;

export type LibraryCoverId = keyof typeof libraryCoverThunks;

export const LIBRARY_COVER_IDS = Object.keys(libraryCoverThunks) as LibraryCoverId[];

const kindToCoverId: Record<string, LibraryCoverId> = {
  ocean: "ocean",
  turtle: "ocean",
  coral: "ocean",
  guam: "guam",
  globe: "guam",
  animals: "animals",
  butterfly: "animals",
  space: "space",
  moon: "space",
  stars: "space",
  weather: "weather",
  cloud: "weather",
  body: "body",
  heart: "body",
  machines: "machines",
  gear: "machines",
  plants: "plants",
  plant: "plants",
  books: "books",
  "island-history": "island-history",
  history: "island-history",
  faith: "faith",
};

export function isLibraryCoverId(id: string | undefined): id is LibraryCoverId {
  return !!id && Object.prototype.hasOwnProperty.call(libraryCoverThunks, id);
}

export function libraryCoverForCategory(categoryId?: string): ImageSourcePropType | undefined {
  if (!isLibraryCoverId(categoryId)) return undefined;
  return libraryCoverThunks[categoryId]();
}

export function libraryCoverForKind(kind?: string): ImageSourcePropType | undefined {
  if (!kind) return undefined;
  const coverId = kindToCoverId[kind];
  return coverId ? libraryCoverThunks[coverId]() : undefined;
}

function resolveImageComponent(): typeof Image | null {
  try {
    const component = Image;
    if (
      typeof component === "function" ||
      typeof component === "string" ||
      (typeof component === "object" && component !== null && "$$typeof" in (component as object))
    ) {
      return component;
    }
  } catch {
    /* Partial test mocks may omit Image from react-native. */
  }
  return null;
}

/**
 * Renders a full-bleed painted Warm Island Storybook WebP cover with an optional
 * instant fallback layer underneath. Guards Image availability for minimal unit-test mocks.
 */
export function PaintedLibraryCover({
  category,
  kind,
  fallback,
  style,
  testID,
}: {
  category?: string;
  kind?: string;
  fallback?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const source = libraryCoverForCategory(category) ?? libraryCoverForKind(kind);
  const ImageComponent = resolveImageComponent();
  return React.createElement(
    View,
    { style: [{ width: "100%", height: "100%", overflow: "hidden" }, style] },
    fallback ? React.createElement(View, { pointerEvents: "none", style: fillBox }, fallback) : null,
    source && ImageComponent
      ? React.createElement(ImageComponent, {
          testID: testID ?? (category ? `library-cover-${category}` : undefined),
          source,
          resizeMode: "cover",
          fadeDuration: 0,
          accessible: false,
          style: fillBox,
        })
      : null
  );
}
