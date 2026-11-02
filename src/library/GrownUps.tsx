import React, { useEffect, useState } from "react";
import { AppState, Image, Switch, TextInput, View } from "react-native";
import { useIsFocused } from "expo-router";
import { Text } from "../components/Text";
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
      <View style={{ gap: 14 }}>
        <Text style={s.title}>Grown-ups</Text>
        <Text style={s.body}>
          What is {gate.a} × {gate.b}?
        </Text>
        <TextInput
          accessibilityLabel="Grown-up answer"
          keyboardType="number-pad"
          value={answer}
          onChangeText={setAnswer}
          maxLength={3}
          style={s.input}
        />
        <Action
          onPress={() => {
            if (gateAccepts(gate, answer)) setOpen(true);
            else setNotice("Try the multiplication again.");
          }}
        >
          Open Library settings
        </Action>
        <Action onPress={onDone}>Back to Library</Action>
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {notice}
          </Text>
        )}
      </View>
    );
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.title}>Library for your family</Text>
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
      <Text style={s.body}>
        Choose collections for {people.find((person) => person.id === child)?.name}. Hiding a collection keeps saved
        pages and places safe.
      </Text>
      {categories.map((category) => (
        <View key={category.id} style={[s.row, { justifyContent: "space-between", paddingVertical: 5 }]}>
          <Text style={[s.body, { flex: 1 }]}>{category.title}</Text>
          <Switch
            accessibilityLabel={`Allow ${category.title}`}
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
            onPress={() => setPreview(preview === category.id ? "" : category.id)}
          >
            Preview
          </Action>
        </View>
      ))}
      {!!preview && (
        <View style={{ gap: 14, padding: 14, backgroundColor: "#E9EFE0", borderRadius: 18 }}>
          <Text style={s.heading}>
            Grown-up preview · {categories.find((category) => category.id === preview)?.title}
          </Text>
          <Text style={s.small}>Previewing does not change availability.</Text>
          {catalog
            .filter((record) => record.category === preview)
            .map((record) => (
              <View key={record.id} style={{ gap: 8 }}>
                <Text style={s.heading}>{record.title}</Text>
                <ItemPicture record={record} />
                {record.item?.type === "topic" ? (
                  Object.entries(record.item.layers).map(([layer, lines]) => (
                    <Text key={layer} style={s.body}>
                      {layer}: {lines.map((line) => line.text).join(" ")}
                    </Text>
                  ))
                ) : record.legacy ? (
                  <Text style={s.body}>
                    {record.legacy.short}
                    {"\n"}
                    {record.legacy.deeper}
                    {"\n"}
                    {record.legacy.question}
                  </Text>
                ) : null}
                {record.item?.type === "book" && <BookPreview book={record.item} />}
                {record.item?.type === "prayer" && <Text style={s.body}>{record.item.sentences.map((line) => line.text).join(" ")}</Text>}
                {!!record.item?.grownUpNote && <Text style={s.body}>{record.item.grownUpNote}</Text>}
                {!!record.item && <Text style={s.small}>{record.item.stage.support}</Text>}
                <Text style={s.small}>{record.item?.sensitiveNotes.join(" ")}</Text>
                <Text style={s.small}>
                  {record.item
                    ? `${record.item.review.status} · revision ${record.item.revision} · ${record.item.review.reviewer} · ${record.item.review.date}`
                    : record.legacy?.review.method}
                </Text>
                {(record.item?.sources ?? record.legacy?.sources ?? []).map((source) => (
                  <Text key={source.url} selectable style={s.small}>
                    {source.title} · {source.url}
                  </Text>
                ))}
              </View>
            ))}
          {!catalog.some((record) => record.category === preview) && (
            <Text style={s.body}>No reviewed items are installed in this collection yet.</Text>
          )}
          {authored
            .filter((item) => item.category === preview && item.type === "collection")
            .map((item) => (
              <Text key={item.id} style={s.small}>
                {item.title} · revision {item.revision}
              </Text>
            ))}
        </View>
      )}
      <View style={s.row}>
        <Text style={s.body}>Optional Library hours</Text>
        <Switch
          accessibilityLabel="Optional Library hours"
          value={policy.hours.enabled}
          onValueChange={(enabled) => onPolicy(child, { ...policy, hours: { ...policy.hours, enabled } })}
        />
      </View>
      {policy.hours.enabled && (
        <>
          <Text style={s.small}>
            Use this device’s local clock, including when travelling. A window across midnight is supported. Equal start
            and end means all day. Reading can finish the current page before pausing.
          </Text>
          <View style={s.row}>
            <TextInput
              accessibilityLabel="Library start time"
              value={start}
              onChangeText={setStart}
              placeholder="08:00"
              style={[s.input, { width: 120 }]}
            />
            <TextInput
              accessibilityLabel="Library end time"
              value={end}
              onChangeText={setEnd}
              placeholder="18:00"
              style={[s.input, { width: 120 }]}
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
      <Action onPress={() => onSelect(child)}>
        Open Library for {people.find((person) => person.id === child)?.name}
      </Action>
      <Action onPress={onExtend}>Extend this visit by 15 minutes</Action>
      <Text style={s.small}>
        Listening is not recorded as independent reading. All data stays on this device. Library pages and settings are
        included in the existing grown-up backup.
      </Text>
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {notice}
        </Text>
      )}
      <Action onPress={onDone}>Done</Action>
    </View>
  );
}

function BookPreview({ book }: { book: Extract<LibraryItem, { type: "book" }> }) {
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
      <Text style={s.body}>{page.sentences.map((line) => line.text).join(" ")}</Text>
      <View style={s.row}>
        <Action label="Previous preview page" disabled={index === 0} onPress={() => setIndex(index - 1)}>
          ←
        </Action>
        <Text style={s.small}>
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
