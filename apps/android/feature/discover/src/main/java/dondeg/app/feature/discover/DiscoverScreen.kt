package dondeg.app.feature.discover

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items as rowItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import dondeg.app.core.designsystem.DondeGoInk
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    discoveryRepository: DiscoveryRepository,
    eventsRepository: EventsRepository,
    likedKeys: Set<String>,
    onToggleLike: (String) -> Unit,
    onOpenEvent: (EventKind, String) -> Unit,
) {
    val viewModel = viewModel {
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
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 164.dp),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            DiscoverHeader(
                query = state.query,
                onQueryChange = onQueryChange,
            )
        }

        item(span = { GridItemSpan(maxLineSpan) }) {
            CategoryMenu(
                categories = feed.categories,
                selectedCategory = state.category,
                total = feed.total,
                onCategorySelected = onCategorySelected,
            )
        }

        if (feed.hero.isNotEmpty() && !state.hasFilters) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                SectionHeader(
                    title = stringResource(R.string.discover_popular_title),
                    body = stringResource(R.string.discover_popular_body),
                )
            }
            item(span = { GridItemSpan(maxLineSpan) }) {
                HeroRail(events = feed.hero.take(7), onOpenEvent = onOpenEvent)
            }
        }

        item(span = { GridItemSpan(maxLineSpan) }) {
            SectionHeader(
                title = stringResource(R.string.discover_upcoming_title),
                body = if (state.category == null) {
                    stringResource(R.string.discover_upcoming_body_all)
                } else {
                    stringResource(
                        R.string.discover_upcoming_body_category,
                        categoryLabel(state.category),
                    )
                },
            )
        }

        when {
            state.filtering -> item(span = { GridItemSpan(maxLineSpan) }) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
            state.listingError != null -> item(span = { GridItemSpan(maxLineSpan) }) {
                MessageState(
                    title = stringResource(R.string.discover_error),
                    body = state.listingError,
                )
            }
            state.listing.isEmpty() -> item(span = { GridItemSpan(maxLineSpan) }) {
                MessageState(
                    title = stringResource(R.string.discover_empty),
                    body = stringResource(R.string.discover_empty_body),
                )
            }
            else -> gridItems(items = state.listing, key = { it.id }) { event ->
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

@Composable
private fun DiscoverHeader(
    query: String,
    onQueryChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            shape = RoundedCornerShape(8.dp),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Outlined.Place,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Text(
                    text = stringResource(R.string.discover_city),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            leadingIcon = {
                Icon(Icons.Outlined.Search, contentDescription = null)
            },
            placeholder = { Text(stringResource(R.string.discover_search_hint)) },
        )
    }
}

@Composable
private fun CategoryMenu(
    categories: List<CategoryCount>,
    selectedCategory: String?,
    total: Int,
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
                count = total,
                selected = selectedCategory == null,
                onClick = { onCategorySelected(null) },
            )
        }
        rowItems(categories, key = { it.slug }) { category ->
            CategoryChip(
                label = categoryLabel(category.slug),
                count = category.count,
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
    count: Int,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                text = "$label $count",
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        leadingIcon = if (selected) {
            {
                Icon(
                    imageVector = Icons.Outlined.Check,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
            }
        } else {
            null
        },
    )
}

@Composable
private fun SectionHeader(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun HeroRail(
    events: List<EventSummary>,
    onOpenEvent: (EventKind, String) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(end = 8.dp),
    ) {
        rowItems(events, key = { it.id }) { event ->
            HeroTile(event = event, onClick = { onOpenEvent(event.kind, event.id) })
        }
    }
}

@Composable
private fun HeroTile(event: EventSummary, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .width(264.dp)
            .aspectRatio(16f / 10f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
    ) {
        EventImage(event = event)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                    ),
                ),
        )
        CategoryBadge(
            label = categoryLabel(event.categories.firstOrNull()),
            light = true,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(10.dp),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = formatEventDateTime(event.startsAt)
                    ?: stringResource(R.string.discover_tba),
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.9f),
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = event.venueName ?: stringResource(R.string.discover_unknown_venue),
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.8f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
internal fun EventTile(
    event: EventSummary,
    liked: Boolean,
    onToggleLike: () -> Unit,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 10f),
        ) {
            EventImage(event = event)
            CategoryBadge(
                label = categoryLabel(event.categories.firstOrNull()),
                light = false,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
            )
            IconButton(
                onClick = onToggleLike,
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                Icon(
                    imageVector = if (liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = stringResource(
                        if (liked) R.string.discover_unlike else R.string.discover_like,
                    ),
                    tint = if (liked) DondeGoCoral else Color.White,
                )
            }
        }
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = formatEventDateTime(event.startsAt)
                    ?: stringResource(R.string.discover_tba),
                style = MaterialTheme.typography.labelMedium,
                color = DondeGoCoral,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = event.venueName ?: stringResource(R.string.discover_unknown_venue),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = priceLabel(event.priceText, event.minPriceMinor, event.currency),
                style = MaterialTheme.typography.labelLarge,
                color = if (event.minPriceMinor == 0L) DondeGoSuccess else MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = if (event.kind == EventKind.Native) {
                    stringResource(R.string.discover_badge_native)
                } else {
                    stringResource(R.string.discover_badge_external)
                },
                style = MaterialTheme.typography.labelSmall,
                color = if (event.kind == EventKind.Native) DondeGoCoral else MaterialTheme.colorScheme.onSurfaceVariant,
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

@Composable
private fun CategoryBadge(
    label: String,
    light: Boolean,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = if (light) Color.White.copy(alpha = 0.92f) else MaterialTheme.colorScheme.primaryContainer,
        contentColor = if (light) DondeGoInk else MaterialTheme.colorScheme.onPrimaryContainer,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
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
