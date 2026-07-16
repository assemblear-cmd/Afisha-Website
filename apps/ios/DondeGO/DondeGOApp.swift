import SwiftUI

@main
struct DondeGOApp: App {
    @StateObject private var app = AppState.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(app)
                .task { await app.refreshLikes() }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var app: AppState

    var body: some View {
        TabView {
            DiscoverView()
                .tabItem { Label("Discover", systemImage: "magnifyingglass") }
            SavedView()
                .tabItem { Label("Saved", systemImage: "heart") }
            TicketsView()
                .tabItem { Label("Tickets", systemImage: "ticket") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
        .tint(DG.pillBlack)
        .sheet(isPresented: $app.showAuthSheet) {
            AuthSheetView()
        }
    }
}
