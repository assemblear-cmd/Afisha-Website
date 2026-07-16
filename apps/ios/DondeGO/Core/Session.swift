import Foundation
import Security
import SwiftUI

// Session storage and app-wide auth state. The JWT and user profile live in
// the Keychain (kSecClassGenericPassword, AfterFirstUnlock) — never in
// UserDefaults, logs or backups-readable plists.

enum Keychain {
    private static let service = "cl.dondego.app.session"

    static func save(_ data: Data, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func load(account: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    static func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

private struct StoredSession: Codable {
    let token: String
    let user: User
}

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    @Published private(set) var user: User?
    @Published private(set) var likedKeys: Set<String> = []
    /** Set to present the sign-in sheet from anywhere (e.g. tapping a heart signed out). */
    @Published var showAuthSheet = false
    /** Bumped after sign-in/out so screens can reload user-scoped data. */
    @Published private(set) var sessionVersion = 0

    private static let sessionAccount = "session"

    init() {
        if let data = Keychain.load(account: Self.sessionAccount),
           let stored = try? JSONDecoder().decode(StoredSession.self, from: data) {
            user = stored.user
            TokenBox.shared.token = stored.token
        }
    }

    var isSignedIn: Bool { user != nil }

    // MARK: - Auth

    func signIn(email: String, password: String) async throws {
        let response = try await APIClient.shared.login(email: email, password: password)
        adopt(response)
    }

    func register(name: String, email: String, password: String) async throws {
        let response = try await APIClient.shared.register(name: name, email: email, password: password)
        adopt(response)
    }

    func signOut() {
        Keychain.delete(account: Self.sessionAccount)
        TokenBox.shared.token = nil
        user = nil
        likedKeys = []
        sessionVersion += 1
    }

    private func adopt(_ response: AuthResponse) {
        let user = User(
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: UserRole(wire: response.user.role)
        )
        TokenBox.shared.token = response.token
        if let data = try? JSONEncoder().encode(StoredSession(token: response.token, user: user)) {
            Keychain.save(data, account: Self.sessionAccount)
        }
        self.user = user
        sessionVersion += 1
        Task { await refreshLikes() }
    }

    // MARK: - Likes

    func refreshLikes() async {
        guard isSignedIn else {
            likedKeys = []
            return
        }
        if let response = try? await APIClient.shared.myLikes() {
            likedKeys = Set(response.keys ?? [])
        }
    }

    func isLiked(_ wireId: String) -> Bool {
        likedKeys.contains(wireId)
    }

    /** Optimistic like toggle; reverts on failure. Signed-out taps open auth. */
    func toggleLike(_ wireId: String) async {
        guard isSignedIn else {
            showAuthSheet = true
            return
        }
        let wasLiked = likedKeys.contains(wireId)
        if wasLiked {
            likedKeys.remove(wireId)
        } else {
            likedKeys.insert(wireId)
        }
        do {
            if wasLiked {
                _ = try await APIClient.shared.unlike(id: wireId)
            } else {
                _ = try await APIClient.shared.like(id: wireId)
            }
        } catch {
            if wasLiked {
                likedKeys.insert(wireId)
            } else {
                likedKeys.remove(wireId)
            }
            if let apiError = error as? APIError, apiError.isUnauthorized {
                signOut()
                showAuthSheet = true
            }
        }
    }
}
