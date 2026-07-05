package dondeg.app.core.model

data class ScannableEvent(
    val id: String,
    val title: String,
    val startsAt: String?,
    val isFree: Boolean,
    val scannerEnabled: Boolean,
)

// Mirrors the backend ScanResult enum. The app renders these verbatim and
// never decides validity locally; Unknown absorbs future server states.
enum class ScanResult {
    Valid,
    AlreadyUsed,
    Invalid,
    Cancelled,
    Refunded,
    Expired,
    EventMismatch,
    NoAccess,
    Unknown,
}

data class ScannedTicket(
    val id: String,
    val attendeeName: String?,
    val ticketTypeName: String,
    val eventTitle: String,
    val checkedInAt: String?,
)

data class ScanOutcome(
    val result: ScanResult,
    val message: String,
    val ticket: ScannedTicket?,
)
