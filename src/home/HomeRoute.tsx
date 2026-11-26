import React, { useCallback, useState } from "react";
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
import { HomeScreen, type HomeSheet } from "./HomeScreen";

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

  const expected = { learner: owner, epoch: store.epoch };

  return (
    <HomeScreen
      key={`${owner}:${store.epoch}`}
      initialState={person.home}
      initialItem={intentConsumed ? undefined : resolvedHomeItem}
      initialSheet={intentConsumed ? undefined : initialSheet}
      initialClosetItem={intentConsumed ? undefined : resolvedClosetItem}
      initialBadge={intentConsumed ? undefined : resolvedBadge}
      onConsumeIntent={consumeIntent}
      badges={badgesFor(person.milestones)}
      milestones={person.milestones}
      closet={{
        look: person.look,
        earned: person.earned,
        unseen: person.unseen,
        onWear: (look) => store.personalize({ look, made: true }, expected),
        onSeen: (id) => {
          if (!person.unseen.includes(id)) return true;
          return store.personalize({ unseen: person.unseen.filter((entry) => entry !== id) }, expected);
        },
        onSeenAll: () => {
          const remaining = person.unseen.filter((id) => {
            const entry = styleCatalog.find((style) => style.id === id);
            return !entry || !!lockedReason(entry, person.earned);
          });
          if (remaining.length === person.unseen.length) return true;
          return store.personalize({ unseen: remaining }, expected);
        },
        renderCharacter: (look) => (input) => <HomeCharacter input={input} look={look} />,
      }}
      ownedWallpapers={wallThemes.filter(
        (id) => !["math-lab", "library", "night-sky", "arcade-neon"].includes(id) || person.earned.includes(id)
      )}
      ownedFloors={floorThemes.filter(
        (id) => !["island-breeze", "game-room"].includes(id) || person.earned.includes(id)
      )}
      ownedItems={[
        ...homeStickerItems(arcadeLearner(store.save.arcade, owner).stickers),
        ...(person.earned.filter((id) => furnitureIds.includes(id as (typeof furnitureIds)[number])) as ItemId[]),
      ]}
      persist={(home) => store.personalize({ home }, expected)}
      saveStatus={<SaveStatus />}
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
