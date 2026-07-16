import SwiftUI

/** Sign-in / registration form shared by the auth sheet and the Account tab. */
struct AuthFormView: View {
    @EnvironmentObject private var app: AppState
    var onAuthenticated: () -> Void = {}

    @State private var isRegister = false
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    private var canSubmit: Bool {
        let emailOk = email.contains("@") && email.contains(".")
        let passwordOk = password.count >= 6
        let nameOk = !isRegister || !name.trimmingCharacters(in: .whitespaces).isEmpty
        return emailOk && passwordOk && nameOk && !isSubmitting
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Picker("", selection: $isRegister) {
                Text("Sign in").tag(false)
                Text("Create account").tag(true)
            }
            .pickerStyle(.segmented)

            if isRegister {
                TextField("Name", text: $name)
                    .textContentType(.name)
                    .fieldStyle()
            }
            TextField("Email", text: $email)
                .keyboardType(.emailAddress)
                .textContentType(.username)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .fieldStyle()
            SecureField("Password", text: $password)
                .textContentType(isRegister ? .newPassword : .password)
                .fieldStyle()

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button {
                submit()
            } label: {
                Group {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text(isRegister ? "Create account" : "Sign in")
                            .font(.body.weight(.semibold))
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(canSubmit ? DG.pillBlack : DG.pillBlack.opacity(0.4), in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(!canSubmit)
        }
    }

    private func submit() {
        errorMessage = nil
        isSubmitting = true
        Task {
            do {
                if isRegister {
                    try await app.register(
                        name: name.trimmingCharacters(in: .whitespaces),
                        email: email.trimmingCharacters(in: .whitespaces),
                        password: password
                    )
                } else {
                    try await app.signIn(
                        email: email.trimmingCharacters(in: .whitespaces),
                        password: password
                    )
                }
                isSubmitting = false
                onAuthenticated()
            } catch {
                isSubmitting = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct AuthSheetView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                AuthFormView(onAuthenticated: { dismiss() })
                    .padding(16)
            }
            .background(DG.eggshell.ignoresSafeArea())
            .navigationTitle("DondeGO")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

private extension View {
    func fieldStyle() -> some View {
        self
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(DG.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
