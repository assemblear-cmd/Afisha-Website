package dondeg.app.feature.eventdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.EventsRepository
import dondeg.app.core.designsystem.DondeGoCoral
import dondeg.app.core.designsystem.DondeGoSuccess
import dondeg.app.core.designsystem.categoryLabel
import dondeg.app.core.designsystem.formatEventDateTime
import dondeg.app.core.designsystem.formatMoney
import dondeg.app.core.designsystem.priceLabel
import dondeg.app.core.model.EventDetail
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.TicketTypeInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Detail for both event kinds. Native events lead to DondeGO's own checkout
 * (web for now — in-app PaymentSheet is the next phase); scraped events lead
 * to the original source URL. Scraped events never enter DondeGO checkout.
 */
@Composable
fun EventDetailScreen(
    kind: EventKind,
    id: String,
    repository: EventsRepository,
    currentUserId: String?,
    nativeWebUrl: (String) -> String,
    onOpenExternal: (String) -> Unit,
    onOpenOrganizer: (String) -> Unit,
    onBack: () -> Unit,
) {
    val viewModel = viewModel(key = "$kind/$id") {
        EventDetailViewModel(repository, kind, id)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = stringResource(R.string.event_detail_back),
                )
            }
            Text(
                text = stringResource(R.string.event_detail_title),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }

        when (val current = state) {
            EventDetailUiState.Loading -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    Text(
                        text = stringResource(R.string.event_detail_loading),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            is EventDetailUiState.Error -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = stringResource(R.string.event_detail_error),
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = current.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(onClick = viewModel::load) {
                    Text(stringResource(R.string.event_detail_retry))
                }
            }
            is EventDetailUiState.Content -> DetailContent(
                detail = current.detail,
                currentUserId = currentUserId,
                nativeWebUrl = nativeWebUrl,
                onOpenExternal = onOpenExternal,
                onOpenOrganizer = onOpenOrganizer,
            )
        }
    }
}

