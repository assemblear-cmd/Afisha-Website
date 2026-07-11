package dondeg.app.feature.discover

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.DiscoveryRepository
import dondeg.app.core.data.EventsRepository
import dondeg.app.core.designsystem.DondeGoCoral
import dondeg.app.core.designsystem.DondeGoPillBlack
import dondeg.app.core.designsystem.DondeGoSuccess
import dondeg.app.core.designsystem.categoryLabel
import dondeg.app.core.designsystem.formatEventDateTime
import dondeg.app.core.designsystem.priceLabel
import dondeg.app.core.model.CategoryCount
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.EventSummary
import dondeg.app.core.model.HomeFeed
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Home tab, reference-design style: location chip, pill search field,
 * category chips, and a personalized vertical event list (the server puts
 * followed venues/categories first for signed-in users).
 *
 * `refreshKey` changes on sign-in/out and after onboarding saves, recreating
 * the view model so the feed reloads with the new personalized order.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    discoveryRepository: DiscoveryRepository,
    eventsRepository: EventsRepository,
    likedKeys: Set<String>,
    onToggleLike: (String) -> Unit,
    onOpenEvent: (EventKind, String) -> Unit,
    refreshKey: String = "",
) {
    val viewModel = viewModel(key = "discover-$refreshKey") {
        DiscoverViewModel(discoveryRepository, eventsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        val feed = state.feed
        when {
            state.loading -> LoadingState()
            feed == null -> ErrorState(
                message = state.error ?: stringResource(R.string.discover_error_body),
                onRetry = viewModel::load,
            )
            else -> PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = viewModel::refresh,
            ) {
                DiscoverContent(
                    feed = feed,
                    state = state,
                    likedKeys = likedKeys,
                    onToggleLike = onToggleLike,
                    onQueryChange = viewModel::onQuery,
                    onCategorySelected = viewModel::onCategory,
                    onOpenEvent = onOpenEvent,
                )
            }
        }
    }
}

@Composable
private fun LoadingState() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Text(
                text = stringResource(R.string.discover_loading),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = stringResource(R.string.discover_error),
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
            Text(stringResource(R.string.discover_retry))
        }
    }
}

@Composable
private fun MessageState(title: String, body: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun DiscoverContent(
    feed: HomeFeed,
    state: DiscoverUiState,
    likedKeys: Set<String>,
    onToggleLike: (String) -> Unit,
    onQueryChange: (String) -> Unit,
    onCategorySelected: (String?) -> Unit,
    onOpenEvent: (EventKind, String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            DiscoverHeader(
                query = state.query,
                onQueryChange = onQueryChange,
            )
        }

        item {
            CategoryMenu(
                categories = feed.categories,
                selectedCategory = state.category,
                onCategorySelected = onCategorySelected,
            )
        }

        item {
            SectionHeader(
                title = if (state.category == null) {
                    stringResource(R.string.discover_upcoming_title)
                } else {
                    categoryLabel(state.category)
                },
            )
        }

        when {
            state.filtering -> item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
            state.listingError != null -> item {
                MessageState(
                    title = stringResource(R.string.discover_error),
                    body = state.listingError,
                )
            }
            state.listing.isEmpty() -> item {
                MessageState(
                    title = stringResource(R.string.discover_empty),
                    body = stringResource(R.string.discover_empty_body),
                )
            }
            else -> items(items = state.listing, key = { it.id }) { event ->
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

@Composable
private fun DiscoverHeader(
    query: String,
    onQueryChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Location chip: pin + city + chevron, like the reference design.
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.Place,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = stringResource(R.string.discover_city),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
            )
            Icon(
                imageVector = Icons.Outlined.ExpandMore,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onBackground,
            )
        }

        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(28.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.outline,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            ),
            leadingIcon = {
                Icon(Icons.Outlined.Search, contentDescription = null)
            },
            trailingIcon = {
                Icon(
                    imageVector = Icons.Outlined.Tune,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            placeholder = { Text(stringResource(R.string.discover_search_hint)) },
        )
    }
}

@Composable
private fun CategoryMenu(
    categories: List<CategoryCount>,
    selectedCategory: String?,
    onCategorySelected: (String?) -> Unit,
) {
    // Categories arrive count-ordered from the backend (count desc, taxonomy
    // tie-break) and are rendered in server order — never re-sorted here.
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(end = 8.dp),
    ) {
        item {
            CategoryChip(
                label = stringResource(R.string.discover_all_categories),
                selected = selectedCategory == null,
                onClick = { onCategorySelected(null) },
            )
        }
        items(categories, key = { it.slug }) { category ->
            CategoryChip(
                label = categoryLabel(category.slug),
                selected = selectedCategory == category.slug,
                onClick = {
                    onCategorySelected(
                        if (selectedCategory == category.slug) null else category.slug,
                    )
                },
            )
        }
    }
}

@Composable
private fun CategoryChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (selected) DondeGoPillBlack else MaterialTheme.colorScheme.surface,
        contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onBackground,
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (selected) DondeGoPillBlack else MaterialTheme.colorScheme.outline,
        ),
        onClick = onClick,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.onBackground,
        fontWeight = FontWeight.Bold,
    )
}

