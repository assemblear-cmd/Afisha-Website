import SwiftUI
import UIKit
import CoreImage.CIFilterBuiltins

// The Tickets tab: purchased tickets with a QR pass for entry.

enum QRRenderer {
    static func image(from string: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        guard let cgImage = CIContext().createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

@MainActor
final class TicketsViewModel: ObservableObject {
    @Published var tickets: [TicketSummary] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.myTickets()
            tickets = response.items ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct TicketsView: View {
    @EnvironmentObject private var app: AppState
    @StateObject private var model = TicketsViewModel()

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
            .navigationTitle("Tickets")
            .navigationDestination(for: TicketSummary.self) { ticket in
                TicketDetailView(ticketId: ticket.id)
            }
        }
    }

    private var signedOutState: some View {
        VStack(spacing: 12) {
            Image(systemName: "ticket")
                .font(.largeTitle)
                .foregroundStyle(DG.textSecondary)
            Text("Sign in to see your tickets")
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
            LazyVStack(spacing: 10) {
                if model.isLoading && model.tickets.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 60)
                } else if model.tickets.isEmpty {
                    VStack(spacing: 8) {
                        Text("No tickets yet")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(DG.textPrimary)
                        Text("Your tickets appear here after purchase.")
                            .font(.footnote)
                            .foregroundStyle(DG.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
                } else {
                    ForEach(model.tickets) { ticket in
                        NavigationLink(value: ticket) {
                            ticketRow(ticket)
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

    private func ticketRow(_ ticket: TicketSummary) -> some View {
        HStack(spacing: 12) {
            PosterImage(url: ticket.event.imageUrl, size: 64)
            VStack(alignment: .leading, spacing: 3) {
                Text(ticket.event.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DG.textPrimary)
                    .lineLimit(2)
                if let date = DGFormat.eventDate(ticket.event.startsAt) {
                    Text(date)
                        .font(.caption)
                        .foregroundStyle(DG.textSecondary)
                }
                StatusBadge(status: ticket.ticketStatus)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(DG.textSecondary)
        }
        .padding(12)
        .background(DG.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct StatusBadge: View {
    let status: TicketStatus

    private var color: Color {
        switch status {
        case .issued: return DG.bannerBlue
        case .checkedIn: return .green
        case .unknown: return DG.textSecondary
        default: return .red
        }
    }

    var body: some View {
        Text(status.label)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
    }
}

@MainActor
final class TicketDetailViewModel: ObservableObject {
    @Published var ticket: TicketDetail?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load(id: String) async {
        guard ticket == nil, !isLoading else { return }
        isLoading = true
        do {
            ticket = try await APIClient.shared.ticketDetail(id: id).ticket
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct TicketDetailView: View {
    let ticketId: String
    @StateObject private var model = TicketDetailViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let ticket = model.ticket {
                    ticketCard(ticket)
                } else if model.isLoading {
                    ProgressView()
                        .padding(.top, 80)
                } else if let error = model.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(DG.textSecondary)
                        .padding(.top, 80)
                }
            }
            .padding(16)
        }
        .background(DG.eggshell.ignoresSafeArea())
        .navigationTitle("Ticket")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.load(id: ticketId) }
    }

    private func ticketCard(_ ticket: TicketDetail) -> some View {
        VStack(spacing: 14) {
            if let payload = ticket.qrPayload, let qr = QRRenderer.image(from: payload) {
                Image(uiImage: qr)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 230, height: 230)
                    .padding(10)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text("Show this code at the entrance.")
                    .font(.caption)
                    .foregroundStyle(DG.textSecondary)
            }

            StatusBadge(status: ticket.ticketStatus)

            VStack(alignment: .leading, spacing: 8) {
                Text(ticket.event.title)
                    .font(.headline)
                    .foregroundStyle(DG.textPrimary)
                if let typeName = ticket.ticketTypeName, !typeName.isEmpty {
                    detailRow(label: String(localized: "Ticket"), value: typeName)
                }
                if let attendee = ticket.attendeeName, !attendee.isEmpty {
                    detailRow(label: String(localized: "Attendee"), value: attendee)
                }
                if let date = DGFormat.eventDate(ticket.event.startsAt) {
                    detailRow(label: "📅", value: date)
                }
                if let venue = venueLine(ticket.event) {
                    detailRow(label: "📍", value: venue)
                }
                if let checkedIn = DGFormat.eventDate(ticket.checkedInAt) {
                    detailRow(label: String(localized: "Checked in"), value: checkedIn)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(DG.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func venueLine(_ event: TicketEventInfo) -> String? {
        var parts: [String] = []
        if let venue = event.venue, !venue.isEmpty { parts.append(venue) }
        if let address = event.address, !address.isEmpty { parts.append(address) }
        if let city = event.city, !city.isEmpty { parts.append(city) }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(label)
                .font(.footnote)
                .foregroundStyle(DG.textSecondary)
            Spacer()
            Text(value)
                .font(.footnote.weight(.medium))
                .foregroundStyle(DG.textPrimary)
                .multilineTextAlignment(.trailing)
        }
    }
}
