//
//  ContentView.swift
//  MathLift
//
//  Created by Lalith Durbhakula on 5/13/26.
//
//  Paste this entire file over ContentView.swift in Xcode.
//  It wraps https://better-math-lalith.vercel.app in real iOS chrome:
//  offline screen, native spinner, header + tab bar, Taptic Engine / Core Haptics,
//  iOS Keychain session storage (Guideline 1.6), complete file protection,
//  ATS/HTTPS-only navigation, and pinch-to-zoom on lesson visuals.
//
//  Session persistence (Prompt A):
//  - Keychain uses kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
//  - restoreScript NEVER removes localStorage on a nil/locked Keychain read
//  - scenePhase + web process termination re-flush / re-restore
//  UNTESTED on device/Xcode in CI — see docs/MANUAL_TESTS.md
//

import SwiftUI
import UIKit
import WebKit
import Network
import Combine
import Security
import CoreHaptics

private let mathLiftRoot = URL(string: "https://better-math-lalith.vercel.app")!

private enum MathLiftTab: String, CaseIterable, Identifiable {
    case home
    case classes
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .classes: return "Classes"
        case .settings: return "Settings"
        }
    }

    var systemImage: String {
        switch self {
        case .home: return "house.fill"
        case .classes: return "person.3.fill"
        case .settings: return "gearshape.fill"
        }
    }

    var path: String {
        switch self {
        case .home: return "/"
        case .classes: return "/planets"
        case .settings: return "/settings"
        }
    }

    /// Match a web path (possibly with a query or trailing slash) to a tab.
    static func from(path raw: String) -> MathLiftTab? {
        let withoutQuery = raw.split(separator: "?").first.map(String.init) ?? raw
        var path = withoutQuery
        while path.count > 1, path.hasSuffix("/") {
            path.removeLast()
        }
        return allCases.first { $0.path == path }
    }
}

// MARK: - Keychain (Guideline 1.6 — never store sessions in UserDefaults)

private enum MathLiftKeychain {
    private static let service = "com.mathlift.app.session"
    private static let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    private static let sessionAccounts = [
        "better-math:active",
        "better-math:active-teacher",
        "better-math:active-role",
        "better-math:last-class-code"
    ]

    enum ReadResult: Equatable {
        case value(String)
        case notFound
        case interactionNotAllowed
        case failed(OSStatus)
    }

    static func set(_ value: String, account: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = accessibility
        SecItemAdd(add as CFDictionary, nil)
    }

    static func read(account: String) -> ReadResult {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var out: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        if status == errSecSuccess, let data = out as? Data, let text = String(data: data, encoding: .utf8) {
            return .value(text)
        }
        if status == errSecItemNotFound {
            return .notFound
        }
        if status == errSecInteractionNotAllowed {
            return .interactionNotAllowed
        }
        return .failed(status)
    }

    /// Convenience: only returns a string when the item exists and is readable.
    static func get(account: String) -> String? {
        if case .value(let text) = read(account: account) { return text }
        return nil
    }

    static func remove(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }

    /// Re-write existing items under AfterFirstUnlock so background restores work.
    static func migrateAccessibilityIfNeeded() {
        for account in sessionAccounts {
            switch read(account: account) {
            case .value(let text):
                set(text, account: account)
            case .notFound, .interactionNotAllowed, .failed:
                break
            }
        }
    }

    /// Mirror web localStorage session keys into Keychain.
    ///
    /// IMPORTANT: `setActiveStudent` / `setActiveTeacher` in `src/lib/session.ts`
    /// always `removeItem` the other role. Clearing the inactive role must NOT
    /// wipe the active role — the old logic did (`remove teacher` → deleted
    /// student + role), so Keychain was empty after login. On background /
    /// WKWebView reload, `restoreScript` then cleared localStorage and the
    /// user looked logged out. Contract covered by `src/lib/sessionNativePersist.test.ts`.
    static func persistWebStorage(key: String, json: String?) {
        let studentKey = "better-math:active"
        let teacherKey = "better-math:active-teacher"
        let roleKey = "better-math:active-role"
        let hasValue = !(json ?? "").isEmpty

        if key == studentKey {
            if hasValue, let json {
                set(json, account: studentKey)
                remove(account: teacherKey)
                set("student", account: roleKey)
            } else {
                remove(account: studentKey)
                if get(account: roleKey) == "student" {
                    remove(account: roleKey)
                }
            }
            return
        }

        if key == teacherKey {
            if hasValue, let json {
                set(json, account: teacherKey)
                remove(account: studentKey)
                set("teacher", account: roleKey)
            } else {
                remove(account: teacherKey)
                if get(account: roleKey) == "teacher" {
                    remove(account: roleKey)
                }
            }
            return
        }

        if key == roleKey {
            if hasValue, let json {
                set(json, account: roleKey)
                if json == "student" {
                    remove(account: teacherKey)
                } else if json == "teacher" {
                    remove(account: studentKey)
                }
            } else {
                remove(account: roleKey)
            }
            return
        }

        if hasValue, let json {
            set(json, account: key)
        } else {
            remove(account: key)
        }
    }

