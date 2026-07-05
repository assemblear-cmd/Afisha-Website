package dondeg.app.core.model

data class TicketTypeInfo(
    val id: String,
    val name: String,
    val description: String?,
    val priceMinor: Long,
    val currency: String,
    val status: String,
    val remaining: Int,
    val perOrderLimit: Int?,
    val onSaleNow: Boolean,
)

data class OrganizerRef(val id: String, val name: String)

data class TheaterRef(val name: String, val slug: String?, val website: String?)

data class EventDetail(
    val id: String,
    val kind: EventKind,
    val title: String,
    val shortDescription: String?,
    val description: String?,
    val categories: List<String>,
    val startsAt: String?,
    val endsAt: String?,
    val venueName: String?,
    val address: String?,
    val city: String?,
    val imageUrl: String?,
    val isFree: Boolean,
    val priceText: String?,
    val priceMinor: Long?,
    val currency: String,
    // Scraped events only: the original source/ticket URL, opened externally.
    // Native events keep this null — their CTA is DondeGO's own checkout.
    val sourceUrl: String?,
    val organizer: OrganizerRef?,
    val theater: TheaterRef?,
    val ticketTypes: List<TicketTypeInfo>,
)
