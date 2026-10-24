import appConfig from "../../app.json";
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { Text } from "./Text";
import { useStore } from "../state/Store";
import { exportBackup, importBackup } from "../state/backup";
import { parseSave } from "../state/validation";
import { Button, C, Copy, Heading, Sheet, ToggleRow, font, styles } from "./ui";
import { Gate, gateAccepts, makeGate } from "../state/grownUpGate";
import { PreviousSaves } from "./PreviousSaves";
import { practiceSummary } from "../learn/skills";
import { engines, skillLabels } from "../learn/engines";
import { islandNames } from "../learn/home";
import type { Island } from "../learn/types";
export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore(),
    [unlocked, setUnlocked] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<string | null>(null),
    [history, setHistory] = useState(false),
    [busy, setBusy] = useState(false),
    [gate, setGate] = useState<Gate>(() => makeGate()),
    [answer, setAnswer] = useState("");
  const practice = practiceSummary(store.save.skills, skillLabels());
  function check() {
    if (gateAccepts(gate, answer)) {
      setUnlocked(true);
      setMessage("");
    } else {
      setMessage("That’s not it. A grown-up can try a new question.");
      setGate(makeGate());
    }
    setAnswer("");
  }
  function close() {
    setUnlocked(false);
    setGate(makeGate());
    setAnswer("");
    setPending(null);
    setHistory(false);
    setMessage("");
    onClose();
  }
  async function read() {
    try {
      const raw = await importBackup();
      if (raw) {
        parseSave(raw);
        setPending(raw);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "We could not read that backup.");
    }
  }
  async function restore() {
    if (!pending) return;
    setBusy(true);
    try {
      await store.restore(pending);
      setPending(null);
      setHistory(false);
      setMessage("Your games and settings have been restored.");
    } catch {
      setMessage("The backup could not be restored. Your current games are still kept.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet visible={visible} onClose={close} title="Your little island">
      <Heading style={{ fontSize: 19 }}>Make yourself comfortable</Heading>
      <ToggleRow
        label="Sound"
        detail="Clues, narration and little feedback tones"
        value={store.save.settings.sound}
        disabled={busy}
        onChange={(sound) => store.settings({ sound })}
      />
      <ToggleRow
        label="Checkers piece hints"
        detail="A small dot on pieces that can move"
        value={store.save.settings.help}
        disabled={busy}
        onChange={(help) => store.settings({ help })}
      />
      <Copy>
        Games and Explore work without internet. Nearby family rooms use a local connection between approved devices. Saves stay on this device. There are no accounts, ads, trackers, or in-app purchases.
      </Copy>
      <View style={{ height: 1, backgroundColor: C.line }} />
      <Heading style={{ fontSize: 19 }}>For grown-ups</Heading>
      {!unlocked ? (
        <>
          <Copy>Practice notes and backups are for grown-ups. Type the answer to unlock.</Copy>
          <View style={[styles.row, { gap: 10 }]}>
            <Text style={{ fontFamily: font, fontSize: 20, fontWeight: "700", color: C.ink }}>
              {gate.a} × {gate.b} =
            </Text>
            <TextInput
              accessibilityLabel={`Grown-up question: ${gate.a} times ${gate.b}`}
              value={answer}
              onChangeText={(v) => setAnswer(v.replace(/[^0-9]/g, "").slice(0, 3))}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={check}
              autoComplete="off"
              textContentType="none"
              style={[styles.input, { width: 96, textAlign: "center", minHeight: 48, paddingVertical: 10 }]}
            />
            <Button quiet compact disabled={!answer} onPress={check}>
              Unlock
            </Button>
          </View>
        </>
      ) : (
        <>
          <Heading style={{ fontSize: 19 }}>What she’s been practicing</Heading>
          {!practice.length && <Copy>No recent practice yet. As she explores the learning islands, the words and ideas she tries will appear here.</Copy>}
          {(["reading", "numbers", "science", "thinking"] as Island[]).map(island => {
            const labels = new Set(Object.values(engines).filter(e => e.island === island).flatMap(e => Object.keys(e.skills)));
            const lines = practice.filter(line => labels.has(line.skill));
            return !lines.length ? null : <View key={island} style={{ gap: 6 }}>
              <Heading style={{ fontSize: 17 }}>{islandNames[island]}</Heading>
              {lines.map(line => <Copy key={line.skill}>{line.label} — {line.state === "getting-easier" ? "getting easier" : "practicing"}</Copy>)}
            </View>;
          })}
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Copy>
            A backup lets you move progress to another device. Deleting the app can remove its local saves. Keep backups
            in a private place; family names and secret game roles may be included. Nearby room credentials are never backed up.
          </Copy>
          <Button
            quiet
            disabled={busy}
            onPress={() =>
              void exportBackup(JSON.stringify(store.save))
                .then(() => setMessage("Choose a private place to save your backup."))
                .catch(() => setMessage("The backup could not be shared. Please try again."))
            }
          >
            Save a backup
          </Button>
          <Button quiet disabled={busy} onPress={() => void read()}>
            Choose a backup to restore
          </Button>
          <Button quiet disabled={busy} onPress={() => { setPending(null); setHistory(!history); }}>
            {history ? "Close previous saves" : "Previous saves"}
          </Button>
          {history && !pending && <PreviousSaves onChoose={(raw) => { setPending(raw); setMessage(""); }} />}
          {pending && (
            <>
              <Copy>
                Restoring replaces the games on this device. A copy of the current save is preserved in recovery
                storage.
              </Copy>
              <Button disabled={busy} onPress={() => void restore()}>
                {busy ? "Restoring…" : "Replace games with this backup"}
              </Button>
              <Button quiet onPress={() => setPending(null)}>
                Keep my current games
              </Button>
            </>
          )}
          <Copy>
            Family preview · Version {appConfig.expo.version}. Public release and physical-device acceptance are separate milestones.
          </Copy>
        </>
      )}
      {!!message && <Copy style={{ color: C.ink }}>{message}</Copy>}
    </Sheet>
  );
}
