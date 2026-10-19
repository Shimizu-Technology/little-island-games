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
export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(),
    store = useStore(),
    [settings, setSettings] = useState(false),
    [filter, setFilter] = useState("All games");
  const availableWidth = width - insets.left - insets.right;
  const columns = availableWidth >= 980 ? 3 : availableWidth >= 600 ? 2 : 1,
    contentWidth = Math.min(availableWidth, 1080) - 44,
    cardWidth = (contentWidth - 16 * (columns - 1)) / columns;
  const choices = gameIds.filter(
    (id) =>
      filter === "All games" ||
      (filter === "Words & numbers" && ["word-rescue", "numbers"].includes(id)) ||
      (filter === "Think & explore" && ["tic-tac-toe", "checkers", "maze"].includes(id)) ||
      (filter === "Play together" && ["tic-tac-toe", "memory", "checkers"].includes(id))
  );
  const recent = store.save.recent && store.save.sessions[store.save.recent],
    resume = recent && !isFinished(recent) ? recent : null;
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.row, { paddingVertical: 22, justifyContent: "space-between" }]}>
          <View style={styles.row}>
            <View
              style={{
                width: 39,
                height: 39,
                borderRadius: 15,
                backgroundColor: "#E8D4A7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24, color: C.teal, fontWeight: "800" }}>li</Text>
            </View>
            <Text style={{ fontFamily: font, fontSize: 21, fontWeight: "800", color: C.ink, letterSpacing: -0.5 }}>
              little island
            </Text>
          </View>
          <Button
            quiet
            onPress={() => setSettings(true)}
            label="Open sound settings and grown-up backups"
            style={{ paddingHorizontal: 14 }}
          >
            Settings
          </Button>
        </View>
        <View
          style={{
            borderRadius: 28,
            backgroundColor: "#EAF0DF",
            padding: width > 600 ? 30 : 24,
            minHeight: width > 600 ? 235 : 260,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <View style={{ zIndex: 1, maxWidth: width > 600 ? "65%" : "100%" }}>
            <Label>A place to play, at your pace</Label>
            <Heading style={{ fontSize: width > 600 ? 43 : 35, lineHeight: width > 600 ? 51 : 42, marginTop: 12 }}>
              A little play.{`\n`}A lot to discover.
            </Heading>
            <Copy style={{ marginTop: 12, maxWidth: 340, color: "#4F6856" }}>
              Small adventures for curious minds.{`\n`}Pick a game and make it your own.
            </Copy>
          </View>
          {width > 600 ? (
            <View style={{ position: "absolute", right: 12, bottom: 3 }}>
              <Island width={280} />
            </View>
          ) : (
            <View style={{ position: "absolute", right: -20, bottom: -39, opacity: 0.27 }}>
              <Island width={205} />
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
          <View
            style={{
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 20,
              padding: 18,
              marginBottom: 23,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Label>Right where you left off</Label>
              <Heading style={{ fontSize: 20, marginTop: 5 }}>{games[resume.game].name}</Heading>
            </View>
            <Button onPress={() => open(resume.game)}>Continue</Button>
          </View>
        )}
        <View style={{ marginBottom: 18 }}>
          <Heading style={{ fontSize: 25 }}>What feels fun today?</Heading>
          <Copy style={{ marginTop: 4, fontSize: 14 }}>Six little worlds. Always ready to play offline.</Copy>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 23 }}>
          {["All games", "Words & numbers", "Think & explore", "Play together"].map((f) => (
            <Chip key={f} selected={f === filter} onPress={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
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
                  borderRadius: 24,
                  overflow: "hidden",
                  backgroundColor: C.paper,
                  borderWidth: 1,
                  borderColor: C.line,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{ height: 145, backgroundColor: g.surface, alignItems: "center", justifyContent: "center" }}
                >
                  <GameArt game={id} size={125} />
                  {ongoing && (
                    <View
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        paddingVertical: 5,
                        paddingHorizontal: 9,
                        backgroundColor: C.paper,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: C.teal }}>Saved round</Text>
                    </View>
                  )}
                </View>
                <View style={{ padding: 20 }}>
                  <Label style={{ color: g.color, fontSize: 10 }}>{g.tag}</Label>
                  <Heading style={{ fontSize: 23, marginTop: 7 }}>{g.name}</Heading>
                  <Copy style={{ fontSize: 14, lineHeight: 21, marginTop: 5, minHeight: 42 }}>{g.description}</Copy>
                  <View style={[styles.row, { justifyContent: "space-between", marginTop: 18 }]}>
                    <Text style={{ color: g.color, fontWeight: "800", fontSize: 14 }}>
                      {ongoing ? "Keep playing" : "Let’s play"}
                    </Text>
                    <Text style={{ fontSize: 24, color: g.color }}>→</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ alignItems: "center", marginTop: 30, gap: 5 }}>
          <Copy style={{ fontSize: 13 }}>Made for little moments together.</Copy>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted }}>NO ADS · NO ACCOUNTS · JUST PLAY</Text>
        </View>
      </ScrollView>
      <Settings visible={settings} onClose={() => setSettings(false)} />
    </SafeAreaView>
  );
}
