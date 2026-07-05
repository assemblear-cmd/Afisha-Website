package dondeg.app.feature.scanner

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.ScannerRepository
import dondeg.app.core.designsystem.DondeGoSuccess
import dondeg.app.core.designsystem.formatEventDateTime
import dondeg.app.core.model.ScanOutcome
import dondeg.app.core.model.ScanResult
import dondeg.app.core.model.ScannableEvent
import dondeg.app.core.model.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Staff check-in. The event list and the check-in decision are both
 * server-authorized; this screen submits a token (manual entry or a value
 * pasted from a QR reader) and renders the server's ScanOutcome verbatim.
 * Double-scan protection stays atomic on the backend.
 */
@Composable
fun ScannerScreen(
    repository: ScannerRepository,
    session: SessionUser?,
    onSignIn: () -> Unit,
) {
    if (session == null) {
        SignedOutState(onSignIn = onSignIn)
        return
    }

    val viewModel = viewModel(key = "scanner-${session.id}") { ScannerViewModel(repository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    val selected = state.selectedEvent
    when {
        state.loading -> LoadingState()
        state.loadError != null -> ErrorState(message = state.loadError!!, onRetry = viewModel::load)
        selected != null -> ScanEventView(
            event = selected,
            token = state.token,
            scanning = state.scanning,
            outcome = state.outcome,
            onToken = viewModel::onToken,
            onSubmit = viewModel::submit,
            onScanAgain = viewModel::clearOutcome,
            onBack = viewModel::clearEvent,
        )
        else -> EventPicker(
            events = state.events,
            onSelect = viewModel::selectEvent,
        )
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
            Icons.Outlined.QrCodeScanner,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(48.dp),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.scanner_signed_out_title),
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(R.string.scanner_signed_out_body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onSignIn) { Text(stringResource(R.string.scanner_sign_in)) }
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
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
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
            text = stringResource(R.string.scanner_error_title),
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
        TextButton(onClick = onRetry) { Text(stringResource(R.string.scanner_retry)) }
    }
}

@Composable
private fun EventPicker(
    events: List<ScannableEvent>,
    onSelect: (ScannableEvent) -> Unit,
) {
    if (events.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.scanner_no_events_title),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.scanner_no_events_body),
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
            Column {
                Text(
                    text = stringResource(R.string.scanner_title),
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    text = stringResource(R.string.scanner_pick_event),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        items(events, key = { it.id }) { event ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = event.scannerEnabled) { onSelect(event) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = event.title,
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = formatEventDateTime(event.startsAt)
                            ?: stringResource(R.string.scanner_tba),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (!event.scannerEnabled) {
                        Text(
                            text = stringResource(R.string.scanner_disabled),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ScanEventView(
    event: ScannableEvent,
    token: String,
    scanning: Boolean,
    outcome: ScanOutcome?,
    onToken: (String) -> Unit,
    onSubmit: () -> Unit,
    onScanAgain: () -> Unit,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = stringResource(R.string.scanner_back),
                )
            }
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
        }

        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (outcome != null) {
                ScanResultCard(outcome = outcome)
                OutlinedButton(
                    onClick = onScanAgain,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.scanner_scan_again))
                }
            } else {
                Text(
                    text = stringResource(R.string.scanner_manual_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
                OutlinedTextField(
                    value = token,
                    onValueChange = onToken,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    label = { Text(stringResource(R.string.scanner_manual_hint)) },
                )
                Button(
                    onClick = onSubmit,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !scanning && token.isNotBlank(),
                ) {
                    if (scanning) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(stringResource(R.string.scanner_submit))
                    }
                }
                Text(
                    text = stringResource(R.string.scanner_manual_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ScanResultCard(outcome: ScanOutcome) {
    val tone = when (outcome.result) {
        ScanResult.Valid -> DondeGoSuccess
        ScanResult.AlreadyUsed -> Color(0xFFB26A00)
        else -> MaterialTheme.colorScheme.primary
    }
    Surface(
        color = tone.copy(alpha = 0.12f),
        contentColor = tone,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = outcome.result.name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = outcome.message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            outcome.ticket?.let { ticket ->
                ticket.attendeeName?.let {
                    Text(
                        text = stringResource(R.string.scanner_attendee, it),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Text(
                    text = stringResource(R.string.scanner_ticket_type, ticket.ticketTypeName),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// --- State & ViewModel -------------------------------------------------------

internal data class ScannerUiState(
    val loading: Boolean = true,
    val events: List<ScannableEvent> = emptyList(),
    val loadError: String? = null,
    val selectedEvent: ScannableEvent? = null,
    val token: String = "",
    val scanning: Boolean = false,
    val outcome: ScanOutcome? = null,
)

internal class ScannerViewModel(
    private val repository: ScannerRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ScannerUiState())
    val state: StateFlow<ScannerUiState> = _state

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, loadError = null) }
            when (val result = repository.events()) {
                is ApiResult.Success -> _state.update {
                    it.copy(loading = false, events = result.value)
                }
                is ApiResult.HttpError -> _state.update {
                    it.copy(loading = false, loadError = result.message)
                }
                is ApiResult.NetworkError -> _state.update {
                    it.copy(loading = false, loadError = result.throwable.message.orEmpty())
                }
                is ApiResult.UnknownError -> _state.update {
                    it.copy(loading = false, loadError = result.throwable.message.orEmpty())
                }
            }
        }
    }

    fun selectEvent(event: ScannableEvent) =
        _state.update { it.copy(selectedEvent = event, token = "", outcome = null) }

    fun clearEvent() =
        _state.update { it.copy(selectedEvent = null, token = "", outcome = null) }

    fun onToken(value: String) = _state.update { it.copy(token = value) }

    fun clearOutcome() = _state.update { it.copy(outcome = null, token = "") }

    fun submit() {
        val snapshot = _state.value
        val event = snapshot.selectedEvent ?: return
        if (snapshot.token.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(scanning = true) }
            when (val result = repository.scan(event.id, snapshot.token)) {
                is ApiResult.Success -> _state.update {
                    it.copy(scanning = false, outcome = result.value)
                }
                is ApiResult.HttpError -> _state.update {
                    it.copy(
                        scanning = false,
                        outcome = ScanOutcome(ScanResult.Unknown, result.message, null),
                    )
                }
                is ApiResult.NetworkError -> _state.update {
                    it.copy(
                        scanning = false,
                        outcome = ScanOutcome(
                            ScanResult.Unknown,
                            result.throwable.message.orEmpty(),
                            null,
                        ),
                    )
                }
                is ApiResult.UnknownError -> _state.update {
                    it.copy(
                        scanning = false,
                        outcome = ScanOutcome(
                            ScanResult.Unknown,
                            result.throwable.message.orEmpty(),
                            null,
                        ),
                    )
                }
            }
        }
    }
}
