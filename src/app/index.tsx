import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { GameId, gameIds, games, isFinished } from "../games";
import { Button, C, Chip, Copy, Heading, Label, font, styles } from "../components/ui";
import { GameArt, Island } from "../components/Art";
import { Settings } from "../components/Settings";
import { Recovery } from "../components/Recovery";
import { useStore } from "../state/Store";
const filters = ["All games", "Words & numbers", "Think & explore", "Play together"];
export default function Home() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions(),
    store = useStore();
  const [settings, setSettings] = useState(false),
    [filter, setFilter] = useState("All games");
  const availableWidth = width - insets.left - insets.right;
  const tablet = availableWidth >= 600;
  const columns = fontScale > 1.3 || availableWidth < 350 ? 1 : availableWidth >= 900 ? 3 : 2;
  const contentWidth = Math.min(availableWidth, 1080) - 40;
  const cardWidth = (contentWidth - 12 * (columns - 1)) / columns;
  const choices = gameIds.filter(
    (id) =>
      filter === "All games" ||
      (filter === "Words & numbers" && ["word-rescue", "numbers"].includes(id)) ||
      (filter === "Think & explore" && ["tic-tac-toe", "checkers", "maze"].includes(id)) ||
      (filter === "Play together" && ["tic-tac-toe", "memory", "checkers"].includes(id))
  );
  const recent = store.save.recent && store.save.sessions[store.save.recent];
  const resume = recent && !isFinished(recent) ? recent : null;
  function open(game: GameId) {
    router.push({ pathname: "/play", params: { game } });
  }
  if (!store.ready)
    return (
      <SafeAreaView style={styles.page}>
        <View style={[styles.content, { paddingTop: 60 }]}>
          <Heading>Getting your island ready…</Heading>
        </View>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 20 }]}>
        <View style={[styles.row, { paddingVertical: 14, justifyContent: "space-between", flexWrap: "wrap" }]}>
          <View style={[styles.row, { gap: 9 }]}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: "#E8D4A7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22, color: C.teal, fontWeight: "800" }}>li</Text>
            </View>
            <Text style={{ fontFamily: font, fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.5 }}>
              little island
            </Text>
          </View>
          <Button compact quiet onPress={() => setSettings(true)} label="Open sound settings and grown-up backups">
            Settings
          </Button>
        </View>
        <View
          style={{
            borderRadius: 24,
            backgroundColor: "#EAF0DF",
            padding: tablet ? 26 : 20,
            overflow: "hidden",
            marginBottom: 22,
          }}
        >
          <View style={{ zIndex: 1, maxWidth: fontScale > 1.3 ? "100%" : tablet ? "70%" : "78%" }}>
            <Label>YOUR LITTLE PLACE TO PLAY</Label>
            <Heading style={{ fontSize: tablet ? 36 : 28, lineHeight: tablet ? 43 : 34, marginTop: 8 }}>
              A little play.{`\n`}A lot to discover.
            </Heading>
            <Copy style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: "#4F6856" }}>
              Pick a game. Take your time.
            </Copy>
          </View>
          {fontScale <= 1.3 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: tablet ? 16 : -36,
                bottom: tablet ? -5 : -13,
                opacity: tablet ? 0.9 : 0.55,
              }}
            >
              <Island width={tablet ? 235 : 155} />
            </View>
          )}
        </View>
        {store.error && (
          <View
            accessibilityRole="alert"
            style={{ padding: 15, backgroundColor: "#FBE8DE", borderRadius: 16, marginBottom: 16, gap: 10 }}
          >
            <Copy>{store.error}</Copy>
            <Button quiet onPress={() => void store.retry()}>
              Try saving again
            </Button>
          </View>
        )}
        {resume && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue ${games[resume.game].name}, your saved round`}
            onPress={() => open(resume.game)}
            style={({ pressed }) => ({
              padding: 15,
              borderRadius: 20,
              backgroundColor: C.soft,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <GameArt game={resume.game} size={48} />
            <View style={{ flex: 1 }}>
              <Label>Keep your adventure going</Label>
              <Heading style={{ fontSize: 19, marginTop: 4 }}>{games[resume.game].name}</Heading>
            </View>
            <Text style={{ color: C.teal, fontSize: 26 }} accessibilityElementsHidden>
              →
            </Text>
          </Pressable>
        )}
        <View style={{ marginBottom: 12 }}>
          <Heading style={{ fontSize: 24 }}>What feels fun today?</Heading>
          <Copy style={{ marginTop: 3, fontSize: 13, lineHeight: 20 }}>Six games. Ready whenever you are.</Copy>
        </View>
        <ScrollView
          horizontal
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Game categories"
          accessibilityHint="Swipe left or right to explore all categories."
          style={{ marginHorizontal: -20, marginBottom: 18, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 3, alignItems: "center" }}
        >
          {filters.map((f) => (
            <Chip key={f} selected={f === filter} onPress={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {choices.map((id) => {
            const g = games[id],
              saved = store.save.sessions[id],
              ongoing = saved && !isFinished(saved);
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Play ${g.name}${ongoing ? ", saved round available" : ""}`}
                onPress={() => open(id)}
                style={({ pressed }) => ({
                  width: cardWidth,
                  borderRadius: 22,
                  overflow: "hidden",
                  backgroundColor: C.paper,
                  borderWidth: 1,
                  borderColor: C.line,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    height: tablet ? 132 : 108,
                    backgroundColor: g.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GameArt game={id} size={tablet ? 110 : 94} />
                  {ongoing && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        paddingVertical: 4,
                        paddingHorizontal: 7,
                        backgroundColor: C.paper,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: C.teal }}>Saved</Text>
                    </View>
                  )}
                </View>
                <View style={{ padding: tablet ? 18 : 13, flex: 1 }}>
                  <Heading style={{ fontSize: tablet ? 23 : 19, letterSpacing: -0.45 }}>{g.name}</Heading>
                  <Copy style={{ fontSize: 13, lineHeight: 19, marginTop: 5, minHeight: 38 }}>{g.description}</Copy>
                  <View style={[styles.row, { justifyContent: "space-between", marginTop: 12 }]}>
                    <Text style={{ color: g.color, fontFamily: font, fontWeight: "700", fontSize: 13 }}>
                      {ongoing ? "Continue" : "Let’s play"}
                    </Text>
                    <Text style={{ fontSize: 22, color: g.color }} accessibilityElementsHidden>
                      →
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ alignItems: "center", marginTop: 25, gap: 4 }}>
          <Copy style={{ fontSize: 12 }}>Made for little moments together.</Copy>
          <Text style={{ fontSize: 10, letterSpacing: 1, color: C.muted }}>OFFLINE · NO ADS · JUST PLAY</Text>
        </View>
      </ScrollView>
      <Settings visible={settings} onClose={() => setSettings(false)} />
    </SafeAreaView>
  );
}