    /// Flush a full snapshot from the web layer (visibility / scenePhase).
    /// Only keys with non-empty values are written; empty strings clear that key.
    static func flushSnapshot(student: String?, teacher: String?, role: String?, lastClass: String?) {
        if let student, !student.isEmpty {
            persistWebStorage(key: "better-math:active", json: student)
        } else if student != nil {
            persistWebStorage(key: "better-math:active", json: nil)
        }
        if let teacher, !teacher.isEmpty {
            persistWebStorage(key: "better-math:active-teacher", json: teacher)
        } else if teacher != nil {
            persistWebStorage(key: "better-math:active-teacher", json: nil)
        }
        if let role, !role.isEmpty {
            persistWebStorage(key: "better-math:active-role", json: role)
        } else if role != nil {
            persistWebStorage(key: "better-math:active-role", json: nil)
        }
        if let lastClass, !lastClass.isEmpty {
            persistWebStorage(key: "better-math:last-class-code", json: lastClass)
        } else if lastClass != nil {
            persistWebStorage(key: "better-math:last-class-code", json: nil)
        }
    }

    private static func jsString(_ value: String?) -> String {
        guard let value else { return "null" }
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
        return "'\(escaped)'"
    }

    private static func positiveString(_ result: ReadResult) -> String? {
        if case .value(let text) = result, !text.isEmpty { return text }
        return nil
    }

    /// Document-start restore. NEVER localStorage.removeItem when Keychain is
    /// nil / locked / failed — only setItem when a stored value exists.
    static func restoreScript() -> String {
        let studentRead = read(account: "better-math:active")
        let teacherRead = read(account: "better-math:active-teacher")
        let roleRead = read(account: "better-math:active-role")
        let lastClassRead = read(account: "better-math:last-class-code")

        var student = positiveString(studentRead)
        var teacher = positiveString(teacherRead)
        var role = positiveString(roleRead)
        let lastClass = positiveString(lastClassRead)

        if student != nil && teacher != nil {
            if role == "teacher" {
                student = nil
            } else {
                teacher = nil
                role = "student"
            }
        }

        return """
        (function() {
          try {
            var student = \(jsString(student));
            var teacher = \(jsString(teacher));
            var role = \(jsString(role));
            var lastClass = \(jsString(lastClass));
            function write(k, v) {
              // Critical: never removeItem when Keychain read was nil/locked.
              if (v) localStorage.setItem(k, v);
            }
            write('better-math:active', student);
            write('better-math:active-teacher', teacher);
            write('better-math:active-role', role);
            write('better-math:last-class-code', lastClass);
          } catch (e) {}
        })();
        """
    }

    /// Push Keychain session into the live page via CustomEvent (defensive restore).
    static func restoreEventScript() -> String {
        let student = positiveString(read(account: "better-math:active"))
        let teacher = positiveString(read(account: "better-math:active-teacher"))
        let role = positiveString(read(account: "better-math:active-role"))
        let lastClass = positiveString(read(account: "better-math:last-class-code"))
        return """
        (function() {
          try {
            window.dispatchEvent(new CustomEvent('mathlift-session-restore', {
              detail: {
                student: \(jsString(student)),
                teacher: \(jsString(teacher)),
                role: \(jsString(role)),
                lastClassCode: \(jsString(lastClass))
              }
            }));
          } catch (e) {}
        })();
        """
    }

