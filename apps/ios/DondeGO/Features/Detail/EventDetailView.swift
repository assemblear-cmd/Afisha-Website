import SwiftUI

@MainActor
final class EventDetailViewModel: ObservableObject {
    @Published var detail: EventDetail?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load(kind: EventKind, id: String) async {
        guard detail == nil, !isLoading else { return }
        isLoading = true
        errorMessage = nil
        do {
            detail = try await APIClient.shared.eventDetail(kind: kind, id: id).event
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct EventDetailView: View {
    let summary: EventSummary
    @StateObject private var model = EventDetailViewModel()
    @EnvironmentObject private var app: AppState
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero
                content
            }
        }
        .background(DG.eggshell.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task { await app.toggleLike(summary.id) }
                } label: {
                    Image(systemName: app.isLiked(summary.id) ? "heart.fill" : "heart")
                        .foregroundStyle(app.isLiked(summary.id) ? DG.burgundy : DG.textPrimary)
                }
            }
        }
        .task { await model.load(kind: summary.eventKind, id: summary.id) }
    }

    private var hero: some View {
        AsyncImage(url: (model.detail?.imageUrl ?? summary.imageUrl).flatMap(URL.init(string:))) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                LinearGradient(
                    colors: [DG.burgundy, DG.burgundyDark],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .frame(height: 260)
        .frame(maxWidth: .infinity)
        .clipped()
    }

    @ViewBuilder
    private var content: some View {
        let detail = model.detail
        VStack(alignment: .leading, spacing: 16) {
            Text(detail?.title ?? summary.title)
                .font(.title2.weight(.bold))
                .foregroundStyle(DG.textPrimary)

            if let categories = detail?.categoryList, !categories.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(categories, id: \.self) { slug in
                            Text(slug.replacingOccurrences(of: "-", with: " ").capitalizedFirst)
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(DG.card, in: Capsule())
                                .foregroundStyle(DG.textSecondary)
                        }
                    }
                }
            }

            if let date = DGFormat.eventDate(detail?.startsAt ?? summary.startsAt) {
                infoRow(icon: "calendar", text: date)
            }
            if let venueLine {
                infoRow(icon: "mappin.and.ellipse", text: venueLine)
            }
            if let price = priceLine {
                infoRow(icon: "ticket", text: price)
            }

            if let about = detail?.description ?? detail?.shortDescription, !about.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("About")
                        .font(.headline)
                        .foregroundStyle(DG.textPrimary)
                    Text(about)
                        .font(.subheadline)
                        .foregroundStyle(DG.textPrimary.opacity(0.85))
                }
                .padding(.top, 4)
            }

            if let types = detail?.ticketTypes, !types.isEmpty {
                ticketTypesSection(types)
            }

            if model.isLoading && detail == nil {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            }
            if let error = model.errorMessage, detail == nil {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(DG.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            }

            ctaButton
                .padding(.top, 8)
                .padding(.bottom, 32)
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
    }

    private var venueLine: String? {
        let detail = model.detail
        var parts: [String] = []
        if let venue = detail?.venueName ?? summary.venueName, !venue.isEmpty { parts.append(venue) }
        if let address = detail?.address, !address.isEmpty { parts.append(address) }
        if let city = detail?.city, !city.isEmpty { parts.append(city) }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var priceLine: String? {
        if let detail = model.detail {
            if detail.isFree == true { return String(localized: "Free") }
            if let text = detail.priceText, !text.isEmpty { return text }
            if let minor = detail.priceMinor {
                return minor <= 0
                    ? String(localized: "Free")
                    : DGFormat.price(minor: minor, currency: detail.currencyCode)
            }
        }
        return summary.priceLabel
    }

    private func infoRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(DG.textSecondary)
                .frame(width: 20)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(DG.textPrimary)
        }
    }

    private func ticketTypesSection(_ types: [TicketTypeInfo]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tickets")
                .font(.headline)
                .foregroundStyle(DG.textPrimary)
            ForEach(types) { type in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(type.name)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(DG.textPrimary)
                        if let note = availabilityNote(type) {
                            Text(note)
                                .font(.caption)
                                .foregroundStyle(DG.textSecondary)
                        }
                    }
                    Spacer()
                    Text(type.priceLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DG.textPrimary)
                }
                .padding(12)
                .background(DG.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding(.top, 4)
    }

    private func availabilityNote(_ type: TicketTypeInfo) -> String? {
        if let remaining = type.remaining, remaining <= 0 { return String(localized: "Sold out") }
        if type.onSaleNow == false { return String(localized: "Not on sale") }
        return nil
    }

    @ViewBuilder
    private var ctaButton: some View {
        if let url = ctaURL {
            Button {
                openURL(url)
            } label: {
                Text(summary.eventKind == .native ? "Get tickets" : "Open event site")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(DG.pillBlack, in: Capsule())
            }
            .buttonStyle(.plain)
        }
    }

    /** Native events check out on the DondeGO website; scraped events link to
        their source site. In-app web checkout for physical-world event tickets
        is App Store-compliant (guideline 3.1.3(e)). */
    private var ctaURL: URL? {
        if summary.eventKind == .native {
            let rawId = model.detail?.rawId
                ?? summary.id.replacingOccurrences(of: "event_", with: "")
            return URL(string: "events/\(rawId)", relativeTo: APIClient.shared.baseURL)
        }
        let source = model.detail?.sourceUrl ?? summary.sourceUrl
        return source.flatMap(URL.init(string:))
    }
}
