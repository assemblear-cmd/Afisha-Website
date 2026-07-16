import SwiftUI

@MainActor
final class SavedViewModel: ObservableObject {
    @Published var items: [EventSummary] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.myLikes()
            items = response.items ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct SavedView: View {
    @EnvironmentObject private var app: AppState
    @StateObject private var model = SavedViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if !app.isSignedIn {
                    signedOutState
                } else {
                    list
                }
            }
            .background(DG.eggshell.ignoresSafeArea())
            .navigationTitle("Saved")
            .navigationDestination(for: EventSummary.self) { summary in
                EventDetailView(summary: summary)
            }
        }
    }

    private var signedOutState: some View {
        VStack(spacing: 12) {
            Image(systemName: "heart")
                .font(.largeTitle)
                .foregroundStyle(DG.textSecondary)
            Text("Sign in to see your saved events")
                .font(.subheadline)
                .foregroundStyle(DG.textSecondary)
            Button {
                app.showAuthSheet = true
            } label: {
                Text("Sign in")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 12)
                    .background(DG.pillBlack, in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var list: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if model.isLoading && model.items.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 60)
                } else if model.items.isEmpty {
                    VStack(spacing: 8) {
                        Text("No saved events yet")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(DG.textPrimary)
                        Text("Events you like will appear here.")
                            .font(.footnote)
                            .foregroundStyle(DG.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
                } else {
                    ForEach(model.items) { event in
                        NavigationLink(value: event) {
                            EventRow(event: event)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .refreshable { await model.load() }
        .task(id: app.sessionVersion) { await model.load() }
    }
}
