import ExpoModulesCore

// Host stand-ins for the expo-audio types that AudioPlayer.swift and AudioPlaylist.swift use, so the installed
// (patched) files compile unchanged into a macOS probe.

struct AudioSource {
  var uri: URL?
  var headers: [String: String]?
}

struct Metadata {}
struct LockScreenOptions { var isLiveStream: Bool? }
enum LoopMode: String { case none, single, all }

final class AudioComponentRegistry {
  func remove(_ object: AnyObject) {}
}

final class MediaController {
  static let shared = MediaController()
  func updateNowPlayingInfo(for player: AudioPlayer) {}
  func setActivePlayer(_ player: AudioPlayer?, options: LockScreenOptions? = nil) {}
}

final class AudioTapProcessor {
  var sampleBufferCallback: ((UnsafeMutablePointer<AudioBuffer>?, Int, Double) -> Void)?
  let isTapInstalled = false
  init(player: AVPlayer) {}
  func installTap() -> Bool { false }
  func uninstallTap() {}
  func invalidate() {}
}

enum AudioUtils {
  static func createAVPlayer(from source: AudioSource?) -> AVPlayer { ProbePlayer(fixed: ProbeItem()) }
  static func createAVPlayerItem(from source: AudioSource?) -> AVPlayerItem? { ProbeItem() }
}

extension AVPlayer {
  func isBuffering(isPlaying: Bool) -> Bool { false }
}

// A queue player whose periodic observers, playback state and seeks the probe drives by hand, the way
// AVFoundation would: each observer block runs on the queue it was registered with (main when nil), and a
// removed observer's block may still be in flight. With a fixed item, it answers the status getters itself,
// so AVFoundation's internal locks can't hide a race in the code under test from ThreadSanitizer. Built from a
// list of items (playlists), it keeps the queue itself: the probe's items can't load, and AVFoundation would
// skip past them.
final class ProbePlayer: AVQueuePlayer {
  struct Observer {
    let queue: DispatchQueue
    let block: (CMTime) -> Void
    func fire(_ seconds: Double) { queue.async { block(CMTime(seconds: seconds, preferredTimescale: 1000)) } }
  }

  static let lock = NSLock()
  // Signalled once a seek's completion has been queued on main, so the probe can release before it runs.
  static let seekQueued = DispatchSemaphore(value: 0)
  nonisolated(unsafe) static var made: [ProbePlayer] = []
  private var observers: [Observer] = []
  private var fakeStatus: AVPlayer.TimeControlStatus = .paused
  private let fixed: ProbeItem?
  private var queued: [AVPlayerItem] = []

  init(fixed item: ProbeItem) {
    fixed = item
    super.init(items: [item])
    unobserved(ProbePlayer.lock) { ProbePlayer.made.append(self) }
  }

  override var currentItem: AVPlayerItem? { fixed ?? unobserved(ProbePlayer.lock) { queued.first } }
  override var status: AVPlayer.Status { .readyToPlay }
  override var rate: Float {
    get { 1 }
    set {}
  }
  override var isMuted: Bool {
    get { false }
    set {}
  }
  override var reasonForWaitingToPlay: AVPlayer.WaitingReason? { nil }

  override init(items: [AVPlayerItem]) {
    fixed = nil
    queued = items
    super.init()
    unobserved(ProbePlayer.lock) { ProbePlayer.made.append(self) }
  }

  // The fixed-item player leaves its queue to AVFoundation.
  override func items() -> [AVPlayerItem] {
    fixed == nil ? unobserved(ProbePlayer.lock) { queued } : super.items()
  }

  override func insert(_ item: AVPlayerItem, after afterItem: AVPlayerItem?) {
    guard fixed == nil else { return super.insert(item, after: afterItem) }
    editQueue { queue in
      let index = afterItem.flatMap { after in queue.firstIndex { $0 === after } }.map { $0 + 1 } ?? queue.count
      queue.insert(item, at: index)
    }
  }

  override func remove(_ item: AVPlayerItem) {
    guard fixed == nil else { return super.remove(item) }
    editQueue { $0.removeAll { $0 === item } }
  }

  override func removeAllItems() {
    guard fixed == nil else { return super.removeAllItems() }
    editQueue { $0.removeAll() }
  }

