package dondeg.app.core.model

enum class EventKind {
    Scraped,
    Native,
    Unknown,
}

data class CategoryCount(
    val slug: String,
    val count: Int,
)

data class EventPage(
    val items: List<EventSummary>,
    val page: Int,
    val total: Int,
    val hasMore: Boolean,
)

data class EventSummary(
    val id: String,
    val kind: EventKind,
    val title: String,
    val startsAt: String?,
    val venueName: String?,
    val imageUrl: String?,
    val categories: List<String>,
    val sourceUrl: String?,
    val minPriceMinor: Long?,
    val priceText: String?,
    val currency: String,
)

data class HomeFeed(
    val categories: List<CategoryCount>,
    val hero: List<EventSummary>,
    val upcoming: List<EventSummary>,
    val total: Int,
    val hasMore: Boolean,
)
