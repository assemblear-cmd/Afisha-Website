import Foundation

// Wire models for the DondeGO mobile API (/api/v1). Field names mirror the
// server JSON one-to-one; everything the server may omit is optional so a
// contract drift degrades gracefully instead of failing the whole decode.

enum EventKind: String {
    case native
    case scraped
    case unknown

    init(wire: String) {
        self = EventKind(rawValue: wire) ?? .unknown
    }
}

struct PagedResponse<T: Decodable>: Decodable {
    var items: [T]?
    var page: Int?
    var pageSize: Int?
    var total: Int?
    var hasMore: Bool?
}

struct CategoryCount: Decodable, Hashable, Identifiable {
    let slug: String
    let count: Int
    var id: String { slug }

    /** "musica-conciertos" → "Musica conciertos" for chip labels. */
    var label: String {
        slug.replacingOccurrences(of: "-", with: " ").capitalizedFirst
    }
}

struct FeedResponse: Decodable {
    var categories: [CategoryCount]?
    var hero: [EventSummary]?
    var upcoming: PagedResponse<EventSummary>?
}

struct EventSummary: Decodable, Identifiable, Hashable {
    let id: String
    let kind: String
    let title: String
    var startsAt: String?
    var venueName: String?
    var imageUrl: String?
    var categories: [String]?
    var sourceUrl: String?
    var priceText: String?
    var priceMinor: Int64?
    var minPriceMinor: Int64?
    var currency: String?

    var eventKind: EventKind { EventKind(wire: kind) }
    var currencyCode: String { currency ?? "CLP" }
    var effectiveMinPriceMinor: Int64? { minPriceMinor ?? priceMinor }

    var priceLabel: String? {
        if let text = priceText, !text.isEmpty { return text }
        guard let minor = effectiveMinPriceMinor else { return nil }
        if minor <= 0 { return String(localized: "Free") }
        return DGFormat.price(minor: minor, currency: currencyCode)
    }
}

struct EventDetailResponse: Decodable {
    let event: EventDetail
}

struct EventDetail: Decodable {
    let id: String
    let kind: String
    let title: String
    var shortDescription: String?
    var description: String?
    var category: String?
    var categories: [String]?
    var startsAt: String?
    var endsAt: String?
    var venueName: String?
    var address: String?
    var city: String?
    var imageUrl: String?
    var isFree: Bool?
    var priceText: String?
    var priceMinor: Int64?
    var currency: String?
    var sourceUrl: String?
    var organizer: OrganizerRef?
    var theater: TheaterRef?
    var ticketTypes: [TicketTypeInfo]?

    var eventKind: EventKind { EventKind(wire: kind) }
    var currencyCode: String { currency ?? "CLP" }
    /** Database id without the wire prefix, used for web links. */
    var rawId: String {
        for prefix in ["event_", "show_"] where id.hasPrefix(prefix) {
            return String(id.dropFirst(prefix.count))
        }
        return id
    }
    var categoryList: [String] {
        if let categories, !categories.isEmpty { return categories }
        if let category { return [category] }
        return []
    }
}

struct OrganizerRef: Decodable {
    let id: String
    let name: String
}

struct TheaterRef: Decodable {
    let name: String
    var slug: String?
    var website: String?
}

struct TicketTypeInfo: Decodable, Identifiable {
    let id: String
    let name: String
    var description: String?
    var priceMinor: Int64?
    var currency: String?
    var status: String?
    var remaining: Int?
    var perOrderLimit: Int?
    var salesStartAt: String?
    var salesEndAt: String?
    var onSaleNow: Bool?

    var priceLabel: String {
        let minor = priceMinor ?? 0
        if minor <= 0 { return String(localized: "Free") }
        return DGFormat.price(minor: minor, currency: currency ?? "CLP")
    }
}

// MARK: - Auth

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct RegisterRequest: Encodable {
    let name: String
    let email: String
    let password: String
    var role: String = "visitor"
}

struct UserDTO: Decodable {
    let id: String
    let email: String
    let name: String
    var role: String?
}

struct AuthResponse: Decodable {
    let token: String
    let user: UserDTO
}

struct MeResponse: Decodable {
    var user: UserDTO?
}

enum UserRole: String, Codable {
    case visitor
    case organizer
    case admin
    case unknown

    init(wire: String?) {
        self = wire.flatMap(UserRole.init(rawValue:)) ?? .unknown
    }
}

struct User: Codable, Equatable {
    let id: String
    let email: String
    let name: String
    let role: UserRole
}

// MARK: - Likes

struct LikesResponse: Decodable {
    var items: [EventSummary]?
    var keys: [String]?
}

struct LikeRequest: Encodable {
    let id: String
}

struct LikeResponse: Decodable {
    var ok: Bool?
    var liked: Bool?
}

struct EventListResponse: Decodable {
    var items: [EventSummary]?
}

// MARK: - Tickets

enum TicketStatus: String {
    case issued = "ISSUED"
    case checkedIn = "CHECKED_IN"
    case cancelled = "CANCELLED"
    case refunded = "REFUNDED"
    case expired = "EXPIRED"
    case invalidated = "INVALIDATED"
    case unknown

    init(wire: String) {
        self = TicketStatus(rawValue: wire) ?? .unknown
    }

    var label: String {
        switch self {
        case .issued: return String(localized: "Issued")
        case .checkedIn: return String(localized: "Checked in")
        case .cancelled: return String(localized: "Cancelled")
        case .refunded: return String(localized: "Refunded")
        case .expired: return String(localized: "Expired")
        case .invalidated: return String(localized: "Invalid")
        case .unknown: return "—"
        }
    }
}

struct TicketEventInfo: Decodable, Hashable {
    let id: String
    let title: String
    var startsAt: String?
    var venue: String?
    var address: String?
    var city: String?
    var imageUrl: String?
}

struct TicketSummary: Decodable, Identifiable, Hashable {
    let id: String
    let status: String
    var checkedInAt: String?
    var ticketTypeName: String?
    let event: TicketEventInfo

    var ticketStatus: TicketStatus { TicketStatus(wire: status) }
}

struct TicketDetailResponse: Decodable {
    let ticket: TicketDetail
}

struct TicketDetail: Decodable {
    let id: String
    let status: String
    var checkedInAt: String?
    var attendeeName: String?
    var ticketTypeName: String?
    var qrPayload: String?
    let event: TicketEventInfo

    var ticketStatus: TicketStatus { TicketStatus(wire: status) }
}

// MARK: - Helpers

extension String {
    var capitalizedFirst: String {
        guard let first = first else { return self }
        return String(first).uppercased() + dropFirst()
    }
}
