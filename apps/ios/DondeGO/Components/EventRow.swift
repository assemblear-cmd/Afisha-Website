import SwiftUI

/** Poster thumbnail with a burgundy placeholder while loading / on failure. */
struct PosterImage: View {
    let url: String?
    var size: CGFloat = 92

    var body: some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                ZStack {
                    LinearGradient(
                        colors: [DG.burgundy, DG.burgundyDark],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    Image(systemName: "theatermasks")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/** Vertical-list event row: poster left, title, "date · venue", price, heart. */
struct EventRow: View {
    @EnvironmentObject private var app: AppState
    let event: EventSummary

    private var subtitle: String {
        var parts: [String] = []
        if let date = DGFormat.eventDate(event.startsAt) { parts.append(date) }
        if let venue = event.venueName, !venue.isEmpty { parts.append(venue) }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            PosterImage(url: event.imageUrl)
            VStack(alignment: .leading, spacing: 4) {
                Text(event.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DG.textPrimary)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(DG.textSecondary)
                        .lineLimit(2)
                }
                if let price = event.priceLabel {
                    Text(price)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DG.textPrimary)
                }
            }
            Spacer(minLength: 8)
            Button {
                Task { await app.toggleLike(event.id) }
            } label: {
                Image(systemName: app.isLiked(event.id) ? "heart.fill" : "heart")
                    .foregroundStyle(app.isLiked(event.id) ? DG.burgundy : DG.textSecondary)
                    .padding(6)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("Save"))
        }
        .padding(.vertical, 6)
    }
}
