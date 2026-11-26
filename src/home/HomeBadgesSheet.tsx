import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BadgeArt } from "../badges/BadgeArt";
import { badgeInfo, progressForBadge, trackLabels, tracks, type BadgeId } from "../badges/engine";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { theme } from "../ui/theme";

export function validBadgeId(value: unknown): value is BadgeId {
  return (
    typeof value === "string" &&
    tracks.some((track) => ([1, 2, 3, 4] as const).some((tier) => value === `${track}-${tier}`))
  );
}

function badgeAnnouncement(id: BadgeId, earned: boolean, milestones: readonly string[]): string {
  const info = badgeInfo(id);
  return earned
    ? `${info.name}. Earned. ${info.rule}`
    : `${info.name}. Not earned yet. ${info.rule} ${progressForBadge(id, milestones)}.`;
}

export type HomeBadgesSheetProps = {
  visible: boolean;
  onClose: () => void;
  badges: readonly BadgeId[];
  milestones: readonly string[];
  initialBadge?: BadgeId;
};

export function HomeBadgesSheet({
  visible,
  onClose,
  badges,
  milestones,
  initialBadge,
}: HomeBadgesSheetProps) {
  const [selected, setSelected] = useState<BadgeId | undefined>(initialBadge);
  const latestData = useRef({ badges, milestones });
  useLayoutEffect(() => {
    latestData.current = { badges, milestones };
  });
  const initializedIntent = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) {
      initializedIntent.current = null;
      return;
    }
    const intent = initialBadge ?? "__bare__";
    if (initializedIntent.current === intent) return;
    initializedIntent.current = intent;
    setSelected(initialBadge);
    if (initialBadge) {
      const { badges: currentBadges, milestones: currentMilestones } = latestData.current;
      AccessibilityInfo.announceForAccessibility?.(
        badgeAnnouncement(initialBadge, currentBadges.includes(initialBadge), currentMilestones)
      );
    }
  }, [visible, initialBadge]);

  const selectBadge = (id: BadgeId) => {
    setSelected(id);
    AccessibilityInfo.announceForAccessibility?.(
      badgeAnnouncement(id, badges.includes(id), milestones)
    );
  };

  const selectedInfo = selected ? badgeInfo(selected) : undefined;
  const selectedEarned = selected ? badges.includes(selected) : false;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      mode="large"
      title="Badge Wall"
      closeLabel="Close badge wall"
    >
      <View testID="home-badges-sheet" style={styles.root}>
        <View
          testID="badge-detail"
          accessibilityLiveRegion="polite"
          style={[styles.detailCard, selectedEarned && styles.detailCardEarned]}
        >
          {selected && selectedInfo ? (
            <>
              <BadgeArt id={selected} earned={selectedEarned} size={60} />
              <View style={styles.detailCopy}>
                <Text variant="body" style={styles.detailName}>
                  {selectedInfo.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {selectedEarned
                    ? `Earned · ${selectedInfo.rule}`
                    : `${selectedInfo.rule} · ${progressForBadge(selected, milestones)}`}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.detailCopy}>
              <Text variant="body" style={styles.detailName}>
                {badges.length} of {tracks.length * 4} badges earned
              </Text>
              <Text variant="caption" tone="muted">
                Tap any frame to see its picture and how to earn it.
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          testID="badge-wall"
          style={styles.wallScroll}
          contentContainerStyle={styles.wallContent}
          showsVerticalScrollIndicator={false}
        >
          {tracks.map((track) => (
            <View key={track} testID={`badge-track-${track}`} style={styles.trackCard}>
              <Text variant="body" style={styles.trackHeading}>
                {trackLabels[track]}
              </Text>
              <View style={styles.trackRow}>
                {([1, 2, 3, 4] as const).map((tier) => {
                  const id: BadgeId = `${track}-${tier}`;
                  const info = badgeInfo(id);
                  const earned = badges.includes(id);
                  const active = selected === id;
                  return (
                    <Pressable
                      key={id}
                      testID={`badge-${id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${info.name}. ${earned ? "Earned" : "Not earned yet"}. ${info.rule}`}
                      accessibilityState={{ selected: active }}
                      {...({ "aria-pressed": active } as object)}
                      onPress={() => selectBadge(id)}
                      style={[
                        styles.frame,
                        earned ? styles.frameEarned : styles.frameUnearned,
                        active && styles.frameSelected,
                      ]}
                    >
                      <BadgeArt id={id} earned={earned} size={52} />
                      <Text
                        variant="small"
                        tone={earned ? "ink" : "muted"}
                        maxFontSizeMultiplier={1.2}
                        numberOfLines={2}
                        style={styles.frameName}
                      >
                        {info.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: theme.space.lg,
    gap: theme.space.md,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.tile,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    minHeight: 76,
  },
  detailCardEarned: {
    backgroundColor: theme.pastels.home,
    borderColor: theme.colors.hairline,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailName: {
    fontWeight: "800",
  },
  wallScroll: {
    flex: 1,
    minHeight: 0,
  },
  wallContent: {
    gap: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  trackCard: {
    padding: theme.space.md,
    borderRadius: theme.radius.tile,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    gap: theme.space.sm,
  },
  trackHeading: {
    fontWeight: "800",
  },
  trackRow: {
    flexDirection: "row",
    gap: theme.space.xs,
  },
  frame: {
    flex: 1,
    minHeight: 98,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xs,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  frameEarned: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
  },
  frameUnearned: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.hairline,
  },
  frameSelected: {
    borderStyle: "solid",
    borderColor: theme.colors.lagoon,
    backgroundColor: theme.colors.lagoonSoft,
  },
  frameName: {
    textAlign: "center",
    fontWeight: "700",
  },
});
