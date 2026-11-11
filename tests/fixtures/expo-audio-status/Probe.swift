import ExpoModulesCore

// Drives the installed AudioPlayer.swift and AudioPlaylist.swift through the entry points AVFoundation and
// AudioModule use (play, periodic observer callbacks, playback-end notifications, seek, media-services reset,
// release), with nothing specific to one version of the patch. Run under ThreadSanitizer with halt_on_error=1.
// Prints "PASS <scenario>" and exits 0, or names the broken rule and exits 1.

let source = AudioSource(uri: URL(fileURLWithPath: "/dev/null"))

func fail(_ message: String) -> Never {
  print("FAIL \(message)")
  exit(1)
}

func pump(_ seconds: Double = 0.05) {
  RunLoop.main.run(until: Date().addingTimeInterval(seconds))
}

func settle() {
  for _ in 0..<4 {
    pump()
    ProbePlayer.drainAll()
  }
  pump()
}

func probe(_ player: AudioPlayer) -> ProbePlayer {
  player.ref as! ProbePlayer
}

func holdNextRead() {
  unobserved(ProbeItem.lock) { ProbeItem.holdNextRead = true }
}

// Unpatched expo-audio delivers status on the main queue, which is what stalled UI frames.
func offMain(_ observer: ProbePlayer.Observer, _ scenario: String) -> ProbePlayer.Observer {
  if observer.queue === DispatchQueue.main { fail("\(scenario): the periodic status observer is delivered on the main queue") }
  return observer
}

func describe(_ events: [Event]) -> String {
  events.map { "playing=\($0.payload["playing"].map { "\($0!)" } ?? "-") didJustFinish=\($0.payload["didJustFinish"].map { "\($0!)" } ?? "-") currentTime=\($0.payload["currentTime"].map { "\($0!)" } ?? "-")" }.joined(separator: "; ")
}

func finished(_ event: Event) -> Bool {
  (event.payload["didJustFinish"] ?? nil) as? Bool == true
}

func time(_ event: Event) -> Double? {
  (event.payload["currentTime"] ?? nil) as? Double
}

// Statuses from the periodic observer carry the time it fired at; KVO and other events report the item's
// current time (0.25). After the terminal status nothing may report an older periodic time or say it's playing.
func checkTerminalLast(_ events: [Event], periodic: Set<Double>, _ scenario: String) {
  guard let end = events.firstIndex(where: finished), events.filter(finished).count == 1 else {
    fail("\(scenario): expected one terminal status: \(describe(events))")
  }
  let after = events[(end + 1)...]
  if after.contains(where: { periodic.contains(time($0) ?? -1) || ($0.payload["playing"] ?? nil) as? Bool == true }) {
    fail("\(scenario): an older periodic status followed the terminal status: \(describe(events))")
  }
}

// The reviewer's R1 race, on the real code: periodic status reads in flight on the observer queue, from the
// first run's removed observer (Apple allows callbacks after removal) and from the current one, while
// media-services resets replace the player on main.
func playerRace() {
  let player = AudioPlayer(ProbePlayer(fixed: ProbeItem()), interval: 10, source: source)
  player.play(at: 1)
  let first = offMain(probe(player).lastObserver, "player-race")
  // Deterministic part: a read is held halfway through its status while main replaces the player.
  holdNextRead()
  first.fire(0)
  ProbeItem.waitForHeldRead()
  player.handleMediaServicesReset()
  ProbeItem.releaseHeldRead()
  settle()
  // Stress part: callbacks from the removed and the current observer race repeated resets.
  var current = first
  for round in 0..<200 {
    if round % 10 == 0 {
      player.play(at: 1)
      current = probe(player).lastObserver
    }
    for tick in 0..<2 {
      first.fire(Double(round) + Double(tick) / 10)
      current.fire(Double(round) + Double(tick) / 10)
    }
    player.handleMediaServicesReset()
  }
  settle()
  player.sharedObjectWillRelease()
  print("PASS player-race")
}

