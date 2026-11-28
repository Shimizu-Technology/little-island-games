import { AtmosphereHeader } from "../atmosphere/AtmosphereHeader";
import { collectionEmptyMessage } from "./availability";
import { savedScrollPosition } from "./scrollPosition";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Keyboard, Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../components/Text";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
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
import { WordLabel } from "./WordLabel";
import { SoundSwitch } from "./SoundSwitch";
import { LibraryArt } from "./LibraryArt";
import { PaintedLibraryCover } from "./illustratedCovers";
import { categoryScene } from "./tileArt";
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

type QuickFilter = "all" | "books" | "labs" | "saved";

const extensions = new Map<string, number>();

const storyCard = {
  backgroundColor: "#FFFDF8",
  borderWidth: 1.5,
  borderColor: "#E8D8BE",
  borderBottomWidth: 3.5,
  borderBottomColor: "rgba(61, 43, 36, 0.16)",
  borderRadius: 24,
  shadowColor: "#3D2B24",
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  elevation: 3,
} as const;

const overlayFill = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

const categoryTitleById = new Map(categories.map((category) => [category.id, category.title]));

export default function LibraryScreen() {
  const store = useStore();
  const route = useLocalSearchParams<{ place?: string; id?: string }>();
  if (!store.ready)
    return (
      <SafeAreaView style={[s.page, { backgroundColor: "#FFF6E5" }]}>
        <View style={s.content}>
          <Text style={[s.body, { color: "#3D2B24" }]}>Opening your Library…</Text>
        </View>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={[s.page, { backgroundColor: "#FFF6E5" }]}>
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
  const nunitoLoaded = useNunitoLoaded();
  const displayBold = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const headingBold = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["700"], fontWeight: "normal" } as const)
    : ({ fontWeight: "700" } as const);
  const bodyFont = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["600"], fontWeight: "normal" } as const)
    : undefined;
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
  const [expandedCategoryLabels, setExpandedCategoryLabels] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(child.onlyFavorites ? "saved" : "all");
  const [bookInfo, setBookInfo] = useState(false);
  const [notice, setNotice] = useState("");
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const surpriseCursor = useRef(0);
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
  const isSaved = (itemId: string) => child.saved.some((value) => savedId(value) === savedId(itemId));
  const toggleSaved = (itemId: string) =>
    update({
      saved: isSaved(itemId)
        ? child.saved.filter((value) => savedId(value) !== savedId(itemId))
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
      store.exploreUpdate(progress, store.epoch, topicId, childId);
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
  const openExhibit = (world: WorldId, motif: string) => {
    remember();
    const reviewed = authored.find(
      (item) =>
        item.type === "exhibit" &&
        resolveExhibitWorld({ id: item.id, title: item.title, category: item.category, motif, item }) === world
    );
    if (reviewed) visit("authored-exhibit", reviewed.id);
    else visit("exhibit", world);
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
  const oldTurtlePosition =
    place === "topic" && id === "turtle-breath"
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
  const contentWidth = Math.min(width, 1200) - 20;
  const headerInnerWidth = Math.max(240, contentWidth - 16);
  const categoryCols = fontScale > 1.6 || expandedCategoryLabels ? 1 : width < 650 ? 2 : width < 1000 ? 3 : 4;
  const categoryTileWidth = Math.floor((headerInnerWidth - (categoryCols - 1) * 12) / categoryCols);
  const labCols = fontScale > 1.6 ? 1 : width < 650 ? 2 : width < 1000 ? 3 : 5;
  const labTileWidth = Math.floor((headerInnerWidth - (labCols - 1) * 10) / labCols);
  const shelfInnerWidth = contentWidth - (cols > 1 ? 14 : 0);
  const bookCardWidth = Math.max(120, Math.floor(shelfInnerWidth / cols) - 12);
  const stackHero = fontScale > 1.5 || (width < 340 && fontScale > 1.25);

  const activeFilter: QuickFilter = child.onlyFavorites ? "saved" : quickFilter;
  const savedSet = useMemo(() => new Set(child.saved.map((item) => canonicalLibraryId(itemById(item)?.id ?? item))), [child.saved]);
  const recentSet = useMemo(() => new Set(child.recent.map((item) => canonicalLibraryId(item))), [child.recent]);

  const enabledExhibits = useMemo(
    () => exhibits.filter((exhibit) => child.policy.collections.includes(exhibit.category)),
    [child.policy.collections]
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; saved: number; explored: number }>();
    for (const item of allowed) {
      const entry = map.get(item.category) ?? { total: 0, saved: 0, explored: 0 };
      entry.total++;
      const canon = canonicalLibraryId(item.id);
      if (savedSet.has(canon)) entry.saved++;
      if (recentSet.has(canon)) entry.explored++;
      map.set(item.category, entry);
    }
    return map;
  }, [allowed, savedSet, recentSet]);

  const continueTarget = (() => {
    for (const recentId of child.recent) {
      if (!canOpen(recentId, child.policy.collections)) continue;
      if (recentId.startsWith("lab-")) {
        const world = recentId.slice(4) as WorldId;
        const exhibit = exhibits.find((entry) => entry.world === world);
        if (exhibit) {
          return {
            kind: "exhibit" as const,
            id: recentId,
            title: exhibit.title,
            badge: "Interactive Lab",
            subtitle: "Jump back into your interactive lab",
            category: exhibit.category,
            motif: exhibit.motif,
            exhibit,
          };
        }
      }
      const found = itemById(recentId);
      if (found) {
        const isBook = found.item?.type === "book";
        const pageIndex = child.bookPages[found.id] ?? 0;
        const pageCount = isBook && found.item?.type === "book" ? found.item.pages.length : 0;
        return {
          kind: "item" as const,
          id: found.id,
          title: found.title,
          badge: categoryTitleById.get(found.category) ?? "Island Library",
          subtitle: isBook && pageCount > 0 ? `Page ${Math.min(pageIndex + 1, pageCount)} of ${pageCount}` : "Pick up right where you left off",
          category: found.category,
          motif: found.motif,
          record: found,
        };
      }
    }
    return undefined;
  })();

  const surprisePick = () => {
    const poolIds: string[] = [
      ...allowed.map((item) => item.id),
      ...enabledExhibits.map((exhibit) => `lab-${exhibit.world}`),
    ];
    if (!poolIds.length) {
      setNotice("No stories or wonders are turned on yet. A grown-up can turn collections on.");
      return;
    }
    const fresh = poolIds.filter((candidate) => !recentSet.has(canonicalLibraryId(candidate)));
    const sourcePool = fresh.length > 0 ? fresh : poolIds;
    const baseOffset = (child.recent.length * 7 + child.saved.length * 3 + surpriseCursor.current) % sourcePool.length;
    surpriseCursor.current += 1;
    const chosen = sourcePool[baseOffset];
    remember();
    openItem(chosen);
  };

  const applyQuickFilter = (next: QuickFilter) => {
    scrollY.current = 0;
    if (next === "all") {
      setQuickFilter("all");
      update({ category: "all", query: "", onlyFavorites: false });
      return;
    }
    if (next === "saved") {
      const nextSaved = !child.onlyFavorites;
      setQuickFilter(nextSaved ? "saved" : "all");
      update({ onlyFavorites: nextSaved });
      return;
    }
    setQuickFilter(next);
    update({ category: "all", onlyFavorites: false });
  };

  const results = useMemo(() => {
    const base = search(
      searchIndex,
      child.query,
      child.onlyFavorites
        ? new Set(child.saved.map((savedItem) => itemById(savedItem)?.id ?? savedItem).filter((savedItem) => allowedIds.has(savedItem)))
        : allowedIds,
      searchCategory(child.query, child.category)
    )
      .map((entry) => itemById(entry.id)!)
      .filter(Boolean);
    if (activeFilter === "books") return base.filter((item) => item.item?.type === "book");
    if (activeFilter === "labs") return base.filter((item) => item.item?.type === "exhibit");
    return base;
  }, [child.query, child.category, child.onlyFavorites, child.saved, allowedIds, activeFilter]);

  const allowedBooks = useMemo(() => allowed.filter((item) => item.item?.type === "book"), [allowed]);
  const startedBooksCount = useMemo(
    () => allowedBooks.filter((bookItem) => (child.bookPages[bookItem.id] ?? 0) > 0 || recentSet.has(canonicalLibraryId(bookItem.id))).length,
    [allowedBooks, child.bookPages, recentSet]
  );

  const relatedBooks =
    record?.item?.type === "book" ? allowedBooks.filter((bookItem) => bookItem.id !== record.id).slice(0, 2) : [];

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

  const card = (item: CatalogItem) => {
    const isBook = item.item?.type === "book";
    const categoryBadge = categoryTitleById.get(item.category);
    return (
      <View
        style={[
          s.card,
          isBook && {
            backgroundColor: "#FFFDF8",
            borderColor: "#DEC59D",
            borderBottomWidth: 6,
            borderBottomColor: "#C89F6E",
            borderRadius: 18,
            flex: 0,
            flexBasis: bookCardWidth,
            flexShrink: 0,
            width: bookCardWidth,
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
          <ItemPicture
            record={item}
            badge={place === "books" ? undefined : categoryBadge}
            pictureHeight={isBook ? (width < 650 ? 200 : 280) : undefined}
          />
          <Text maxFontSizeMultiplier={1.5} style={[s.cardTitle, headingBold, { color: "#3D2B24" }]}>
            {item.title}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hearTitleLabel(item.title)}
          onPress={() => {
            const speech = recordSpeech(item);
            audio.speak(speech.key, speech.sentence);
          }}
          style={({ pressed }) => ({
            position: "absolute",
            right: 8,
            top: 8,
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 24,
            backgroundColor: "#FFFDF8",
            borderWidth: 1.5,
            borderColor: "#E8D8BE",
            shadowColor: "#3D2B24",
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 5,
            elevation: 2,
            opacity: pressed ? 0.78 : 1,
          })}
        >
          <LibraryIcon name="sound" size={22} />
        </Pressable>
      </View>
    );
  };

  if (place === "little" && open && !paused)
    return (
      <SafeAreaView style={[s.page, { backgroundColor: "#FFF6E5" }]}>
        <LookListen
          items={allowed.filter((item) => item.item?.type !== "book" && item.item?.type !== "exhibit")}
          speak={audio.speak}
          stop={audio.stop}
          onExit={() => visit("wonder", "", true)}
        />
        {audio.notice && <Text style={[s.small, bodyFont, { color: "#665247", paddingHorizontal: 14 }]}>{audio.notice}</Text>}
      </SafeAreaView>
    );

  const blocked = (paused || (!open && !safePage)) && place !== "grownups";
  const showGrid = (place === "wonder" || place === "books") && !blocked;
  const readerAvailable = place === "reader" && !restricted && !blocked && record?.item?.type === "book";
  const authoredExhibit = record?.item?.type === "exhibit" ? record.item : undefined;
  const exhibitWorld = place === "exhibit" ? (id as WorldId) : resolveExhibitWorld(record);
  const headerFontSize = place === "reader" ? 16 : width < 360 ? 16 : 20;
  const tabFontSize = width < 360 ? 12.5 : 13.5;
  const activeTabBg = { backgroundColor: "#F9EBD0", borderColor: "#DEC496" } as const;
  const activeCategoryInfo = child.category !== "all" ? categories.find((c) => c.id === child.category) : undefined;

  return (
    <SafeAreaView style={[s.page, { backgroundColor: "#FFF6E5" }]} edges={["top", "left", "right", "bottom"]}>
      <View style={s.header}>
        <AtmosphereHeader />
        <Action onPress={back} label="Back">
          <LibraryIcon name="back" size={24} />
        </Action>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[
            s.heading,
            displayBold,
            { marginTop: 0, flex: 1, fontSize: headerFontSize, textAlign: "center", color: "#3D2B24" },
          ]}
        >
          {readerAvailable ? record.title : "Island Library"}
        </Text>
        {place === "make" && creation && !restricted && !blocked ? (
          <Action label="Done editing story" onPress={() => Keyboard.dismiss()}>
            Done
          </Action>
        ) : (
          <SoundSwitch
            on={store.save.settings.sound}
            onToggle={() => {
              audio.stop();
              store.settings({ sound: !store.save.settings.sound });
            }}
          />
        )}
        {readerAvailable ? (
          <>
            <Action
              label={isSaved(id) ? "Saved book. Remove from My Shelf" : "Save book"}
              selected={isSaved(id)}
              onPress={() => toggleSaved(id)}
            >
              <LibraryIcon name="heart" size={24} filled={isSaved(id)} />
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
          <Text accessibilityLiveRegion="polite" style={[s.small, bodyFont, { color: "#665247" }]}>
            {notice || audio.notice}
          </Text>
        </View>
      )}
      {!open && safePage && !paused && (
        <View style={s.notice}>
          <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>Finish this page, then we’ll pause.</Text>
          <View style={s.row}>
            <Action
              onPress={() => {
                void pause();
              }}
            >
              Save and pause
            </Action>
            <Action onPress={() => visit("grownups")}>Grown-ups</Action>
          </View>
        </View>
      )}
      {blocked ? (
        <View style={s.content}>
          <View style={[storyCard, { padding: 20, gap: 14 }]}>
            <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { color: "#3D2B24" }]}>
              {paused ? "A good place to pause" : "The Library is resting"}
            </Text>
            <Text style={[s.body, bodyFont, { color: "#665247" }]}>
              {paused ? "Your work is saved in My Shelf." : "Your saved pages and places are here for your next visit."}
            </Text>
            <View style={s.row}>
              <Action onPress={() => visit("grownups")}>Grown-ups</Action>
              <Action onPress={() => router.replace("/")}>Return to the Island</Action>
            </View>
          </View>
        </View>
      ) : restricted ? (
        <View style={s.content}>
          <View style={[storyCard, { padding: 20, gap: 14 }]}>
            <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
              {collectionEmptyMessage(record?.category ?? "", child.policy.collections)}
            </Text>
            <Action onPress={() => visit("wonder", "", true)}>Choose another picture</Action>
          </View>
        </View>
      ) : showGrid ? (
        <FlatList
          ref={list}
          key={`${place}:${cols}`}
          data={place === "books" ? allowedBooks : results}
          numColumns={cols}
          style={{ backgroundColor: "#FFF6E5" }}
          columnWrapperStyle={
            place === "books" && cols > 1
              ? {
                  backgroundColor: "#F3E4C8",
                  borderWidth: 1,
                  borderColor: "#E4CFA9",
                  borderBottomWidth: 10,
                  borderBottomColor: "#C89F6E",
                  marginBottom: 20,
                  borderRadius: 18,
                  paddingTop: 14,
                  paddingBottom: 8,
                  paddingHorizontal: 6,
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
          onScroll={(event) => onScroll(savedScrollPosition(event.nativeEvent))}
          scrollEventThrottle={120}
          onContentSizeChange={() => {
            if (!restored.current) {
              restored.current = true;
              list.current?.scrollToOffset({ offset: savedY, animated: false });
            }
          }}
          ListHeaderComponent={
            place === "books" ? (
              <View style={[storyCard, { overflow: "hidden", marginHorizontal: 6, marginBottom: 18 }]}>
                <View style={{ width: "100%", height: width < 650 ? 156 : 200, position: "relative", backgroundColor: "#EFE7D4" }}>
                  <PaintedLibraryCover category="books" testID="books-shelf-hero-cover" />
                  <View style={[overlayFill, { backgroundColor: "rgba(61, 43, 36, 0.22)" }]} />
                  <View
                    style={{
                      position: "absolute",
                      left: 14,
                      bottom: 12,
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#FFFDF8F2",
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "#E8D8BE",
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}
                    >
                      <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#3D2B24", fontSize: 13 }]}>
                        {allowedBooks.length} {allowedBooks.length === 1 ? "picture book" : "picture books"}
                      </Text>
                    </View>
                    {startedBooksCount > 0 && (
                      <View
                        style={{
                          backgroundColor: "#DDF1EEF2",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "#9BC7C2",
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        }}
                      >
                        <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#1E6B66", fontSize: 13 }]}>
                          {startedBooksCount} started
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ padding: 18, gap: 6 }}>
                  <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { fontSize: 28, lineHeight: 35, color: "#3D2B24" }]}>
                    Our story shelf
                  </Text>
                  <Text style={[s.body, bodyFont, { fontSize: 18, lineHeight: 26, color: "#665247" }]}>
                    A shelf of stories to share.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ padding: 8, gap: 14 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text
                    maxFontSizeMultiplier={1.5}
                    style={[
                      s.title,
                      displayBold,
                      { fontSize: width < 360 ? 25 : 28, lineHeight: width < 360 ? 32 : 36, color: "#3D2B24", flexShrink: 1 },
                    ]}
                  >
                    What do you wonder?
                  </Text>
                  <Action
                    testID="library-surprise-me"
                    label="Surprise Me!"
                    onPress={surprisePick}
                    style={{ backgroundColor: "#FFF3DA", borderColor: "#DEC496" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <LibraryIcon name="sparkles" size={22} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.actionText, headingBold, { color: "#3D2B24" }]}>
                        Surprise Me!
                      </Text>
                    </View>
                  </Action>
                </View>

                {!child.query && continueTarget && (
                  <View
                    testID="library-continue-reading"
                    style={[
                      storyCard,
                      {
                        flexDirection: stackHero ? "column" : "row",
                        alignItems: "center",
                        padding: 12,
                        gap: 14,
                        borderColor: "#9BC7C2",
                        backgroundColor: "#FFFDF8",
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: stackHero ? "100%" : width < 650 ? 116 : 168,
                        height: stackHero ? 124 : 112,
                        borderRadius: 18,
                        overflow: "hidden",
                        backgroundColor: "#DDF1EE",
                      }}
                    >
                      {continueTarget.kind === "item" && continueTarget.record ? (
                        <ItemPicture record={continueTarget.record} fill />
                      ) : (
                        <LibraryArt kind={continueTarget.motif} category={continueTarget.category} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 6, width: stackHero ? "100%" : undefined }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        <View
                          style={{
                            backgroundColor: "#DDF1EE",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: "#9BC7C2",
                          }}
                        >
                          <Text maxFontSizeMultiplier={1.2} style={[s.small, headingBold, { color: "#1E6B66", fontSize: 12 }]}>
                            Pick Up Where You Left Off
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#FFF6E5",
                            borderRadius: 999,
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: "#E8D8BE",
                          }}
                        >
                          <Text maxFontSizeMultiplier={1.2} style={[s.small, headingBold, { color: "#3D2B24", fontSize: 12 }]}>
                            {continueTarget.badge}
                          </Text>
                        </View>
                      </View>
                      <Text
                        maxFontSizeMultiplier={1.4}
                        numberOfLines={2}
                        style={[s.heading, displayBold, { marginTop: 0, fontSize: 19, lineHeight: 25, color: "#3D2B24" }]}
                      >
                        {continueTarget.title}
                      </Text>
                      <Text maxFontSizeMultiplier={1.25} style={[s.small, bodyFont, { color: "#665247" }]}>
                        {continueTarget.subtitle}
                      </Text>
                      <View style={{ flexDirection: "row", marginTop: 2 }}>
                        <Action
                          testID="library-continue-resume"
                          label={`Resume ${continueTarget.title}`}
                          selected
                          onPress={() => {
                            remember();
                            openItem(continueTarget.id);
                          }}
                        >
                          Resume
                        </Action>
                      </View>
                    </View>
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Look & Listen"
                  onPress={() => visit("little")}
                  style={({ pressed }) => [
                    storyCard,
                    {
                      flexDirection: stackHero ? "column" : "row",
                      alignItems: "center",
                      padding: 12,
                      gap: 12,
                      borderRadius: 26,
                      overflow: "hidden",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: stackHero ? "100%" : "42%",
                      height: stackHero ? 120 : 124,
                      borderRadius: 18,
                      overflow: "hidden",
                      backgroundColor: "#DDF1EE",
                    }}
                  >
                    <LibraryArt kind="turtle" category="ocean" />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 6, alignItems: "center" }}>
                    <LibraryIcon name="listen" size={34} />
                    <Text
                      maxFontSizeMultiplier={1.5}
                      style={[s.heading, displayBold, { marginTop: 0, textAlign: "center", fontSize: 21, color: "#3D2B24" }]}
                    >
                      Look & Listen
                    </Text>
                    <Text maxFontSizeMultiplier={1.25} style={[s.small, bodyFont, { textAlign: "center", color: "#665247" }]}>
                      Picture cards with read-aloud words
                    </Text>
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
                  style={[s.input, bodyFont]}
                  placeholder="Find a wonder…"
                  placeholderTextColor="#665247"
                  autoCorrect={false}
                  returnKeyType="search"
                />

                {/* 1-tap Quick Filter Chips */}
                <View style={[s.row, { gap: 8 }]}>
                  <Action
                    testID="library-filter-all"
                    selected={activeFilter === "all" && child.category === "all" && !child.query}
                    onPress={() => applyQuickFilter("all")}
                  >
                    All
                  </Action>
                  <Action
                    testID="library-filter-books"
                    selected={activeFilter === "books"}
                    onPress={() => applyQuickFilter("books")}
                  >
                    Books
                  </Action>
                  <Action
                    testID="library-filter-labs"
                    selected={activeFilter === "labs"}
                    onPress={() => applyQuickFilter("labs")}
                  >
                    Interactive Labs
                  </Action>
                  <Action
                    testID="library-filter-saved"
                    selected={activeFilter === "saved"}
                    onPress={() => applyQuickFilter("saved")}
                  >
                    Saved
                  </Action>
                </View>

                {!child.query && activeCategoryInfo && (
                  <View testID="library-selected-category-banner" style={[storyCard, { overflow: "hidden" }]}>
                    <View style={{ height: 112, width: "100%", position: "relative", backgroundColor: activeCategoryInfo.tint }}>
                      <PaintedLibraryCover category={activeCategoryInfo.id} />
                      <View style={[overlayFill, { backgroundColor: "rgba(61, 43, 36, 0.25)" }]} />
                    </View>
                    <View
                      style={{
                        padding: 14,
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ gap: 2, flexShrink: 1 }}>
                        <Text maxFontSizeMultiplier={1.4} style={[s.heading, displayBold, { marginTop: 0, color: "#3D2B24" }]}>
                          {activeCategoryInfo.title}
                        </Text>
                        <Text maxFontSizeMultiplier={1.25} style={[s.small, bodyFont, { color: "#665247" }]}>
                          {results.length} {results.length === 1 ? "wonder" : "wonders"} on this shelf
                        </Text>
                      </View>
                      <Action onPress={() => update({ category: "all" })}>All shelves</Action>
                    </View>
                  </View>
                )}

                {!child.query && child.category === "all" && activeFilter === "all" && (
                  <View style={[s.row, { gap: 12 }]}>
                    {categories
                      .filter((category) => category.id !== "books" && child.policy.collections.includes(category.id))
                      .map((category) => {
                        const stats = categoryStats.get(category.id) ?? { total: 0, saved: 0, explored: 0 };
                        const progressText =
                          stats.saved > 0
                            ? `${stats.saved} saved`
                            : stats.explored > 0
                              ? `${stats.explored} explored`
                              : null;
                        return (
                          <Pressable
                            key={category.id}
                            testID={`library-category-${category.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Browse ${category.title}`}
                            accessibilityState={{ selected: child.category === category.id }}
                            onPress={() => {
                              scrollY.current = 0;
                              update({ category: child.category === category.id ? "all" : category.id });
                            }}
                            onLongPress={() => audio.speak(category.speechKey)}
                            style={({ pressed }) => [
                              storyCard,
                              {
                                width: categoryTileWidth,
                                overflow: "hidden",
                                opacity: pressed ? 0.85 : 1,
                              },
                              child.category === category.id && s.selected,
                            ]}
                          >
                            <View
                              style={{
                                width: "100%",
                                height: width < 650 ? 136 : 162,
                                backgroundColor: category.tint,
                                position: "relative",
                              }}
                            >
                              <LibraryArt kind={categoryScene(category)} category={category.id} />
                              <View
                                pointerEvents="none"
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  height: 44,
                                  backgroundColor: "rgba(61, 43, 36, 0.24)",
                                }}
                              />
                              <View
                                pointerEvents="none"
                                style={{
                                  position: "absolute",
                                  left: 8,
                                  right: 8,
                                  bottom: 8,
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  justifyContent: "space-between",
                                  gap: 4,
                                }}
                              >
                                {stats.total > 0 && (
                                  <View
                                    style={{
                                      backgroundColor: "#FFFDF8F0",
                                      borderRadius: 999,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                      borderWidth: 1,
                                      borderColor: "#E8D8BE",
                                    }}
                                  >
                                    <Text
                                      maxFontSizeMultiplier={1.2}
                                      style={[s.small, headingBold, { color: "#3D2B24", fontSize: 11.5, lineHeight: 15 }]}
                                    >
                                      {stats.total} {stats.total === 1 ? "story" : "stories & facts"}
                                    </Text>
                                  </View>
                                )}
                                {progressText && (
                                  <View
                                    style={{
                                      backgroundColor: "#DDF1EEF2",
                                      borderRadius: 999,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                      borderWidth: 1,
                                      borderColor: "#9BC7C2",
                                    }}
                                  >
                                    <Text
                                      maxFontSizeMultiplier={1.2}
                                      style={[s.small, headingBold, { color: "#1E6B66", fontSize: 11.5, lineHeight: 15 }]}
                                    >
                                      {progressText}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <WordLabel
                              textStyle={[s.actionText, headingBold, { color: "#3D2B24" }]}
                              onWordLayout={(event) => setExpandedCategoryLabels(event.nativeEvent.layout.height > 28)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                minHeight: 54,
                                backgroundColor: child.category === category.id ? "#DDF1EE" : "#FFFDF8",
                                borderTopWidth: 1,
                                borderColor: "#EFE3CE",
                              }}
                            >
                              {category.title}
                            </WordLabel>
                          </Pressable>
                        );
                      })}
                  </View>
                )}

                {!child.query && (activeFilter === "all" || activeFilter === "labs") && enabledExhibits.length > 0 && (
                  <View style={{ gap: 10 }}>
                    <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
                      Interactive Labs
                    </Text>
                    <View style={[s.row, { gap: 10 }]}>
                      {enabledExhibits.map((exhibit) => (
                        <Pressable
                          key={exhibit.world}
                          testID={`library-lab-${exhibit.world}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Interactive Lab: ${exhibit.title}`}
                          onPress={() => openExhibit(exhibit.world, exhibit.motif)}
                          style={({ pressed }) => [
                            storyCard,
                            {
                              width: labTileWidth,
                              minWidth: 146,
                              flexGrow: 1,
                              overflow: "hidden",
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <View style={{ width: "100%", height: 104, position: "relative", backgroundColor: "#DDF1EE" }}>
                            <LibraryArt kind={exhibit.motif} category={exhibit.category} />
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: 8,
                                top: 8,
                                backgroundColor: "#FFFDF8F2",
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: "#9BC7C2",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              }}
                            >
                              <Text
                                maxFontSizeMultiplier={1.2}
                                style={[s.small, headingBold, { color: "#1E6B66", fontSize: 11, lineHeight: 14 }]}
                              >
                                Interactive Lab
                              </Text>
                            </View>
                          </View>
                          <View style={{ padding: 10, minHeight: 52, justifyContent: "center" }}>
                            <Text
                              maxFontSizeMultiplier={1.4}
                              numberOfLines={2}
                              style={[s.actionText, headingBold, { color: "#3D2B24", fontSize: 15.5, textAlign: "left" }]}
                            >
                              {exhibit.title}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
                  {child.query
                    ? "Your discoveries"
                    : activeFilter === "books"
                      ? "Picture books"
                      : activeFilter === "labs"
                        ? "Reviewed exhibit guides"
                        : activeFilter === "saved"
                          ? "Saved pictures"
                          : "Follow a picture"}
                </Text>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 6, paddingTop: 4, maxWidth: 1060, width: "100%", alignSelf: "center" }}>
              <View style={[storyCard, { padding: 20, gap: 14 }]}>
                <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                  {place === "books"
                    ? collectionEmptyMessage("books", child.policy.collections)
                    : activeFilter === "saved"
                      ? "No saved pictures yet. Tap the heart on any book or wonder to keep it here."
                      : "No picture found yet. Try another word, or choose a picture above."}
                </Text>
                {place !== "books" && (
                  <Action onPress={() => applyQuickFilter("all")}>Back to pictures</Action>
                )}
              </View>
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
            readingPage={audio.readingSequence ?? false}
            onReadPage={
              audio.speakSequence
                ? (sentences) => {
                    audio.speakSequence(sentences);
                  }
                : undefined
            }
            onStopReading={audio.stop}
            onDrawAbout={() => make(id)}
            relatedBooks={relatedBooks}
            onOpenBook={openItem}
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
          onScroll={(event) => onScroll(savedScrollPosition(event.nativeEvent))}
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
                <View style={[storyCard, { padding: 20, gap: 12 }]}>
                  <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { color: "#3D2B24" }]}>
                    Make something yours
                  </Text>
                  <Text style={[s.body, bodyFont, { fontSize: 18, lineHeight: 26, color: "#665247" }]}>
                    Draw freely, add pictures, and tell about a wonder.
                  </Text>
                  <Action onPress={() => make()}>Make my page</Action>
                </View>
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
              <View style={[storyCard, { padding: 20, gap: 10 }]}>
                <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { color: "#3D2B24" }]}>
                  My Shelf
                </Text>
                <Text style={[s.small, bodyFont, { color: "#665247", fontSize: 15 }]}>
                  {people.people.find((person) => person.id === childId)?.name}
                </Text>
                <View style={s.row}>
                  <View
                    style={{
                      backgroundColor: "#FFF6E5",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "#E8D8BE",
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#3D2B24" }]}>
                      {child.saved.filter((item) => canOpen(item, child.policy.collections)).length} saved
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "#DDF1EE",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "#9BC7C2",
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#1E6B66" }]}>
                      {child.creations.filter((page) => !page.sourceId || canOpen(page.sourceId, child.policy.collections)).length} pages made
                    </Text>
                  </View>
                </View>
              </View>
              <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
                Saved wonders & books
              </Text>
              {child.saved
                .filter((item) => canOpen(item, child.policy.collections))
                .map((item) => (
                  <View key={item} style={[storyCard, { padding: 12, gap: 10 }]}>
                    {itemById(item) && card(itemById(item)!)}
                    <Action onPress={() => toggleSaved(item)}>Remove from My Shelf</Action>
                  </View>
                ))}
              {!child.saved.length && (
                <View style={[storyCard, { padding: 18 }]}>
                  <Text style={[s.body, bodyFont, { fontSize: 18, lineHeight: 26, color: "#665247" }]}>
                    Keep a wonder or book here when you find one you love.
                  </Text>
                </View>
              )}
              <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
                My pages
              </Text>
              {child.creations
                .filter((page) => !page.sourceId || canOpen(page.sourceId, child.policy.collections))
                .map((page) => (
                  <View key={page.id} style={[storyCard, { padding: 14, gap: 10 }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open my page: ${page.title}`}
                      onPress={() => visit("make", page.id)}
                      style={{ gap: 8 }}
                    >
                      <View
                        style={{
                          width: "100%",
                          height: 180,
                          borderRadius: 16,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: "#E8D8BE",
                        }}
                      >
                        <DrawingArt drawing={page} />
                      </View>
                      <Text maxFontSizeMultiplier={1.6} style={[s.heading, headingBold, { marginTop: 2, color: "#3D2B24" }]}>
                        {page.title}
                      </Text>
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
              <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
                Recent places
              </Text>
              <View style={s.row}>
                {child.recent
                  .filter((item) => canOpen(item, child.policy.collections))
                  .map((item) => (
                    <Action key={item} onPress={() => openItem(item)}>
                      {itemById(item)?.title ?? exhibits.find((exhibit) => `lab-${exhibit.world}` === item)?.title}
                    </Action>
                  ))}
              </View>
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
              onSelect={(selectedId) => {
                store.selectLearner(selectedId);
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
            <View style={[storyCard, { padding: 20, gap: 14 }]}>
              <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                This page is not available. Your saved place is kept.
              </Text>
              <Action onPress={() => visit("wonder", "", true)}>Back to pictures</Action>
            </View>
          )}
        </ScrollView>
      )}
      {place !== "reader" && !blocked && (
        <View style={s.tabs}>
          {(["wonder", "books", "make", "shelf"] as const).map((tab) => {
            const active = place === tab;
            const tabLabelStyle = [
              s.small,
              active ? displayBold : headingBold,
              { color: active ? "#3D2B24" : "#665247", fontSize: tabFontSize, lineHeight: 18 },
            ];
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityLabel={tab === "shelf" ? "My Shelf" : tab[0].toUpperCase() + tab.slice(1)}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  remember();
                  visit(tab, "", true);
                }}
                style={[s.tab, active && activeTabBg]}
              >
                <LibraryIcon name={tab} />
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={tabLabelStyle}>
                  {tab === "shelf" ? "My Shelf" : tab[0].toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}
