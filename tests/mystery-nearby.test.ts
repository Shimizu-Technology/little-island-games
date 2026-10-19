import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NearbyMystery, NearbyState } from "../src/mystery/nearby";
import { helloPacket } from "../src/mystery/protocol";
const fake = vi.hoisted(() => ({
  listeners: new Set<(event: unknown) => void>(),
  native: {
    identity: vi.fn(),
    host: vi.fn(),
    browse: vi.fn(),
    join: vi.fn(),
    approve: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    addListener: vi.fn(),
  },
}));
vi.mock("../modules/island-nearby", () => ({ nearby: fake.native }));
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
const flush = async () => {
  for (let i = 0; i < 24; i++) await Promise.resolve();
};
const emit = (event: unknown) => {
  for (const listener of [...fake.listeners]) listener(event);
};
let controllers: NearbyMystery[];
function connection() {
  const states: NearbyState[] = [];
  const c = new NearbyMystery((s) => states.push(s));
  controllers.push(c);
  return { c, states, last: () => states.at(-1)! };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fake.listeners.clear();
  controllers = [];
  let count = 0;
  fake.native.identity.mockImplementation(async () => {
    const id = `11111111-1111-4111-8111-${String(++count).padStart(12, "0")}`;
    return { room: id, secret: id, pin: "123456" };
  });
  for (const method of [
    fake.native.host,
    fake.native.browse,
    fake.native.join,
    fake.native.approve,
    fake.native.send,
    fake.native.close,
  ])
    method.mockResolvedValue(undefined);
  fake.native.addListener.mockImplementation((_event: string, listener: (event: unknown) => void) => {
    fake.listeners.add(listener);
    return { remove: () => fake.listeners.delete(listener) };
  });
});
afterEach(async () => {
  controllers.forEach((c) => c.dispose());
  await flush();
  vi.useRealTimers();
});

describe("nearby controller operation ownership", () => {
  it("rapid concurrent creates open only the latest host and own one removable clock", async () => {
    const { c, last } = connection();
    await Promise.all([c.create("First"), c.create("Second")]);
    expect(fake.native.host).toHaveBeenCalledTimes(1);
    expect(fake.native.host.mock.calls[0][0]).toBe("Second");
    expect(last().lobby?.players[0].name).toBe("Second");
    expect(vi.getTimerCount()).toBe(1);
    c.dispose();
    await flush();
    expect(vi.getTimerCount()).toBe(0);
    expect(fake.listeners.size).toBe(0);
  });
  it("captures ownership before a deferred native close, not after its await", async () => {
    const closing = deferred();
    fake.native.close.mockReturnValueOnce(closing.promise);
    const { c } = connection();
    const first = c.create("First");
    await flush();
    expect(fake.native.close).toHaveBeenCalledTimes(1);
    const second = c.create("Second");
    closing.resolve();
    await Promise.all([first, second]);
    expect(fake.native.host).toHaveBeenCalledTimes(1);
    expect(fake.native.host.mock.calls[0][0]).toBe("Second");
    expect(vi.getTimerCount()).toBe(1);
  });
  it("serializes a superseded native host before browse, without closing the newer browser", async () => {
    const opening = deferred();
    fake.native.host.mockReturnValueOnce(opening.promise);
    const { c, states, last } = connection();
    const first = c.create("First");
    await flush();
    expect(fake.native.host).toHaveBeenCalledTimes(1);
    const second = c.browse("Guest");
    await flush();
    expect(fake.native.browse).not.toHaveBeenCalled();
    opening.resolve();
    await Promise.all([first, second]);
    expect(fake.native.browse).toHaveBeenCalledTimes(1);
    expect(last().mode).toBe("client");
    expect(states.some((s) => s.mode === "host")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const browseOrder = fake.native.browse.mock.invocationCallOrder[0];
    expect(fake.native.close.mock.invocationCallOrder.every((order) => order < browseOrder)).toBe(true);
  });
  it("dispose during a deferred host open leaves no timer, listener or announced room", async () => {
    const opening = deferred();
    fake.native.host.mockReturnValueOnce(opening.promise);
    const { c, states } = connection();
    const first = c.create("Parent");
    await flush();
    c.dispose();
    opening.resolve();
    await first;
    await flush();
    expect(vi.getTimerCount()).toBe(0);
    expect(fake.listeners.size).toBe(0);
    expect(states.some((s) => s.mode === "host")).toBe(false);
  });
  it("replacing a live room cannot make an old clock advance the new room twice", async () => {
    const { c, last } = connection();
    const startFamily = async () => {
      const room = fake.native.host.mock.calls.at(-1)![1] as string;
      emit({ type: "data", peer: "peer-a", payload: helloPacket(room, "Mango", null) });
      emit({ type: "data", peer: "peer-b", payload: helloPacket(room, "Pearl", null) });
      await flush();
      await c.start();
    };
    await c.create("Parent");
    await startFamily();
    await vi.advanceTimersByTimeAsync(3000);
    expect(last().view?.tick).toBe(3);
    const replacement = c.create("New parent");
    expect(vi.getTimerCount()).toBe(0);
    await replacement;
    await startFamily();
    expect(last().view?.tick).toBe(0);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(last().view?.tick).toBe(3);
  });
  it("rapid join attempts keep one peer binding until the native handshake settles", async () => {
    const joining = deferred();
    fake.native.join.mockReturnValueOnce(joining.promise);
    const { c } = connection();
    await c.browse("Guest");
    const first = c.join("peer-a", "11111111-1111-4111-8111-111111111111", "123456");
    await flush();
    const second = c.join("peer-b", "22222222-2222-4222-8222-222222222222", "123456");
    await second;
    expect(fake.native.join).toHaveBeenCalledTimes(1);
    expect(fake.native.join.mock.calls[0][0]).toBe("peer-a");
    joining.resolve();
    await first;
    emit({ type: "connected", peer: "peer-a" });
    await flush();
    expect(fake.native.send.mock.calls.at(-1)![0]).toBe("peer-a");
    expect(JSON.parse(fake.native.send.mock.calls.at(-1)![1]).room).toBe("11111111-1111-4111-8111-111111111111");
  });
  it("approved seat credentials survive pause and rejoin but explicit leave clears them", async () => {
    const { c } = connection();
    const room = "11111111-1111-4111-8111-111111111111",
      secret = "22222222-2222-4222-8222-222222222222";
    await c.browse("Guest");
    await c.join("peer-a", room, "123456");
    emit({
      type: "data",
      peer: "peer-a",
      payload: JSON.stringify({ v: 1, room, type: "welcome", seq: 1, playerId: "p1", resume: secret }),
    });
    await c.pause();
    await c.browse("Guest", true);
    await c.join("peer-new", room, "123456");
    emit({ type: "connected", peer: "peer-new" });
    await flush();
    expect(JSON.parse(fake.native.send.mock.calls.at(-1)![1]).resume).toBe(secret);
    await c.leave();
    await c.browse("Guest", true);
    await c.join("peer-final", room, "123456");
    emit({ type: "connected", peer: "peer-final" });
    await flush();
    expect(JSON.parse(fake.native.send.mock.calls.at(-1)![1]).resume).toBeNull();
  });
  it("background during native host open cancels its operation and all clocks", async () => {
    const opening = deferred();
    fake.native.host.mockReturnValueOnce(opening.promise);
    const { c, last } = connection();
    const first = c.create("Parent");
    await flush();
    emit({ type: "status", status: "background", message: "Host backgrounded" });
    opening.resolve();
    await first;
    await flush();
    expect(last().mode).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
    expect(fake.listeners.size).toBe(0);
  });
});
