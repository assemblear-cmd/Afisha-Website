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

/** Saved tab: the events the user liked, newest first. */
@Composable
fun SavedScreen(
    likesRepository: LikesRepository,
    likedKeys: Set<String>,
    onToggleLike: (String) -> Unit,
    onOpenEvent: (EventKind, String) -> Unit,
    isSignedIn: Boolean,
    onSignIn: () -> Unit,
) {
    if (!isSignedIn) {
        SignedOutSaved(onSignIn = onSignIn)
        return
    }

    // Keyed by the liked set so un/re-liking elsewhere refreshes this list.
    val viewModel = viewModel(key = "saved-${likedKeys.size}") { SavedViewModel(likesRepository) }
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
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Text(
                        text = stringResource(R.string.saved_title),
                        style = MaterialTheme.typography.headlineLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }
                if (state.liked.isEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.saved_empty),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    items(state.liked, key = { it.id }) { event ->
                        EventRow(
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
private fun SignedOutSaved(onSignIn: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.saved_signed_out_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = stringResource(R.string.saved_signed_out_body),
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

internal data class SavedUiState(
    val loading: Boolean = true,
    val liked: List<EventSummary> = emptyList(),
)

internal class SavedViewModel(
    private val likesRepository: LikesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(SavedUiState())
    val state: StateFlow<SavedUiState> = _state

    init {
        viewModelScope.launch {
            val liked = likesRepository.likedEvents()
            _state.update {
                it.copy(
                    loading = false,
                    liked = (liked as? ApiResult.Success)?.value ?: emptyList(),
                )
            }
        }
    }
}
