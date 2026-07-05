package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.common.map
import dondeg.app.core.model.TicketDetail
import dondeg.app.core.model.TicketSummary
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.TicketDto
import dondeg.app.core.network.safeApiCall

class TicketsRepository(
    private val api: DondeGoApi,
) {
    suspend fun myTickets(scope: String = "all"): ApiResult<List<TicketSummary>> =
        safeApiCall { api.myTickets(scope = scope) }
            .map { response -> response.items.map(TicketDto::toModel) }

    suspend fun ticket(id: String): ApiResult<TicketDetail> =
        safeApiCall { api.ticket(id) }.map { it.ticket.toModel() }
}
