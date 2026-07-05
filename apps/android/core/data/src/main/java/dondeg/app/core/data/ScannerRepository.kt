package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.common.map
import dondeg.app.core.model.ScanOutcome
import dondeg.app.core.model.ScanResult
import dondeg.app.core.model.ScannableEvent
import dondeg.app.core.model.ScannedTicket
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.ScanOutcomeDto
import dondeg.app.core.network.ScanRequest
import dondeg.app.core.network.ScannerEventDto
import dondeg.app.core.network.safeApiCall

/**
 * Scanner data access. Both the event list and the check-in decision are
 * server-owned: `scannerEvents` returns only events the caller may scan, and
 * `scan` posts to the atomic /api/scan pipeline. No validity logic lives here.
 */
class ScannerRepository(
    private val api: DondeGoApi,
) {
    suspend fun events(): ApiResult<List<ScannableEvent>> =
        safeApiCall { api.scannerEvents() }
            .map { response -> response.events.map(ScannerEventDto::toModel) }

    suspend fun scan(eventId: String, value: String): ApiResult<ScanOutcome> =
        safeApiCall { api.scan(ScanRequest(eventId = eventId, value = value.trim())) }
            .map(ScanOutcomeDto::toModel)
}

private fun ScannerEventDto.toModel(): ScannableEvent = ScannableEvent(
    id = id,
    title = title,
    startsAt = startsAt,
    isFree = isFree,
    scannerEnabled = scannerEnabled,
)

private fun scanResultFromWire(result: String): ScanResult = when (result) {
    "VALID" -> ScanResult.Valid
    "ALREADY_USED" -> ScanResult.AlreadyUsed
    "INVALID" -> ScanResult.Invalid
    "CANCELLED" -> ScanResult.Cancelled
    "REFUNDED" -> ScanResult.Refunded
    "EXPIRED" -> ScanResult.Expired
    "EVENT_MISMATCH" -> ScanResult.EventMismatch
    "NO_ACCESS" -> ScanResult.NoAccess
    else -> ScanResult.Unknown
}

private fun ScanOutcomeDto.toModel(): ScanOutcome = ScanOutcome(
    result = scanResultFromWire(result),
    message = message,
    ticket = ticket?.let {
        ScannedTicket(
            id = it.id,
            attendeeName = it.attendeeName,
            ticketTypeName = it.ticketTypeName,
            eventTitle = it.eventTitle,
            checkedInAt = it.checkedInAt,
        )
    },
)