    /// Ask the page to post its current localStorage session back to Keychain.
    static let flushFromWebScript = """
    (function() {
      try {
        function val(k) {
          try { return localStorage.getItem(k); } catch (e) { return null; }
        }
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mathlift) {
          window.webkit.messageHandlers.mathlift.postMessage({
            type: 'flushSession',
            student: val('better-math:active'),
            teacher: val('better-math:active-teacher'),
            role: val('better-math:active-role'),
            lastClassCode: val('better-math:last-class-code')
          });
        }
      } catch (e) {}
    })();
    """
}

// MARK: - File protection (Guideline 1.6)

private func protectAppFiles() {
    let urls = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
        + FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        + FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
    for url in urls {
        try? FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.complete],
            ofItemAtPath: url.path
        )
    }
}

final class ConnectivityMonitor: ObservableObject {
    @Published var isOnline = true

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "MathLift.Network")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOnline = path.status == .satisfied
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var connectivity = ConnectivityMonitor()
    @State private var selectedTab: MathLiftTab = .home
    @State private var isLoading = true
    @State private var loadFailed = false
    @State private var reloadToken = 0
    @State private var canGoBack = false
    @State private var keychainRetryToken = 0

    private var showOffline: Bool {
        !connectivity.isOnline || loadFailed
    }

    var body: some View {
        VStack(spacing: 0) {
            nativeHeader

            ZStack {
                MathLiftWebView(
                    selectedTab: selectedTab,
                    reloadToken: reloadToken,
                    isOnline: connectivity.isOnline,
                    keychainRetryToken: keychainRetryToken,
                    onLoadingChange: { loading in
                        isLoading = loading
                        if loading {
                            loadFailed = false
                        }
                    },
                    onLoadFailed: {
                        isLoading = false
                        loadFailed = true
                    },
                    onCanGoBackChange: { canGoBack = $0 }
                )
                .opacity(showOffline ? 0 : 1)

                if isLoading && !showOffline {
                    LoadingScreen()
                }

                if showOffline {
                    OfflineScreen {
                        loadFailed = false
                        isLoading = true
                        reloadToken += 1
                    }
                }
            }

            nativeTabBar
        }
        .background(Color(red: 24 / 255, green: 27 / 255, blue: 46 / 255).ignoresSafeArea())
        .preferredColorScheme(.dark)
        .onAppear {
            protectAppFiles()
            MathLiftKeychain.migrateAccessibilityIfNeeded()
        }
        .onChange(of: scenePhase) { phase in
            switch phase {
            case .background, .inactive:
                NotificationCenter.default.post(name: .mathLiftFlushSession, object: nil)
            case .active:
                MathLiftKeychain.migrateAccessibilityIfNeeded()
                keychainRetryToken += 1
                NotificationCenter.default.post(name: .mathLiftRestoreSession, object: nil)
            @unknown default:
                break
            }
        }
        .onReceive(connectivity.$isOnline.dropFirst()) { online in
            // NWPathMonitor often flips false→true when the app backgrounds /
            // resumes. Reloading the WKWebView on every flap remounts the SPA
            // and (with a broken Keychain mirror) looked like a logout.
            // Only retry when a real load failure left the offline screen up.
            if online, loadFailed {
                loadFailed = false
                isLoading = true
                reloadToken += 1
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .mathLiftSelectTab)) { notification in
            guard let tab = notification.object as? MathLiftTab else { return }
            if selectedTab != tab {
                selectedTab = tab
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .mathLiftWebProcessDied)) { _ in
            loadFailed = false
            isLoading = true
            reloadToken += 1
        }
    }

    private var nativeHeader: some View {
        HStack {
            Button {
                NotificationCenter.default.post(name: .mathLiftGoBack, object: nil)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .opacity(canGoBack ? 1 : 0.35)
            }
            .disabled(!canGoBack)
            .accessibilityLabel("Back")

            Spacer()

            Text("MathLift")
                .font(.headline)

            Spacer()

            Color.clear.frame(width: 22, height: 22)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    private var nativeTabBar: some View {
        HStack(spacing: 0) {
            ForEach(MathLiftTab.allCases) { tab in
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    if selectedTab == tab {
                        // Already highlighted — still send the web view to this
                        // tab so a stale screen (e.g. Home after deleting from
                        // Settings) cannot trap the user on the wrong page.
                        NotificationCenter.default.post(name: .mathLiftOpenTab, object: tab.path)
                    } else {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.systemImage)
                            .font(.system(size: 20))
                        Text(tab.title)
                            .font(.caption2.weight(.semibold))
                    }
                    .foregroundStyle(selectedTab == tab ? Color.accentColor : Color.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
                    .padding(.bottom, 4)
                }
                .accessibilityLabel(tab.title)
            }
        }
        .padding(.bottom, 2)
        .background(.bar)
    }
}

