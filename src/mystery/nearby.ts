import { nearby, NearbyEvent } from "../../modules/island-nearby";
import { MysteryIntent, MysteryView } from "./engine";
import { LobbyView, MysteryHost, Outgoing, helloPacket, intentPacket, parseRoomPacket } from "./protocol";
export type NearbyState = {
  mode: "idle" | "host" | "client";
  message: string;
  error: boolean;
  pin: string | null;
  rooms: { peer: string; room: string; name: string }[];
  invitations: { peer: string; name: string }[];
  lobby: LobbyView | null;
  view: MysteryView | null;
  playerId: string | null;
  canRejoin: boolean;
};
const initial: NearbyState = {
  mode: "idle",
  message: "A parent creates the room. Join using the private PIN.",
  error: false,
  pin: null,
  rooms: [],
  invitations: [],
  lobby: null,
  view: null,
  playerId: null,
  canRejoin: false,
};
/** Own one controller for a mounted Mystery screen. All native resources close on dispose. */
export class NearbyMystery {
  private host: MysteryHost | null = null;
  private subscription: { remove(): void } | null = null;
  private state: NearbyState = { ...initial };
  private name = "Player";
  private room = "";
  private hostPeer: string | null = null;
  private resume: string | null = null;
  private sequence = 1;
  private received = 0;
  private closed = false;
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private changed: (state: NearbyState) => void) {}
  private update(patch: Partial<NearbyState>) {
    this.state = { ...this.state, ...patch };
    if (!this.closed) this.changed(this.state);
  }
  private fail(error: unknown) {
    this.update({
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Nearby connection failed. Check Local Network permission and Wi-Fi/Bluetooth.",
    });
  }
  private listen() {
    if (!nearby) throw new Error("Nearby transport is unavailable in this build.");
    if (!this.subscription)
      this.subscription = nearby.addListener("onNearby", (e) => {
        void this.event(e);
      });
  }
  private async send(outgoing: Outgoing[]) {
    for (const { peer, packet } of outgoing) {
      try {
        await nearby?.send(peer, JSON.stringify(packet));
      } catch {
        this.host?.disconnected(peer);
        this.sync();
      }
    }
  }
  private sync() {
    if (this.host) this.update({ lobby: this.host.lobby, view: this.host.view(), playerId: "host" });
  }
  async create(name: string) {
    try {
      await this.leave(false);
      this.name = name;
      this.listen();
      const generation = this.generation;
      const identities = await Promise.all(Array.from({ length: 8 }, () => nearby!.identity()));
      if (generation !== this.generation || this.closed) return;
      const identity = identities[0],
        secrets = identities.map((i) => i.secret);
      this.room = identity.room;
      this.host = new MysteryHost(this.room, name, () => secrets.shift()!);
      await nearby!.host(name, this.room, identity.pin);
      if (generation !== this.generation) {
        await nearby!.close();
        return;
      }
      this.update({
        mode: "host",
        pin: identity.pin,
        error: false,
        message: "Share this PIN privately. Approve only family devices you recognize.",
        rooms: [],
        invitations: [],
        canRejoin: false,
      });
      this.sync();
      this.timer = setInterval(() => {
        this.host?.tick();
        this.sync();
        if (this.host) void this.send(this.host.snapshots());
      }, 1000);
    } catch (e) {
      this.fail(e);
    }
  }
  async browse(name: string, rejoin = false) {
    try {
      const saved = rejoin ? { room: this.room, resume: this.resume } : null;
      await this.leave(false);
      this.name = name;
      if (saved) {
        this.room = saved.room;
        this.resume = saved.resume;
      }
      this.listen();
      await nearby!.browse(name);
      this.update({
        mode: "client",
        message: "Choose the parent’s room, enter its PIN, then wait for approval.",
        error: false,
        rooms: [],
        view: null,
        lobby: null,
        canRejoin: !!this.resume,
      });
    } catch (e) {
      this.fail(e);
    }
  }
  async join(peer: string, room: string, pin: string) {
    try {
      if (this.room !== room) this.resume = null;
      this.room = room;
      this.hostPeer = peer;
      this.sequence = 1;
      this.received = 0;
      await nearby!.join(peer, room, pin);
    } catch (e) {
      this.fail(e);
    }
  }
  async approve(peer: string, yes: boolean) {
    try {
      await nearby!.approve(peer, yes);
      this.update({ invitations: this.state.invitations.filter((p) => p.peer !== peer) });
    } catch (e) {
      this.fail(e);
    }
  }
  async start() {
    if (!this.host?.start()) {
      this.update({ error: true, message: "Need 3–8 connected family players to start." });
      return;
    }
    this.sync();
    await this.send(this.host.snapshots());
  }
  async intent(intent: MysteryIntent) {
    if (this.host) {
      this.host.local(intent);
      this.sync();
      await this.send(this.host.snapshots());
    } else if (this.hostPeer) {
      try {
        await nearby!.send(this.hostPeer, intentPacket(this.room, ++this.sequence, intent));
      } catch (e) {
        this.fail(e);
      }
    }
  }
  private async event(e: NearbyEvent) {
    if (this.closed) return;
    if (e.type === "status") {
      if (e.status === "background") {
        const wasHost = !!this.host;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.host = null;
        this.hostPeer = null;
        this.update({
          mode: "idle",
          pin: null,
          view: null,
          lobby: null,
          invitations: [],
          canRejoin: !wasHost && !!this.resume,
          message: e.message,
          error: false,
        });
      } else this.update({ message: e.message, error: ["error", "join-failed"].includes(e.status) });
    } else if (e.type === "found")
      this.update({
        rooms: [
          ...this.state.rooms.filter((r) => r.peer !== e.peer),
          { peer: e.peer, room: e.room, name: e.name },
        ].slice(-12),
      });
    else if (e.type === "lost") this.update({ rooms: this.state.rooms.filter((r) => r.peer !== e.peer) });
    else if (e.type === "invitation" && this.host)
      this.update({
        invitations: [...this.state.invitations.filter((p) => p.peer !== e.peer), { peer: e.peer, name: e.name }].slice(
          0,
          7
        ),
      });
    else if (e.type === "connected" && !this.host && e.peer === this.hostPeer) {
      try {
        await nearby!.send(e.peer, helloPacket(this.room, this.name, this.resume));
      } catch (error) {
        this.fail(error);
      }
    } else if (e.type === "disconnected") {
      if (this.host) {
        this.host.disconnected(e.peer);
        this.sync();
        await this.send(this.host.snapshots());
      } else if (e.peer === this.hostPeer) {
        this.hostPeer = null;
        this.update({
          view: null,
          lobby: null,
          mode: "idle",
          canRejoin: !!this.resume,
          error: true,
          message:
            "The host disconnected. If the room is still open, search again to rejoin your seat. If the host left, create a new round.",
        });
      }
    } else if (e.type === "data") {
      if (this.host) {
        const output = this.host.receive(e.peer, e.payload);
        this.sync();
        await this.send(output);
      } else if (e.peer === this.hostPeer) {
        const p = parseRoomPacket(e.payload, this.room, this.received);
        if (!p) return;
        this.received = p.seq;
        if (p.type === "welcome") {
          this.resume = p.resume;
          this.update({
            playerId: p.playerId,
            canRejoin: true,
            message: "Approved. Waiting for the parent to start.",
            error: false,
          });
        } else if (p.type === "snapshot" && (!p.view || p.view.selfId === this.state.playerId))
          this.update({ lobby: p.lobby, view: p.view, error: false });
        else if (p.type === "error") this.update({ error: true, message: p.message });
      }
    }
  }
  /** Route leave/background: host closes room; a client may keep its in-memory seat secret for rejoin. */
  async pause() {
    const wasHost = !!this.host;
    const saved = !wasHost ? { resume: this.resume, room: this.room } : null;
    await this.leave(false);
    if (saved) {
      this.resume = saved.resume;
      this.room = saved.room;
    }
    this.update({
      canRejoin: !!saved?.resume,
      message: wasHost
        ? "The parent left, so the room closed. Create a new room to play again."
        : "Nearby play paused. Search again to rejoin with parent approval.",
    });
  }
  async leave(notify = true) {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.host = null;
    this.hostPeer = null;
    this.subscription?.remove();
    this.subscription = null;
    this.resume = null;
    this.room = "";
    try {
      await nearby?.close();
    } catch {
      /* A closed or unavailable transport is already safe. */
    }
    this.state = { ...initial };
    if (notify) this.update({});
  }
  dispose() {
    this.closed = true;
    void this.leave(false);
  }
}
