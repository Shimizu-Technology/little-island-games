import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, FeColorMatrix, Filter, G, Path } from "react-native-svg";
import { IslanderShape, resolvePose, type IslanderLook } from "../islander";
import {
  canWear,
  lockedReason,
  lookWithStyle,
  selectedValue,
  styleCatalog,
  type Category,
  type StyleItem,
} from "../personalization/catalog";
import { thumbnailFocus } from "../personalization/thumbnail";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { BaseballCap, LockSimple, Pants, Sunglasses, TShirt } from "../ui/icons";
import { theme } from "../ui/theme";

export type ClosetTab = "hair" | "tops" | "bottoms" | "hats" | "extras";

export const CLOSET_TABS: readonly { id: ClosetTab; label: string; categories: readonly Category[] }[] = [
  { id: "hair", label: "Hair", categories: ["hairStyle", "hairColor"] },
  { id: "tops", label: "Tops", categories: ["outfit", "top", "palette"] },
  { id: "bottoms", label: "Bottoms", categories: ["bottom", "shoes", "shoeColor"] },
  { id: "hats", label: "Hats", categories: ["hat"] },
  { id: "extras", label: "Extras", categories: ["accessory", "skinTone", "build", "brows", "lashes", "freckles", "cheeks"] },
];

export function closetTabForCategory(category: Category): ClosetTab {
  return CLOSET_TABS.find((t) => t.categories.includes(category))?.id ?? "hair";
}

export function closetItemsForTab(tab: ClosetTab): readonly StyleItem[] {
  const categories = CLOSET_TABS.find((t) => t.id === tab)?.categories ?? [];
  return categories.flatMap((category) => styleCatalog.filter((item) => item.category === category));
}

function HairGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M5 13c-.8-5.5 2.4-9 7-9s7.8 3.5 7 9l-1.5 6.5H6.5Z"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 13.5c3 0 5.3-2 6.8-3.7 1.4 2 2.9 2.9 4.5 2.9"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TabIcon({ tab, active }: { tab: ClosetTab; active: boolean }) {
  const tone = active ? "surface" : "ink";
  const weight = active ? "fill" : "bold";
  if (tab === "hair") return <HairGlyph color={active ? theme.colors.surface : theme.colors.ink} />;
  if (tab === "tops") return <Icon glyph={TShirt} tone={tone} weight={weight} />;
  if (tab === "bottoms") return <Icon glyph={Pants} tone={tone} weight={weight} />;
  if (tab === "hats") return <Icon glyph={BaseballCap} tone={tone} weight={weight} />;
  return <Icon glyph={Sunglasses} tone={tone} weight={weight} />;
}

const ClosetThumb = memo(function ClosetThumb({
  item,
  locked,
  encoded,
  size,
}: {
  item: StyleItem;
  locked: boolean;
  encoded: string;
  size: number;
}) {
  const shown = JSON.parse(encoded) as IslanderLook;
  const focus = thumbnailFocus(item);
  const pose = resolvePose(focus.view, focus.view === "back" ? 0 : "idle");
  const art = size - 8;
  return (
    <View style={[styles.thumbBox, { width: size, height: size }]}>
      {item.color ? (
        <View
          style={[
            styles.swatch,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              backgroundColor: locked ? theme.colors.track : item.color,
            },
          ]}
        />
      ) : (
        <Svg width={art} height={art} viewBox={focus.box} accessible={false}>
          <Defs>
            <Filter id={`closet-muted-${item.id}`}>
              <FeColorMatrix type="saturate" values="0" />
            </Filter>
          </Defs>
          <G opacity={locked ? 0.38 : 1} filter={locked ? `url(#closet-muted-${item.id})` : undefined}>
            <IslanderShape pose={pose} look={shown} />
          </G>
        </Svg>
      )}
    </View>
  );
});

export type HomeClosetSheetProps = {
  visible: boolean;
  onClose: () => void;
  look: IslanderLook;
  equipped: IslanderLook;
  earned: readonly string[];
  unseen: readonly string[];
  initialItem?: StyleItem;
  onTryOn: (nextLook: IslanderLook, item: StyleItem) => void;
  onWear: (nextLook: IslanderLook) => boolean;
  onSeen?: (id: string) => void;
};

