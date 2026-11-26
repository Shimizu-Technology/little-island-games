import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { topicSpeechKey } from "../explore/content";
import { LibraryArt } from "./LibraryArt";
import { SentenceLine } from "./Reader";
import { Action, ItemPicture, LibraryIcon, s } from "./ui";
import { canOpen, exhibits, itemById, type CatalogItem } from "./catalog";
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
  const links: LibraryLink[] = record.item?.links ?? [
    ...(legacy?.related ?? []).map((id) => ({
      kind: "legacy-topic" as const,
      target: id,
      label: itemById(id)?.title ?? id,
    })),
  ];
  const exhibit = legacy && exhibits.find((item) => item.world === legacy.world);
  return (
    <View style={{ gap: 0 }}>
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
            paddingTop: 16,
            paddingBottom: 22,
            gap: 8,
          }}
        >
          <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { fontSize: 26, lineHeight: 33, marginBottom: 4, color: "#3D2B24" }]}>
            {record.title}
          </Text>
          {!prayer && (
            <View style={[s.row, { justifyContent: "flex-start", gap: 8, marginBottom: 6 }]}>
              {(["tell", "more", "deep"] as const).map((key, index) => (
                <Action
                  key={key}
                  selected={layer === key}
                  label={`${index + 1} books: ${key === "tell" ? "Tell me" : key === "more" ? "More" : "Deep"}`}
                  onPress={() => onLayer(key)}
                >
                  <View style={{ flexDirection: "row" }}>
                    {Array.from({ length: index + 1 }, (_, i) => (
                      <LibraryIcon key={i} name="layer" size={24} />
                    ))}
                  </View>
                  {key === "tell" ? "Tell me" : key === "more" ? "More" : "Deep"}
                </Action>
              ))}
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
              <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>{legacy?.question}</Text>
            </>
          )}
        </View>
      </View>
      <View style={{ padding: phone ? 16 : 28, gap: 16 }}>
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
            {saved ? "Saved in My Shelf" : "Save to My Shelf"}
          </Action>
          {!!legacy && <Action onPress={() => go(`complete:${record.id}`)}>I explored this</Action>}
        </View>
        <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { color: "#3D2B24" }]}>
          Where next?
        </Text>
        {exhibit && (
          <Action onPress={() => go(`lab-${exhibit.world}`)}>
            <View style={{ width: "100%", height: 160, borderRadius: 18, overflow: "hidden", marginBottom: 6 }}>
              <LibraryArt kind={exhibit.motif} />
            </View>
            Try {exhibit.title}
          </Action>
        )}
        <View style={s.row}>
          {links
            .filter((link) => link.kind === "make" || link.kind === "game" || canOpen(link.target, collections))
            .map((link) => {
              const destination = itemById(link.target);
              return (
                <Action
                  key={`${link.kind}-${link.target}`}
                  onPress={() =>
                    link.kind === "make" ? make() : go(link.kind === "game" ? `game:${link.target}` : link.target)
                  }
                  label={link.label}
                >
                  {destination ? (
                    <View style={{ width: fontScale > 1.6 ? 180 : phone ? 150 : 220, marginBottom: 6 }}>
                      <ItemPicture record={destination} scene />
                    </View>
                  ) : (
                    <LibraryIcon name={link.kind === "make" ? "make" : "wonder"} size={40} />
                  )}
                  {"\n"}
                  {link.label}
                </Action>
              );
            })}
        </View>
        <Action onPress={make}>
          <LibraryIcon name="make" size={40} />
          {"\n"}Make a page about this wonder
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
