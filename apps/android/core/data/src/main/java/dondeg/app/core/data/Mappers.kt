package dondeg.app.core.data

import dondeg.app.core.model.CategoryCount
import dondeg.app.core.model.EventDetail
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.EventSummary
import dondeg.app.core.model.OrganizerRef
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.TheaterRef
import dondeg.app.core.model.TicketDetail
import dondeg.app.core.model.TicketEventInfo
import dondeg.app.core.model.TicketStatus
import dondeg.app.core.model.TicketSummary
import dondeg.app.core.model.TicketTypeInfo
import dondeg.app.core.model.UserRole
import dondeg.app.core.network.CategoryDto
import dondeg.app.core.network.EventDetailDto
import dondeg.app.core.network.EventSummaryDto
import dondeg.app.core.network.TicketDetailDto
import dondeg.app.core.network.TicketDto
import dondeg.app.core.network.TicketEventDto
import dondeg.app.core.network.TicketTypeDto
import dondeg.app.core.network.UserDto

// DTO -> domain mapping in one place. Unknown wire values degrade to the
// *Unknown enum members so old app versions survive new server states.

internal fun eventKindFromWire(kind: String): EventKind = when (kind) {
    "scraped" -> EventKind.Scraped
    "native" -> EventKind.Native
    else -> EventKind.Unknown
}

internal fun roleFromWire(role: String): UserRole = when (role) {
    "visitor" -> UserRole.Visitor
    "organizer" -> UserRole.Organizer
    "admin" -> UserRole.Admin
    else -> UserRole.Unknown
}

internal fun ticketStatusFromWire(status: String): TicketStatus = when (status) {
    "ISSUED" -> TicketStatus.Issued
    "CHECKED_IN" -> TicketStatus.CheckedIn
    "CANCELLED" -> TicketStatus.Cancelled
    "REFUNDED" -> TicketStatus.Refunded
    "EXPIRED" -> TicketStatus.Expired
    "INVALIDATED" -> TicketStatus.Invalidated
    else -> TicketStatus.Unknown
}

internal fun UserDto.toModel(): SessionUser =
    SessionUser(id = id, email = email, name = name, role = roleFromWire(role))

internal fun CategoryDto.toModel(): CategoryCount = CategoryCount(slug = slug, count = count)

internal fun EventSummaryDto.toModel(): EventSummary = EventSummary(
    id = id,
    kind = eventKindFromWire(kind),
    title = title,
    startsAt = startsAt,
    venueName = venueName,
    imageUrl = imageUrl,
    categories = categories,
    sourceUrl = sourceUrl,
    minPriceMinor = minPriceMinor ?: scrapedPriceMinor,
    priceText = priceText,
    currency = currency,
)

internal fun TicketTypeDto.toModel(): TicketTypeInfo = TicketTypeInfo(
    id = id,
    name = name,
    description = description,
    priceMinor = priceMinor,
    currency = currency,
    status = status,
    remaining = remaining,
    perOrderLimit = perOrderLimit,
    onSaleNow = onSaleNow,
)

internal fun EventDetailDto.toModel(): EventDetail = EventDetail(
    id = id,
    kind = eventKindFromWire(kind),
    title = title,
    shortDescription = shortDescription,
    description = description,
    categories = categories.ifEmpty { listOfNotNull(category) },
    startsAt = startsAt,
    endsAt = endsAt,
    venueName = venueName,
    address = address,
    city = city,
    imageUrl = imageUrl,
    isFree = isFree,
    priceText = priceText,
    priceMinor = priceMinor,
    currency = currency,
    sourceUrl = sourceUrl,
    organizer = organizer?.let { OrganizerRef(id = it.id, name = it.name) },
    theater = theater?.let { TheaterRef(name = it.name, slug = it.slug, website = it.website) },
    ticketTypes = ticketTypes.map(TicketTypeDto::toModel),
)

internal fun TicketEventDto.toModel(): TicketEventInfo = TicketEventInfo(
    id = id,
    title = title,
    startsAt = startsAt,
    venue = venue,
    address = address,
    city = city,
    imageUrl = imageUrl,
)

internal fun TicketDto.toModel(): TicketSummary = TicketSummary(
    id = id,
    status = ticketStatusFromWire(status),
    checkedInAt = checkedInAt,
    ticketTypeName = ticketTypeName,
    event = event.toModel(),
)

internal fun TicketDetailDto.toModel(): TicketDetail = TicketDetail(
    id = id,
    status = ticketStatusFromWire(status),
    checkedInAt = checkedInAt,
    attendeeName = attendeeName,
    ticketTypeName = ticketTypeName,
    qrPayload = qrPayload,
    event = event.toModel(),
)
