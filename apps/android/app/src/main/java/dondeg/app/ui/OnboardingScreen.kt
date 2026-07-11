package dondeg.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import dondeg.app.R
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.PreferencesRepository
import dondeg.app.core.designsystem.DondeGoPillBlack
import dondeg.app.core.designsystem.categoryLabel
import dondeg.app.core.model.OnboardingOptions
import dondeg.app.core.model.VenueOption
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Which onboarding pages to show: the full 2-question flow or one editor. */
enum class OnboardingMode { Full, Interests, Venues }

private enum class OnboardingStep { Categories, Venues }

/**
 * The two registration questions, Eventbrite-style: (1) which event
 * categories interest you, (2) which venues do you want to follow. Answers
 * are saved on the account and drive personalized feed ordering. Also reused
 * from Account → Interests / Venues as a single-page editor.
 */
@Composable
fun OnboardingScreen(
    repository: PreferencesRepository,
    mode: OnboardingMode,
    onClose: (saved: Boolean) -> Unit,
) {
    val viewModel = viewModel(key = "onboarding-$mode") {
        OnboardingViewModel(repository, mode)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    androidx.compose.runtime.LaunchedEffect(state.closed) {
        if (state.closed) onClose(state.savedAnything)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Top bar: circled back arrow left, Skip right (full flow only).
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 2.dp,
            ) {
                IconButton(onClick = viewModel::back) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = stringResource(R.string.onboarding_back),
                    )
                }
            }
            Spacer(modifier = Modifier.weight(1f))
            if (mode == OnboardingMode.Full) {
                TextButton(onClick = viewModel::skip) {
                    Text(
                        text = stringResource(R.string.onboarding_skip),
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }
        }

        when {
            state.loading -> Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            state.options == null -> Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = state.error ?: stringResource(R.string.onboarding_error),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(onClick = viewModel::load) {
                    Text(stringResource(R.string.onboarding_retry))
                }
            }
            state.step == OnboardingStep.Categories -> CategoriesStep(
                options = state.options!!,
                selected = state.selectedCategories,
                onToggle = viewModel::toggleCategory,
                modifier = Modifier.weight(1f),
            )
            else -> VenuesStep(
                options = state.options!!,
                selected = state.selectedVenues,
                onToggle = viewModel::toggleVenue,
                modifier = Modifier.weight(1f),
            )
        }

        // Bottom pinned Continue pill.
        if (!state.loading && state.options != null) {
            state.error?.let { error ->
                Text(
                    text = error,
                    modifier = Modifier.padding(horizontal = 24.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Button(
                onClick = viewModel::next,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
                    .height(54.dp),
                enabled = !state.saving,
                shape = RoundedCornerShape(27.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DondeGoPillBlack,
                    contentColor = Color.White,
                ),
            ) {
                if (state.saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(
                        text = stringResource(
                            if (mode == OnboardingMode.Full && state.step == OnboardingStep.Categories) {
                                R.string.onboarding_continue
                            } else {
                                R.string.onboarding_save
                            },
                        ),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoriesStep(
    options: OnboardingOptions,
    selected: Set<String>,
    onToggle: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 16.dp),
    ) {
        item {
            OnboardingHeading(
                title = stringResource(R.string.onboarding_categories_title),
                subtitle = stringResource(R.string.onboarding_categories_subtitle),
            )
        }
        item {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                options.categories.forEach { category ->
                    val isSelected = selected.contains(category.slug)
                    SelectablePill(
                        label = categoryLabel(category.slug),
                        selected = isSelected,
                        onClick = { onToggle(category.slug) },
                    )
                }
            }
        }
    }
}

@Composable
private fun VenuesStep(
    options: OnboardingOptions,
    selected: Set<String>,
    onToggle: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            OnboardingHeading(
                title = stringResource(R.string.onboarding_venues_title),
                subtitle = stringResource(R.string.onboarding_venues_subtitle),
            )
            Text(
                text = stringResource(R.string.onboarding_venues_popular),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
        }
        items(options.venues, key = { it.slug }) { venue ->
            VenueRow(
                venue = venue,
                selected = selected.contains(venue.slug),
                onToggle = { onToggle(venue.slug) },
            )
        }
    }
}

@Composable
private fun OnboardingHeading(title: String, subtitle: String) {
    Column(modifier = Modifier.padding(bottom = 20.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.ExtraBold,
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.75f),
        )
    }
}

@Composable
private fun SelectablePill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(22.dp),
        color = if (selected) DondeGoPillBlack else MaterialTheme.colorScheme.surface,
        contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onBackground,
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (selected) DondeGoPillBlack else MaterialTheme.colorScheme.outline,
        ),
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (selected) {
                Icon(
                    imageVector = Icons.Outlined.Check,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun VenueRow(
    venue: VenueOption,
    selected: Boolean,
    onToggle: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Avatar: venue initial on a dark circle, like the reference design's
        // placeholder organizer avatars.
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(DondeGoPillBlack, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = venue.name.trim().take(1).uppercase(),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = venue.name,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = pluralStringResource(
                    R.plurals.onboarding_upcoming_events,
                    venue.upcomingCount,
                    venue.upcomingCount,
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (selected) {
            OutlinedButton(
                onClick = onToggle,
                shape = RoundedCornerShape(22.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.onBackground,
                ),
            ) {
                Text(
                    text = stringResource(R.string.onboarding_following),
                    fontWeight = FontWeight.SemiBold,
                )
            }
        } else {
            Button(
                onClick = onToggle,
                shape = RoundedCornerShape(22.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DondeGoPillBlack,
                    contentColor = Color.White,
                ),
            ) {
                Text(
                    text = stringResource(R.string.onboarding_follow),
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

// --- State & ViewModel -------------------------------------------------------

private data class OnboardingUiState(
    val loading: Boolean = true,
    val options: OnboardingOptions? = null,
    val step: OnboardingStep = OnboardingStep.Categories,
    val selectedCategories: Set<String> = emptySet(),
    val selectedVenues: Set<String> = emptySet(),
    val saving: Boolean = false,
    val error: String? = null,
    val closed: Boolean = false,
    val savedAnything: Boolean = false,
)

private class OnboardingViewModel(
    private val repository: PreferencesRepository,
    private val mode: OnboardingMode,
) : ViewModel() {
    private val _state = MutableStateFlow(
        OnboardingUiState(
            step = if (mode == OnboardingMode.Venues) OnboardingStep.Venues else OnboardingStep.Categories,
        ),
    )
    val state: StateFlow<OnboardingUiState> = _state

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val options = repository.options()
            // Editing from Account starts from the saved answers; a brand-new
            // registration has nothing saved yet (any failure degrades to
            // empty selections instead of blocking the flow).
            val saved = repository.preferences()
            _state.update { current ->
                when (options) {
                    is ApiResult.Success -> {
                        val prefs = (saved as? ApiResult.Success)?.value
                        current.copy(
                            loading = false,
                            options = options.value,
                            selectedCategories = prefs?.categories?.toSet() ?: current.selectedCategories,
                            selectedVenues = prefs?.venues?.toSet() ?: current.selectedVenues,
                        )
                    }
                    else -> current.copy(loading = false, error = errorText(options))
                }
            }
        }
    }

    fun toggleCategory(slug: String) = _state.update {
        it.copy(
            selectedCategories = if (it.selectedCategories.contains(slug)) {
                it.selectedCategories - slug
            } else {
                it.selectedCategories + slug
            },
        )
    }

    fun toggleVenue(slug: String) = _state.update {
        it.copy(
            selectedVenues = if (it.selectedVenues.contains(slug)) {
                it.selectedVenues - slug
            } else {
                it.selectedVenues + slug
            },
        )
    }

    /** Back arrow: step back inside the full flow, close otherwise. */
    fun back() {
        val snapshot = _state.value
        if (mode == OnboardingMode.Full && snapshot.step == OnboardingStep.Venues) {
            _state.update { it.copy(step = OnboardingStep.Categories) }
        } else {
            _state.update { it.copy(closed = true) }
        }
    }

    /** Skip: advance without requiring picks; the last step still saves. */
    fun skip() {
        val snapshot = _state.value
        if (mode == OnboardingMode.Full && snapshot.step == OnboardingStep.Categories) {
            _state.update { it.copy(step = OnboardingStep.Venues) }
        } else {
            // Skipping at the end still persists anything picked earlier.
            save()
        }
    }

    /** Continue/Save: advance in the full flow, persist on the last page. */
    fun next() {
        val snapshot = _state.value
        if (mode == OnboardingMode.Full && snapshot.step == OnboardingStep.Categories) {
            _state.update { it.copy(step = OnboardingStep.Venues) }
        } else {
            save()
        }
    }

    private fun save() {
        val snapshot = _state.value
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            val result = repository.save(
                categories = snapshot.selectedCategories.toList(),
                venues = snapshot.selectedVenues.toList(),
            )
            when (result) {
                is ApiResult.Success -> _state.update {
                    it.copy(saving = false, closed = true, savedAnything = true)
                }
                else -> _state.update { it.copy(saving = false, error = errorText(result)) }
            }
        }
    }

    private fun errorText(result: ApiResult<*>): String = when (result) {
        is ApiResult.HttpError -> result.message
        is ApiResult.NetworkError -> result.throwable.message.orEmpty()
        is ApiResult.UnknownError -> result.throwable.message.orEmpty()
        is ApiResult.Success -> ""
    }
}