  override func advanceToNextItem() {
    guard fixed == nil else { return super.advanceToNextItem() }
    editQueue { if !$0.isEmpty { $0.removeFirst() } }
  }

  private func editQueue(_ edit: (inout [AVPlayerItem]) -> Void) {
    let current = currentItem
    var next = unobserved(ProbePlayer.lock) { queued }
    edit(&next)
    if next.first === current {
      unobserved(ProbePlayer.lock) { queued = next }
      return
    }
    willChangeValue(forKey: "currentItem")
    unobserved(ProbePlayer.lock) { queued = next }
    didChangeValue(forKey: "currentItem")
  }

  override init() {
    fixed = nil
    super.init()
  }

  var lastObserver: Observer {
    unobserved(ProbePlayer.lock) { observers.last! }
  }

  // Every observer registered so far, oldest first; all but the last have been removed.
  var allObservers: [Observer] {
    unobserved(ProbePlayer.lock) { observers }
  }

  override func addPeriodicTimeObserver(forInterval interval: CMTime, queue: DispatchQueue?, using block: @escaping @Sendable (CMTime) -> Void) -> Any {
    unobserved(ProbePlayer.lock) { observers.append(Observer(queue: queue ?? .main, block: block)) }
    return NSObject()
  }

  override func removeTimeObserver(_ observer: Any) {}

  override var timeControlStatus: AVPlayer.TimeControlStatus {
    unobserved(ProbePlayer.lock) { fakeStatus }
  }

  func setPlaying(_ playing: Bool) {
    unobserved(ProbePlayer.lock) { fakeStatus = playing ? .playing : .paused }
  }

  override func playImmediately(atRate rate: Float) { setPlaying(true) }
  override func play() { setPlaying(true) }
  override func pause() { setPlaying(false) }

  override func seek(to time: CMTime, completionHandler: @escaping @Sendable (Bool) -> Void) {
    DispatchQueue.main.async { completionHandler(true) }
    ProbePlayer.seekQueued.signal()
  }

  override func seek(to time: CMTime, toleranceBefore: CMTime, toleranceAfter: CMTime, completionHandler: @escaping @Sendable (Bool) -> Void) {
    DispatchQueue.main.async { completionHandler(true) }
    ProbePlayer.seekQueued.signal()
  }

  static func drainAll() {
    let queues = unobserved(lock) { made.flatMap { $0.observers.map(\.queue) } }
    for _ in 0..<3 {
      for queue in queues where queue !== DispatchQueue.main { queue.sync {} }
    }
  }
}

// An item that can hold its next off-main currentTime() read, like the MediaToolbox item lock wait.
final class ProbeItem: AVPlayerItem {
  static func waitForHeldRead() {
    unobserved { precondition(reading.wait(timeout: .now() + 5) == .success, "no read was held") }
  }

  static func releaseHeldRead() {
    unobserved { _ = release.signal() }
  }

  nonisolated(unsafe) static var holdNextRead = false
  static let reading = DispatchSemaphore(value: 0)
  static let release = DispatchSemaphore(value: 0)
  static let lock = NSLock()

  convenience init() {
    self.init(asset: AVURLAsset(url: URL(fileURLWithPath: "/dev/null")), automaticallyLoadedAssetKeys: nil)
  }

  override func currentTime() -> CMTime {
    let hold = unobserved(ProbeItem.lock) {
      let hold = ProbeItem.holdNextRead && !Thread.isMainThread
      if hold { ProbeItem.holdNextRead = false }
      return hold
    }
    if hold {
      // The gate itself is invisible to ThreadSanitizer, so it orders nothing in the code under test.
      unobserved {
        ProbeItem.reading.signal()
        precondition(ProbeItem.release.wait(timeout: .now() + 10) == .success, "probe gate timed out")
      }
    }
    return CMTime(seconds: 0.25, preferredTimescale: 1000)
  }

  override var duration: CMTime { CMTime(seconds: 1, preferredTimescale: 1000) }
  override var status: AVPlayerItem.Status { .readyToPlay }
  override func currentDate() -> Date? { nil }
  override var isPlaybackLikelyToKeepUp: Bool { true }
  override var isPlaybackBufferEmpty: Bool { false }
}
