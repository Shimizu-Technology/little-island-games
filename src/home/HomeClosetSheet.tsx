import { defaultLook } from "../islander/look";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
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
import { thumbnailFocus, thumbnailLook } from "../personalization/thumbnail";
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

/** Adaptive detent ratio: ~45% on portrait phones/tablets, ~65% on short/landscape phones (< 520 pt) so both Islander and grid fit. */
export function closetSheetHeightRatio(windowHeight: number): number {
  return windowHeight < 520 ? 0.65 : 0.45;
}

export type ClosetLayoutOptions = {
  bottomInset?: number;
  hasLockedBanner?: boolean;
  hasStatusLine?: boolean;
};

/** Layout metrics shared by Closet rendering and layout tests (including 844×390 phone landscape with bottom inset & banners). */
export function closetSheetMetrics(windowHeight: number, options: ClosetLayoutOptions = {}) {
  const { bottomInset = 0, hasLockedBanner = false, hasStatusLine = false } = options;
  const shortViewport = windowHeight < 520;
  const heightRatio = closetSheetHeightRatio(windowHeight);
  const sheetHeight = Math.floor(windowHeight * heightRatio);
  const headerBudget = shortViewport ? 57 : 68;
  const tabHeight = shortViewport ? theme.target.min : theme.target.adult;
  const bannerBudget = hasLockedBanner ? (shortViewport ? 30 : 46) : 0;
  const statusBudget = hasStatusLine ? (shortViewport ? 20 : 24) : 0;
  const footerBudget = (shortViewport ? 53 : 74) + statusBudget;
  const gaps = shortViewport ? 8 : 16;
  const fixedChromeHeight = headerBudget + bottomInset + tabHeight + bannerBudget + footerBudget + gaps;
  const availableGridHeight = Math.max(0, sheetHeight - fixedChromeHeight);
  const footerFits = fixedChromeHeight <= sheetHeight;
  return {
    shortViewport,
    heightRatio,
    sheetHeight,
    headerBudget,
    tabHeight,
    bannerBudget,
    footerBudget,
    fixedChromeHeight,
    availableGridHeight,
    footerFits,
  };
}

/** Next tab index for W3C Tabs arrow/Home/End navigation on Web; undefined for unrelated keys. */
export function nextClosetTabIndex(key: string, current: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

type TabNode = { focus?: () => void; contains?: (other: unknown) => boolean };
type KeyEvent = {
  key?: string;
  nativeEvent?: { key?: string };
  target?: unknown;
  currentTarget?: unknown;
  preventDefault?: () => void;
};

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
  const shown = { ...defaultLook, ...JSON.parse(encoded) } as IslanderLook;
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
          {locked && <Defs>
            <Filter id={`closet-muted-${item.id}`}>
              <FeColorMatrix type="saturate" values="0" />
            </Filter>
          </Defs>}
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
  onSeen?: (id: string) => boolean | void;
  /** Atomic batch acknowledgement for "Mark all seen"; falls back to calling `onSeen` per unseen unlocked item. */
  onSeenAll?: () => boolean | void;
  /** Store async persistence state so Closet never announces success while saving or after a write error. */
  saving?: boolean;
  saveError?: string | null;
  /** Native VoiceOver focus restoration target (Closet dock opener button). */
  returnFocusRef?: React.RefObject<View | null>;
};

