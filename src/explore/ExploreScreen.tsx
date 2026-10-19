import { Text } from "../components/Text";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, C, Chip, Copy, Heading, Label, Status, font } from "../components/ui";
import { ExploreTopic, WORLDS, WorldId, searchTopics, topicById, topicNarration } from "./content";
import {
  FOOD_CHAIN,
  HABITATS,
  HABITAT_CHOICES,
  LabAction,
  LabState,
  PLACES,
  WATER_ACTIONS,
  activityTopic,
  isDay,
  labAction,
  newLab,
} from "./activities";
import { EarthLabArt, GlobeMap, Motif, TopicArt, WorldGlyph } from "./ExploreArt";
export interface ExploreScreenProps {
  favorites: readonly string[];
  onToggleFavorite: (topicId: string) => void;
  onBack: () => void;
  onSpeak: (topicId: string, transcript: string) => void;
  onStop: () => void;
  narrationEnabled?: boolean;
  speakingTopicId?: string;
}
type Location =
  | { kind: "map" }
  | { kind: "world"; world: WorldId }
  | { kind: "topic"; id: string }
  | { kind: "activity"; world: WorldId };
const locationKey = (location: Location) =>
  location.kind === "topic"
    ? `topic:${location.id}`
    : location.kind === "map"
      ? "map"
      : `${location.kind}:${location.world}`;