/**
 * Reference-design list row: square poster left, then title / date · venue /
 * price, heart on the right. Shared by the home feed, Saved and Your events.
 */
@Composable
internal fun EventRow(
    event: EventSummary,
    liked: Boolean,
    onToggleLike: () -> Unit,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(92.dp)
                .clip(RoundedCornerShape(10.dp)),
        ) {
            EventImage(event = event)
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(top = 2.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = listOfNotNull(
                    formatEventDateTime(event.startsAt) ?: stringResource(R.string.discover_tba),
                    event.venueName ?: stringResource(R.string.discover_unknown_venue),
                ).joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = priceLabel(event.priceText, event.minPriceMinor, event.currency),
                style = MaterialTheme.typography.labelLarge,
                color = if (event.minPriceMinor == 0L) DondeGoSuccess else MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.SemiBold,
            )
        }
        IconButton(onClick = onToggleLike) {
            Icon(
                imageVector = if (liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                contentDescription = stringResource(
                    if (liked) R.string.discover_unlike else R.string.discover_like,
                ),
                tint = if (liked) DondeGoCoral else MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
private fun EventImage(event: EventSummary) {
    if (event.imageUrl != null) {
        AsyncImage(
            model = event.imageUrl,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
    } else {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(placeholderBrush(event.id)),
        )
    }
}

private fun placeholderBrush(seed: String): Brush {
    val palettes = listOf(
        listOf(DondeGoCoral, Color(0xFF2A0E4F)),
        listOf(DondeGoSuccess, Color(0xFF10403B)),
        listOf(Color(0xFF6D5BD0), Color(0xFF241046)),
        listOf(Color(0xFFC1121F), Color(0xFF4A0E1B)),
        listOf(Color(0xFF2D9CDB), Color(0xFF16324F)),
        listOf(Color(0xFFE0517E), Color(0xFF3A1136)),
    )
    val index = seed.fold(0) { acc, char -> (acc * 31 + char.code) and Int.MAX_VALUE } % palettes.size
    return Brush.linearGradient(palettes[index])
}

// --- State & ViewModel -------------------------------------------------------

internal data class DiscoverUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val feed: HomeFeed? = null,
    val listing: List<EventSummary> = emptyList(),
    val listingTotal: Int = 0,
    val filtering: Boolean = false,
    val category: String? = null,
    val query: String = "",
    val error: String? = null,
    val listingError: String? = null,
) {
    val hasFilters: Boolean get() = category != null || query.isNotBlank()
}

internal class DiscoverViewModel(
    private val discoveryRepository: DiscoveryRepository,
    private val eventsRepository: EventsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(DiscoverUiState())
    val state: StateFlow<DiscoverUiState> = _state
    private var filterJob: Job? = null

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = discoveryRepository.loadHomeFeed()) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        loading = false,
                        feed = result.value,
                        listing = result.value.upcoming,
                        listingTotal = result.value.total,
                    )
                }
                else -> _state.update { it.copy(loading = false, error = errorText(result)) }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(refreshing = true) }
            when (val result = discoveryRepository.loadHomeFeed()) {
                is ApiResult.Success -> _state.update {
                    val filtered = it.hasFilters
                    it.copy(
                        refreshing = false,
                        error = null,
                        feed = result.value,
                        listing = if (filtered) it.listing else result.value.upcoming,
                        listingTotal = if (filtered) it.listingTotal else result.value.total,
                    )
                }
                else -> _state.update { it.copy(refreshing = false) }
            }
            if (_state.value.hasFilters) runFilter(debounceMs = 0)
        }
    }

    fun onCategory(slug: String?) {
        _state.update { it.copy(category = slug) }
        runFilter(debounceMs = 0)
    }

    fun onQuery(text: String) {
        _state.update { it.copy(query = text) }
        runFilter(debounceMs = 350)
    }

    /**
     * Server-side filtering keeps results consistent with the count-driven
     * category strip; without filters the first feed page is shown as-is.
     */
    private fun runFilter(debounceMs: Long) {
        filterJob?.cancel()
        filterJob = viewModelScope.launch {
            if (debounceMs > 0) delay(debounceMs)
            val snapshot = _state.value
            if (!snapshot.hasFilters) {
                _state.update {
                    it.copy(
                        filtering = false,
                        listingError = null,
                        listing = it.feed?.upcoming ?: emptyList(),
                        listingTotal = it.feed?.total ?: 0,
                    )
                }
                return@launch
            }
            _state.update { it.copy(filtering = true, listingError = null) }
            val result = eventsRepository.events(
                category = snapshot.category,
                query = snapshot.query,
            )
            when (result) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        filtering = false,
                        listing = result.value.items,
                        listingTotal = result.value.total,
                    )
                }
                else -> _state.update { it.copy(filtering = false, listingError = errorText(result)) }
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
