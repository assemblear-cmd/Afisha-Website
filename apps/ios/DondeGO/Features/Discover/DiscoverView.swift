import SwiftUI

@MainActor
final class DiscoverViewModel: ObservableObject {
    @Published var categories: [CategoryCount] = []
    @Published var events: [EventSummary] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var selectedCategory: String?
    @Published var searchText = ""

    private var page = 1
    private var hasMore = false
    private var loadedOnce = false

    private var searchQueryOrNil: String? {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    func loadInitialIfNeeded() async {
        guard !loadedOnce else { return }
        loadedOnce = true
        if let feed = try? await APIClient.shared.feed() {
            categories = feed.categories ?? []
        }
        await reloadEvents()
    }

    func reloadEvents() async {
        isLoading = true
        errorMessage = nil
        do {
            let paged = try await APIClient.shared.events(
                page: 1,
                category: selectedCategory,
                query: searchQueryOrNil
            )
            events = paged.items ?? []
            page = 1
            hasMore = paged.hasMore ?? false
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadMoreIfNeeded(after event: EventSummary) async {
        guard hasMore, !isLoadingMore, event.id == events.last?.id else { return }
        isLoadingMore = true
        if let paged = try? await APIClient.shared.events(
            page: page + 1,
            category: selectedCategory,
            query: searchQueryOrNil
        ) {
            page += 1
            events += paged.items ?? []
            hasMore = paged.hasMore ?? false
        }
        isLoadingMore = false
    }

    func select(category: String?) async {
        selectedCategory = category
        await reloadEvents()
    }
}

struct DiscoverView: View {
    @StateObject private var model = DiscoverViewModel()
    @FocusState private var searchFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    header
                    searchPill
                    categoryChips
                    listSection
                }
                .padding(.horizontal, 16)
            }
            .background(DG.eggshell.ignoresSafeArea())
            .navigationDestination(for: EventSummary.self) { summary in
                EventDetailView(summary: summary)
            }
            .task { await model.loadInitialIfNeeded() }
            .refreshable { await model.reloadEvents() }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        HStack {
            HStack(spacing: 6) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.footnote)
                Text("Santiago")
                    .font(.footnote.weight(.semibold))
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(DG.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(DG.card, in: Capsule())
            Spacer()
        }
        .padding(.top, 8)
    }

    private var searchPill: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(DG.textSecondary)
            TextField("Find things to do", text: $model.searchText)
                .focused($searchFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
                .onSubmit {
                    Task { await model.reloadEvents() }
                }
            if !model.searchText.isEmpty {
                Button {
                    model.searchText = ""
                    searchFocused = false
                    Task { await model.reloadEvents() }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(DG.textSecondary)
                }
                .buttonStyle(.plain)
            }
            Image(systemName: "slider.horizontal.3")
                .foregroundStyle(DG.textPrimary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(DG.card, in: Capsule())
        .padding(.top, 14)
    }

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip(slug: nil, label: String(localized: "All"))
                ForEach(model.categories) { category in
                    chip(slug: category.slug, label: category.label)
                }
            }
            .padding(.vertical, 2)
        }
        .padding(.top, 14)
    }

    private func chip(slug: String?, label: String) -> some View {
        let isSelected = model.selectedCategory == slug
        return Button {
            Task { await model.select(category: slug) }
        } label: {
            Text(label)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? DG.pillBlack : DG.card, in: Capsule())
                .foregroundStyle(isSelected ? .white : DG.textPrimary)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var listSection: some View {
        if model.isLoading && model.events.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.top, 60)
        } else if let error = model.errorMessage, model.events.isEmpty {
            VStack(spacing: 12) {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(DG.textSecondary)
                    .multilineTextAlignment(.center)
                Button("Retry") {
                    Task { await model.reloadEvents() }
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(DG.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 60)
        } else {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(model.events) { event in
                    NavigationLink(value: event) {
                        EventRow(event: event)
                    }
                    .buttonStyle(.plain)
                    .task { await model.loadMoreIfNeeded(after: event) }
                }
                if model.isLoadingMore {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
            }
            .padding(.top, 10)
        }
    }
}
