import { completedLearningRounds, seasonalPacks, unlockedSeasonalPacks } from "./seasonal";
import { themeRewards } from "./catalog";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { arcadeLearner } from "../arcade/progress";
import { badgesFor } from "../badges/engine";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { lockedReason, styleCatalog } from "../personalization/catalog";
import { personFor } from "../personalization/model";
import { useStore } from "../state/Store";
import { Text } from "../ui/Text";
import { theme } from "../ui/theme";
import {
  floorThemes,
  furnitureIds,
  homeStickerItems,
  itemIds,
  wallThemes,
  type ItemId,
} from "./catalog";
import { HomeCharacter } from "./characterRenderer";
import { validBadgeId } from "./HomeBadgesSheet";
import { HomeScreen, type HomeClosetConfig, type HomeSheet } from "./HomeScreen";

const characterForLook: NonNullable<HomeClosetConfig["renderCharacter"]> = (look) => function DressedCharacter(input) { return <HomeCharacter input={input} look={look} />; };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validHomeItem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (
    itemIds.includes(value) ||
    (wallThemes as readonly string[]).includes(value) ||
    (floorThemes as readonly string[]).includes(value)
  ) {
    return value;
  }
  return undefined;
}

export function HomeRoute({
  initialSheet,
  item,
  closetItem,
  badge,
  loadingText = "Opening your home…",
}: {
  initialSheet?: HomeSheet;
  item?: string | string[];
  closetItem?: string | string[];
  badge?: string | string[];
  loadingText?: string;
}) {
  const store = useStore();
  const owner = store.save.learning?.active ?? "family";
  const person = personFor(store.save);
  const resolvedHomeItem = validHomeItem(firstParam(item));
  const resolvedClosetItemId = firstParam(closetItem);
  const resolvedClosetItem = resolvedClosetItemId
    ? styleCatalog.find((entry) => entry.id === resolvedClosetItemId)
    : undefined;
  const resolvedBadgeParam = firstParam(badge);
  const resolvedBadge = validBadgeId(resolvedBadgeParam) ? resolvedBadgeParam : undefined;
  // P2-1: Keep dismissed route intent consumed across learner/save-epoch remounts so an alias never replays.
  const intentKey = `${initialSheet ?? ""}|${resolvedHomeItem ?? ""}|${resolvedClosetItem?.id ?? ""}|${resolvedBadge ?? ""}`;
  const [consumedIntentKey, setConsumedIntentKey] = useState<string | null>(null);
  const intentConsumed = consumedIntentKey === intentKey;
  const consumeIntent = useCallback(() => {
    setConsumedIntentKey(intentKey);
  }, [intentKey]);

  const latestStore = useRef(store);
  useLayoutEffect(() => { latestStore.current = store; }, [store]);
  const personalize = useCallback<typeof store.personalize>((patch, identity) => latestStore.current.personalize(patch, identity), []);
  const { epoch } = store;
  const expected = useMemo(() => ({ learner: owner, epoch }), [owner, epoch]);
  const rounds = completedLearningRounds(store.save, owner);
  const packs = useMemo(() => unlockedSeasonalPacks(rounds, store.save.settings.unlockSeasonalPacks),
    [rounds, store.save.settings.unlockSeasonalPacks]);
  const { look, earned, unseen, milestones } = person;
  const closet = useMemo<HomeClosetConfig>(() => ({
    look, earned, unseen,
    onWear: (next) => personalize({ look: next, made: true }, expected),
    onSeen: (id) => !unseen.includes(id) || personalize({ unseen: unseen.filter(entry => entry !== id) }, expected),
    onSeenAll: () => {
      const remaining = unseen.filter(id => {
        const entry = styleCatalog.find(style => style.id === id);
        return !entry || !!lockedReason(entry, earned);
      });
      return remaining.length === unseen.length || personalize({ unseen: remaining }, expected);
    },
    renderCharacter: characterForLook,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Refresh admission closures when Store replaces its writer.
  }), [look, earned, unseen, personalize, expected, store.personalize]);
  const badges = useMemo(() => badgesFor(milestones), [milestones]);
  const ownedWallpapers = useMemo(() => wallThemes.filter(id =>
    (!themeRewards.some(r => r.id === id) && !seasonalPacks.some(p => p.wallpaper === id)) || earned.includes(id) || packs.some(p => p.wallpaper === id)), [earned, packs]);
  const ownedFloors = useMemo(() => floorThemes.filter(id =>
    (!themeRewards.some(r => r.id === id) && !seasonalPacks.some(p => p.floor === id)) || earned.includes(id) || packs.some(p => p.floor === id)), [earned, packs]);
  const stickers = useMemo(() => arcadeLearner(store.save.arcade, owner).stickers, [store.save.arcade, owner]);
  const ownedItems = useMemo(() => [
    ...packs.flatMap(p => [...p.items]), ...homeStickerItems(stickers),
    ...(earned.filter(id => furnitureIds.includes(id as (typeof furnitureIds)[number])) as ItemId[]),
  ], [packs, stickers, earned]);
  const persist = useCallback((home: import("./model").HomeStateV2) =>
    personalize({ home }, expected), [personalize, expected]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Refresh the status slot on save/error edges, while ordinary edits reuse it.
  const saveStatus = useMemo(() => <SaveStatus />, [store.saving, store.error]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Keep the compact slot in sync with the full status slot.
  const sheetSaveStatus = useMemo(() => <SaveStatus compact />, [store.saving, store.error]);

  if (!store.ready) {
    return (
      <SafeAreaView style={styles.page}>
        <Text variant="body">{loadingText}</Text>
      </SafeAreaView>
    );
  }
  if (store.recovery) {
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  }

  return (
    <HomeScreen
      key={`${owner}:${store.epoch}`}
      initialState={person.home}
      completedRounds={rounds}
      unlockSeasonalPacks={store.save.settings.unlockSeasonalPacks ?? false}
      initialItem={intentConsumed ? undefined : resolvedHomeItem}
      initialSheet={intentConsumed ? undefined : initialSheet}
      initialClosetItem={intentConsumed ? undefined : resolvedClosetItem}
      initialBadge={intentConsumed ? undefined : resolvedBadge}
      onConsumeIntent={consumeIntent}
      badges={badges}
      milestones={milestones}
      closet={closet}
      ownedWallpapers={ownedWallpapers}
      ownedFloors={ownedFloors}
      ownedItems={ownedItems}
      persist={persist}
      saveStatus={saveStatus}
      sheetSaveStatus={sheetSaveStatus}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.space.xl,
    justifyContent: "center",
    alignItems: "center",
  },
});