export function ExploreScreen({
  favorites,
  onToggleFavorite,
  onBack,
  onSpeak,
  onStop,
  narrationEnabled = true,
  speakingTopicId,
}: ExploreScreenProps) {
  const { width, fontScale } = useWindowDimensions();
  const [location, setLocation] = useState<Location>({ kind: "map" });
  const [history, setHistory] = useState<Location[]>([]);
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [labs, setLabs] = useState<Record<WorldId, LabState>>({
    space: newLab(),
    oceans: newLab(),
    animals: newLab(),
    weather: newLab(),
    world: newLab(),
  });
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const currentY = useRef(0);
  const pendingRestore = useRef(true);
  const currentKey = locationKey(location);
  const stopRef = useRef(onStop);
  useEffect(() => {
    stopRef.current = onStop;
  }, [onStop]);
  useEffect(() => () => stopRef.current(), []);
  const go = (next: Location) => {
    onStop();
    positions.current[currentKey] = currentY.current;
    pendingRestore.current = true;
    setHistory((previous) => [...previous, location]);
    setLocation(next);
  };
  const back = useCallback(() => {
    onStop();
    positions.current[locationKey(location)] = currentY.current;
    pendingRestore.current = true;
    if (history.length) {
      setLocation(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    } else onBack();
  }, [history, location, onBack, onStop]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => listener.remove();
  }, [back]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ y: positions.current[currentKey] ?? 0, animated: false });
      pendingRestore.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [currentKey]);
  useEffect(() => {
    if (!narrationEnabled) stopRef.current();
  }, [narrationEnabled]);
  const world =
    location.kind === "world" || location.kind === "activity" ? WORLDS.find((w) => w.id === location.world) : undefined;
  const topic = location.kind === "topic" ? topicById(location.id) : undefined;
  const topics = searchTopics(
    query,
    location.kind === "world" ? location.world : undefined,
    onlyFavorites ? favorites : undefined
  );
  const twoColumns = width >= 600 && fontScale < 1.5;
  const act = (id: WorldId, action: LabAction) =>
    setLabs((previous) => ({ ...previous, [id]: labAction(previous[id], action) }));
  return (
    <SafeAreaView style={s.page} edges={["top", "left", "right", "bottom"]}>
      <View style={s.topbar}>
        <Button
          quiet
          compact
          onPress={back}
          label={history.length ? "Back to previous discovery" : "Back to Little Island"}
        >
          ‹ {history.length ? "Back" : "Little Island"}
        </Button>
        <Label style={{ flexShrink: 1 }}>Explore</Label>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={(event) => {
          currentY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={80}
        onContentSizeChange={() => {
          if (pendingRestore.current) {
            pendingRestore.current = false;
            scroll.current?.scrollTo({ y: positions.current[currentKey] ?? 0, animated: false });
          }
        }}
        contentContainerStyle={s.content}
      >
        {location.kind === "map" && (
          <>
            <Label>Follow your curiosity</Label>
            <Heading style={s.title}>Where shall we go?</Heading>
            <Copy>Five worlds. Fifty discoveries. Ready without Wi-Fi.</Copy>
            <DiscoveryMap onChoose={(id) => go({ kind: "world", world: id })} />
          </>
        )}
        {location.kind === "world" && world && (
          <>
            <View style={[s.worldHeader, { backgroundColor: world.tint }]}>
              <WorldGlyph world={world.id} size={88} />
              <View style={{ flex: 1, minWidth: 140 }}>
                <Label>10 discoveries</Label>
                <Heading style={s.title}>{world.title}</Heading>
                <Copy style={{ color: C.ink }}>{world.invitation}</Copy>
              </View>
            </View>
            <Button onPress={() => go({ kind: "activity", world: world.id })}>Try: {world.activity}</Button>
          </>
        )}
        {(location.kind === "map" || location.kind === "world") && (
          <>
            <View style={s.sectionHeading}>
              <Heading style={{ fontSize: 24 }}>
                {location.kind === "map" ? "Find a discovery" : "Wonder about…"}
              </Heading>
              <Copy>
                {topics.length} {topics.length === 1 ? "topic" : "topics"}
              </Copy>
            </View>
            <TextInput
              style={s.input}
              accessibilityLabel="Search discoveries"
              placeholder="Search sky, turtles, space…"
              placeholderTextColor="#64716C"
              value={query}
              onChangeText={setQuery}
              maxLength={100}
              returnKeyType="search"
              autoCorrect={false}
            />
            <View style={s.row}>
              <Chip selected={!onlyFavorites} onPress={() => setOnlyFavorites(false)}>
                All discoveries
              </Chip>
              <Chip selected={onlyFavorites} onPress={() => setOnlyFavorites(true)}>
                Favorites ({favorites.length})
              </Chip>
            </View>
            {topics.length === 0 && (
              <Status
                title={onlyFavorites && !favorites.length ? "Your discoveries can live here" : "No discoveries found"}
                detail={
                  onlyFavorites && !favorites.length
                    ? "Open a topic and tap Save favorite. Try All discoveries to start exploring."
                    : "Try a shorter search, another world, or All discoveries."
                }
              />
            )}
            <View style={s.grid}>
              {topics.map((item) => (
                <TopicCard
                  key={item.id}
                  topic={item}
                  favorite={favorites.includes(item.id)}
                  onPress={() => go({ kind: "topic", id: item.id })}
                  twoColumns={twoColumns}
                />
              ))}
            </View>
          </>
        )}
        {topic && (
          <TopicView
            key={topic.id}
            topic={topic}
            favorite={favorites.includes(topic.id)}
            onFavorite={() => onToggleFavorite(topic.id)}
            onRelated={(id) => go({ kind: "topic", id })}
            onActivity={() => go({ kind: "activity", world: topic.world })}
            onSpeak={() => onSpeak(topic.id, topicNarration(topic))}
            onStop={onStop}
            narrationEnabled={narrationEnabled}
            speaking={speakingTopicId === topic.id}
          />
        )}
        {location.kind === "activity" && world && (
          <>
            <Label>{world.title} · Try it yourself</Label>
            <Heading style={s.title}>{world.activity}</Heading>
            <Lab world={world.id} state={labs[world.id]} act={(action) => act(world.id, action)} />
            <View style={s.row}>
              <Button quiet onPress={() => act(world.id, { type: "reset" })}>
                Start activity again
              </Button>
              <Button quiet onPress={() => go({ kind: "topic", id: activityTopic[world.id] })}>
                Read the discovery
              </Button>
            </View>
            <Copy style={{ fontSize: 13 }}>
              A simplified learning model. Shapes, sizes, and timing are changed to make the ideas easier to explore.
            </Copy>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function DiscoveryMap({ onChoose }: { onChoose: (id: WorldId) => void }) {
  const [focused, setFocused] = useState<string>();
  return (
    <View style={s.discoveryMap}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 500 500" preserveAspectRatio="none" accessibilityElementsHidden>
          <Rect width={500} height={500} rx={26} fill="#E3EFF0" />
          <Path
            d="M70 50q350 30 245 150T115 320t250 90"
            stroke="#90B7B6"
            strokeWidth={3}
            fill="none"
            strokeDasharray="5 9"
          />
          {[60, 205, 360, 470].map((y) => (
            <Path key={y} d={`M8 ${y}q30-12 55 0m360 20q30-12 55 0`} stroke="#B6D4D5" strokeWidth={3} fill="none" />
          ))}
        </Svg>
      </View>
      <Label style={{ textAlign: "center", paddingTop: 12 }}>Your discovery map</Label>
      <View style={s.mapGrid}>
        {WORLDS.map((world, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Explore ${world.title}, 10 discoveries and ${world.activity}`}
            key={world.id}
            onFocus={() => setFocused(world.id)}
            onBlur={() => setFocused(undefined)}
            onPress={() => onChoose(world.id)}
            style={({ pressed }) => [
              s.mapIsland,
              {
                backgroundColor: world.tint,
                borderColor: world.color,
                transform: [{ rotate: `${i % 2 ? 2 : -2}deg` }],
              },
              pressed && { opacity: 0.7 },
              focused === world.id && { outlineColor: C.blue, outlineWidth: 3 },
            ]}
          >
            <WorldGlyph world={world.id} size={68} />
            <Text style={s.islandLabel}>{world.title}</Text>
          </Pressable>
        ))}
      </View>
      <Copy style={{ fontSize: 12, textAlign: "center" }}>An imaginary map of ideas. Tap an island to explore.</Copy>
    </View>
  );
}
function TopicCard({
  topic,
  onPress,
  favorite,
  twoColumns,
}: {
  topic: ExploreTopic;
  onPress: () => void;
  favorite: boolean;
  twoColumns: boolean;
}) {
  const world = WORLDS.find((w) => w.id === topic.world)!;
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}${favorite ? ", saved favorite" : ""}. ${world.title}`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        s.card,
        { width: twoColumns ? "48.5%" : "100%" },
        pressed && { opacity: 0.75 },
        focused && { outlineColor: C.blue, outlineWidth: 3 },
      ]}
    >
      <TopicArt topic={topic} compact />
      <View style={s.cardText}>
        <Label style={{ color: world.color }}>
          {world.title}
          {favorite ? " · Saved" : ""}
        </Label>
        <Heading style={{ fontSize: 21, letterSpacing: -0.2 }}>{topic.title}</Heading>
        <Copy style={{ fontSize: 14, lineHeight: 22 }}>{topic.short}</Copy>
        <Text style={s.read}>Let's find out ›</Text>
      </View>
    </Pressable>
  );
}
function TopicView({
  topic,
  favorite,
  onFavorite,
  onRelated,
  onActivity,
  onSpeak,
  onStop,
  narrationEnabled,
  speaking,
}: {
  topic: ExploreTopic;
  favorite: boolean;
  onFavorite: () => void;
  onRelated: (id: string) => void;
  onActivity: () => void;
  onSpeak: () => void;
  onStop: () => void;
  narrationEnabled: boolean;
  speaking: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const world = WORLDS.find((w) => w.id === topic.world)!;
  return (
    <>
      <Label>{world.title}</Label>
      <Heading style={s.title}>{topic.title}</Heading>
      <TopicArt topic={topic} />
      <View style={s.row}>
        <Button onPress={onSpeak} disabled={!narrationEnabled}>
          {speaking ? "Read again" : "Listen to discovery"}
        </Button>
        <Button quiet disabled={!speaking} onPress={onStop}>
          Stop reading
        </Button>
        <Button
          quiet
          selected={favorite}
          onPress={onFavorite}
          label={`${favorite ? "Remove" : "Save"} favorite: ${topic.title}`}
        >
          {favorite ? "Saved favorite" : "Save favorite"}
        </Button>
      </View>
      {!narrationEnabled && <Copy>Sound is off. You can read every word below.</Copy>}
      <Copy style={s.short}>{topic.short}</Copy>
      <View style={s.deeper}>
        <Label>A little deeper</Label>
        <Copy style={{ color: C.ink }}>{topic.deeper}</Copy>
      </View>
      <View style={[s.deeper, { backgroundColor: world.tint }]}>
        <Label>Something to try</Label>
        <Heading style={{ fontSize: 21 }}>{topic.question}</Heading>
      </View>
      <Button onPress={onActivity}>Try: {world.activity}</Button>
      <Heading style={{ fontSize: 24 }}>Keep wondering</Heading>
      <View style={{ gap: 10 }}>
        {topic.related.map((id) => {
          const related = topicById(id)!;
          return (
            <Button key={id} quiet onPress={() => onRelated(id)}>
              {related.title} ›
            </Button>
          );
        })}
      </View>
      <Button quiet compact onPress={() => setShowSources((value) => !value)}>
        {showSources ? "Hide" : "About"} this discovery
      </Button>
      {showSources && (
        <View style={s.deeper}>
          <Copy style={{ fontSize: 13 }}>
            Original Little Island explanation and illustration. Fact-checked {topic.review.checkedOn} using:
          </Copy>
          {topic.sources.map((source) => (
            <View key={source.url}>
              <Text selectable style={s.sourceTitle}>
                {source.title}
              </Text>
              <Text selectable style={s.sourceUrl}>
                {source.url}
              </Text>
            </View>
          ))}
          <Copy style={{ fontSize: 12 }}>
            Source addresses are reference text, not links out of the app. Narration reads the title, explanation,
            deeper fact, and activity prompt shown here.
          </Copy>
        </View>
      )}
    </>
  );
}
function Lab({ world, state, act }: { world: WorldId; state: LabState; act: (action: LabAction) => void }) {
  if (world === "space") {
    const edge = state.turn === 2 || state.turn === 6;
    return (
      <>
        <Copy>
          Turn Earth while the Sun stays on the left. Follow the coral-colored dot: it marks one place on Earth.
        </Copy>
        <EarthLabArt turn={state.turn} />
        <Status
          title={
            edge
              ? "The dot is at the edge of daylight"
              : isDay(state.turn)
                ? "The dot has daytime"
                : "The dot has nighttime"
          }
          detail="Half of Earth faces sunlight. The other half faces away. This view looks down from above the North Pole."
        />
        <View style={s.row}>
          <Button quiet onPress={() => act({ type: "turn", by: -1 })}>
            Turn back
          </Button>
          <Button onPress={() => act({ type: "turn", by: 1 })}>Turn Earth ⅛</Button>
        </View>
        <Copy>
          Challenge: put the dot fully in daylight, then fully in darkness. Eight steps make one whole turn. The real
          Earth takes about a day.
        </Copy>
      </>
    );
  }
  if (world === "oceans")
    return (
      <>
        <Copy>
          Build one possible ocean food chain. Start with the energy source, then choose who receives that energy next.
        </Copy>
        <View style={s.chain}>
          {state.chain.length ? (
            state.chain.map((item, i) => (
              <View key={item} style={s.chainItem}>
                <Label>Link {i + 1}</Label>
                <Heading style={{ fontSize: 19 }}>{item}</Heading>
                {i < state.chain.length - 1 && <Copy>↓ energy moves to</Copy>}
              </View>
            ))
          ) : (
            <Copy>Your first link goes here.</Copy>
          )}
        </View>
        <View style={s.row}>
          {[3, 0, 4, 2, 1].map((index) => (
            <Button
              key={index}
              quiet
              disabled={state.chain.includes(FOOD_CHAIN[index]) || state.chain.length === 5}
              onPress={() => act({ type: "chain", item: FOOD_CHAIN[index] })}
            >
              {FOOD_CHAIN[index]}
            </Button>
          ))}
        </View>
        <Button quiet disabled={!state.chain.length} onPress={() => act({ type: "unchain" })}>
          Remove last link
        </Button>
        {state.message && (
          <Status
            title={state.chain.length === 5 ? "You built a chain!" : "Try the next connection"}
            detail={state.message}
            success={state.chain.length === 5}
          />
        )}
        <Copy>
          Phytoplankton use sunlight. Some zooplankton eat phytoplankton; some small fish eat zooplankton; larger fish
          can eat smaller fish. Animals often have several foods, so real life forms a web.
        </Copy>
      </>
    );
  if (world === "animals") {
    const animal = HABITATS[state.habitat];
    return (
      <>
        <Copy>Find a suitable habitat for each animal. Think about its food, water, shelter, and space.</Copy>
        <Copy>
          {state.matched.length} of {HABITATS.length} habitats found
        </Copy>
        {animal ? (
          <>
            <View style={s.labPicture}>
              <Svg width={130} height={130} viewBox="0 0 120 120" accessibilityElementsHidden>
                <Motif name={animal.art} />
              </Svg>
            </View>
            <Heading style={{ fontSize: 26 }}>{animal.animal}</Heading>
            <View style={s.row}>
              {HABITAT_CHOICES.map((choice) => (
                <Button key={choice} quiet onPress={() => act({ type: "habitat", choice })}>
                  {choice}
                </Button>
              ))}
            </View>
          </>
        ) : (
          <Status
            title="Six good habitat matches!"
            detail="Different living things need different homes. You found a suitable place for each one."
            success
          />
        )}
        {state.message && <Status title="Habitat clue" detail={state.message} />}
        <Copy>
          These are examples of suitable habitats. An animal's whole habitat is larger than one nest, leaf, or hiding
          place.
        </Copy>
      </>
    );
  }
  if (world === "weather")
    return (
      <>
        <Copy>
          Move a drop through water's different states. Choose an action, watch what changes, and try a different route.
        </Copy>
        <WaterPicture place={state.water} />
        <Status
          title={
            {
              ocean: "Liquid water in the ocean",
              vapor: "Invisible water vapor",
              cloud: "Tiny drops in a cloud",
              rain: "Rain falling to land",
              ground: "Water in soil and rock",
              ice: "Frozen water: ice",
            }[state.water]
          }
          detail={state.message || "Choose what happens to the water next."}
        />
        <View style={s.row}>
          {WATER_ACTIONS[state.water].map((choice) => (
            <Button key={choice.action} onPress={() => act({ type: "water", action: choice.action })}>
              {choice.label}
            </Button>
          ))}
        </View>
        <View style={s.deeper}>
          <Label>Your recent journey</Label>
          <Copy style={{ color: C.ink }}>
            {state.journey
              .map(
                (place) =>
                  ({ ocean: "Ocean", vapor: "Vapor", cloud: "Cloud", rain: "Rain", ground: "Groundwater", ice: "Ice" })[
                    place
                  ]
              )
              .join(" → ")}
          </Copy>
        </View>
        <Copy>
          Challenge: take a trip through the ground and back to the ocean. Then try freezing and melting. Real water can
          take many more paths and much longer journeys.
        </Copy>
      </>
    );
  return (
    <>
      <Copy>
        Follow five clues around a simplified world map. Tap a numbered destination below the map to choose it. North is
        up.
      </Copy>
      <GlobeMap selected={state.visited.at(-1)} />
      <Copy style={{ fontSize: 13 }}>
        Green = land · Blue = ocean · Numbered dots = destinations. Shapes are simplified and polar land is stretched.
      </Copy>
      <Status
        title={
          state.expedition === PLACES.length
            ? "You completed the expedition!"
            : `Clue ${state.expedition + 1} of ${PLACES.length}`
        }
        detail={
          state.expedition === PLACES.length
            ? "You found Guam, Japan, Australia, Africa, and Antarctica. Start again to revisit the route."
            : PLACES[state.expedition].clue
        }
        success={state.expedition === PLACES.length}
      />
      <View style={s.row}>
        {PLACES.map((place, index) => (
          <Button
            key={place.id}
            quiet
            disabled={state.expedition === PLACES.length}
            selected={state.visited.includes(place.id)}
            onPress={() => act({ type: "place", id: place.id })}
          >
            {index + 1}. {place.name}
          </Button>
        ))}
      </View>
      {state.message && <Status title="Expedition notebook" detail={state.message} />}
      <Copy>
        {state.visited.length} of {PLACES.length} destinations found. This map is for learning, not travel directions.
      </Copy>
    </>
  );
}
function WaterPicture({ place }: { place: LabState["water"] }) {
  return (
    <View style={s.labPicture}>
      <Svg width="100%" height={180} viewBox="0 0 320 180" accessibilityElementsHidden>
        <Rect width={320} height={180} rx={20} fill="#E4F1F2" />
        {place === "vapor" ? (
          <>
            {[110, 160, 210].map((x) => (
              <Path
                key={x}
                d={`M${x} 140q-20-20 0-40t0-40`}
                stroke="#6A8792"
                strokeWidth={4}
                strokeDasharray="4 6"
                fill="none"
              />
            ))}
            <Circle cx={47} cy={40} r={19} fill="#F0D397" />
          </>
        ) : place === "ice" ? (
          <Path
            d="m95 47 65-23 65 23v79l-65 25-65-25Zm0 0 65 24 65-24M160 71v80"
            fill="#B5D9E4"
            stroke="#477487"
            strokeWidth={3}
          />
        ) : place === "ground" ? (
          <>
            <Path d="M0 58h320v122H0Z" fill="#D6B899" />
            {[83, 131, 179, 227].map((x, i) => (
              <Path key={x} d={`M${x} ${80 + (i % 2) * 25}q-17 20 0 24 17-4 0-24Z`} fill="#528FA8" />
            ))}
          </>
        ) : place === "ocean" ? (
          <>
            {[85, 112, 139].map((y) => (
              <Path
                key={y}
                d={`M0 ${y}q30-20 60 0t60 0 60 0 60 0 80 0`}
                stroke="#5997B1"
                strokeWidth={12}
                fill="none"
              />
            ))}
            <Circle cx={48} cy={34} r={20} fill="#F0D397" />
          </>
        ) : (
          <GCloud rain={place === "rain"} />
        )}
      </Svg>
    </View>
  );
}
function GCloud({ rain }: { rain: boolean }) {
  return (
    <>
      <Path
        d="M98 90C52 89 64 37 106 46c7-48 80-44 88 1 46-9 65 44 16 50Z"
        fill="#FFF"
        stroke="#6B8790"
        strokeWidth={3}
      />
      {rain &&
        [109, 159, 209].map((x) => (
          <Path key={x} d={`m${x} 115-12 26`} stroke="#5997B1" strokeWidth={5} strokeLinecap="round" />
        ))}
    </>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },
  content: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 18,
  },
  title: { fontSize: 31, lineHeight: 39 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  sectionHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
    borderRadius: 15,
    padding: 15,
    minHeight: 52,
    fontSize: 17,
    fontFamily: font,
    color: C.ink,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  card: { borderRadius: 22, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  cardText: { padding: 18, gap: 9 },
  read: { fontFamily: font, color: C.teal, fontWeight: "700", fontSize: 15, marginTop: 3 },
  worldHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", borderRadius: 24, padding: 20, gap: 16 },
  short: { fontSize: 20, lineHeight: 31, color: C.ink },
  deeper: { padding: 20, gap: 10, backgroundColor: "#F0F2E8", borderRadius: 20 },
  sourceTitle: { fontFamily: font, fontSize: 14, color: C.ink, fontWeight: "700" },
  sourceUrl: { fontFamily: font, fontSize: 12, color: C.muted, flexShrink: 1 },
  discoveryMap: { overflow: "hidden", borderRadius: 26, padding: 14, gap: 14 },
  mapGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, paddingVertical: 8 },
  mapIsland: {
    flexGrow: 1,
    flexBasis: 124,
    maxWidth: 230,
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 32,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  islandLabel: { fontFamily: font, fontSize: 17, fontWeight: "700", color: C.ink, textAlign: "center" },
  labPicture: {
    backgroundColor: "#E9F0E9",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  chain: { padding: 18, gap: 9, backgroundColor: "#E4F1F1", borderRadius: 20 },
  chainItem: { gap: 3 },
});
