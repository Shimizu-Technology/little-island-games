import { EarlierWorkSettings } from "./EarlierWorkSettings";
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { useStore } from "../state/Store";
import { Button, Chip, Copy, Heading, styles } from "../components/ui";
import { activeLearner, familyLearners } from "./learners";
import { practiceSummary } from "./skills";
import { noteLabel } from "./noteLabel";
import { skillLabels } from "./engines";

export function LearnerSettings({ disabled }: { disabled: boolean }) {
  const store = useStore(), people = store.save.learning ?? familyLearners(), learner = activeLearner(people);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rename, setRename] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const labels = skillLabels();
  return <View style={{ gap: 10 }}>
    <Heading style={{ fontSize: 19 }}>Who is practicing?</Heading>
    <Copy>Each learner keeps their own saved games, completed School levels and stars, records, Library, badges and house on this device. Earlier family records stay separate.</Copy>
    <View style={[styles.row, { flexWrap: "wrap" }]}>{people.people.map(p => <Chip key={p.id} selected={learner.id === p.id} onPress={() => { if (!disabled && !busy) { setConfirm(null); setRename(""); store.selectLearner(p.id); } }}>{p.name}</Chip>)}</View>
    {people.people.length < 5 && <>
      <TextInput accessibilityLabel="New learner name" placeholder="Learner’s name" value={name} onChangeText={setName} maxLength={24} autoComplete="off" textContentType="none" editable={!disabled && !busy} style={styles.input} returnKeyType="done" onSubmitEditing={() => { if (!disabled && !busy && name.trim()) { if (store.addLearner(name)) { setName(""); setMessage(""); } else setMessage("Use a different name, up to 24 characters."); } }} />
      <Button quiet compact disabled={disabled || busy || !name.trim()} onPress={() => { if (store.addLearner(name)) { setName(""); setMessage(""); } else setMessage("Use a different name, up to 24 characters."); }}>Add learner</Button>
    </>}
    {learner.id !== "family" && <>
      <TextInput accessibilityLabel="Rename learner" placeholder={`New name for ${learner.name}`} value={rename} onChangeText={setRename} maxLength={24} editable={!disabled && !busy} style={styles.input}/>
      <Button quiet compact disabled={disabled || busy || !rename.trim()} onPress={() => { if (store.renameLearner(learner.id, rename)) { setRename(""); setMessage("Name changed."); } else setMessage("Use a different name, up to 24 characters."); }}>Rename learner</Button>
      <Button quiet compact disabled={disabled || busy} onPress={() => setConfirm(learner.id)}>Remove {learner.name}</Button>
    </>}
    {confirm && <View style={{ gap: 10 }}>
      <Heading style={{ fontSize: 18 }}>Remove {people.people.find(p => p.id === confirm)?.name ?? "this learner"}?</Heading>
      <Copy>This removes this learner’s saved learning, classic, board and activity rounds; School levels and stars; word and race records; favorites and recent places; practice notes; Arcade progress; Library books, pages and creations; Islander, badges, earned items and whole house. Other learners, earlier family records and the Family free-play board stay. Previous saves keeps a full copy. Restoring it replaces the whole device save, including every learner’s newer work.</Copy>
      <Button disabled={busy || disabled} onPress={() => { setBusy(true); void store.removeLearner(confirm).then(ok => { if (ok) { setConfirm(null); setMessage("Learner removed. The previous save is kept in backups."); } else setMessage("No learner was removed."); }).catch(() => setMessage("Could not keep a recovery copy. The learner has not been removed.")).finally(() => setBusy(false)); }}>{busy ? "Keeping a recovery copy…" : "Confirm removal"}</Button>
      <Button quiet disabled={busy} onPress={() => setConfirm(null)}>Keep learner</Button>
    </View>}
    {!!message && <Copy>{message}</Copy>}
    <EarlierWorkSettings disabled={disabled || busy}/>
    {!!Object.keys(learner.skills).length && <>
      <Heading style={{ fontSize: 17 }}>{learner.name}’s practice across activities</Heading>
      <Copy>These signals help choose what to offer again. They do not establish proficiency.</Copy>
      {practiceSummary(learner.skills, labels).map(line => <Copy key={line.skill}>{line.label} · practiced</Copy>)}
    </>}
    <Heading style={{ fontSize: 17 }}>{learner.name}’s learning notes</Heading>
    {!Object.keys(learner.notes).length && <Copy>Notes appear after solo practice and completed rounds. Helped answers count as completed practice. Independent answers mean no answer hints were used; read-aloud stays available. These notes describe practice, not grades or mastery.</Copy>}
    {Object.entries(learner.notes).map(([key, n]) => {
      return <Copy key={key}>{noteLabel(key, labels)}: {n.independent} independently · {n.helped} with help</Copy>;
    })}
  </View>;
}
