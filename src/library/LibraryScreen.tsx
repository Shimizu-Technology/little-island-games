import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../components/Text";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useStore } from "../state/Store";
import { familyLearners } from "../learn/learners";
import { learnIds, type LearnId } from "../learn/types";
import { gameIds } from "../games";
import { boardIds } from "../board";
import { activityIds } from "../state/activities";
import { arcadeIds } from "../arcade";
import { type WorldId } from "../explore/content";
import { labAction } from "../explore/activities";
import { newExploreProgress } from "../explore/progress";
import { libraryChild, libraryHoursOpen, type LibraryChildState } from "./state";
import {
  authored,
  availableItems,
  canOpen,
  categories,
  exhibits,
  itemById,
  recordSpeech,
  searchIndex,
  worldCategory,
  type CatalogItem,
} from "./catalog";
import { categoryAfterTyping, search, searchCategory } from "./search";
import { Action, ItemPicture, LibraryIcon, s } from "./ui";
import { SoundSwitch } from "./SoundSwitch";
import { LibraryArt } from "./LibraryArt";
import { useLibraryAudio } from "./useLibraryAudio";
import { TopicPage } from "./Topics";
import { Reader } from "./Reader";
import { createLibraryPage } from "./drawing";
import { Maker, DrawingArt } from "./Maker";
import { GrownUps } from "./GrownUps";
import { LookListen } from "./LookListen";
import { ReviewedNarration } from "./ReviewedNarration";
import { Exhibit } from "./Exhibit";
import { hasPendingPages, pageDraftKey, pendingPage } from "./drafts";
import { canonicalDestination, exhibitWorld as resolveExhibitWorld, hearTitleLabel, libraryBack, mayFinishPage } from "./navigation";
import { canonicalLibraryId, rememberLibraryDestination } from "./ids";
import type { ReadingLayer } from "./schema";
const extensions = new Map<string, number>();
export default function LibraryScreen() {
  const store = useStore();
  const route = useLocalSearchParams<{ place?: string; id?: string }>();
  if (!store.ready)
    return (
      <SafeAreaView style={s.page}>
        <Text style={s.body}>Opening your Library…</Text>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={s.page}>
        <Recovery />
      </SafeAreaView>
    );
  return (
    <LibraryReady
      key={`${store.epoch}:${store.save.learning?.active ?? "family"}:${route.place ?? "wonder"}:${route.id ?? ""}`}
    />
  );
}
function LibraryReady() {
  const store = useStore();
  const { width, fontScale } = useWindowDimensions();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ place?: string; id?: string; resume?: string }>();
  const place = params.place ?? "wonder";
  const id = canonicalLibraryId(params.id ?? "");
  const people = store.save.learning ?? familyLearners();
  const childId = people.active;
  const child = libraryChild(store.save.library, childId);
  const live = useRef(child);
  useLayoutEffect(() => {
    live.current = child;
  }, [child]);
  const update = useCallback(
    (patch: Partial<LibraryChildState>) => {
      const next = { ...live.current, ...patch };
      const admitted = store.libraryPatch(patch, store.epoch, childId);
      if (admitted) live.current = next;
      return admitted;
    },
    [store, childId]
  );
  const allowed = useMemo(() => availableItems(child.policy.collections), [child.policy.collections]);
  const allowedIds = useMemo(() => new Set(allowed.map((item) => item.id)), [allowed]);
  const record = itemById(id);
  const audio = useLibraryAudio(
    store.save.settings.sound && store.save.settings.narration !== false && focused,
    store.save.settings.narrationVolume ?? 0.75,
    `${place}:${id}:${childId}:${store.epoch}`
  );
  const [bookInfo, setBookInfo] = useState(false);
  const [notice, setNotice] = useState("");
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const open = libraryHoursOpen(child.policy, now) || (extensions.get(childId) ?? 0) > now.getTime();
  const [enteredOpen] = useState(open);
  const currentOpen = useRef(open);
  useLayoutEffect(() => {
    currentOpen.current = open;
  }, [open]);
  const safePage = mayFinishPage(place, enteredOpen);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const stopAudio = audio.stop;
  useEffect(() => {
    if (!focused) stopAudio();
  }, [focused, stopAudio]);
  const pause = async () => {
    audio.stop();
    if (hasPendingPages(childId)) {
      setNotice("A page still needs saving. Reopen it in Make or export it before pausing. A grown-up can help.");
      return;
    }
    if (await store.libraryFlush()) {
      setPaused(true);
      setNotice("");
    } else setNotice("Your work is still here. Retry saving before pausing.");
  };
  const visit = (nextPlace: string, nextId = "", replace = false) => {
    if (!currentOpen.current && nextPlace !== "grownups") {
      void pause();
      return;
    }
    audio.stop();
    setNotice("");
    if (nextId && !nextId.startsWith("page-")) {
      const destinationId = canonicalDestination(nextPlace, nextId);
      update({
        recent: rememberLibraryDestination(live.current.recent, destinationId),
        current: destinationId,
      });
    }
    const target = { pathname: "/library" as const, params: { place: nextPlace, ...(nextId ? { id: nextId } : {}) } };
    if (replace) router.replace(target);
    else router.push(target);
  };
  const back = () => {
    audio.stop();
    if (!open) {
      void pause();
      return;
    }
    // A tab root leaves for the Island map; everywhere else Back returns to where the child came from.
    if (libraryBack(place, id) === "island") router.dismissTo("/");
    else if (router.canGoBack()) router.back();
    else if (place === "reader") visit("books", "", true);
    else router.replace("/");
  };
  const savedId = (itemId: string) => canonicalLibraryId(itemById(itemId)?.id ?? itemId);
  const isSaved = (itemId: string) => child.saved.some(value => savedId(value) === savedId(itemId));
  const toggleSaved = (itemId: string) => update({
    saved: isSaved(itemId)
      ? child.saved.filter(value => savedId(value) !== savedId(itemId))
      : [...child.saved, savedId(itemId)].slice(-300),
  });
  const openItem = (itemId: string) => {
    if (itemId.startsWith("complete:")) {
      const topicId = itemId.slice(9);
      const progress = {
        ...newExploreProgress(),
        ...store.save.explore?.progress,
        location: { kind: "topic" as const, id: topicId },
      };
      store.exploreUpdate(progress, store.epoch, topicId);
      setNotice("Your discovery is kept.");
      return;
    }
    if (itemId.startsWith("game:")) {
      if (!currentOpen.current) {
        void pause();
        return;
      }
      const game = itemId.slice(5);
      if (learnIds.includes(game as LearnId)) router.push({ pathname: "/learn", params: { game } });
      else if (gameIds.some((id) => id === game)) router.push({ pathname: "/play", params: { game } });
      else if (boardIds.some((id) => id === game)) router.push({ pathname: "/board", params: { game } });
      else if (activityIds.some((id) => id === game)) router.push({ pathname: "/activity", params: { game } });
      else if (arcadeIds.some((id) => id === game)) router.push({ pathname: "/arcade", params: { game } });
      else setNotice("This activity is not installed. Choose another picture.");
      return;
    }
    if (!canOpen(itemId, child.policy.collections)) {
      setNotice("A grown-up can choose which collections are available. Your saved place is kept.");
      return;
    }
    if (itemId.startsWith("lab-")) visit("exhibit", itemId.slice(4));
    else {
      const item = itemById(itemId);
      visit(
        item?.item?.type === "book" ? "reader" : item?.item?.type === "exhibit" ? "authored-exhibit" : "topic",
        itemId
      );
    }
  };
  const make = (sourceId?: string) => {
    if (!open) {
      void pause();
      return;
    }
    if (child.creations.length >= 24) {
      setNotice("My Shelf has 24 pages. Export and remove a page to make room.");
      return;
    }
    const creation = createLibraryPage(sourceId);
    update({ creations: [...child.creations, creation] });
    visit("make", creation.id);
  };
  const creation = child.creations.find((page) => page.id === id);
  const restricted =
    (place === "authored-exhibit" &&
      record?.item?.type === "exhibit" &&
      !child.policy.collections.includes(record.item.category)) ||
    (creation?.sourceId && !canOpen(creation.sourceId, child.policy.collections)) ||
    (record && !allowedIds.has(record.id)) ||
    (place === "exhibit" && !child.policy.collections.includes(worldCategory[id as WorldId]));
  const list = useRef<FlatList<CatalogItem>>(null);
  const scroll = useRef<ScrollView>(null);
  const queryKey = [...child.query].reduce((hash, letter) => (Math.imul(hash, 31) + letter.charCodeAt(0)) | 0, 0) >>> 0;
  const positionKey = `${place}:${id || "index"}:${child.category}:q${queryKey}`;
  const scrollY = useRef(0);
  const restored = useRef(false);
  const legacyScrollKey =
    place === "topic"
      ? `topic:${id}`
      : child.category === "all"
        ? "map"
        : `world:${Object.entries(worldCategory).find(([, category]) => category === child.category)?.[0]}`;
  const oldTurtlePosition = place === "topic" && id === "turtle-breath"
    ? child.positions[positionKey.replace("turtle-breath", "turtles")] ?? child.positions["topic:turtles"]
    : undefined;
  const savedY = child.positions[positionKey] ?? child.positions[legacyScrollKey] ?? oldTurtlePosition ?? 0;
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPositionKey = useRef(positionKey);
  useLayoutEffect(() => {
    latestPositionKey.current = positionKey;
  }, [positionKey]);
  const remember = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = null;
    const positions = { ...live.current.positions, [latestPositionKey.current]: scrollY.current };
    update({ positions: Object.fromEntries(Object.entries(positions).slice(-64)) });
  }, [update]);
  const rememberRef = useRef(remember);
  useLayoutEffect(() => {
    rememberRef.current = remember;
  }, [remember]);
  useEffect(
    () => () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    []
  );
  const onScroll = (y: number) => {
    scrollY.current = y;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => rememberRef.current(), 250);
  };
  const cols = fontScale > 1.6 ? 1 : width < 650 ? 2 : width < 1000 ? 3 : 4;
  const results = useMemo(
    () =>
      search(
        searchIndex,
        child.query,
        child.onlyFavorites ? new Set(child.saved.map(id => itemById(id)?.id ?? id).filter((id) => allowedIds.has(id))) : allowedIds,
        searchCategory(child.query, child.category)
      )
        .map((entry) => itemById(entry.id)!)
        .filter(Boolean),
    [child.query, child.category, child.onlyFavorites, child.saved, allowedIds]
  );
  useEffect(() => {
    if (!params.resume) return;
    const old = store.save.explore?.progress?.location;
    router.replace({
      pathname: "/library",
      params:
        old?.kind === "topic"
          ? { place: "topic", id: old.id }
          : old?.kind === "activity"
            ? { place: "exhibit", id: old.world }
            : { place: "wonder" },
    });
  }, [params.resume, store.save.explore?.progress?.location]);
  const card = (item: CatalogItem) => (
    <View
      style={[
        s.card,
        item.item?.type === "book" && {
          backgroundColor: "#E9D6AF",
          borderColor: "#A77F56",
          borderBottomWidth: 12,
          borderBottomColor: "#A77F56",
          borderRadius: 12,
          flex: 0,
          flexBasis: (Math.min(width, 1200) - 20) / cols - 12,
          flexShrink: 0,
          width: (Math.min(width, 1200) - 20) / cols - 12,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => {
          remember();
          openItem(item.id);
        }}
        onLongPress={() => {
          const speech = recordSpeech(item);
          audio.speak(speech.key, speech.sentence);
        }}
      >
        <ItemPicture record={item} pictureHeight={item.item?.type === "book" ? (width < 650 ? 210 : 300) : undefined} />
        <Text style={s.cardTitle}>{item.title}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hearTitleLabel(item.title)}
        onPress={() => {
          const speech = recordSpeech(item);
          audio.speak(speech.key, speech.sentence);
        }}
        style={{
          position: "absolute",
          right: 5,
          top: 5,
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          borderRadius: 25,
          backgroundColor: "#FFFBEF",
        }}
      >
        <LibraryIcon name="sound" size={22} />
      </Pressable>
    </View>
  );
  if (place === "little" && open && !paused)
    return (
      <SafeAreaView style={s.page}>
        <LookListen
          items={allowed.filter((item) => item.item?.type !== "book" && item.item?.type !== "exhibit")}
          speak={audio.speak}
          stop={audio.stop}
          onExit={() => visit("wonder", "", true)}
        />
        {audio.notice && <Text style={s.small}>{audio.notice}</Text>}
      </SafeAreaView>
    );
  const blocked = (paused || (!open && !safePage)) && place !== "grownups";
  const showGrid = (place === "wonder" || place === "books") && !blocked;
  const authoredExhibit = record?.item?.type === "exhibit" ? record.item : undefined;
  const exhibitWorld = place === "exhibit" ? (id as WorldId) : resolveExhibitWorld(record);
  return (
    <SafeAreaView style={s.page} edges={["top", "left", "right", "bottom"]}>
      <View style={s.header}>
        <Action onPress={back} label="Back">
          <LibraryIcon name="back" size={24} />
        </Action>
        <Text
          style={[s.heading, { marginTop: 0, flex: 1, fontSize: place === "reader" ? 17 : 20, textAlign: "center" }]}
        >
          {place === "reader" ? record?.title : "Island Library"}
        </Text>
        <SoundSwitch
          on={store.save.settings.sound}
          onToggle={() => {
            audio.stop();
            store.settings({ sound: !store.save.settings.sound });
          }}
        />
        {place === "reader" ? (
          <>
            <Action
              label={isSaved(id) ? "Saved book. Remove from My Shelf" : "Save book"}
              selected={isSaved(id)}
              onPress={() => toggleSaved(id)}
            >
              <LibraryIcon name="heart" size={24} />
            </Action>
            <Action label="Book information" onPress={() => setBookInfo(true)}>
              <LibraryIcon name="info" size={24} />
            </Action>
          </>
        ) : (
          <Action label="Grown-ups" onPress={() => visit("grownups")}>
            <LibraryIcon name="lock" size={24} />
          </Action>
        )}
      </View>
      {!!store.error && <SaveStatus />}
      {!!(notice || audio.notice) && (
        <View style={s.notice}>
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {notice || audio.notice}
          </Text>
        </View>
      )}
      {!open && safePage && !paused && (
        <View style={s.notice}>
          <Text style={s.body}>Finish this page, then we’ll pause.</Text>
          <Action
            onPress={() => {
              void pause();
            }}
          >
            Save and pause
          </Action>
          <Action onPress={() => visit("grownups")}>Grown-ups</Action>
        </View>
      )}
      {blocked ? (
        <View style={s.content}>
          <Text style={s.title}>{paused ? "A good place to pause" : "The Library is resting"}</Text>
          <Text style={s.body}>
            {paused ? "Your work is saved in My Shelf." : "Your saved pages and places are here for your next visit."}
          </Text>
          <Action onPress={() => visit("grownups")}>Grown-ups</Action>
          <Action onPress={() => router.replace("/")}>Return to the Island</Action>
        </View>
      ) : restricted ? (
        <View style={s.content}>
          <Text style={s.body}>
            This collection is resting. Your place is kept for when a grown-up makes it available.
          </Text>
          <Action onPress={() => visit("wonder", "", true)}>Choose another picture</Action>
        </View>
      ) : showGrid ? (
        <FlatList
          ref={list}
          key={`${place}:${cols}`}
          data={place === "books" ? allowed.filter((item) => item.item?.type === "book") : results}
          numColumns={cols}
          style={place === "books" ? { backgroundColor: "#F0E1C6" } : undefined}
          columnWrapperStyle={
            place === "books" && cols > 1
              ? {
                  backgroundColor: "#E5D0AC",
                  borderBottomWidth: 12,
                  borderColor: "#9B724E",
                  marginBottom: 24,
                  borderRadius: 12,
                  paddingTop: 14,
                }
              : undefined
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => card(item)}
          contentContainerStyle={{ padding: 10, paddingBottom: 28, maxWidth: 1200, width: "100%", alignSelf: "center" }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={120}
          onContentSizeChange={() => {
            if (!restored.current) {
              restored.current = true;
              list.current?.scrollToOffset({ offset: savedY, animated: false });
            }
          }}
          ListHeaderComponent={
            place === "books" ? (
              <View style={[s.content, { backgroundColor: "#F0E1C6", borderRadius: 24, marginBottom: 16 }]}>
                <Text style={s.title}>Our story shelf</Text>
                <Text style={s.body}>A shelf of stories to share.</Text>
              </View>
            ) : (
              <View style={{ padding: 8, gap: 14 }}>
                <Text style={[s.title, { fontSize: 28 }]}>What do you wonder?</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Look & Listen"
                  onPress={() => visit("little")}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFF3D4",
                    borderWidth: 2,
                    borderColor: "#577E69",
                    borderRadius: 26,
                    overflow: "hidden",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ width: "45%", height: 130 }}>
                    <LibraryArt kind="turtle" />
                  </View>
                  <View style={{ flex: 1, padding: 12, gap: 8, alignItems: "center" }}>
                    <LibraryIcon name="listen" size={36} />
                    <Text style={[s.heading, { marginTop: 0, textAlign: "center", fontSize: 21 }]}>Look & Listen</Text>
                  </View>
                </Pressable>
                <TextInput
                  accessibilityLabel="Search the Library"
                  value={child.query}
                  onChangeText={(query) => {
                    scrollY.current = 0;
                    update({ query, category: categoryAfterTyping(query, live.current.category) });
                  }}
                  maxLength={120}
                  style={s.input}
                  placeholder="Find a wonder…"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                <Action
                  selected={child.category === "all" && !child.query}
                  onPress={() => update({ category: "all", query: "", onlyFavorites: false })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <LibraryIcon name="wonder" size={36} />
                    <Text style={[s.actionText, { fontSize: 19 }]}>All pictures</Text>
                    <View style={{ width: 80, height: 48, overflow: "hidden", borderRadius: 14 }}>
                      <LibraryArt kind="butterfly" />
                    </View>
                  </View>
                </Action>
                {!child.query && child.category === "all" && (
                  <View style={s.row}>
                    {categories
                      .filter((category) => category.id !== "books" && child.policy.collections.includes(category.id))
                      .map((category) => (
                        <Pressable
                          key={category.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Browse ${category.title}`}
                          accessibilityState={{ selected: child.category === category.id }}
                          onPress={() => {
                            scrollY.current = 0;
                            update({ category: child.category === category.id ? "all" : category.id });
                          }}
                          onLongPress={() => audio.speak(category.speechKey)}
                          style={[
                            {
                              width: fontScale > 1.6 ? "100%" : width < 650 ? "48%" : width < 1000 ? "31%" : "23.5%",
                              backgroundColor: category.tint,
                              borderRadius: 24,
                              overflow: "hidden",
                              borderWidth: 2,
                              borderColor: "#577E69",
                            },
                            child.category === category.id && s.selected,
                          ]}
                        >
                          <View style={{ width: "100%", height: width < 650 ? 142 : 164 }}>
                            <LibraryArt kind={category.motif} />
                          </View>
                          <Text
                            style={[
                              s.actionText,
                              {
                                padding: 10,
                                minHeight: 54,
                                backgroundColor: "#FFF3D4",
                                borderTopWidth: 2,
                                borderColor: "#A2B18A",
                              },
                            ]}
                          >
                            {category.title}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                )}
                {!child.query && (
                  <>
                    <Text style={s.heading}>Try an exhibit</Text>
                    <View style={s.row}>
                      {exhibits
                        .filter((exhibit) => child.policy.collections.includes(exhibit.category))
                        .map((exhibit) => (
                          <Action
                            key={exhibit.world}
                            onPress={() => {
                              remember();
                              const reviewed = authored.find(item => item.type === "exhibit" && resolveExhibitWorld({ id: item.id, title: item.title, category: item.category, motif: exhibit.motif, item }) === exhibit.world);
                              if (reviewed) visit("authored-exhibit", reviewed.id);
                              else visit("exhibit", exhibit.world);
                            }}
                          >
                            <View
                              style={{
                                width: width < 650 ? 128 : 160,
                                height: 88,
                                overflow: "hidden",
                                borderRadius: 16,
                              }}
                            >
                              <LibraryArt kind={exhibit.motif} />
                            </View>
                            {exhibit.title}
                          </Action>
                        ))}
                    </View>
                  </>
                )}
                <View style={s.row}>
                  <Action
                    selected={!!child.onlyFavorites}
                    onPress={() => update({ onlyFavorites: !child.onlyFavorites })}
                  >
                    Saved pictures
                  </Action>
                </View>
                <Text style={s.heading}>{child.query ? "Your discoveries" : "Follow a picture"}</Text>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={s.content}>
              <Text style={s.body}>
                {place === "books"
                  ? "Reviewed books will appear here when they are installed."
                  : "No picture found yet. Try another word, or choose a picture above."}
              </Text>
              {place !== "books" && (
                <Action onPress={() => update({ query: "", category: "all", onlyFavorites: false })}>
                  Back to pictures
                </Action>
              )}
            </View>
          }
        />
      ) : place === "reader" && record?.item?.type === "book" ? (
        <View style={{ flex: 1 }}>
          <Reader
            book={record.item}
            page={child.bookPages[id] ?? 0}
            onPage={(page) => {
              if (!open) {
                void pause();
                return;
              }
              audio.stop();
              update({ bookPages: { ...child.bookPages, [id]: page } });
            }}
            showInfo={bookInfo}
            onCloseInfo={() => setBookInfo(false)}
            selected={audio.selected}
            speak={(sentence) => audio.speak(sentence.speechKey, sentence)}
            word={audio.word}
          />
        </View>
      ) : place === "make" && creation ? (
        <Maker
          key={creation.id}
          wide={width >= 700 && fontScale < 1.6}
          draftKey={pageDraftKey(childId, creation.id)}
          creation={creation}
          saving={store.saving}
          saveError={!!store.error}
          onChange={(next) => update({ creations: child.creations.map((page) => (page.id === next.id ? next : page)) })}
        />
      ) : (
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, place === "topic" && { padding: 0, maxWidth: 1300 }]}
          onContentSizeChange={() => {
            if (!restored.current) {
              restored.current = true;
              scroll.current?.scrollTo({ y: savedY, animated: false });
            }
          }}
          onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={120}
        >
          {place === "topic" && record ? (
            <TopicPage
              record={record}
              layer={child.layers[id] ?? (id === "turtle-breath" ? child.layers.turtles : undefined) ?? "tell"}
              onLayer={(layer: ReadingLayer) => {
                audio.stop();
                update({ layers: { ...child.layers, [id]: layer } });
              }}
              saved={isSaved(id)}
              toggleSaved={() => toggleSaved(id)}
              collections={child.policy.collections}
              selected={audio.selected}
              speak={audio.speak}
              go={openItem}
              make={() => make(id)}
            />
          ) : place === "make" ? (
            creation ? (
              <Maker
                key={creation.id}
                draftKey={pageDraftKey(childId, creation.id)}
                creation={creation}
                saving={store.saving}
                saveError={!!store.error}
                onChange={(next) =>
                  update({ creations: child.creations.map((page) => (page.id === next.id ? next : page)) })
                }
              />
            ) : (
              <View style={{ gap: 18 }}>
                <Text style={s.title}>Make something yours</Text>
                <Text style={s.body}>Draw freely, add pictures, and tell about a wonder.</Text>
                <Action onPress={() => make()}>Make my page</Action>
                {child.creations
                  .filter((page) => !page.sourceId || canOpen(page.sourceId, child.policy.collections))
                  .map((page) => (
                    <Action key={page.id} onPress={() => visit("make", page.id)}>
                      {page.title}
                    </Action>
                  ))}
              </View>
            )
          ) : place === "shelf" ? (
            <>
              <Text style={s.title}>My Shelf</Text>
              <Text style={s.small}>{people.people.find((person) => person.id === childId)?.name}</Text>
              <Text style={s.heading}>Saved wonders & books</Text>
              {child.saved
                .filter((item) => canOpen(item, child.policy.collections))
                .map((item) => (
                  <View key={item}>
                    {itemById(item) && card(itemById(item)!)}
                    <Action onPress={() => toggleSaved(item)}>Remove from My Shelf</Action>
                  </View>
                ))}
              {!child.saved.length && (
                <Text style={s.body}>Keep a wonder or book here when you find one you love.</Text>
              )}
              <Text style={s.heading}>My pages</Text>
              {child.creations
                .filter((page) => !page.sourceId || canOpen(page.sourceId, child.policy.collections))
                .map((page) => (
                  <View key={page.id} style={{ gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open my page: ${page.title}`}
                      onPress={() => visit("make", page.id)}
                    >
                      <View style={{ width: "100%", height: 180 }}>
                        <DrawingArt drawing={page} />
                      </View>
                      <Text style={s.heading}>{page.title}</Text>
                    </Pressable>
                    <Action
                      onPress={() => {
                        if (pendingPage(pageDraftKey(childId, page.id))) {
                          setNotice(
                            "This page has unsaved changes. Open it to save or export them before removing it."
                          );
                          return;
                        }
                        update({ creations: child.creations.filter((item) => item.id !== page.id) });
                      }}
                    >
                      Remove page
                    </Action>
                  </View>
                ))}
              <Text style={s.heading}>Recent places</Text>
              {child.recent
                .filter((item) => canOpen(item, child.policy.collections))
                .map((item) => (
                  <Action key={item} onPress={() => openItem(item)}>
                    {itemById(item)?.title ?? exhibits.find((exhibit) => `lab-${exhibit.world}` === item)?.title}
                  </Action>
                ))}
            </>
          ) : place === "grownups" ? (
            <GrownUps
              people={people.people}
              selected={childId}
              getPolicy={(person) => libraryChild(store.save.library, person).policy}
              onPolicy={store.libraryPolicy}
              onExtend={() => {
                extensions.set(childId, Date.now() + 15 * 60_000);
                setNow(new Date());
                setPaused(false);
                router.replace("/library");
              }}
              onSelect={(id) => {
                store.selectLearner(id);
                router.replace("/library");
              }}
              onDone={() => router.replace("/library")}
            />
          ) : !!exhibitWorld &&
            (place === "exhibit" || (place === "authored-exhibit" && !!authoredExhibit)) &&
            exhibits.some((exhibit) => exhibit.world === exhibitWorld) ? (
            <>
              <Exhibit
                title={authoredExhibit?.title ?? exhibits.find((exhibit) => exhibit.world === exhibitWorld)?.title}
                world={exhibitWorld}
                state={child.labs[exhibitWorld]}
                onAction={(action) => {
                  audio.stop();
                  const labs = { ...child.labs, [exhibitWorld]: labAction(child.labs[exhibitWorld], action) };
                  update({ labs });
                  const progress = {
                    ...newExploreProgress(),
                    ...store.save.explore?.progress,
                    location: { kind: "activity" as const, world: exhibitWorld },
                    labs,
                  };
                  store.exploreUpdate(progress, store.epoch);
                }}
                sound={store.save.settings.sound}
                onHear={(key) => audio.speak(key)}
                speaking={audio.selected}
              />
              {authoredExhibit && (
                <ReviewedNarration
                  id={authoredExhibit.id}
                  state={child.labs[exhibitWorld]}
                  selected={audio.selected}
                  speak={audio.speak}
                />
              )}
            </>
          ) : (
            <>
              <Text style={s.body}>This page is not available. Your saved place is kept.</Text>
              <Action onPress={() => visit("wonder", "", true)}>Back to pictures</Action>
            </>
          )}
        </ScrollView>
      )}
      {place !== "reader" && !blocked && (
        <View style={s.tabs}>
          {(["wonder", "books", "make", "shelf"] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={tab === "shelf" ? "My Shelf" : tab[0].toUpperCase() + tab.slice(1)}
              accessibilityState={{ selected: place === tab }}
              onPress={() => {
                remember();
                visit(tab, "", true);
              }}
              style={[s.tab, place === tab && { backgroundColor: "#C1DCC8" }]}
            >
              <LibraryIcon name={tab} />
              <Text style={[s.small, { fontWeight: "700" }]}>
                {tab === "shelf" ? "My Shelf" : tab[0].toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
