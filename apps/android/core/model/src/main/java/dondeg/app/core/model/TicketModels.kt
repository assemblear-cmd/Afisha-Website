package dondeg.app.core.model

// Server-owned status machine; the app renders states and never derives
// validity locally. Unknown absorbs future server states safely.
enum class TicketStatus {
    Issued,
    CheckedIn,
    Cancelled,
    Refunded,
    Expired,
    Invalidated,
    Unknown,
}

data class TicketEventInfo(
    val id: String,
    val title: String,
    val startsAt: String?,
    val venue: String?,
    val address: String?,
    val city: String?,
    val imageUrl: String?,
)

data class TicketSummary(
    val id: String,
    val status: TicketStatus,
    val checkedInAt: String?,
    val ticketTypeName: String,
    val event: TicketEventInfo,
)

data class TicketDetail(
    val id: String,
    val status: TicketStatus,
    val checkedInAt: String?,
    val attendeeName: String?,
    val ticketTypeName: String,
    // "DGO1.<token>" payload rendered as a QR bitmap; null when the server
    // disabled the QR (cancelled/refunded/expired/invalidated tickets).
    val qrPayload: String?,
    val event: TicketEventInfo,
)