// The reviewer's R2 interleaving, on the real code: a periodic read is held in flight, playback ends on main,
// then the read finishes. The terminal status must be last; later callbacks from that run, replays, resets
// and release must not emit anything older.
func playerOrder() {
  let player = AudioPlayer(ProbePlayer(fixed: ProbeItem()), interval: 10, source: source)
  player.play(at: 1)
  let first = offMain(probe(player).lastObserver, "player-order")
  holdNextRead()
  first.fire(0.1)
  ProbeItem.waitForHeldRead()
  probe(player).setPlaying(false)
  let item = probe(player).currentItem!
  NotificationCenter.default.post(name: .AVPlayerItemDidPlayToEndTime, object: item)
  pump()
  ProbeItem.releaseHeldRead()
  first.fire(0.2)
  settle()

  var events = Events.of(player, "playbackStatusUpdate")
  checkTerminalLast(events, periodic: [0.1, 0.2], "player-order")

  // A replay starts a new run: the old observer's late callback is dropped, the new one's is emitted.
  player.play(at: 1)
  let second = probe(player).lastObserver
  first.fire(0.3)
  second.fire(0.05)
  settle()
  events = Events.of(player, "playbackStatusUpdate")
  let afterReplay = events.drop { !finished($0) }.dropFirst()
  guard afterReplay.contains(where: { time($0) == 0.05 }), !afterReplay.contains(where: { time($0) == 0.3 }) else {
    fail("player-order: after a replay expected the new run's status and not the old observer's: \(describe(Array(afterReplay)))")
  }

  // A read in flight when media services reset belongs to the old player and is dropped.
  holdNextRead()
  second.fire(0.4)
  ProbeItem.waitForHeldRead()
  let beforeReset = Events.of(player, "playbackStatusUpdate").count
  player.handleMediaServicesReset()
  ProbeItem.releaseHeldRead()
  settle()
  let afterReset = Events.of(player, "playbackStatusUpdate").dropFirst(beforeReset)
  if afterReset.contains(where: { time($0) == 0.4 }) {
    fail("player-order: the old player's in-flight status was emitted after a reset: \(describe(Array(afterReset)))")
  }

  // Nothing after release.
  player.play(at: 1)
  let third = probe(player).lastObserver
  player.sharedObjectWillRelease()
  let beforeRelease = Events.of(player, "playbackStatusUpdate").count
  third.fire(0.5)
  settle()
  if Events.of(player, "playbackStatusUpdate").count != beforeRelease {
    fail("player-order: a status was emitted after release")
  }
  print("PASS player-order")
}

// Seek completion still resumes JS only after its status is emitted.
func playerSeek() {
  let player = AudioPlayer(ProbePlayer(fixed: ProbeItem()), interval: 10, source: source)
  let done = DispatchSemaphore(value: 0)
  nonisolated(unsafe) var emittedBeforeResume = -1
  Task.detached {
    await player.seekTo(seconds: 0)
    emittedBeforeResume = Events.of(player, "playbackStatusUpdate").count
    done.signal()
  }
  let deadline = Date().addingTimeInterval(5)
  while done.wait(timeout: .now()) != .success {
    if Date() > deadline { fail("player-seek: seekTo never resumed") }
    pump(0.01)
  }
  settle()
  if emittedBeforeResume < 1 { fail("player-seek: seekTo resumed before its status was emitted") }
  player.sharedObjectWillRelease()
  print("PASS player-seek")
}

// Release closes status delivery for good. A status already being built, a seek completion that arrives after
// release, a later producer and a media-services reset racing release emit nothing; the seek still resumes once.
func playerRelease() {
  let player = AudioPlayer(ProbePlayer(fixed: ProbeItem()), interval: 10, source: source)
  player.play(at: 1)
  settle()
  holdNextRead()
  player.updateStatus(with: [:])
  ProbeItem.waitForHeldRead()
  let resumed = startSeek { await player.seekTo(seconds: 0) }
  let before = Events.of(player, "playbackStatusUpdate").count
  player.sharedObjectWillRelease()
  ProbeItem.releaseHeldRead()
  player.updateStatus(with: [:])
  player.handleMediaServicesReset()
  awaitResumedOnce(resumed, "player-release")
  let after = Events.of(player, "playbackStatusUpdate").dropFirst(before)
  if !after.isEmpty { fail("player-release: \(after.count) status(es) emitted after release: \(describe(Array(after)))") }
  print("PASS player-release")
}

// Starts a seek on another thread and returns once its completion is queued on main, not yet run.
func startSeek(_ seek: @escaping @Sendable () async -> Void) -> DispatchSemaphore {
  let resumed = DispatchSemaphore(value: 0)
  Task.detached {
    await seek()
    resumed.signal()
  }
  if ProbePlayer.seekQueued.wait(timeout: .now() + 5) != .success { fail("the seek never reached the player") }
  return resumed
}

// A double resume traps in CheckedContinuation; a missing one never signals.
func awaitResumedOnce(_ resumed: DispatchSemaphore, _ scenario: String) {
  let deadline = Date().addingTimeInterval(5)
  while resumed.wait(timeout: .now()) != .success {
    if Date() > deadline { fail("\(scenario): seekTo never resumed after release") }
    pump(0.01)
  }
  settle()
  if resumed.wait(timeout: .now()) == .success { fail("\(scenario): seekTo resumed twice") }
}

func playlist(_ count: Int) -> (AudioPlaylist, ProbePlayer) {
  let items: [AVPlayerItem?] = (0..<count).map { _ in ProbeItem() }
  let queue = ProbePlayer(items: items.compactMap { $0 })
  return (AudioPlaylist(queue, sources: Array(repeating: source, count: count), items: items, interval: 10, loopMode: .none), queue)
}

