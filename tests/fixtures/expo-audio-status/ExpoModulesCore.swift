@_exported import AVFoundation
@_exported import Combine

// The host stand-in for the part of ExpoModulesCore that AudioPlayer.swift and AudioPlaylist.swift use. SharedRef
// keeps Expo's plain `public var ref` storage. Events are recorded instead of being scheduled onto a JS runtime.

@_silgen_name("__tsan_ignore_thread_begin") func tsanIgnoreAccessesBegin()
@_silgen_name("__tsan_ignore_thread_end") func tsanIgnoreAccessesEnd()
@_silgen_name("AnnotateIgnoreSyncBegin") func tsanIgnoreSyncBegin(_ file: UnsafePointer<CChar>?, _ line: Int32)
@_silgen_name("AnnotateIgnoreSyncEnd") func tsanIgnoreSyncEnd(_ file: UnsafePointer<CChar>?, _ line: Int32)

func tsanIgnoreBegin() {
  tsanIgnoreAccessesBegin()
  tsanIgnoreSyncBegin(nil, 0)
}

func tsanIgnoreEnd() {
  tsanIgnoreSyncEnd(nil, 0)
  tsanIgnoreAccessesEnd()
}

// Runs probe bookkeeping invisibly to ThreadSanitizer: its locks must not add happens-before edges between
// threads, or they would hide races in the code under test.
public func unobserved<T>(_ body: () -> T) -> T {
  tsanIgnoreBegin()
  defer { tsanIgnoreEnd() }
  return body()
}

public func unobserved<T>(_ lock: NSLock, _ body: () -> T) -> T {
  tsanIgnoreBegin()
  lock.lock()
  defer {
    lock.unlock()
    tsanIgnoreEnd()
  }
  return body()
}

open class SharedRef<RefType> {
  public var ref: RefType
  public init(_ ref: RefType) { self.ref = ref }
  open func sharedObjectWillRelease() {}
  public func emit<P>(event: String, payload: P) { Events.record(owner: ObjectIdentifier(self), event: event, payload: payload) }
}

public struct Event {
  public let owner: ObjectIdentifier
  public let name: String
  public let payload: [String: Any?]
}

public enum Events {
  private static let lock = NSLock()
  private static var all: [Event] = []

  public static func record<P>(owner: ObjectIdentifier, event: String, payload: P) {
    unobserved(lock) {
      var flat: [String: Any?] = [:]
      if let dict = payload as? [String: Any?] { flat = dict } else if let dict = payload as? [String: Any] { flat = dict.mapValues { $0 } }
      all.append(Event(owner: owner, name: event, payload: flat))
    }
  }

  public static func of(_ owner: AnyObject, _ name: String) -> [Event] {
    unobserved(lock) { all.filter { $0.owner == ObjectIdentifier(owner) && $0.name == name } }
  }
}