type WearPhase = "idle" | "queued" | "saving" | "saved" | "refused";
const REFUSED_WEAR_MESSAGE = "Couldn't save your look yet. Keep the app open and try again.";

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
  onSeenAll,
  saving,
  saveError,
  returnFocusRef,
}: HomeClosetSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [tab, setTab] = useState<ClosetTab>(() => (initialItem ? closetTabForCategory(initialItem.category) : "hair"));
  const [lockedNote, setLockedNote] = useState<string | undefined>(() =>
    initialItem ? lockedReason(initialItem, earned) : undefined
  );
  const [wearPhase, setWearPhase] = useState<WearPhase>("idle");
  const wearAcceptedRef = useRef(false);
  const prevSaveErrorRef = useRef(saveError);
  const gridRef = useRef<FlatList<StyleItem>>(null);
  const titleNodeRef = useRef<unknown>(null);
  const needsNativeFocusRef = useRef(false);
  const wasVisibleRef = useRef(false);

  const handleTitleRef = useCallback((node: unknown) => {
    titleNodeRef.current = node;
    if (node && Platform.OS !== "web" && needsNativeFocusRef.current) {
      needsNativeFocusRef.current = false;
      requestAnimationFrame(() => {
        if (titleNodeRef.current === node) {
          AccessibilityInfo.sendAccessibilityEvent?.(node as React.ComponentRef<typeof View>, "focus");
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (initialItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncs deep-link tab & lock rule when sheet opens.
      setTab(closetTabForCategory(initialItem.category));
      setLockedNote(lockedReason(initialItem, earned));
    } else {
      setLockedNote(undefined);
    }
    setWearPhase("idle");
    wearAcceptedRef.current = false;
  }, [visible, initialItem, earned]);

  // P2-2: Native VoiceOver focus entry to Closet title on open and restoration to opener button on close.
  useEffect(() => {
    if (Platform.OS === "web") {
      wasVisibleRef.current = visible;
      return;
    }
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      const node = titleNodeRef.current;
      if (node) {
        needsNativeFocusRef.current = false;
        const frame = requestAnimationFrame(() => {
          AccessibilityInfo.sendAccessibilityEvent?.(node as React.ComponentRef<typeof View>, "focus");
        });
        return () => cancelAnimationFrame(frame);
      }
      // Sheet mounts its title one render later when transitioning visible false -> true; handleTitleRef focuses it then.
      needsNativeFocusRef.current = true;
      return undefined;
    }
    if (!visible && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      needsNativeFocusRef.current = false;
      const frame = requestAnimationFrame(() => {
        const opener = returnFocusRef?.current;
        if (opener) {
          AccessibilityInfo.sendAccessibilityEvent?.(opener, "focus");
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [visible, returnFocusRef]);

  // P1-5: Reconcile queued/saving/refused Wear writes with Store persistence and retry recovery.
  useEffect(() => {
    const hadSaveError = !!prevSaveErrorRef.current;
    prevSaveErrorRef.current = saveError;
    if (wearPhase === "queued") {
      if (saveError) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Reflects Store persistence failure honestly.
        setWearPhase("refused");
      } else if (saving === true) {
        setWearPhase("saving");
      } else if (saving === false) {
        setWearPhase("saved");
        AccessibilityInfo.announceForAccessibility?.("Wearing your new look.");
      }
    } else if (wearPhase === "saving" && saving === false) {
      if (saveError) {
        setWearPhase("refused");
      } else if (wearAcceptedRef.current) {
        setWearPhase("saved");
        AccessibilityInfo.announceForAccessibility?.("Wearing your new look.");
      } else {
        setWearPhase("idle");
      }
    } else if (wearPhase === "refused") {
      if (saving === true) {
        setWearPhase("saving");
      } else if (hadSaveError && !saveError && !saving) {
        if (wearAcceptedRef.current) {
          setWearPhase("saved");
          AccessibilityInfo.announceForAccessibility?.("Wearing your new look.");
        } else {
          setWearPhase("idle");
        }
      }
    }
  }, [wearPhase, saving, saveError]);

  const items = useMemo(() => closetItemsForTab(tab), [tab]);
  const unseenUnlocked = useMemo(
    () =>
      unseen.filter((id) => {
        const item = styleCatalog.find((entry) => entry.id === id);
        return !!item && !lockedReason(item, earned);
      }),
    [unseen, earned]
  );
  const changed = useMemo(() => JSON.stringify(look) !== JSON.stringify(equipped), [look, equipped]);
  const wearable = changed && canWear(look, earned);
  const metrics = closetSheetMetrics(windowHeight);
  const { shortViewport, heightRatio } = metrics;
  const compact = windowHeight < 700;
  const thumbSize = shortViewport ? 44 : compact ? 54 : 62;

  const selectTab = useCallback((nextTab: ClosetTab) => {
    setTab(nextTab);
    setLockedNote(undefined);
    gridRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);

  const onTabsKeyDown = useCallback(
    (event: KeyEvent) => {
      const key = event.key ?? event.nativeEvent?.key ?? "";
      const list = event.currentTarget as { querySelectorAll?: (selector: string) => ArrayLike<TabNode> } | undefined;
      const tabNodes = list?.querySelectorAll?.('[role="tab"]');
      let current = -1;
      if (tabNodes && event.target) {
        current = Array.from(tabNodes).findIndex((node) => node === event.target || !!node.contains?.(event.target));
      }
      if (current < 0) current = Math.max(CLOSET_TABS.findIndex((entry) => entry.id === tab), 0);
      const next = nextClosetTabIndex(key, current, CLOSET_TABS.length);
      if (next === undefined) return;
      event.preventDefault?.();
      selectTab(CLOSET_TABS[next].id);
      tabNodes?.[next]?.focus?.();
    },
    [selectTab, tab]
  );

  const choose = (item: StyleItem) => {
    if (unseen.includes(item.id)) onSeen?.(item.id);
    const reason = lockedReason(item, earned);
    if (reason) {
      setLockedNote(reason);
      setWearPhase("idle");
      wearAcceptedRef.current = false;
      AccessibilityInfo.announceForAccessibility?.(reason);
      return;
    }
    setLockedNote(undefined);
    setWearPhase("idle");
    wearAcceptedRef.current = false;
    onTryOn(lookWithStyle(look, item), item);
  };

  const markAllSeen = () => {
    if (!unseenUnlocked.length) return;
    if (onSeenAll) {
      onSeenAll();
      return;
    }
    if (!onSeen) return;
    for (const id of unseenUnlocked) {
      if (onSeen(id) === false) break;
    }
  };

  const wear = () => {
    if (!wearable) return;
    setLockedNote(undefined);
    const accepted = onWear(look);
    wearAcceptedRef.current = accepted;
    if (!accepted) {
      setWearPhase("refused");
      AccessibilityInfo.announceForAccessibility?.(REFUSED_WEAR_MESSAGE);
      return;
    }
    if (typeof saving === "boolean") {
      setWearPhase("queued");
    } else if (saveError) {
      setWearPhase("refused");
      AccessibilityInfo.announceForAccessibility?.(saveError);
    } else {
      setWearPhase("saved");
      AccessibilityInfo.announceForAccessibility?.("Wearing your new look.");
    }
  };

  const showWearError = wearPhase === "refused" || !!saveError;
  const showWearSaving = !showWearError && (wearPhase === "queued" || wearPhase === "saving");
  const showWearSaved = !showWearError && !showWearSaving && wearPhase === "saved";

  const webTablistProps = { role: "tablist", "aria-label": "Closet categories", onKeyDown: onTabsKeyDown } as object;
  const webTabpanelProps = { id: "closet-tabpanel", role: "tabpanel", "aria-labelledby": `closet-tab-${tab}` } as object;
  const markAllSeenAction =
    unseenUnlocked.length > 0 && (onSeenAll || onSeen) ? (
      <Pressable
        testID="closet-mark-all-seen"
        accessibilityRole="button"
        accessibilityLabel="Mark all seen"
        onPress={markAllSeen}
        style={styles.markAllSeenButton}
      >
        <Text variant="small" tone="lagoon" maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.markAllSeenText}>
          Mark all seen
        </Text>
      </Pressable>
    ) : undefined;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      mode="small"
      heightRatio={heightRatio}
      compactHeader={shortViewport}
      onTitleRef={handleTitleRef}
      headerAction={markAllSeenAction}
      scroll={false}
      title="Closet"
      closeLabel="Close closet"
    >
      <View testID="home-closet-sheet" style={[styles.root, shortViewport && styles.rootCompact]}>
        {/* Picture-only category tabs: hair, tops, bottoms, hats, extras. */}
        <View testID="closet-tabs" accessibilityRole="tablist" style={styles.tabs} {...webTablistProps}>
          {CLOSET_TABS.map((entry) => {
            const active = tab === entry.id;
            const hasUnseen = entry.categories.some((category) =>
              unseen.some((id) => id.startsWith(`${category.toLowerCase()}:`))
            );
            const webTabProps = {
              id: `closet-tab-${entry.id}`,
              role: "tab",
              "aria-selected": active,
              "aria-controls": "closet-tabpanel",
            } as object;
            return (
              <Pressable
                key={entry.id}
                testID={`closet-tab-${entry.id}`}
                accessibilityRole="tab"
                accessibilityLabel={hasUnseen ? `${entry.label}, new items` : entry.label}
                accessibilityState={{ selected: active }}
                tabIndex={active ? 0 : -1}
                {...webTabProps}
                onPress={() => selectTab(entry.id)}
                style={[styles.tabButton, shortViewport && styles.tabButtonCompact, active && styles.tabButtonActive]}
              >
                <TabIcon tab={entry.id} active={active} />
                {hasUnseen && <View accessible={false} style={styles.tabDot} />}
              </Pressable>
            );
          })}
        </View>

        {!!lockedNote && (
          <View testID="closet-locked-rule" accessibilityLiveRegion="polite" style={[styles.ruleBanner, shortViewport && styles.ruleBannerCompact]}>
            <Icon glyph={LockSimple} size={18} tone="ink" />
            <Text variant="small" numberOfLines={shortViewport ? 1 : 2} style={styles.ruleText}>
              {lockedNote}
            </Text>
          </View>
        )}

        <FlatList
          key={shortViewport ? "short" : "tall"}
          ref={gridRef}
          data={items}
          numColumns={shortViewport ? 5 : 4}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={3}
          keyExtractor={item => item.id}
          columnWrapperStyle={{ gap: shortViewport ? theme.space.xs : theme.space.sm }}
          testID="closet-grid"
          style={styles.gridScroll}
          contentContainerStyle={{ gap: shortViewport ? theme.space.xs : theme.space.sm, paddingBottom: theme.space.sm }}
          showsVerticalScrollIndicator={false}
          {...webTabpanelProps}
          renderItem={({ item }) => {
            const reason = lockedReason(item, earned);
            const locked = !!reason;
            const selected = !locked && selectedValue(look, item.category) === item.value;
            const worn = !locked && selectedValue(equipped, item.category) === item.value;
            // P3-1: Reserve "trying on" strictly for actual unsaved draft changes.
            const tryingOn = selected && !worn;
            const isNew = unseen.includes(item.id);
            return (
              <Pressable
                key={item.id}
                testID={`closet-item-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}${reason ? `. Locked. ${reason}` : ""}${tryingOn ? ", trying on" : ""}${worn ? ", wearing" : ""}${isNew ? ", new" : ""}`}
                accessibilityState={{ selected }}
                onPress={() => choose(item)}
                style={[
                  styles.tile,
                  shortViewport && styles.tileCompact,
                  locked ? styles.tileLocked : styles.tileEarned,
                  selected && styles.tileSelected,
                ]}
              >
                <ClosetThumb
                  item={item}
                  locked={locked}
                  encoded={thumbnailLook(look, item)}
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
          }}
        />

        <View testID="closet-wear-bar" style={[styles.footer, shortViewport && styles.footerCompact]}>
          {showWearError && (
            <Text
              testID="closet-wear-error"
              variant="small"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              numberOfLines={shortViewport ? 1 : 2}
              style={[styles.statusText, styles.errorText]}
            >
              {saveError ?? REFUSED_WEAR_MESSAGE}
            </Text>
          )}
          {showWearSaving && (
            <Text
              testID="closet-wear-saving"
              variant="small"
              tone="muted"
              accessibilityLiveRegion="polite"
              style={styles.statusText}
            >
              Saving your look…
            </Text>
          )}
          {showWearSaved && (
            <Text
              testID="closet-wear-saved"
              variant="small"
              tone="lagoon"
              accessibilityLiveRegion="polite"
              style={styles.statusText}
            >
              Wearing your new look.
            </Text>
          )}
          <Button
            testID="closet-wear-button"
            label="Wear this"
            variant="primary"
            target={shortViewport ? "min" : compact ? "adult" : "child"}
            fill
            disabled={!wearable}
            onPress={wear}
            style={shortViewport ? styles.wearButtonCompact : undefined}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: theme.space.lg,
    gap: theme.space.sm,
  },
  rootCompact: {
    paddingHorizontal: theme.space.md,
    gap: 4,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.space.xs,
    flexShrink: 0,
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
  tabButtonCompact: {
    minWidth: theme.target.min,
    minHeight: theme.target.min,
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
    flexShrink: 0,
  },
  ruleBannerCompact: {
    paddingVertical: 3,
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
  gridCompact: {
    gap: theme.space.xs,
    paddingBottom: theme.space.xs,
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
  tileCompact: {
    width: "18%",
    minWidth: 64,
    minHeight: 72,
    padding: 4,
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
    flexShrink: 0,
  },
  footerCompact: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 2,
  },
  wearButtonCompact: {
    paddingVertical: theme.space.sm,
  },
  markAllSeenButton: {
    minHeight: theme.target.min,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.lagoonSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllSeenText: {
    fontWeight: "700",
  },
  statusText: {
    textAlign: "center",
    fontWeight: "700",
  },
  errorText: {
    color: theme.colors.conflict,
  },
});