@Composable
private fun DetailContent(
    detail: EventDetail,
    currentUserId: String?,
    nativeWebUrl: (String) -> String,
    onOpenExternal: (String) -> Unit,
    onOpenOrganizer: (String) -> Unit,
) {
    val isOwner = detail.kind == EventKind.Native &&
        currentUserId != null &&
        detail.organizer?.id == currentUserId
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f),
        ) {
            if (detail.imageUrl != null) {
                AsyncImage(
                    model = detail.imageUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(listOf(DondeGoCoral, Color(0xFF2A0E4F))),
                        ),
                )
            }
        }

        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                detail.categories.take(3).forEach { slug ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ) {
                        Text(
                            text = categoryLabel(slug),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                if (detail.isFree) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = DondeGoSuccess.copy(alpha = 0.15f),
                        contentColor = DondeGoSuccess,
                    ) {
                        Text(
                            text = stringResource(R.string.event_detail_free_badge),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            Text(
                text = detail.title,
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.ExtraBold,
            )

            InfoRow(
                icon = { Icon(Icons.Outlined.CalendarToday, contentDescription = null, modifier = Modifier.size(18.dp)) },
                text = formatEventDateTime(detail.startsAt)
                    ?: stringResource(R.string.event_detail_tba),
            )
            InfoRow(
                icon = { Icon(Icons.Outlined.Place, contentDescription = null, modifier = Modifier.size(18.dp)) },
                text = listOfNotNull(
                    detail.venueName ?: stringResource(R.string.event_detail_venue_tba),
                    detail.address,
                    detail.city,
                ).joinToString(", "),
            )

            Text(
                text = priceLabel(detail.priceText, detail.priceMinor, detail.currency),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )

            detail.organizer?.let { organizer ->
                Text(
                    text = stringResource(R.string.event_detail_organizer_label, organizer.name),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (isOwner) {
                Button(
                    onClick = { onOpenOrganizer(detail.id.removePrefix("event_")) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.event_detail_enter_organizer))
                }
            }

            if (detail.kind == EventKind.Native) {
                NativeTicketsSection(
                    detail = detail,
                    nativeWebUrl = nativeWebUrl,
                    onOpenExternal = onOpenExternal,
                )
            } else {
                ScrapedSourceSection(detail = detail, onOpenExternal = onOpenExternal)
            }

            val about = detail.description ?: detail.shortDescription
            if (!about.isNullOrBlank()) {
                Text(
                    text = stringResource(R.string.event_detail_about),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = about,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun NativeTicketsSection(
    detail: EventDetail,
    nativeWebUrl: (String) -> String,
    onOpenExternal: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (detail.ticketTypes.isNotEmpty()) {
            Text(
                text = stringResource(R.string.event_detail_tickets),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
            detail.ticketTypes.forEach { ticketType ->
                TicketTypeRow(ticketType = ticketType)
            }
        }
        Button(
            onClick = {
                // Web checkout preserves every backend rule (order → Stripe →
                // webhook = payment truth). Native PaymentSheet is next phase.
                val rawId = detail.id.removePrefix("event_")
                onOpenExternal(nativeWebUrl("/events/$rawId"))
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.event_detail_buy_dondego))
        }
        Text(
            text = stringResource(R.string.event_detail_buy_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun TicketTypeRow(ticketType: TicketTypeInfo) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = ticketType.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = when {
                        ticketType.remaining <= 0 -> stringResource(R.string.event_detail_sold_out)
                        !ticketType.onSaleNow -> stringResource(R.string.event_detail_not_on_sale)
                        else -> stringResource(R.string.event_detail_remaining, ticketType.remaining)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (ticketType.onSaleNow && ticketType.remaining > 0) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        DondeGoCoral
                    },
                )
            }
            Text(
                text = if (ticketType.priceMinor <= 0L) {
                    stringResource(dondeg.app.core.designsystem.R.string.ds_price_free)
                } else {
                    formatMoney(ticketType.priceMinor, ticketType.currency)
                },
                style = MaterialTheme.typography.titleSmall,
                color = if (ticketType.priceMinor <= 0L) DondeGoSuccess else MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun ScrapedSourceSection(
    detail: EventDetail,
    onOpenExternal: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        detail.theater?.let { theater ->
            Text(
                text = "${stringResource(R.string.event_detail_source_label)}: ${theater.name}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        val sourceUrl = detail.sourceUrl
        if (sourceUrl != null) {
            Button(
                onClick = { onOpenExternal(sourceUrl) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.OpenInNew,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(modifier = Modifier.size(8.dp))
                Text(stringResource(R.string.event_detail_open_source))
            }
        }
        Text(
            text = stringResource(R.string.event_detail_source_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun InfoRow(icon: @Composable () -> Unit, text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            shape = RoundedCornerShape(6.dp),
        ) {
            Box(modifier = Modifier.padding(6.dp)) { icon() }
        }
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

// --- State & ViewModel -------------------------------------------------------

private sealed interface EventDetailUiState {
    data object Loading : EventDetailUiState
    data class Content(val detail: EventDetail) : EventDetailUiState
    data class Error(val message: String) : EventDetailUiState
}

private class EventDetailViewModel(
    private val repository: EventsRepository,
    private val kind: EventKind,
    private val id: String,
) : ViewModel() {
    private val _state = MutableStateFlow<EventDetailUiState>(EventDetailUiState.Loading)
    val state: StateFlow<EventDetailUiState> = _state

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.value = EventDetailUiState.Loading
            _state.value = when (val result = repository.detail(kind, id)) {
                is ApiResult.Success -> EventDetailUiState.Content(result.value)
                is ApiResult.HttpError -> EventDetailUiState.Error(result.message)
                is ApiResult.NetworkError -> EventDetailUiState.Error(result.throwable.message.orEmpty())
                is ApiResult.UnknownError -> EventDetailUiState.Error(result.throwable.message.orEmpty())
            }
        }
    }
}
