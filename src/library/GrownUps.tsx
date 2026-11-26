import React, { useEffect, useState } from "react";
import { AppState, Image, Switch, TextInput, View } from "react-native";
import { useIsFocused } from "expo-router";
import { Text } from "../components/Text";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { gateAccepts, makeGate } from "../state/grownUpGate";
import { authored, catalog, categories } from "./catalog";
import { libraryAssets } from "./assets.generated";
import { Action, ItemPicture, s } from "./ui";
import type { LibraryItem } from "./schema";
import type { LibraryPolicy } from "./state";
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return match && +match[1] < 24 && +match[2] < 60 ? +match[1] * 60 + +match[2] : null;
}
const sectionCard = {
  backgroundColor: "#FFFDF8",
  borderWidth: 1.5,
  borderColor: "#E8D8BE",
  borderBottomWidth: 3,
  borderBottomColor: "rgba(61, 43, 36, 0.14)",
  borderRadius: 24,
  padding: 18,
  gap: 14,
} as const;
export function GrownUps({
  people,
  selected,
  getPolicy,
  onPolicy,
  onExtend,
  onDone,
  onSelect,
}: {
  people: { id: string; name: string }[];
  selected: string;
  getPolicy: (id: string) => LibraryPolicy;
  onPolicy: (id: string, policy: LibraryPolicy) => void;
  onExtend: () => void;
  onDone: () => void;
  onSelect: (id: string) => void;
}) {
  const nunitoLoaded = useNunitoLoaded();
  const displayBold = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const bodyFont = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["600"], fontWeight: "normal" } as const)
    : undefined;
  const [gate, setGate] = useState(makeGate);
  const [answer, setAnswer] = useState("");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [child, setChild] = useState(selected);
  const focused = useIsFocused();
  useEffect(() => {
    const lock = () => {
      setOpen(false);
      setAnswer("");
      setGate(makeGate());
    };
    // Losing route ownership starts a new grown-up visit and needs a fresh gate.
    if (!focused) lock();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") lock();
    });
    return () => sub.remove();
  }, [focused]);
  const [preview, setPreview] = useState("");
  const policy = getPolicy(child);
  const [start, setStart] = useState(clock(policy.hours.start));
  const [end, setEnd] = useState(clock(policy.hours.end));
  if (!open)
    return (
      <View style={sectionCard}>
        <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { color: "#3D2B24" }]}>
          Grown-ups
        </Text>
        <Text style={[s.body, displayBold, { color: "#3D2B24", fontSize: 21 }]}>
          What is {gate.a} × {gate.b}?
        </Text>
        <TextInput
          accessibilityLabel="Grown-up answer"
          keyboardType="number-pad"
          value={answer}
          onChangeText={setAnswer}
          maxLength={3}
          placeholder="Answer"
          placeholderTextColor="#665247"
          style={[s.input, bodyFont]}
        />
        <View style={s.row}>
          <Action
            onPress={() => {
              if (gateAccepts(gate, answer)) setOpen(true);
              else setNotice("Try the multiplication again.");
            }}
          >
            Open Library settings
          </Action>
          <Action onPress={onDone}>Back to Library</Action>
        </View>
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={[s.small, bodyFont, { color: "#665247" }]}>
            {notice}
          </Text>
        )}
      </View>
    );
  return (
    <View style={{ gap: 16 }}>
      <View style={sectionCard}>
        <Text maxFontSizeMultiplier={1.5} style={[s.title, displayBold, { color: "#3D2B24" }]}>
          Library for your family
        </Text>
        <View style={s.row}>
          {people.map((person) => (
            <Action
              key={person.id}
              selected={person.id === child}
              onPress={() => {
                setChild(person.id);
                setStart(clock(getPolicy(person.id).hours.start));
                setEnd(clock(getPolicy(person.id).hours.end));
                setPreview("");
              }}
            >
              {person.name}
            </Action>
          ))}
        </View>
        <Text style={[s.small, bodyFont, { color: "#665247", fontSize: 16, lineHeight: 24 }]}>
          Choose collections for {people.find((person) => person.id === child)?.name}. Hiding a collection keeps saved
          pages and places safe.
        </Text>
        <View style={{ gap: 2 }}>
          {categories.map((category, index) => (
            <View
              key={category.id}
              style={[
                s.row,
                {
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderColor: "#EFE3CE",
                },
              ]}
            >
              <Text style={[s.body, bodyFont, { flex: 1, minWidth: 120, color: "#3D2B24", fontSize: 18, lineHeight: 25 }]}>
                {category.title}
              </Text>
              <Switch
                accessibilityLabel={`Allow ${category.title}`}
                trackColor={{ false: "#D8C9B2", true: "#1E6B66" }}
                thumbColor="#FFFDF8"
                value={policy.collections.includes(category.id)}
                onValueChange={(value) =>
                  onPolicy(child, {
                    ...policy,
                    collections: value
                      ? [...policy.collections, category.id]
                      : policy.collections.filter((id) => id !== category.id),
                  })
                }
              />
              <Action
                label={`Preview ${category.title}`}
                selected={preview === category.id}
                onPress={() => setPreview(preview === category.id ? "" : category.id)}
              >
                Preview
              </Action>
            </View>
          ))}
        </View>
        {!!preview && (
          <View
            style={{
              gap: 14,
              padding: 16,
              backgroundColor: "#FFF6E5",
              borderWidth: 1.5,
              borderColor: "#E8D8BE",
              borderRadius: 20,
            }}
          >
            <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { marginTop: 0, color: "#3D2B24" }]}>
              Grown-up preview · {categories.find((category) => category.id === preview)?.title}
            </Text>
            <Text style={[s.small, bodyFont, { color: "#665247" }]}>Previewing does not change availability.</Text>
            {catalog
              .filter((record) => record.category === preview)
              .map((record) => (
                <View
                  key={record.id}
                  style={{
                    gap: 8,
                    padding: 14,
                    backgroundColor: "#FFFDF8",
                    borderWidth: 1,
                    borderColor: "#E8D8BE",
                    borderRadius: 18,
                  }}
                >
                  <Text maxFontSizeMultiplier={1.6} style={[s.heading, displayBold, { marginTop: 0, color: "#3D2B24" }]}>
                    {record.title}
                  </Text>
                  <ItemPicture record={record} />
                  {record.item?.type === "topic" ? (
                    Object.entries(record.item.layers).map(([layer, lines]) => (
                      <Text key={layer} style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                        {layer}: {lines.map((line) => line.text).join(" ")}
                      </Text>
                    ))
                  ) : record.legacy ? (
                    <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                      {record.legacy.short}
                      {"\n"}
                      {record.legacy.deeper}
                      {"\n"}
                      {record.legacy.question}
                    </Text>
                  ) : null}
                  {record.item?.type === "book" && <BookPreview book={record.item} />}
                  {record.item?.type === "prayer" && (
                    <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                      {record.item.sentences.map((line) => line.text).join(" ")}
                    </Text>
                  )}
                  {!!record.item?.grownUpNote && (
                    <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>{record.item.grownUpNote}</Text>
                  )}
                  {!!record.item && <Text style={[s.small, bodyFont, { color: "#665247" }]}>{record.item.stage.support}</Text>}
                  <Text style={[s.small, bodyFont, { color: "#665247" }]}>{record.item?.sensitiveNotes.join(" ")}</Text>
                  <Text style={[s.small, bodyFont, { color: "#665247" }]}>
                    {record.item
                      ? `${record.item.review.status} · revision ${record.item.revision} · ${record.item.review.reviewer} · ${record.item.review.date}`
                      : record.legacy?.review.method}
                  </Text>
                  {(record.item?.sources ?? record.legacy?.sources ?? []).map((source) => (
                    <Text key={source.url} selectable style={[s.small, bodyFont, { color: "#665247" }]}>
                      {source.title} · {source.url}
                    </Text>
                  ))}
                </View>
              ))}
            {!catalog.some((record) => record.category === preview) && (
              <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>
                No reviewed items are installed in this collection yet.
              </Text>
            )}
            {authored
              .filter((item) => item.category === preview && item.type === "collection")
              .map((item) => (
                <Text key={item.id} style={[s.small, bodyFont, { color: "#665247" }]}>
                  {item.title} · revision {item.revision}
                </Text>
              ))}
          </View>
        )}
      </View>
      <View style={sectionCard}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.body, displayBold, { color: "#3D2B24", fontSize: 19, flex: 1 }]}>Optional Library hours</Text>
          <Switch
            accessibilityLabel="Optional Library hours"
            trackColor={{ false: "#D8C9B2", true: "#1E6B66" }}
            thumbColor="#FFFDF8"
            value={policy.hours.enabled}
            onValueChange={(enabled) => onPolicy(child, { ...policy, hours: { ...policy.hours, enabled } })}
          />
        </View>
        {policy.hours.enabled && (
          <>
            <Text style={[s.small, bodyFont, { color: "#665247" }]}>
              Use this device’s local clock, including when travelling. A window across midnight is supported. Equal
              start and end means all day. Reading can finish the current page before pausing.
            </Text>
            <View style={s.row}>
              <TextInput
                accessibilityLabel="Library start time"
                value={start}
                onChangeText={setStart}
                placeholder="08:00"
                placeholderTextColor="#665247"
                style={[s.input, bodyFont, { width: 120 }]}
              />
              <TextInput
                accessibilityLabel="Library end time"
                value={end}
                onChangeText={setEnd}
                placeholder="18:00"
                placeholderTextColor="#665247"
                style={[s.input, bodyFont, { width: 120 }]}
              />
            </View>
            <Action
              onPress={() => {
                const a = parseClock(start),
                  b = parseClock(end);
                if (a === null || b === null) setNotice("Use a time like 08:00 or 18:30.");
                else {
                  onPolicy(child, { ...policy, hours: { enabled: true, start: a, end: b } });
                  setNotice("Library hours saved.");
                }
              }}
            >
              Save hours
            </Action>
          </>
        )}
        <View style={s.row}>
          <Action onPress={() => onSelect(child)}>
            Open Library for {people.find((person) => person.id === child)?.name}
          </Action>
          <Action onPress={onExtend}>Extend this visit by 15 minutes</Action>
        </View>
        <Text style={[s.small, bodyFont, { color: "#665247" }]}>
          Listening is not recorded as independent reading. All data stays on this device. Library pages and settings
          are included in the existing grown-up backup.
        </Text>
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={[s.small, bodyFont, { color: "#665247" }]}>
            {notice}
          </Text>
        )}
        <Action onPress={onDone}>Done</Action>
      </View>
    </View>
  );
}

function BookPreview({ book }: { book: Extract<LibraryItem, { type: "book" }> }) {
  const nunitoLoaded = useNunitoLoaded();
  const bodyFont = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["600"], fontWeight: "normal" } as const)
    : undefined;
  const [index, setIndex] = useState(0);
  const page = book.pages[index];
  return (
    <View style={{ gap: 10 }}>
      <Image
        source={libraryAssets[page.image.path]}
        resizeMode="contain"
        style={{ width: "100%", height: 240 }}
        accessibilityLabel={page.image.alt}
      />
      <Text style={[s.body, bodyFont, { color: "#3D2B24" }]}>{page.sentences.map((line) => line.text).join(" ")}</Text>
      <View style={s.row}>
        <Action label="Previous preview page" disabled={index === 0} onPress={() => setIndex(index - 1)}>
          ←
        </Action>
        <Text style={[s.small, bodyFont, { color: "#665247" }]}>
          Page {index + 1} of {book.pages.length}
        </Text>
        <Action
          label="Next preview page"
          disabled={index === book.pages.length - 1}
          onPress={() => setIndex(index + 1)}
        >
          →
        </Action>
      </View>
    </View>
  );
}
