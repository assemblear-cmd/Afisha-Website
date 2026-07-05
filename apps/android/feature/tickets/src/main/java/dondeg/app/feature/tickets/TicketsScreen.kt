package dondeg.app.feature.tickets

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ConfirmationNumber
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.TicketsRepository
import dondeg.app.core.designsystem.DondeGoSuccess
import dondeg.app.core.designsystem.formatEventDateTime
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.TicketDetail
import dondeg.app.core.model.TicketStatus
import dondeg.app.core.model.TicketSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * "My tickets" list + QR detail. Requires a signed-in session; when logged out
 * it prompts sign-in. The QR payload comes straight from the backend and is
 * only present for scannable tickets.
 */
@Composable
fun TicketsScreen(
    repository: TicketsRepository,
    session: SessionUser?,
    onSignIn: () -> Unit,
) {
    if (session == null) {
        SignedOutState(onSignIn = onSignIn)
        return
    }

    val viewModel = viewModel(key = "tickets-${session.id}") { TicketsViewModel(repository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (val current = state) {
        TicketsUiState.Loading -> LoadingState()
        is TicketsUiState.Error -> ErrorState(message = current.message, onRetry = viewModel::load)
        is TicketsUiState.Content -> {
            val selected = current.selected
            if (selected != null) {
                TicketDetailView(detail = selected, onBack = viewModel::clearSelection)
            } else {
                TicketsList(
                    tickets = current.tickets,
                    onSelect = viewModel::open,
                    loadingDetail = current.loadingDetail,
                )
            }
        }
    }
}

@Composable
private fun SignedOutState(onSignIn: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.ConfirmationNumber,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(48.dp),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.tickets_signed_out_title),
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(R.string.tickets_signed_out_body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onSignIn) {
            Text(stringResource(R.string.tickets_sign_in))
        }
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Text(
                text = stringResource(R.string.tickets_loading),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = stringResource(R.string.tickets_error_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(onClick = onRetry) {
            Text(stringResource(R.string.tickets_retry))
        }
    }
}

@Composable
private fun TicketsList(
    tickets: List<TicketSummary>,
    onSelect: (String) -> Unit,
    loadingDetail: Boolean,
) {
    if (tickets.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.tickets_empty_title),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.tickets_empty_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                text = stringResource(R.string.tickets_title),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.ExtraBold,
            )
        }
        items(tickets, key = { it.id }) { ticket ->
            TicketRow(ticket = ticket, enabled = !loadingDetail, onClick = { onSelect(ticket.id) })
        }
    }
}

@Composable
private fun TicketRow(ticket: TicketSummary, enabled: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = ticket.event.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = formatEventDateTime(ticket.event.startsAt)
                        ?: stringResource(R.string.tickets_tba),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = ticket.ticketTypeName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TicketStatusChip(status = ticket.status)
        }
    }
}

@Composable
private fun TicketStatusChip(status: TicketStatus) {
    val (labelRes, tone) = when (status) {
        TicketStatus.Issued -> R.string.tickets_status_issued to DondeGoSuccess
        TicketStatus.CheckedIn -> R.string.tickets_status_checked_in to MaterialTheme.colorScheme.primary
        TicketStatus.Cancelled -> R.string.tickets_status_cancelled to MaterialTheme.colorScheme.onSurfaceVariant
        TicketStatus.Refunded -> R.string.tickets_status_refunded to MaterialTheme.colorScheme.onSurfaceVariant
        TicketStatus.Expired -> R.string.tickets_status_expired to MaterialTheme.colorScheme.onSurfaceVariant
        TicketStatus.Invalidated -> R.string.tickets_status_invalidated to MaterialTheme.colorScheme.onSurfaceVariant
        TicketStatus.Unknown -> R.string.tickets_status_unknown to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = tone.copy(alpha = 0.14f),
        contentColor = tone,
    ) {
        Text(
            text = stringResource(labelRes),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun TicketDetailView(detail: TicketDetail, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState()),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = stringResource(R.string.tickets_back),
                )
            }
            Text(
                text = stringResource(R.string.tickets_detail_title),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = detail.event.title,
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "${detail.ticketTypeName} · ${formatEventDateTime(detail.event.startsAt) ?: stringResource(R.string.tickets_tba)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            detail.event.venue?.let { venue ->
                Text(
                    text = listOfNotNull(venue, detail.event.address, detail.event.city)
                        .joinToString(", "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            TicketStatusChip(status = detail.status)

            val payload = detail.qrPayload
            if (payload != null) {
                // Generated once per payload; only the server-issued string is encoded.
                val qrBitmap = remember(payload) { encodeQrBitmap(payload).asImageBitmap() }
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Image(
                        bitmap = qrBitmap,
                        contentDescription = null,
                        modifier = Modifier
                            .padding(12.dp)
                            .size(260.dp)
                            .clip(RoundedCornerShape(4.dp)),
                    )
                }
                Text(
                    text = stringResource(R.string.tickets_manual_code, payload),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    text = stringResource(
                        R.string.tickets_qr_disabled,
                        detail.status.name.lowercase(),
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            val checkedInAt = detail.checkedInAt
            if (detail.status == TicketStatus.CheckedIn && checkedInAt != null) {
                Text(
                    text = stringResource(
                        R.string.tickets_checked_in,
                        formatEventDateTime(checkedInAt) ?: checkedInAt,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

// --- State & ViewModel -------------------------------------------------------

private sealed interface TicketsUiState {
    data object Loading : TicketsUiState
    data class Content(
        val tickets: List<TicketSummary>,
        val selected: TicketDetail? = null,
        val loadingDetail: Boolean = false,
    ) : TicketsUiState
    data class Error(val message: String) : TicketsUiState
}

private class TicketsViewModel(
    private val repository: TicketsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<TicketsUiState>(TicketsUiState.Loading)
    val state: StateFlow<TicketsUiState> = _state

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.value = TicketsUiState.Loading
            _state.value = when (val result = repository.myTickets()) {
                is ApiResult.Success -> TicketsUiState.Content(tickets = result.value)
                is ApiResult.HttpError -> TicketsUiState.Error(result.message)
                is ApiResult.NetworkError -> TicketsUiState.Error(result.throwable.message.orEmpty())
                is ApiResult.UnknownError -> TicketsUiState.Error(result.throwable.message.orEmpty())
            }
        }
    }

    fun open(id: String) {
        val content = _state.value as? TicketsUiState.Content ?: return
        _state.value = content.copy(loadingDetail = true)
        viewModelScope.launch {
            when (val result = repository.ticket(id)) {
                is ApiResult.Success -> _state.update {
                    (it as? TicketsUiState.Content)?.copy(selected = result.value, loadingDetail = false) ?: it
                }
                else -> _state.update {
                    (it as? TicketsUiState.Content)?.copy(loadingDetail = false) ?: it
                }
            }
        }
    }

    fun clearSelection() {
        _state.update {
            (it as? TicketsUiState.Content)?.copy(selected = null) ?: it
        }
    }
}
