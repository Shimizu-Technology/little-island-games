import appConfig from "../../app.json";
import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../state/Store";
import { exportBackup, importBackup } from "../state/backup";
import { parseSave } from "../state/validation";
import { Button, Copy, Heading, Sheet } from "./ui";
export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore(),
    [unlocked, setUnlocked] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  function close() {
    setUnlocked(false);
    setPending(null);
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
      <Button quiet onPress={() => store.settings({ sound: !store.save.settings.sound })}>
        Sound · {store.save.settings.sound ? "On" : "Off"}
      </Button>
      <Button quiet onPress={() => store.settings({ help: !store.save.settings.help })}>
        Checkers piece hints · {store.save.settings.help ? "On" : "Off"}
      </Button>
      <Copy>
        Games and Explore work without internet. Nearby family rooms use a local connection between approved devices. Saves stay on this device. There are no accounts, ads, trackers, or in-app purchases.
      </Copy>
      <View style={{ height: 1, backgroundColor: "#DBE3DA" }} />
      <Heading style={{ fontSize: 19 }}>For grown-ups</Heading>
      {!unlocked ? (
        <>
          <Copy>Ask a grown-up to help with backups. What is twelve plus nine?</Copy>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[18, 21, 24].map((n) => (
              <Button
                key={n}
                quiet
                onPress={() => {
                  if (n === 21) setUnlocked(true);
                  else setMessage("Ask a grown-up to try again.");
                }}
              >
                {n}
              </Button>
            ))}
          </View>
        </>
      ) : (
        <>
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
      {!!message && <Copy style={{ color: "#183F39" }}>{message}</Copy>}
    </Sheet>
  );
}
