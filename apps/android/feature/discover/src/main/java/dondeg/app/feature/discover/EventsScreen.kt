package dondeg.app.feature.discover

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.LikesRepository
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.EventSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Events tab: the user's own organized events on top (tap → the public event
 * page, which offers "enter as organizer"), and liked feed items below.
 */
@Composable
fun EventsScreen(
    likesRepository: LikesRepository,
    likedKeys: Set<String>,
    onToggleLike: (String) -> Unit,
    onOpenEvent: (EventKind, String) -> Unit,
    isSignedIn: Boolean,
    onSignIn: () -> Unit,
) {
    if (!isSignedIn) {
        SignedOutEvents(onSignIn = onSignIn)
        return
    }

    val viewModel = viewModel { EventsViewModel(likesRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        if (state.loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { EventsSectionHeader(stringResource(R.string.events_my_title)) }
                if (state.myEvents.isEmpty()) {
                    item { EventsHint(stringResource(R.string.events_my_empty)) }
                } else {
                    items(state.myEvents, key = { "mine_${it.id}" }) { event ->
                        EventTile(
                            event = event,
                            liked = likedKeys.contains(event.id),
                            onToggleLike = { onToggleLike(event.id) },
                            onClick = { onOpenEvent(event.kind, event.id) },
                        )
                    }
                }

                item { EventsSectionHeader(stringResource(R.string.events_liked_title)) }
                if (state.liked.isEmpty()) {
                    item { EventsHint(stringResource(R.string.events_liked_empty)) }
                } else {
                    items(state.liked, key = { "liked_${it.id}" }) { event ->
                        EventTile(
                            event = event,
                            liked = likedKeys.contains(event.id),
                            onToggleLike = { onToggleLike(event.id) },
                            onClick = { onOpenEvent(event.kind, event.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventsSectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.onBackground,
        fontWeight = FontWeight.Bold,
    )
}

@Composable
private fun EventsHint(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun SignedOutEvents(onSignIn: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.events_signed_out_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = stringResource(R.string.events_signed_out_body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
        )
        Button(onClick = onSignIn) {
            Text(stringResource(R.string.events_sign_in))
        }
    }
}

// --- State & ViewModel -------------------------------------------------------

internal data class EventsUiState(
    val loading: Boolean = true,
    val myEvents: List<EventSummary> = emptyList(),
    val liked: List<EventSummary> = emptyList(),
    val error: String? = null,
)

internal class EventsViewModel(
    private val likesRepository: LikesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(EventsUiState())
    val state: StateFlow<EventsUiState> = _state

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val mine = likesRepository.myEvents()
            val liked = likesRepository.likedEvents()
            _state.update {
                it.copy(
                    loading = false,
                    myEvents = (mine as? ApiResult.Success)?.value ?: emptyList(),
                    liked = (liked as? ApiResult.Success)?.value ?: emptyList(),
                    error = if (mine !is ApiResult.Success && liked !is ApiResult.Success) {
                        it.error ?: "error"
                    } else {
                        null
                    },
                )
            }
        }
    }
}
