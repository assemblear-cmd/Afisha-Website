import Foundation

// Thin async URLSession client for the DondeGO API. The base URL comes from
// Info.plist (DondeGoAPIBase), which the build config points at the local dev
// server for Debug and https://dondego.cl/ for Release.

enum APIError: LocalizedError {
    case invalidURL
    case transport(Error)
    case server(status: Int, message: String?)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return String(localized: "Invalid request.")
        case .transport:
            return String(localized: "Network error. Check your connection.")
        case .server(let status, let message):
            if let message, !message.isEmpty { return message }
            return status == 401
                ? String(localized: "Please sign in again.")
                : String(localized: "Something went wrong. Try again.")
        case .decoding:
            return String(localized: "Unexpected server response.")
        }
    }

    var isUnauthorized: Bool {
        if case .server(let status, _) = self { return status == 401 }
        return false
    }
}

private struct ServerErrorBody: Decodable {
    var error: String?
    var message: String?
}

struct APIClient {
    static let shared = APIClient()

    let baseURL: URL = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "DondeGoAPIBase") as? String
        return URL(string: raw ?? "") ?? URL(string: "https://dondego.cl/")!
    }()

    // MARK: - Endpoints

    func feed() async throws -> FeedResponse {
        try await get("api/v1/feed")
    }

    func events(
        page: Int = 1,
        pageSize: Int = 20,
        category: String? = nil,
        query: String? = nil
    ) async throws -> PagedResponse<EventSummary> {
        var items = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "pageSize", value: String(pageSize)),
        ]
        if let category, !category.isEmpty {
            items.append(URLQueryItem(name: "category", value: category))
        }
        if let query, !query.isEmpty {
            items.append(URLQueryItem(name: "query", value: query))
        }
        return try await get("api/v1/events", query: items)
    }

    func eventDetail(kind: EventKind, id: String) async throws -> EventDetailResponse {
        let path = kind == .native ? "api/v1/events/native/\(id)" : "api/v1/events/scraped/\(id)"
        return try await get(path)
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        try await send("POST", "api/v1/auth/login", body: LoginRequest(email: email, password: password))
    }

    func register(name: String, email: String, password: String) async throws -> AuthResponse {
        try await send(
            "POST", "api/v1/auth/register",
            body: RegisterRequest(name: name, email: email, password: password)
        )
    }

    func myLikes() async throws -> LikesResponse {
        try await get("api/v1/me/likes")
    }

    func like(id: String) async throws -> LikeResponse {
        try await send("POST", "api/v1/me/likes", body: LikeRequest(id: id))
    }

    func unlike(id: String) async throws -> LikeResponse {
        try await send("DELETE", "api/v1/me/likes", body: LikeRequest(id: id))
    }

    func myTickets() async throws -> PagedResponse<TicketSummary> {
        try await get("api/v1/me/tickets", query: [
            URLQueryItem(name: "scope", value: "all"),
            URLQueryItem(name: "page", value: "1"),
            URLQueryItem(name: "pageSize", value: "50"),
        ])
    }

    func ticketDetail(id: String) async throws -> TicketDetailResponse {
        try await get("api/v1/me/tickets/\(id)")
    }

    // MARK: - Transport

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await perform(request(method: "GET", path: path, query: query, bodyData: nil))
    }

    private func send<T: Decodable, B: Encodable>(_ method: String, _ path: String, body: B) async throws -> T {
        let data = try JSONEncoder().encode(body)
        return try await perform(request(method: method, path: path, query: [], bodyData: data))
    }

    private func request(method: String, path: String, query: [URLQueryItem], bodyData: Data?) throws -> URLRequest {
        guard var components = URLComponents(
            url: URL(string: path, relativeTo: baseURL) ?? baseURL,
            resolvingAgainstBaseURL: true
        ) else {
            throw APIError.invalidURL
        }
        if !query.isEmpty {
            components.queryItems = query
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token = TokenBox.shared.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let body = try? JSONDecoder().decode(ServerErrorBody.self, from: data)
            throw APIError.server(status: status, message: body?.error ?? body?.message)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

/** Thread-safe holder for the bearer token, shared by APIClient and AppState. */
final class TokenBox {
    static let shared = TokenBox()
    private let lock = NSLock()
    private var value: String?

    var token: String? {
        get {
            lock.lock()
            defer { lock.unlock() }
            return value
        }
        set {
            lock.lock()
            defer { lock.unlock() }
            value = newValue
        }
    }
}
