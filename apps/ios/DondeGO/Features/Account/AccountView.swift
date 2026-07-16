import SwiftUI
import UIKit

struct AccountView: View {
    @EnvironmentObject private var app: AppState
    @Environment(\.openURL) private var openURL

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let user = app.user {
                        profileCard(user)
                        settingsCard
                        signOutButton
                    } else {
                        AuthFormView()
                            .padding(.top, 8)
                    }
                    Text("DondeGO \(appVersion)")
                        .font(.caption2)
                        .foregroundStyle(DG.textSecondary)
                        .padding(.top, 12)
                }
                .padding(16)
            }
            .background(DG.eggshell.ignoresSafeArea())
            .navigationTitle("Account")
        }
    }

    private func profileCard(_ user: User) -> some View {
        HStack(spacing: 14) {
            Text(initials(of: user.name))
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(DG.burgundy, in: Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(user.name)
                    .font(.headline)
                    .foregroundStyle(DG.textPrimary)
                Text(user.email)
                    .font(.footnote)
                    .foregroundStyle(DG.textSecondary)
            }
            Spacer()
        }
        .padding(16)
        .background(DG.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var settingsCard: some View {
        VStack(spacing: 0) {
            settingsRow(icon: "globe", title: String(localized: "Language")) {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    openURL(url)
                }
            }
            Divider().padding(.leading, 48)
            settingsRow(icon: "safari", title: String(localized: "Website")) {
                if let url = URL(string: "https://dondego.cl") {
                    openURL(url)
                }
            }
        }
        .background(DG.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func settingsRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.subheadline)
                    .foregroundStyle(DG.textPrimary)
                    .frame(width: 24)
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(DG.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(DG.textSecondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }

    private var signOutButton: some View {
        Button {
            app.signOut()
        } label: {
            Text("Sign out")
                .font(.body.weight(.semibold))
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(DG.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func initials(of name: String) -> String {
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first.map(String.init) }
        return letters.isEmpty ? "?" : letters.joined().uppercased()
    }
}
