import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, C, Copy, Heading, Label, Sheet, Status, font } from "../components/ui";
import { nearby, nearbyUnavailable } from "../../modules/island-nearby";
import {
  BELL,
  MAP,
  MysteryIntent,
  MysterySession,
  MysteryView,
  PUMP,
  REPAIR_CHOICES,
  Role,
  TASKS,
  applyMysteryIntent,
  createMysterySession,
  mysteryView,
  soloMysteryTick,
} from "./engine";
import { NearbyMystery, NearbyState } from "./nearby";

const initialNearby: NearbyState = {
  mode: "idle",
  message: "A parent creates the private family room.",
  error: false,
  pin: null,
  rooms: [],
  invitations: [],
  lobby: null,
  view: null,
  playerId: null,
  canRejoin: false,
};
export type MysteryScreenProps = {
  state: MysterySession | null;
  onSave: (next: MysterySession, previous: MysterySession | null) => void;
  width: number;
  /** False for route blur or any parent-owned overlay; nearby rooms close safely. */
  active: boolean;
  sound: boolean;
  onFeedback?: () => void;
};
const AVATAR_COLORS = [C.coral, C.blue, C.teal, "#88639B", "#906B26", "#A44D75", "#4A7981", "#647243"];
function IslandMap({ view, width }: { view: MysteryView; width: number }) {
  const size = Math.min(620, Math.max(200, width));
  return (
    <View
      accessibilityLabel="Island map. Use the movement buttons and location labels below."
      style={{ width: "100%", alignItems: "center" }}
    >
      <Svg width={size} height={(size * 7) / 9} viewBox="0 0 450 350" accessible={false}>
        <Rect width="450" height="350" rx="25" fill="#D9EAF0" />
        {MAP.flatMap((row, y) =>
          [...row].map((tile, x) =>
            tile === "." ? (
              <Rect key={`${x}:${y}`} x={x * 50 + 1} y={y * 50 + 1} width="48" height="48" rx="10" fill="#EEE6CE" />
            ) : null
          )
        )}
        {TASKS.map((task, i) => (
          <React.Fragment key={task.id}>
            <Rect
              x={task.x * 50 + 7}
              y={task.y * 50 + 7}
              width="36"
              height="36"
              rx="10"
              fill={view.tasks[task.id] === 3 ? "#A6C9A4" : "#F4CF77"}
            />
            <Path
              d={
                i === 0
                  ? `M${task.x * 50 + 25} ${task.y * 50 + 36}v-20m0 7q-18-15-15 0q10 7 15 0q15-18 15-3q-3 9-15 3`
                  : `M${task.x * 50 + 14} ${task.y * 50 + 25}h22m-11-11v22`
              }
              stroke={C.ink}
              strokeWidth="3"
              fill="none"
            />
          </React.Fragment>
        ))}
        <Circle cx={BELL.x * 50 + 25} cy={BELL.y * 50 + 25} r="17" fill="#E1B251" />
        <Path d="M215 179h20m-17-3v-12q7-10 14 0v12m-8 8h3" stroke={C.ink} strokeWidth="3" fill="none" />
        <Rect
          x={PUMP.x * 50 + 11}
          y={PUMP.y * 50 + 8}
          width="28"
          height="34"
          rx="5"
          fill={view.sabotage ? C.coral : C.blue}
        />
        {view.players
          .filter((p) => !p.out && p.connected)
          .map((p, i) => (
            <React.Fragment key={p.id}>
              <Circle
                cx={p.x * 50 + 25 + ((i % 3) - 1) * 6}
                cy={p.y * 50 + 25 + (Math.floor(i / 3) - 1) * 5}
                r={p.id === view.selfId ? 14 : 10}
                fill={AVATAR_COLORS[i]}
                stroke={p.id === view.selfId ? C.ink : C.cream}
                strokeWidth={p.id === view.selfId ? 4 : 2}
              />
              <Circle
                cx={p.x * 50 + 24 + ((i % 3) - 1) * 6}
                cy={p.y * 50 + 21 + (Math.floor(i / 3) - 1) * 5}
                r="2"
                fill={C.cream}
              />
            </React.Fragment>
          ))}
      </Svg>
    </View>
  );
}
function MysteryPlay({
  view,
  width,
  enabled,
  showRole,
  setShowRole,
  intent,
}: {
  view: MysteryView;
  width: number;
  enabled: boolean;
  showRole: boolean;
  setShowRole: (v: boolean) => void;
  intent: (i: MysteryIntent) => void;
}) {
  const p = view.players.find((p) => p.id === view.selfId)!;
  const living = view.players.filter((p) => !p.out);
  const at = (point: { x: number; y: number }) => p.x === point.x && p.y === point.y;
  const nearbyPlayers = living.filter((t) => t.id !== p.id && Math.abs(t.x - p.x) + Math.abs(t.y - p.y) <= 1);
  const task = TASKS.find(at);
  const canAct = enabled && !view.paused && !p.out && !view.result;
  const caption = view.result
    ? view.result.winner === "crew"
      ? "The crew saved the picnic!"
      : "Mischief wins this round!"
    : view.paused
      ? "Waiting for family to rejoin"
      : p.out
        ? "Watching from the hammock"
        : view.phase === "discussion"
          ? "Share your clues aloud"
          : view.phase === "voting"
            ? "Who made the mischief?"
            : "Explore Picnic Island";
  return (
    <View style={{ gap: 14 }}>
      <Status
        title={caption}
        detail={
          view.result
            ? {
                tasks: "All four jobs are complete.",
                caught: "The vote found the mischief maker.",
                pranks: "The mischief maker surprised enough crew members.",
                sabotage: "The water supply was not repaired in time.",
              }[view.result.reason]
            : view.paused
              ? "Timers and moves are paused. Disconnected players keep their seats and roles."
              : p.out
                ? "You can follow the public story. Your movement and vote are finished for this round."
                : view.phase === "discussion" || view.phase === "voting"
                  ? `${view.phaseLeft} seconds remaining. ${view.phase === "voting" ? `${view.votesCast} of ${living.length} votes cast.` : `${view.readyCount} of ${living.length} ready.`}`
                  : view.events.at(-1)
        }
        success={view.result?.winner === "crew"}
      />
      {enabled && (
        <View style={s.role}>
          <Button quiet onPress={() => setShowRole(!showRole)}>
            {showRole ? "Hide my role and clues" : "Reveal my role and clues"}
          </Button>
          {showRole && (
            <>
              <Heading style={{ fontSize: 23 }}>
                {view.ownRole === "crew" ? "You are crew" : "You make mischief"}
              </Heading>
              <Copy>
                {view.ownRole === "crew"
                  ? "Finish the four jobs, repair sabotage, and use clues to find the mischief maker."
                  : "Pretend to help. At the pump, turn off the water; near a crew member, play a silly prank. Avoid the vote."}
              </Copy>
            </>
          )}
        </View>
      )}
      <IslandMap view={view} width={width} />
      <Copy style={{ textAlign: "center" }}>
        You are at column {p.x}, row {p.y}.{" "}
        {at(BELL) ? "Meeting bell." : at(PUMP) ? "Water pump." : task ? task.name : "Island path."}
      </Copy>
      {view.phase === "explore" && (
        <>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Button compact disabled={!canAct} onPress={() => intent({ type: "move", dx: 0, dy: -1 })} label="Move up">
              Up
            </Button>
            <View style={s.row}>
              <Button
                compact
                disabled={!canAct}
                onPress={() => intent({ type: "move", dx: -1, dy: 0 })}
                label="Move left"
              >
                Left
              </Button>
              <Button
                compact
                disabled={!canAct}
                onPress={() => intent({ type: "move", dx: 0, dy: 1 })}
                label="Move down"
              >
                Down
              </Button>
              <Button
                compact
                disabled={!canAct}
                onPress={() => intent({ type: "move", dx: 1, dy: 0 })}
                label="Move right"
              >
                Right
              </Button>
            </View>
          </View>
          {view.sabotage && (
            <Status
              title={`Repair the pump: ${view.sabotage.left} seconds`}
              detail="Jobs are paused. Go to the pump at column 4, row 1. Order: open supply, close valve, connect pipe."
            />
          )}
          {at(PUMP) && view.sabotage && (
            <View style={s.activity}>
              <Heading style={{ fontSize: 21 }}>Fix the water supply · {view.sabotage.progress}/3</Heading>
              <View style={s.row}>
                {REPAIR_CHOICES.map((choice, i) => (
                  <Button
                    quiet
                    compact
                    key={choice}
                    disabled={!canAct}
                    onPress={() => intent({ type: "repair", choice: i })}
                  >
                    {choice}
                  </Button>
                ))}
              </View>
            </View>
          )}
          {task && (
            <View style={s.activity}>
              <Heading style={{ fontSize: 21 }}>
                {task.name} · {view.tasks[task.id]}/3
              </Heading>
              <Copy>{view.tasks[task.id] === 3 ? "Job complete. Find another island station." : task.prompt}</Copy>
              <View style={s.row}>
                {task.choices.map((choice, i) => (
                  <Button
                    quiet
                    compact
                    key={choice}
                    disabled={!canAct || !!view.sabotage || view.tasks[task.id] === 3}
                    onPress={() => intent({ type: "task", task: task.id, choice: i })}
                  >
                    {choice}
                  </Button>
                ))}
              </View>
            </View>
          )}
          {at(BELL) && (
            <Button disabled={!canAct || !view.canMeet} onPress={() => intent({ type: "meeting" })}>
              Ring meeting bell · {p.meetings} left
            </Button>
          )}
          {showRole && view.ownRole === "mischief" && (
            <View style={s.activity}>
              <Copy>
                Prank ready in {view.prankReadyIn}s. Pump sabotage ready in {view.sabotageReadyIn}s.
              </Copy>
              {at(PUMP) && (
                <Button
                  disabled={!canAct || !!view.sabotage || view.sabotageReadyIn > 0}
                  onPress={() => intent({ type: "sabotage" })}
                >
                  Turn off the water
                </Button>
              )}
              {nearbyPlayers.map((target) => (
                <Button
                  key={target.id}
                  quiet
                  disabled={!canAct || view.prankReadyIn > 0}
                  onPress={() => intent({ type: "prank", target: target.id })}
                >
                  Silly prank on {target.name}
                </Button>
              ))}
            </View>
          )}
        </>
      )}
      {view.phase === "discussion" && (
        <>
          <Copy>Say what you saw. Nobody needs to type or chat online. When everyone is ready, the vote opens.</Copy>
          <Button disabled={!canAct || view.selfReady} onPress={() => intent({ type: "ready" })}>
            {view.selfReady ? "Waiting for others" : "Ready to vote"}
          </Button>
        </>
      )}
      {view.phase === "voting" && (
        <View style={s.row}>
          {living.map((target) => (
            <Button
              quiet
              key={target.id}
              disabled={!canAct || view.selfVoted}
              onPress={() => intent({ type: "vote", target: target.id })}
            >
              Vote {target.name}
            </Button>
          ))}
          <Button quiet disabled={!canAct || view.selfVoted} onPress={() => intent({ type: "vote", target: "skip" })}>
            Skip vote
          </Button>
        </View>
      )}
      <View style={s.activity}>
        <Label>Four island jobs</Label>
        {TASKS.map((t) => (
          <Copy key={t.id}>
            {view.tasks[t.id] === 3 ? "Complete" : `${view.tasks[t.id]}/3`} · {t.name} · column {t.x}, row {t.y}
          </Copy>
        ))}
      </View>
      {enabled && showRole && view.clues.length > 0 && (
        <View style={s.activity}>
          <Label>My private clues</Label>
          {view.clues.map((clue, i) => (
            <Copy key={`${i}:${clue}`}>{clue}</Copy>
          ))}
        </View>
      )}
      <View style={s.row}>
        {view.players.map((player, i) => (
          <Copy key={player.id} style={{ color: AVATAR_COLORS[i] }}>
            {player.name}
            {player.id === view.selfId ? " (you)" : ""}:{" "}
            {player.out ? "watching" : !player.connected ? "disconnected" : "playing"}
          </Copy>
        ))}
      </View>
      <Copy style={{ fontSize: 13 }}>Last island event: {view.events.at(-1)}</Copy>
    </View>
  );
}
export function MysteryScreen({ state, onSave, width, active, sound, onFeedback }: MysteryScreenProps) {
  const [mode, setMode] = useState<"menu" | "solo" | "nearby">("menu");
  const [remote, setRemote] = useState<NearbyState>(initialNearby);
  const [foreground, setForeground] = useState(AppState.currentState === "active" || AppState.currentState === null);
  const [help, setHelp] = useState(false),
    [setup, setSetup] = useState(false),
    [parent, setParent] = useState(false),
    [exit, setExit] = useState(false);
  const [role, setRole] = useState<Role>("crew"),
    [showRole, setShowRole] = useState(false);
  const [name, setName] = useState("Player"),
    [pin, setPin] = useState(""),
    [answer, setAnswer] = useState("");
  const latest = useRef(state),
    controller = useRef<NearbyMystery | null>(null);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    const connection = new NearbyMystery(setRemote);
    controller.current = connection;
    return () => {
      connection.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setForeground(next === "active");
      if (next !== "active") setShowRole(false);
    });
    const visibility = () => {
      setForeground(!document.hidden);
      setShowRole(false);
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", visibility);
    return () => {
      sub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!active) {
      // External route/overlay changes must clear private role visibility.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRole(false);
      void controller.current?.pause();
    }
  }, [active]);
  const playing = active && foreground && !help && !setup && !parent && !exit;
  useEffect(() => {
    if (!playing || mode !== "solo" || !state?.id || state.result) return;
    const timer = setInterval(() => {
      const previous = latest.current;
      if (previous) {
        const next = soloMysteryTick(previous);
        latest.current = next;
        onSave(next, previous);
      }
    }, 1000);
    return () => clearInterval(timer);
    // Revisions are read through latest; recreating the timer after every move would let movement stall the clock.
  }, [playing, mode, state?.id, state?.result, onSave]);
  const view =
    mode === "solo" && state ? mysteryView(state, state.players[0].id) : mode === "nearby" ? remote.view : null;
  const intent = (action: MysteryIntent) => {
    if (!playing) return;
    if (sound) onFeedback?.();
    if (mode === "nearby") void controller.current?.intent(action);
    else {
      const previous = latest.current;
      if (previous) {
        const next = applyMysteryIntent(previous, previous.players[0].id, action, previous.revision);
        if (next !== previous) {
          latest.current = next;
          onSave(next, previous);
        }
      }
    }
  };
  const closeOverlays = () => {
    setShowRole(false);
    setHelp(false);
    setSetup(false);
    setParent(false);
    setExit(false);
  };
  return (
    <View style={{ width: "100%", maxWidth: 850, alignSelf: "center", gap: 16 }}>
      {mode === "menu" && (
        <>
          <Status
            title="The Picnic Island mystery"
            detail="Explore, finish little jobs, share clues, and uncover one playful mischief maker."
          />
          <View style={s.activity}>
            <Heading style={{ fontSize: 24 }}>Solo practice</Heading>
            <Copy>Play crew or mischief with three computer islanders. Practice rounds save on this device.</Copy>
            {state && (
              <Button
                onPress={() => {
                  closeOverlays();
                  setMode("solo");
                }}
              >
                Continue saved practice
              </Button>
            )}
            <Button
              quiet
              onPress={() => {
                setRole("crew");
                setSetup(true);
              }}
            >
              Start fresh practice
            </Button>
          </View>
          <View style={s.activity}>
            <Heading style={{ fontSize: 24 }}>Nearby family</Heading>
            <Copy>
              Three to eight people, each with an iPhone or iPad. A parent opens and approves a private room. No
              internet account or public chat.
            </Copy>
            {nearby ? (
              <Button
                onPress={() => {
                  setMode("nearby");
                  setShowRole(false);
                }}
              >
                Nearby family rooms
              </Button>
            ) : (
              <Copy>{nearbyUnavailable}</Copy>
            )}
          </View>
        </>
      )}
      {mode === "nearby" && !view && (
        <>
          <Status
            title={remote.error ? "Connection needs attention" : "Private nearby family"}
            detail={remote.message}
          />
          {remote.mode === "idle" && (
            <>
              <TextInput
                accessibilityLabel="Your family player name"
                value={name}
                onChangeText={(text) => setName(text.replace(/[\p{C}<>]/gu, "").slice(0, 20))}
                maxLength={20}
                style={s.input}
                autoComplete="off"
              />
              <View style={s.row}>
                <Button
                  disabled={!name.trim()}
                  onPress={() => {
                    setAnswer("");
                    setParent(true);
                  }}
                >
                  Parent: create a room
                </Button>
                <Button
                  quiet
                  disabled={!name.trim()}
                  onPress={() => void controller.current?.browse(name.trim(), remote.canRejoin)}
                >
                  {remote.canRejoin ? "Search to rejoin my seat" : "Join a family room"}
                </Button>
              </View>
            </>
          )}
          {remote.pin && (
            <View style={s.activity}>
              <Label>Tell family privately</Label>
              <Heading>{remote.pin}</Heading>
              <Copy>The PIN is not advertised. Approve only devices you recognize.</Copy>
            </View>
          )}
          {remote.mode === "client" && !remote.lobby && (
            <>
              <TextInput
                accessibilityLabel="Private six digit room PIN"
                keyboardType="number-pad"
                secureTextEntry
                value={pin}
                onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                style={s.input}
                autoComplete="off"
              />
              <Copy>
                Ask the parent for the PIN. If no room appears, allow Local Network access in Settings and turn on
                Wi-Fi/Bluetooth.
              </Copy>
              {remote.rooms.map((room) => (
                <Button
                  quiet
                  key={room.peer}
                  disabled={pin.length !== 6}
                  onPress={() => void controller.current?.join(room.peer, room.room, pin)}
                >
                  Join {room.name}’s room
                </Button>
              ))}
            </>
          )}
          {remote.lobby && (
            <View style={s.activity}>
              <Heading style={{ fontSize: 23 }}>Family lobby · {remote.lobby.players.length}/8</Heading>
              {remote.lobby.players.map((p) => (
                <Copy key={p.id}>
                  {p.name} · {p.connected ? "ready" : "disconnected"}
                </Copy>
              ))}
              {remote.mode === "host" ? (
                <Button
                  disabled={remote.lobby.players.length < 3 || remote.lobby.players.some((p) => !p.connected)}
                  onPress={() => void controller.current?.start()}
                >
                  Start the mystery
                </Button>
              ) : (
                <Copy>Waiting for the parent to start.</Copy>
              )}
            </View>
          )}
        </>
      )}
      {mode === "nearby" &&
        remote.mode === "host" &&
        remote.invitations.map((invite) => (
          <View style={s.activity} key={invite.peer}>
            <Heading style={{ fontSize: 21 }}>Allow {invite.name}?</Heading>
            <Copy>Confirm this is your family member’s device.</Copy>
            <View style={s.row}>
              <Button onPress={() => void controller.current?.approve(invite.peer, true)}>Approve</Button>
              <Button quiet onPress={() => void controller.current?.approve(invite.peer, false)}>
                Decline
              </Button>
            </View>
          </View>
        ))}
      {view && (
        <MysteryPlay
          view={view}
          width={width}
          enabled={playing}
          showRole={showRole && playing}
          setShowRole={setShowRole}
          intent={intent}
        />
      )}
      {mode !== "menu" && (
        <View style={s.row}>
          <Button
            quiet
            onPress={() => {
              setShowRole(false);
              setHelp(true);
            }}
          >
            How to play
          </Button>
          {mode === "solo" && (
            <Button
              quiet
              onPress={() => {
                setShowRole(false);
                setSetup(true);
              }}
            >
              Fresh practice
            </Button>
          )}
          <Button
            quiet
            onPress={() => {
              setShowRole(false);
              setExit(true);
            }}
          >
            Leave mystery
          </Button>
        </View>
      )}
      <Sheet visible={help} title="Picnic Island rules" onClose={() => setHelp(false)}>
        <Copy>
          Crew wins by completing the four three-step jobs or voting out the one mischief maker. Look at the map, move
          with the arrows, and use the choices at each station. A wrong task choice restarts its three-step pattern.
        </Copy>
        <Copy>
          Mischief wins by surprising crew until only one crew member remains, or by turning off the water for 60
          seconds. Pranks require an adjacent player and an 18-second cooldown. Nearby witnesses get a private clue. No
          fighting or scary pictures.
        </Copy>
        <Copy>
          The pump is at column 4, row 1. Repair in order: open supply, close valve, connect pipe. Sabotage pauses jobs;
          its timer stops during disconnection.
        </Copy>
        <Copy>
          The bell is at column 4, row 3. Each player has two meetings, at least 10 seconds apart; meetings cannot
          interrupt sabotage. Share clues aloud for up to 20 seconds, then each active player votes once. Highest vote
          leaves; ties and skip keep everyone. The vote closes after 25 seconds; missing votes become skip.
        </Copy>
        <Copy>
          Computer players use their own role and private clues plus public positions/jobs. Nearby games are
          host-authoritative and private. If a guest pauses or disconnects, everyone waits for their approved rejoin. If
          the parent host leaves/backgrounds, the room closes and a new room is needed.
        </Copy>
      </Sheet>
      <Sheet visible={setup} title="Fresh solo mystery" onClose={() => setSetup(false)}>
        <Copy>
          {state
            ? "This replaces your saved practice. Cancel to keep it."
            : "Choose a role to learn how the island mystery works."}
        </Copy>
        <View style={s.row}>
          <Button quiet selected={role === "crew"} onPress={() => setRole("crew")}>
            Crew practice
          </Button>
          <Button quiet selected={role === "mischief"} onPress={() => setRole("mischief")}>
            Mischief practice
          </Button>
        </View>
        <Button
          onPress={() => {
            const previous = latest.current;
            const next = createMysterySession(undefined, undefined, role);
            latest.current = next;
            onSave(next, previous);
            closeOverlays();
            setMode("solo");
          }}
        >
          Start practice
        </Button>
      </Sheet>
      <Sheet visible={parent} title="Parent room setup" onClose={() => setParent(false)}>
        <Copy>A grown-up creates the room and approves each joining device. What is 8 + 13?</Copy>
        <TextInput
          accessibilityLabel="Grown-up answer"
          value={answer}
          onChangeText={setAnswer}
          keyboardType="number-pad"
          style={s.input}
        />
        <Button
          disabled={answer.trim() !== "21"}
          onPress={() => {
            setParent(false);
            void controller.current?.create(name.trim());
          }}
        >
          Create private family room
        </Button>
        <Copy>
          Keep this app open. Nearby play needs Local Network permission; allow the system prompt, then wait for family
          devices to join.
        </Copy>
      </Sheet>
      <Sheet visible={exit} title="Leave this mystery?" onClose={() => setExit(false)}>
        <Copy>
          {mode === "nearby"
            ? remote.mode === "host"
              ? "Leaving closes this family room for everyone. Start a new room to play again."
              : "Leaving disconnects your seat and pauses the family round until you rejoin. Ask the parent before leaving."
            : "Your practice is saved. You can continue later."}
        </Copy>
        <Button
          onPress={() => {
            if (mode === "nearby") void controller.current?.pause();
            closeOverlays();
            setMode("menu");
          }}
        >
          Leave and return
        </Button>
      </Sheet>
    </View>
  );
}
const s = StyleSheet.create({
  activity: { backgroundColor: "#F0F1E8", padding: 17, borderRadius: 20, gap: 12 },
  role: { backgroundColor: "#E5EFE5", padding: 16, borderRadius: 20, gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 15,
    fontFamily: font,
    fontSize: 18,
    color: C.ink,
    backgroundColor: C.paper,
    minHeight: 52,
  },
});
