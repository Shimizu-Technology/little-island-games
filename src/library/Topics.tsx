import React, { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { topicSpeechKey } from "../explore/content";
import { PaintedLibraryCover } from "./illustratedCovers";
import { LibraryArt } from "./LibraryArt";
import { SentenceLine } from "./Reader";
import { Action, ItemPicture, LibraryIcon, s } from "./ui";
import { canOpen, categories, exhibits, itemById, recordSpeech, type CatalogItem } from "./catalog";
import type { LibraryLink, ReadingLayer, Sentence } from "./schema";

const topicCard = {
  backgroundColor: "#FFFDF8",
  borderWidth: 1.5,
  borderColor: "#E8D8BE",
  borderBottomWidth: 3,
  borderBottomColor: "rgba(61, 43, 36, 0.14)",
  borderRadius: 22,
  padding: 16,
  gap: 10,
} as const;

interface WonderPrompt {
  id: string;
  question: string;
  answer: string;
  speechKey: string;
  sentence?: Sentence;
}

function buildWonderPrompts(record: CatalogItem): WonderPrompt[] {
  const prompts: WonderPrompt[] = [];
  const topic = record.item?.type === "topic" ? record.item : undefined;
  const legacy = record.legacy;

  if (legacy?.question) {
    prompts.push({
      id: `wonder-legacy-${record.id}`,
      question: legacy.question,
      answer: legacy.deeper || legacy.short,
      speechKey: topicSpeechKey(record.id),
    });
  }

  if (topic) {
    const layers: ReadingLayer[] = ["tell", "more", "deep"];
    for (const layerKey of layers) {
      for (const sentence of topic.layers[layerKey]) {
        if (sentence.text.includes("?") && prompts.length < 2) {
          const companion =
            topic.layers[layerKey].find((item) => item.id !== sentence.id && !item.text.includes("?")) ??
            topic.layers.tell[0];
          prompts.push({
            id: `wonder-${sentence.id}`,
            question: sentence.text,
            answer: companion?.text ?? "Share your own guess with someone nearby, then listen again!",
            speechKey: sentence.speechKey,
            sentence,
          });
        }
      }
    }
    if (!prompts.length) {
      const tellFirst = topic.layers.tell[0];
      const deepFirst = topic.layers.more[0] ?? topic.layers.deep[0] ?? tellFirst;
      const speech = recordSpeech(record);
      prompts.push({
        id: `wonder-explore-${record.id}`,
        question: record.title.endsWith("?")
          ? record.title
          : `What surprised you most about ${record.title}?`,
        answer:
          deepFirst?.text ??
          tellFirst?.text ??
          "Try telling the story of this wonder in your own words!",
        speechKey: tellFirst?.speechKey ?? speech.key,
        sentence: tellFirst ?? speech.sentence,
      });
    }
  }
  return prompts;
}

function WonderQuestionCard({
  prompt,
  onHear,
  headingBold,
  bodyFont,
}: {
  prompt: WonderPrompt;
  onHear: () => void;
  headingBold: { fontFamily?: string; fontWeight: "normal" | "700" };
  bodyFont?: { fontFamily: string; fontWeight: "normal" };
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View
      testID="topic-wonder-card"
      style={{
        backgroundColor: expanded ? "#EEF7F5" : "#FFF8E8",
        borderWidth: 1.5,
        borderColor: expanded ? "#1E6B66" : "#DEC59D",
        borderBottomWidth: 3.5,
        borderBottomColor: expanded ? "#1E6B66" : "rgba(61, 43, 36, 0.16)",
        borderRadius: 22,
        overflow: "hidden",
      }}
    >
      <Pressable
        testID={`wonder-card-toggle-${prompt.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Wonder question: ${prompt.question}`}
        accessibilityHint={expanded ? "Tap to fold discovery card" : "Tap to flip and discover"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((open) => !open)}
        style={({ pressed }) => ({
          padding: 16,
          minHeight: 58,
          gap: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#FFFDF8",
              borderWidth: 1,
              borderColor: "#E8D8BE",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <LibraryIcon name="sparkles" size={16} />
            <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#3D2B24", fontSize: 12.5 }]}>
              {expanded ? "Discovery Clue" : "Wonder Question · Tap to flip"}
            </Text>
          </View>
          <LibraryIcon name="details" size={20} />
        </View>
        <Text style={[s.body, headingBold, { color: "#3D2B24" }]}>{prompt.question}</Text>
      </Pressable>

      {expanded && (
        <View
          testID="topic-wonder-card-answer"
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderColor: "#CBE3DF",
            backgroundColor: "#FFFDF8",
            gap: 12,
          }}
        >
          <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>{prompt.answer}</Text>
          <View style={s.row}>
            <Action
              testID={`wonder-card-hear-${prompt.id}`}
              label={`Hear aloud: ${prompt.question}`}
              onPress={onHear}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <LibraryIcon name="sound" size={20} />
                <Text maxFontSizeMultiplier={1.3} style={[s.actionText, headingBold, { color: "#3D2B24" }]}>
                  Hear aloud
                </Text>
              </View>
            </Action>
          </View>
        </View>
      )}
    </View>
  );
}

export function TopicPage({
  record,
  layer,
  onLayer,
  saved,
  toggleSaved,
  collections,
  selected,
  speak,
  go,
  make,
}: {
  record: CatalogItem;
  layer: ReadingLayer;
  onLayer: (layer: ReadingLayer) => void;
  saved: boolean;
  toggleSaved: () => void;
  collections: string[];
  selected: string;
  speak: (key: string, sentence?: Sentence) => void;
  go: (id: string) => void;
  make: () => void;
}) {
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
  const { width, height, fontScale } = useWindowDimensions();
  const phone = width < 650;
  const wide = width >= 800 && width > height && fontScale < 1.5;
  const [sources, setSources] = useState(false);
  const [grownUps, setGrownUps] = useState(false);
  const topic = record.item?.type === "topic" ? record.item : undefined;
  const prayer = record.item?.type === "prayer" ? record.item : undefined;
  const legacy = record.legacy;
  const categoryInfo = categories.find((c) => c.id === record.category);
  const links: LibraryLink[] = record.item?.links ?? [
    ...(legacy?.related ?? []).map((id) => ({
      kind: "legacy-topic" as const,
      target: id,
      label: itemById(id)?.title ?? id,
    })),
  ];
  const visibleLinks = links.filter(
    (link) => link.kind === "make" || link.kind === "game" || canOpen(link.target, collections)
  );
  const gameLinks = visibleLinks.filter((link) => link.kind === "game");
  const topicLinks = visibleLinks.filter((link) => link.kind !== "game");
  const exhibit = legacy && exhibits.find((item) => item.world === legacy.world);
  const wonderPrompts = useMemo(() => (prayer ? [] : buildWonderPrompts(record)), [prayer, record]);

  return (
    <View style={{ gap: 0 }}>
      {/* Painted Warm Island Storybook category hero accent */}
      <View
        testID="topic-category-banner"
        style={{
          height: 76,
          width: "100%",
          backgroundColor: categoryInfo?.tint ?? "#EFE7D4",
          borderBottomWidth: 1.5,
          borderColor: "#E8D8BE",
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <PaintedLibraryCover category={record.category} kind={record.motif} />
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(61, 43, 36, 0.24)" }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: phone ? 14 : 26,
            paddingBottom: 10,
            gap: 10,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFDF8F2",
              borderWidth: 1.5,
              borderColor: "#E8D8BE",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#3D2B24", fontSize: 13 }]}>
              {categoryInfo?.title ?? "Island Library"}
            </Text>
          </View>
          {saved && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#FFFDF8F2",
                borderWidth: 1.5,
                borderColor: "#E8D8BE",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <LibraryIcon name="heart" size={15} filled />
              <Text maxFontSizeMultiplier={1.2} style={[s.small, headingBold, { color: "#3D2B24", fontSize: 12 }]}>
                Saved
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: wide ? "row" : "column", alignItems: "stretch" }}>
        <View style={{ width: wide ? "55%" : "100%" }}>
          <ItemPicture
            record={record}
            large
            scene
            pictureHeight={wide ? height * 0.65 : Math.min(420, height * 0.45)}
          />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFDF8",
            borderBottomWidth: 1.5,
            borderLeftWidth: wide ? 1.5 : 0,
            borderColor: "#E8D8BE",
            paddingHorizontal: phone ? 16 : 30,
            paddingTop: 18,
            paddingBottom: 22,
            gap: 10,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.5}
            style={[s.title, displayBold, { fontSize: 26, lineHeight: 33, marginBottom: 2, color: "#3D2B24" }]}
          >
            {record.title}
          </Text>
          {!prayer && (
            <View style={{ gap: 6, marginBottom: 4 }}>
              <Text maxFontSizeMultiplier={1.25} style={[s.small, headingBold, { color: "#665247", fontSize: 13 }]}>
                Choose your reading level
              </Text>
              <View style={[s.row, { justifyContent: "flex-start", gap: 8 }]}>
                {(["tell", "more", "deep"] as const).map((key, index) => (
                  <Action
                    key={key}
                    selected={layer === key}
                    label={`${index + 1} books: ${key === "tell" ? "Tell me" : key === "more" ? "More" : "Deep"}`}
                    onPress={() => onLayer(key)}
                  >
                    <View style={{ flexDirection: "row" }}>
                      {Array.from({ length: index + 1 }, (_, i) => (
                        <LibraryIcon key={i} name="layer" size={22} />
                      ))}
                    </View>
                    {key === "tell" ? "Tell me" : key === "more" ? "More" : "Deep"}
                  </Action>
                ))}
              </View>
            </View>
          )}
          {topic || prayer ? (
            (prayer?.sentences ?? topic!.layers[layer]).map((sentence) => (
              <SentenceLine
                key={sentence.id}
                sentence={sentence}
                selected={selected === sentence.id}
                onSentence={() => speak(sentence.speechKey, sentence)}
              />
            ))
          ) : (
            <>
              <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                {layer === "tell"
                  ? legacy?.short
                  : layer === "more"
                    ? legacy?.deeper
                    : "A deeper page is being prepared. Tell me and More are ready to explore."}
              </Text>
              <Action onPress={() => speak(topicSpeechKey(record.id))}>Hear the original discovery</Action>
            </>
          )}
        </View>
      </View>

      <View style={{ padding: phone ? 16 : 28, gap: 16 }}>
        {wonderPrompts.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text maxFontSizeMultiplier={1.5} style={[s.heading, displayBold, { marginTop: 0, color: "#3D2B24" }]}>
              Wonder & Talk Together
            </Text>
            {wonderPrompts.map((prompt) => (
              <WonderQuestionCard
                key={prompt.id}
                prompt={prompt}
                headingBold={headingBold}
                bodyFont={bodyFont}
                onHear={() => speak(prompt.speechKey, prompt.sentence)}
              />
            ))}
          </View>
        )}

        {!!record.item?.grownUpNote && (
          <View style={{ gap: 10 }}>
            <Action expanded={grownUps} onPress={() => setGrownUps(!grownUps)}>
              For grown-ups
            </Action>
            {grownUps && (
              <View style={topicCard}>
                <Text style={[s.small, bodyFont, { color: "#665247" }]}>{record.item.grownUpNote}</Text>
              </View>
            )}
          </View>
        )}

        <View style={s.row}>
          <Action selected={saved} onPress={toggleSaved}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LibraryIcon name="heart" size={20} filled={saved} />
              <Text maxFontSizeMultiplier={1.3} style={[s.actionText, headingBold, { color: "#3D2B24" }]}>
                {saved ? "Saved in My Shelf" : "Save to My Shelf"}
              </Text>
            </View>
          </Action>
          {!!legacy && <Action onPress={() => go(`complete:${record.id}`)}>I explored this</Action>}
        </View>

        <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
          Related Adventures & Games
        </Text>

        {exhibit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Try ${exhibit.title}`}
            onPress={() => go(`lab-${exhibit.world}`)}
            style={({ pressed }) => [
              topicCard,
              {
                padding: 0,
                overflow: "hidden",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={{ width: "100%", height: 156, position: "relative" }}>
              <LibraryArt kind={exhibit.motif} category={exhibit.category} />
              <View
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  backgroundColor: "#FFFDF8F2",
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#E8D8BE",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text maxFontSizeMultiplier={1.2} style={[s.small, headingBold, { color: "#1E6B66", fontSize: 12 }]}>
                  Interactive Lab
                </Text>
              </View>
            </View>
            <View style={{ padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <Text maxFontSizeMultiplier={1.4} style={[s.heading, headingBold, { marginTop: 0, color: "#3D2B24", fontSize: 19 }]}>
                Try {exhibit.title}
              </Text>
              <LibraryIcon name="next" size={22} />
            </View>
          </Pressable>
        )}

        {gameLinks.length > 0 && (
          <View style={s.row}>
            {gameLinks.map((link) => (
              <Action
                key={`game-${link.target}`}
                onPress={() => go(`game:${link.target}`)}
                label={`Play ${link.label}`}
                style={{ backgroundColor: "#EEF7F5", borderColor: "#9BC7C2" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <LibraryIcon name="play" size={20} />
                  <Text maxFontSizeMultiplier={1.3} style={[s.actionText, headingBold, { color: "#1E6B66" }]}>
                    Play {link.label}
                  </Text>
                </View>
              </Action>
            ))}
          </View>
        )}

        {topicLinks.length > 0 && (
          <View style={s.row}>
            {topicLinks.map((link) => {
              const destination = itemById(link.target);
              return (
                <Action
                  key={`${link.kind}-${link.target}`}
                  onPress={() => (link.kind === "make" ? make() : go(link.target))}
                  label={link.label}
                >
                  {destination ? (
                    <View style={{ width: fontScale > 1.6 ? 180 : phone ? 150 : 220, marginBottom: 6 }}>
                      <ItemPicture record={destination} scene />
                    </View>
                  ) : (
                    <LibraryIcon name={link.kind === "make" ? "make" : "wonder"} size={36} />
                  )}
                  {"\n"}
                  {link.label}
                </Action>
              );
            })}
          </View>
        )}

        <Action onPress={make} label="Draw About This">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LibraryIcon name="make" size={28} />
            <Text maxFontSizeMultiplier={1.35} style={[s.actionText, headingBold, { color: "#3D2B24" }]}>
              Draw About This
            </Text>
          </View>
        </Action>

        <Action onPress={() => setSources(!sources)}>
          {sources ? "Hide credits and sources" : "Credits and sources"}
        </Action>
        {sources && (
          <View style={topicCard}>
            <Text style={[s.small, bodyFont, { color: "#665247" }]}>
              {record.item?.rights.credit ?? "Original Little Island explanation and illustrations."}
            </Text>
            <Text style={[s.small, bodyFont, { color: "#665247" }]}>
              {record.item
                ? `${record.item.review.reviewer} · ${record.item.review.date}`
                : `${legacy?.review.method} · ${legacy?.review.checkedOn}`}
            </Text>
            {(record.item?.sources ?? legacy?.sources ?? []).map((source) => (
              <Text key={source.url} selectable style={[s.small, bodyFont, { color: "#665247" }]}>
                {source.title}
                {"\n"}
                {source.url}
              </Text>
            ))}
            <Text style={[s.small, bodyFont, { color: "#665247" }]}>
              Source addresses are reference text. They do not open a browser.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