// Periodic playlist reads of the track list in flight while JS and main rebuild it.
func playlistRace() {
  let (list, queue) = playlist(3)
  for round in 0..<30 {
    list.play(at: 1)
    let observer = offMain(queue.lastObserver, "playlist-race")
    for tick in 0..<4 {
      observer.fire(Double(round) + Double(tick) / 10)
    }
    list.add(source: source)
    list.skipTo(index: 0)
    list.remove(at: 1)
    pump(0.001)
  }
  settle()
  list.sharedObjectWillRelease()
  print("PASS playlist-race")
}

// The end of the last track while a periodic read is in flight: the terminal status stays last.
func playlistOrder() {
  let (list, queue) = playlist(1)
  list.play(at: 1)
  let observer = offMain(queue.lastObserver, "playlist-order")
  holdNextRead()
  observer.fire(0.1)
  ProbeItem.waitForHeldRead()
  queue.setPlaying(false)
  NotificationCenter.default.post(name: .AVPlayerItemDidPlayToEndTime, object: queue.currentItem!)
  pump()
  ProbeItem.releaseHeldRead()
  observer.fire(0.2)
  settle()
  checkTerminalLast(Events.of(list, "playlistStatusUpdate"), periodic: [0.1, 0.2], "playlist-order")
  list.sharedObjectWillRelease()
  print("PASS playlist-order")
}

// Track-list edits don't stop a continuing playback's progress. After an append, an insert and each branch of
// remove, the latest observer's callbacks are emitted, and callbacks from every removed observer stay rejected.
func playlistEdits() {
  let (list, queue) = playlist(4)
  var tick = 0.0
  func expectProgress(after step: String, index: Int, count: Int) {
    settle()
    if list.currentTrackIndex != index || list.trackCount != count {
      fail("playlist-edits: after \(step) expected track \(index) of \(count), got \(list.currentTrackIndex) of \(list.trackCount)")
    }
    let observers = queue.allObservers
    let before = Events.of(list, "playlistStatusUpdate").count
    var removed: Set<Double> = []
    for observer in observers.dropLast() {
      tick += 1
      removed.insert(tick)
      observer.fire(tick)
    }
    tick += 1
    observers.last!.fire(tick)
    settle()
    let times = Events.of(list, "playlistStatusUpdate").dropFirst(before).compactMap(time)
    if !times.contains(tick) { fail("playlist-edits: no progress after \(step): \(times)") }
    if let stale = times.first(where: removed.contains) {
      fail("playlist-edits: a removed observer's callback (\(stale)) was emitted after \(step)")
    }
  }
  list.play(at: 1)
  expectProgress(after: "play", index: 0, count: 4)
  list.add(source: source)
  expectProgress(after: "an append", index: 0, count: 5)
  list.insert(source: source, at: 0)
  expectProgress(after: "an insert before the current track", index: 1, count: 6)
  list.remove(at: 1)
  expectProgress(after: "removing the current track", index: 1, count: 5)
  list.remove(at: 0)
  expectProgress(after: "removing an earlier track", index: 0, count: 4)
  list.remove(at: 3)
  expectProgress(after: "removing a later track", index: 0, count: 3)
  list.sharedObjectWillRelease()
  print("PASS playlist-edits")
}

// The playlist's release closes status delivery the same way.
func playlistRelease() {
  let (list, _) = playlist(2)
  list.play(at: 1)
  settle()
  holdNextRead()
  list.updateStatus(with: [:])
  ProbeItem.waitForHeldRead()
  let resumed = startSeek { await list.seekTo(seconds: 0) }
  let before = Events.of(list, "playlistStatusUpdate").count
  list.sharedObjectWillRelease()
  ProbeItem.releaseHeldRead()
  list.updateStatus(with: [:])
  awaitResumedOnce(resumed, "playlist-release")
  let after = Events.of(list, "playlistStatusUpdate").dropFirst(before)
  if !after.isEmpty { fail("playlist-release: \(after.count) status(es) emitted after release: \(describe(Array(after)))") }
  print("PASS playlist-release")
}

let scenarios: [String: () -> Void] = [
  "player-race": playerRace,
  "player-order": playerOrder,
  "player-seek": playerSeek,
  "player-release": playerRelease,
  "playlist-race": playlistRace,
  "playlist-order": playlistOrder,
  "playlist-edits": playlistEdits,
  "playlist-release": playlistRelease
]
guard CommandLine.arguments.count == 2, let run = scenarios[CommandLine.arguments[1]] else {
  print("usage: probe <\(scenarios.keys.sorted().joined(separator: "|"))>")
  exit(2)
}
run()
