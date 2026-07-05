package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.common.map
import dondeg.app.core.model.EventDetail
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.EventPage
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.EventSummaryDto
import dondeg.app.core.network.safeApiCall

class EventsRepository(
    private val api: DondeGoApi,
) {
    /**
     * Server-filtered event list. Category filtering happens on the backend
     * so results always agree with the count-driven category strip.
     */
    suspend fun events(
        category: String? = null,
        query: String? = null,
        page: Int = 1,
    ): ApiResult<EventPage> = safeApiCall {
        api.events(
            page = page,
            category = category,
            query = query?.trim()?.takeIf { it.isNotEmpty() },
        )
    }.map { response ->
        EventPage(
            items = response.items.map(EventSummaryDto::toModel),
            page = response.page,
            total = response.total,
            hasMore = response.hasMore,
        )
    }

    suspend fun detail(kind: EventKind, id: String): ApiResult<EventDetail> = safeApiCall {
        when (kind) {
            EventKind.Native -> api.nativeEvent(id)
            else -> api.scrapedEvent(id)
        }
    }.map { it.event.toModel() }
}