private struct LoadingScreen: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.3)
                .tint(.white)
            Text("Loading MathLift")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white.opacity(0.85))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 24 / 255, green: 27 / 255, blue: 46 / 255))
    }
}

private struct OfflineScreen: View {
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 44, weight: .medium))
                .foregroundStyle(.white.opacity(0.9))
            Text("No Internet Connection")
                .font(.title2.weight(.semibold))
                .multilineTextAlignment(.center)
            Text("MathLift needs a connection to load your class. Check Wi‑Fi or cellular, then try again.")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.75))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
            Button("Try Again", action: onRetry)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 24 / 255, green: 27 / 255, blue: 46 / 255))
    }
}

private struct MathLiftWebView: UIViewRepresentable {
    let selectedTab: MathLiftTab
    let reloadToken: Int
    let isOnline: Bool
    let keychainRetryToken: Int
    let onLoadingChange: (Bool) -> Void
    let onLoadFailed: () -> Void
    let onCanGoBackChange: (Bool) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.userContentController.add(context.coordinator, name: "mathlift")

        let restore = WKUserScript(
            source: MathLiftKeychain.restoreScript() + Self.storageBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(restore)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 24 / 255, green: 27 / 255, blue: 46 / 255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        // Lesson pages handle pinch-to-zoom in-page (Zoomable). Keep a modest
        // WebView zoom as a fallback for short screens like Home.
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 3.0
        webView.scrollView.bouncesZoom = true
        webView.scrollView.pinchGestureRecognizer?.isEnabled = true

        context.coordinator.webView = webView
        context.coordinator.load(path: selectedTab.path, force: true)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.webView = webView
        context.coordinator.apply(
            tab: selectedTab,
            reloadToken: reloadToken,
            isOnline: isOnline,
            keychainRetryToken: keychainRetryToken
        )
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "mathlift")
        NotificationCenter.default.removeObserver(coordinator)
    }

    /// Mirrors localStorage session writes into the iOS Keychain.
    private static let storageBridgeScript = """
    (function() {
      if (window.__mathliftStorageBridged) return;
      window.__mathliftStorageBridged = true;
      var keys = {
        'better-math:active': true,
        'better-math:active-teacher': true,
        'better-math:active-role': true,
        'better-math:last-class-code': true
      };
      var originalSet = localStorage.setItem.bind(localStorage);
      var originalRemove = localStorage.removeItem.bind(localStorage);
      function post(key, value) {
        try {
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mathlift) {
            window.webkit.messageHandlers.mathlift.postMessage({ type: 'storage', key: key, value: value });
          }
        } catch (e) {}
      }
      localStorage.setItem = function(key, value) {
        originalSet(key, value);
        if (keys[key]) post(key, String(value));
      };
      localStorage.removeItem = function(key) {
        originalRemove(key);
        if (keys[key]) post(key, null);
      };
    })();
    """

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: MathLiftWebView
        weak var webView: WKWebView?
        private var lastTabPath: String?
        private var lastReloadToken = -1
        private var lastKeychainRetryToken = -1
        private var hapticEngine: CHHapticEngine?
        private var lockedRetryWorkItem: DispatchWorkItem?

        init(_ parent: MathLiftWebView) {
            self.parent = parent
            super.init()
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(goBack),
                name: .mathLiftGoBack,
                object: nil
            )
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(openTabFromNotification(_:)),
                name: .mathLiftOpenTab,
                object: nil
            )
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(flushSessionFromWeb),
                name: .mathLiftFlushSession,
                object: nil
            )
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(restoreSessionIntoWeb),
                name: .mathLiftRestoreSession,
                object: nil
            )
            prepareHaptics()
        }

        private func prepareHaptics() {
            guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
            hapticEngine = try? CHHapticEngine()
            try? hapticEngine?.start()
        }

        func apply(tab: MathLiftTab, reloadToken: Int, isOnline: Bool, keychainRetryToken: Int) {
            if reloadToken != lastReloadToken {
                lastReloadToken = reloadToken
                lastTabPath = tab.path
                if isOnline {
                    // Refresh document-start restore script before reload.
                    reinjectRestoreScript()
                    load(path: tab.path, force: true)
                }
                return
            }
            if keychainRetryToken != lastKeychainRetryToken {
                lastKeychainRetryToken = keychainRetryToken
                restoreSessionIntoWeb()
            }
            if tab.path != lastTabPath {
                lastTabPath = tab.path
                navigateInApp(to: tab.path)
            }
        }

        private func reinjectRestoreScript() {
            guard let webView else { return }
            let controller = webView.configuration.userContentController
            controller.removeAllUserScripts()
            let restore = WKUserScript(
                source: MathLiftKeychain.restoreScript() + MathLiftWebView.storageBridgeScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            controller.addUserScript(restore)
        }

        /// Hop off the current SwiftUI update so we never set @State from updateUIView.
        private func updateParent(_ work: @escaping (MathLiftWebView) -> Void) {
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                work(self.parent)
            }
        }

        func load(path: String, force: Bool) {
            guard let webView else { return }
            let url = mathLiftRoot.appendingPathComponent(String(path.drop(while: { $0 == "/" })))
            let target = path == "/" ? mathLiftRoot : url
            if !force, webView.url?.host == target.host, webView.isLoading { return }
            updateParent { $0.onLoadingChange(true) }
            // ATS: HTTPS only. Never disable App Transport Security in Info.plist.
            webView.load(URLRequest(url: target, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
        }

        private func navigateInApp(to path: String) {
            guard let webView else { return }
            let escaped = path.replacingOccurrences(of: "'", with: "\\'")
            let js = """
            (function() {
              try {
                window.dispatchEvent(new CustomEvent('mathlift-navigate', { detail: { path: '\(escaped)' } }));
              } catch (e) {}
            })();
            """
            webView.evaluateJavaScript(js) { [weak self] _, error in
                if error != nil {
                    self?.load(path: path, force: true)
                }
            }
        }

        @objc private func goBack() {
            guard let webView else { return }
            if webView.canGoBack {
                webView.goBack()
            } else {
                webView.evaluateJavaScript("history.back()")
            }
        }

        @objc private func openTabFromNotification(_ notification: Notification) {
            guard let path = notification.object as? String else { return }
            lastTabPath = path
            navigateInApp(to: path)
        }

        @objc private func flushSessionFromWeb() {
            webView?.evaluateJavaScript(MathLiftKeychain.flushFromWebScript, completionHandler: nil)
        }

        @objc private func restoreSessionIntoWeb() {
            // If Keychain is still locked, retry shortly instead of wiping.
            let locked = sessionAccountsContainLockedRead()
            if locked {
                scheduleLockedRetry()
                return
            }
            reinjectRestoreScript()
            webView?.evaluateJavaScript(MathLiftKeychain.restoreScript(), completionHandler: nil)
            webView?.evaluateJavaScript(MathLiftKeychain.restoreEventScript(), completionHandler: nil)
        }

        private func sessionAccountsContainLockedRead() -> Bool {
            let accounts = [
                "better-math:active",
                "better-math:active-teacher",
                "better-math:active-role",
                "better-math:last-class-code"
            ]
            return accounts.contains { MathLiftKeychain.read(account: $0) == .interactionNotAllowed }
        }

        private func scheduleLockedRetry() {
            lockedRetryWorkItem?.cancel()
            let work = DispatchWorkItem { [weak self] in
                self?.restoreSessionIntoWeb()
            }
            lockedRetryWorkItem = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.75, execute: work)
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "mathlift" else { return }

            if let body = message.body as? [String: Any], let type = body["type"] as? String {
                switch type {
                case "storage":
                    let key = body["key"] as? String ?? ""
                    let value = body["value"] as? String
                    DispatchQueue.main.async {
                        MathLiftKeychain.persistWebStorage(key: key, json: value)
                    }
                    return
                case "flushSession":
                    DispatchQueue.main.async {
                        MathLiftKeychain.flushSnapshot(
                            student: body["student"] as? String,
                            teacher: body["teacher"] as? String,
                            role: body["role"] as? String,
                            lastClass: body["lastClassCode"] as? String
                        )
                    }
                    return
                case "getSession":
                    DispatchQueue.main.async {
                        self.restoreSessionIntoWeb()
                    }
                    return
                case "selectTab":
                    let path = body["path"] as? String ?? ""
                    guard let tab = MathLiftTab.from(path: path) else { return }
                    DispatchQueue.main.async {
                        self.lastTabPath = tab.path
                        NotificationCenter.default.post(name: .mathLiftSelectTab, object: tab)
                    }
                    return
                case "haptic":
                    let style = (body["style"] as? String) ?? "light"
                    DispatchQueue.main.async {
                        self.playHaptic(style)
                    }
                    return
                case "print":
                    DispatchQueue.main.async {
                        self.presentPrint()
                    }
                    return
                default:
                    return
                }
            }

            if let body = message.body as? String {
                DispatchQueue.main.async {
                    self.playHaptic(body)
                }
            }
        }

        /// Uses the web view's print formatter. Must be tested on a Mac in Xcode.
        private func presentPrint() {
            guard let webView else { return }
            let controller = UIPrintInteractionController.shared
            let formatter = webView.viewPrintFormatter()
            formatter.perPageContentInsets = UIEdgeInsets(top: 24, left: 24, bottom: 24, right: 24)
            controller.printFormatter = formatter
            controller.present(animated: true, completionHandler: nil)
        }

        private func playHaptic(_ style: String) {
            switch style {
            case "success":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                playCoreHaptic(intensity: 0.7, sharpness: 0.4)
            case "error":
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                playCoreHaptic(intensity: 0.35, sharpness: 0.2)
            case "medium":
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                playCoreHaptic(intensity: 0.55, sharpness: 0.5)
            default:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                playCoreHaptic(intensity: 0.3, sharpness: 0.7)
            }
        }

        private func playCoreHaptic(intensity: Float, sharpness: Float) {
            guard CHHapticEngine.capabilitiesForHardware().supportsHaptics,
                  let engine = hapticEngine else { return }
            let event = CHHapticEvent(
                eventType: .hapticTransient,
                parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
                ],
                relativeTime: 0
            )
            if let pattern = try? CHHapticPattern(events: [event], parameters: []),
               let player = try? engine.makePlayer(with: pattern) {
                try? player.start(atTime: 0)
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.scheme == "about" {
                decisionHandler(.allow)
                return
            }
            if url.scheme == "mailto" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            // HTTPS only, same host as the MathLift app (ATS / Guideline 1.6).
            if url.scheme == "https", url.host == mathLiftRoot.host {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            let canGo = webView.canGoBack
            updateParent {
                $0.onLoadingChange(true)
                $0.onCanGoBackChange(canGo)
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            let canGo = webView.canGoBack
            updateParent {
                $0.onLoadingChange(false)
                $0.onCanGoBackChange(canGo)
            }
            // Re-apply Keychain after navigation in case WKWebView storage was empty.
            restoreSessionIntoWeb()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handleFailure(error)
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            handleFailure(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // Process death wipes in-memory JS/localStorage; Keychain is SoT.
            reinjectRestoreScript()
            NotificationCenter.default.post(name: .mathLiftWebProcessDied, object: nil)
        }

        private func handleFailure(_ error: Error) {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
                return
            }
            updateParent { $0.onLoadFailed() }
        }
    }
}

private extension Notification.Name {
    static let mathLiftGoBack = Notification.Name("MathLiftGoBack")
    static let mathLiftOpenTab = Notification.Name("MathLiftOpenTab")
    static let mathLiftSelectTab = Notification.Name("MathLiftSelectTab")
    static let mathLiftFlushSession = Notification.Name("MathLiftFlushSession")
    static let mathLiftRestoreSession = Notification.Name("MathLiftRestoreSession")
    static let mathLiftWebProcessDied = Notification.Name("MathLiftWebProcessDied")
}

#Preview {
    ContentView()
}
