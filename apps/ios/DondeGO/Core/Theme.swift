import SwiftUI

// DondeGO design tokens — mirrors the Android redesign: eggshell background,
// near-black pills, banner blue accents and the burgundy brand color.

enum DG {
    static let eggshell = Color(hex: 0xF2F1EB)
    static let pillBlack = Color(hex: 0x16141A)
    static let bannerBlue = Color(hex: 0x3B47F1)
    static let burgundy = Color(hex: 0x8C1528)
    static let burgundyDark = Color(hex: 0x4A0812)
    static let card = Color.white
    static let textPrimary = Color(hex: 0x16141A)
    static let textSecondary = Color(hex: 0x6E6A5E)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: 1.0
        )
    }
}

// MARK: - Formatting

enum DGFormat {
    static let santiagoTimeZone = TimeZone(identifier: "America/Santiago") ?? .current

    private static let isoWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let displayDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.autoupdatingCurrent
        formatter.timeZone = santiagoTimeZone
        formatter.setLocalizedDateFormatFromTemplate("EEE d MMM HH:mm")
        return formatter
    }()

    static func parseDate(_ isoString: String?) -> Date? {
        guard let isoString, !isoString.isEmpty else { return nil }
        return isoWithFraction.date(from: isoString) ?? iso.date(from: isoString)
    }

    /** "sáb 12 jul 20:00" in the user's locale, Santiago time. */
    static func eventDate(_ isoString: String?) -> String? {
        guard let date = parseDate(isoString) else { return nil }
        return displayDate.string(from: date)
    }

    private static let zeroDecimalCurrencies: Set<String> = ["CLP", "JPY", "KRW", "VND"]

    /** Formats minor units: whole pesos for CLP, cents for USD. */
    static func price(minor: Int64, currency: String) -> String {
        let code = currency.uppercased()
        let isZeroDecimal = zeroDecimalCurrencies.contains(code)
        let amount = isZeroDecimal ? Double(minor) : Double(minor) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = code
        formatter.maximumFractionDigits = isZeroDecimal ? 0 : 2
        formatter.locale = code == "CLP" ? Locale(identifier: "es_CL") : Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "\(code) \(minor)"
    }
}