export function HomeClosetSheet({
  visible,
  onClose,
  look,
  equipped,
  earned,
  unseen,
  initialItem,
  onTryOn,
  onWear,
  onSeen,
}: HomeClosetSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [tab, setTab] = useState<ClosetTab>(() => (initialItem ? closetTabForCategory(initialItem.category) : "hair"));
  const [lockedNote, setLockedNote] = useState<string | undefined>(() =>
    initialItem ? lockedReason(initialItem, earned) : undefined
  );
  const [statusNote, setStatusNote] = useState<string | undefined>();
  const gridRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncs deep-link tab & lock rule when sheet opens.
      setTab(closetTabForCategory(initialItem.category));
      setLockedNote(lockedReason(initialItem, earned));
    } else {
      setLockedNote(undefined);
    }
    setStatusNote(undefined);
  }, [visible, initialItem, earned]);

  const items = useMemo(() => closetItemsForTab(tab), [tab]);
  const changed = useMemo(() => JSON.stringify(look) !== JSON.stringify(equipped), [look, equipped]);
  const wearable = changed && canWear(look, earned);
  const compact = windowHeight < 700;
  const thumbSize = compact ? 54 : 62;

  const choose = (item: StyleItem) => {
    if (unseen.includes(item.id)) onSeen?.(item.id);
    const reason = lockedReason(item, earned);
    if (reason) {
      setLockedNote(reason);
      setStatusNote(undefined);
      AccessibilityInfo.announceForAccessibility?.(reason);
      return;
    }
    setLockedNote(undefined);
    setStatusNote(undefined);
    onTryOn(lookWithStyle(look, item), item);
  };

  const wear = () => {
    if (!wearable) return;
    if (onWear(look)) {
      setLockedNote(undefined);
      setStatusNote("Wearing your new look.");
      AccessibilityInfo.announceForAccessibility?.("Wearing your new look.");
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      mode="small"
      heightRatio={0.45}
      scroll={false}
      title="Closet"
      closeLabel="Close closet"
    >
      <View testID="home-closet-sheet" style={styles.root}>
        {/* Picture-only category tabs: hair, tops, bottoms, hats, extras. */}
        <View testID="closet-tabs" accessibilityRole="tablist" style={styles.tabs}>
          {CLOSET_TABS.map((entry) => {
            const active = tab === entry.id;
            const hasUnseen = entry.categories.some((category) =>
              unseen.some((id) => id.startsWith(`${category.toLowerCase()}:`))
            );
            return (
              <Pressable
                key={entry.id}
                testID={`closet-tab-${entry.id}`}
                accessibilityRole="tab"
                accessibilityLabel={hasUnseen ? `${entry.label}, new items` : entry.label}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setTab(entry.id);
                  setLockedNote(undefined);
                  gridRef.current?.scrollTo?.({ y: 0, animated: false });
                }}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <TabIcon tab={entry.id} active={active} />
                {hasUnseen && <View accessible={false} style={styles.tabDot} />}
              </Pressable>
            );
          })}
        </View>

        {!!lockedNote && (
          <View testID="closet-locked-rule" accessibilityLiveRegion="polite" style={styles.ruleBanner}>
            <Icon glyph={LockSimple} size={18} tone="ink" />
            <Text variant="small" numberOfLines={2} style={styles.ruleText}>
              {lockedNote}
            </Text>
          </View>
        )}

        <ScrollView
          ref={gridRef}
          testID="closet-grid"
          style={styles.gridScroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const reason = lockedReason(item, earned);
            const locked = !!reason;
            const selected = !locked && selectedValue(look, item.category) === item.value;
            const worn = !locked && selectedValue(equipped, item.category) === item.value;
            const isNew = unseen.includes(item.id);
            return (
              <Pressable
                key={item.id}
                testID={`closet-item-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}${reason ? `. Locked. ${reason}` : ""}${selected ? ", trying on" : ""}${worn ? ", wearing" : ""}${isNew ? ", new" : ""}`}
                accessibilityState={{ selected }}
                onPress={() => choose(item)}
                style={[
                  styles.tile,
                  locked ? styles.tileLocked : styles.tileEarned,
                  selected && styles.tileSelected,
                ]}
              >
                <ClosetThumb
                  item={item}
                  locked={locked}
                  encoded={JSON.stringify(lookWithStyle(look, item))}
                  size={thumbSize}
                />
                {locked && (
                  <View testID={`closet-lock-${item.id}`} accessible={false} style={styles.lockPin}>
                    <Icon glyph={LockSimple} size={14} tone="muted" />
                  </View>
                )}
                {isNew && (
                  <View testID={`closet-new-${item.id}`} accessible={false} style={styles.newPill}>
                    <Text variant="small" maxFontSizeMultiplier={1.1} style={styles.newPillText}>
                      New
                    </Text>
                  </View>
                )}
                <Text
                  variant="small"
                  tone={locked ? "muted" : "ink"}
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={1}
                  style={styles.tileLabel}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View testID="closet-wear-bar" style={styles.footer}>
          {!!statusNote && (
            <Text variant="small" tone="lagoon" accessibilityLiveRegion="polite" style={styles.statusText}>
              {statusNote}
            </Text>
          )}
          <Button
            testID="closet-wear-button"
            label="Wear this"
            variant="primary"
            target={compact ? "adult" : "child"}
            fill
            disabled={!wearable}
            onPress={wear}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: theme.space.lg,
    gap: theme.space.sm,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.space.xs,
  },
  tabButton: {
    flex: 1,
    minWidth: theme.target.adult,
    minHeight: theme.target.adult,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabButtonActive: {
    backgroundColor: theme.colors.lagoon,
    borderColor: theme.colors.lagoon,
  },
  tabDot: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.coral,
  },
  ruleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.tile,
    backgroundColor: theme.pastels.arcade,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  ruleText: {
    flex: 1,
    fontWeight: "700",
  },
  gridScroll: {
    flex: 1,
    minHeight: 0,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    paddingBottom: theme.space.sm,
  },
  tile: {
    width: "23%",
    minWidth: 74,
    minHeight: 86,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.xs,
    gap: 2,
    position: "relative",
  },
  tileEarned: {
    backgroundColor: theme.colors.bg,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
  },
  tileLocked: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.hairline,
  },
  tileSelected: {
    borderColor: theme.colors.lagoon,
    backgroundColor: theme.colors.lagoonSoft,
  },
  thumbBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  swatch: {
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  lockPin: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  newPill: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.coral,
  },
  newPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  tileLabel: {
    textAlign: "center",
    fontWeight: "700",
  },
  footer: {
    paddingTop: theme.space.xs,
    paddingBottom: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    gap: theme.space.xs,
  },
  statusText: {
    textAlign: "center",
    fontWeight: "700",
  },
});
