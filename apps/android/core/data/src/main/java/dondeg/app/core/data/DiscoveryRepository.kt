package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.common.map
import dondeg.app.core.model.HomeFeed
import dondeg.app.core.network.CategoryDto
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.EventSummaryDto
import dondeg.app.core.network.safeApiCall

class DiscoveryRepository(
    private val api: DondeGoApi,
) {
    suspend fun loadHomeFeed(): ApiResult<HomeFeed> = safeApiCall { api.feed() }.map { response ->
        HomeFeed(
            categories = response.categories.map(CategoryDto::toModel),
            hero = response.hero.map(EventSummaryDto::toModel),
            upcoming = response.upcoming.items.map(EventSummaryDto::toModel),
            total = response.upcoming.total,
            hasMore = response.upcoming.hasMore,
        )
    }
}
