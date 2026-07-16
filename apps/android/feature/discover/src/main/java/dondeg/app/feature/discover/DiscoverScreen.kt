package dondeg.app.feature.discover

import androidx.compose.foundation.Canvas
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
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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
    requestedQuery: String = "",
    queryRequestVersion: Int = 0,
) {
    val viewModel = viewModel {
        DiscoverViewModel(discoveryRepository, eventsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(queryRequestVersion) {
        if (queryRequestVersion > 0) {
            viewModel.onQuery(requestedQuery)
        }
    }

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
                    onOpenEvent = onOpenEvent,
                    onSelectCategory = viewModel::onCategory,
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
    onOpenEvent: (EventKind, String) -> Unit,
    onSelectCategory: (String?) -> Unit,
) {
    val heroEvents = remember(feed.hero, state.listing) {
        uniquePrimaryCategoryFirst(feed.hero.ifEmpty { state.listing }).take(7)
    }
    val listing = remember(state.listing, state.hasFilters) {
        if (state.hasFilters) state.listing else uniquePrimaryCategoryFirst(state.listing)
    }
    val categorySlugs = remember(feed.categories, state.listing) {
        visibleCategorySlugs(feed, state.listing)
    }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 164.dp),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (heroEvents.isNotEmpty() && !state.hasFilters) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                HeroRail(events = heroEvents, onOpenEvent = onOpenEvent)
            }
        }

        item(span = { GridItemSpan(maxLineSpan) }) {
            CategoryLogoRail(
                slugs = categorySlugs,
                selectedSlug = state.category,
                onSelectCategory = onSelectCategory,
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
            else -> gridItems(items = listing, key = { it.id }) { event ->
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
private fun CategoryLogoRail(
    slugs: List<String>,
    selectedSlug: String?,
    onSelectCategory: (String?) -> Unit,
) {
    if (slugs.isEmpty()) return

    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(18.dp),
        contentPadding = PaddingValues(horizontal = 2.dp, vertical = 2.dp),
    ) {
        rowItems(slugs, key = { it }) { slug ->
            CategoryLogoButton(
                slug = slug,
                selected = selectedSlug == slug,
                onClick = {
                    onSelectCategory(if (selectedSlug == slug) null else slug)
                },
            )
        }
    }
}

@Composable
private fun CategoryLogoButton(
    slug: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val labelColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground
    Column(
        modifier = Modifier
            .width(78.dp)
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        CategoryLogo(slug = slug, selected = selected)
        Text(
            text = categoryLabel(slug),
            style = MaterialTheme.typography.labelMedium,
            color = labelColor,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        Box(
            modifier = Modifier
                .width(if (selected) 28.dp else 0.dp)
                .height(2.dp)
                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(1.dp)),
        )
    }
}

@Composable
private fun CategoryLogo(slug: String, selected: Boolean) {
    val ink = MaterialTheme.colorScheme.onBackground
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val accent = if (selected) MaterialTheme.colorScheme.primary else DondeGoCoral

    Canvas(modifier = Modifier.size(58.dp)) {
        val w = size.width
        val h = size.height
        val stroke = w * 0.065f
        fun p(x: Float, y: Float) = Offset(w * x, h * y)
        fun s(width: Float, height: Float) = Size(w * width, h * height)

        when (slug) {
            "concierto" -> {
                drawCircle(Color(0xFFFFC857), radius = w * 0.14f, center = p(0.32f, 0.74f))
                drawCircle(Color(0xFFFFC857), radius = w * 0.14f, center = p(0.68f, 0.67f))
                drawLine(accent, p(0.42f, 0.25f), p(0.42f, 0.73f), strokeWidth = stroke, cap = StrokeCap.Round)
                drawLine(accent, p(0.78f, 0.18f), p(0.78f, 0.66f), strokeWidth = stroke, cap = StrokeCap.Round)
                drawLine(accent, p(0.42f, 0.25f), p(0.78f, 0.18f), strokeWidth = stroke, cap = StrokeCap.Round)
            }
            "festival" -> {
                drawLine(ink, p(0.18f, 0.76f), p(0.82f, 0.76f), strokeWidth = stroke, cap = StrokeCap.Round)
                drawLine(ink, p(0.24f, 0.76f), p(0.38f, 0.43f), strokeWidth = stroke, cap = StrokeCap.Round)
                drawLine(ink, p(0.76f, 0.76f), p(0.62f, 0.43f), strokeWidth = stroke, cap = StrokeCap.Round)
                listOf(0.24f, 0.40f, 0.56f).forEachIndexed { index, x ->
                    val color = listOf(Color(0xFFFFC857), accent, Color(0xFF3EB489))[index]
                    val flag = Path().apply {
                        moveTo(w * x, h * 0.25f)
                        lineTo(w * (x + 0.14f), h * 0.33f)
                        lineTo(w * x, h * 0.41f)
                        close()
                    }
                    drawPath(flag, color)
                }
                drawLine(muted, p(0.18f, 0.25f), p(0.76f, 0.25f), strokeWidth = stroke * 0.58f, cap = StrokeCap.Round)
            }
            "exposicion" -> {
                drawRoundRect(
                    color = Color(0xFFFFD166),
                    topLeft = p(0.20f, 0.20f),
                    size = s(0.60f, 0.50f),
                    cornerRadius = CornerRadius(w * 0.08f, w * 0.08f),
                )
                drawRoundRect(
                    color = ink,
                    topLeft = p(0.20f, 0.20f),
                    size = s(0.60f, 0.50f),
                    cornerRadius = CornerRadius(w * 0.08f, w * 0.08f),
                    style = Stroke(width = stroke * 0.7f),
                )
                drawCircle(accent, radius = w * 0.07f, center = p(0.38f, 0.38f))
                drawLine(Color(0xFF3EB489), p(0.30f, 0.62f), p(0.48f, 0.47f), strokeWidth = stroke * 0.75f, cap = StrokeCap.Round)
                drawLine(Color(0xFF3EB489), p(0.48f, 0.47f), p(0.70f, 0.62f), strokeWidth = stroke * 0.75f, cap = StrokeCap.Round)
            }
            "charla" -> {
                drawRoundRect(
                    color = Color(0xFF6D5BD0),
                    topLeft = p(0.18f, 0.22f),
                    size = s(0.56f, 0.34f),
                    cornerRadius = CornerRadius(w * 0.14f, w * 0.14f),
                )
                drawRoundRect(
                    color = accent,
                    topLeft = p(0.30f, 0.42f),
                    size = s(0.54f, 0.33f),
                    cornerRadius = CornerRadius(w * 0.14f, w * 0.14f),
                )
                drawCircle(Color.White.copy(alpha = 0.95f), radius = w * 0.035f, center = p(0.44f, 0.58f))
                drawCircle(Color.White.copy(alpha = 0.95f), radius = w * 0.035f, center = p(0.57f, 0.58f))
                drawCircle(Color.White.copy(alpha = 0.95f), radius = w * 0.035f, center = p(0.70f, 0.58f))
            }
            "obra-de-teatro", "comedia" -> {
                drawOval(Color(0xFFFFD166), topLeft = p(0.16f, 0.23f), size = s(0.34f, 0.47f))
                drawOval(accent, topLeft = p(0.48f, 0.18f), size = s(0.34f, 0.47f))
                drawCircle(ink, radius = w * 0.025f, center = p(0.29f, 0.41f))
                drawCircle(ink, radius = w * 0.025f, center = p(0.39f, 0.41f))
                drawArc(ink, startAngle = 15f, sweepAngle = 150f, useCenter = false, topLeft = p(0.27f, 0.47f), size = s(0.15f, 0.13f), style = Stroke(width = stroke * 0.46f, cap = StrokeCap.Round))
                drawCircle(Color.White, radius = w * 0.025f, center = p(0.61f, 0.36f))
                drawCircle(Color.White, radius = w * 0.025f, center = p(0.72f, 0.36f))
                drawArc(Color.White, startAngle = 205f, sweepAngle = 130f, useCenter = false, topLeft = p(0.58f, 0.49f), size = s(0.17f, 0.12f), style = Stroke(width = stroke * 0.46f, cap = StrokeCap.Round))
            }
            "fiesta-y-vida-nocturna" -> {
                drawCircle(Color(0xFF6D5BD0), radius = w * 0.26f, center = p(0.46f, 0.42f))
                drawLine(Color.White.copy(alpha = 0.85f), p(0.26f, 0.42f), p(0.66f, 0.42f), strokeWidth = stroke * 0.45f)
                drawLine(Color.White.copy(alpha = 0.85f), p(0.46f, 0.17f), p(0.46f, 0.67f), strokeWidth = stroke * 0.45f)
                drawLine(Color.White.copy(alpha = 0.55f), p(0.32f, 0.25f), p(0.60f, 0.59f), strokeWidth = stroke * 0.35f)
                drawLine(Color.White.copy(alpha = 0.55f), p(0.60f, 0.25f), p(0.32f, 0.59f), strokeWidth = stroke * 0.35f)
                drawCircle(accent, radius = w * 0.09f, center = p(0.72f, 0.70f))
            }
            "gastronomia" -> {
                val slice = Path().apply {
                    moveTo(w * 0.26f, h * 0.18f)
                    lineTo(w * 0.78f, h * 0.34f)
                    lineTo(w * 0.38f, h * 0.82f)
                    close()
                }
                drawPath(slice, Color(0xFFFFC857))
                drawLine(accent, p(0.26f, 0.18f), p(0.78f, 0.34f), strokeWidth = stroke * 1.6f, cap = StrokeCap.Round)
                drawCircle(accent, radius = w * 0.045f, center = p(0.49f, 0.42f))
                drawCircle(accent, radius = w * 0.045f, center = p(0.62f, 0.50f))
                drawCircle(accent, radius = w * 0.045f, center = p(0.45f, 0.62f))
            }
            "curso-taller" -> {
                rotate(-28f, pivot = p(0.50f, 0.50f)) {
                    drawRoundRect(accent, topLeft = p(0.25f, 0.28f), size = s(0.50f, 0.16f), cornerRadius = CornerRadius(w * 0.08f, w * 0.08f))
                    drawRoundRect(Color(0xFFFFD166), topLeft = p(0.25f, 0.44f), size = s(0.50f, 0.16f), cornerRadius = CornerRadius(w * 0.08f, w * 0.08f))
                    drawRoundRect(ink, topLeft = p(0.37f, 0.28f), size = s(0.12f, 0.32f), cornerRadius = CornerRadius(w * 0.02f, w * 0.02f))
                }
            }
            "salud-y-bienestar" -> {
                drawOval(Color(0xFF3EB489), topLeft = p(0.24f, 0.32f), size = s(0.30f, 0.42f))
                drawOval(Color(0xFF74D99F), topLeft = p(0.46f, 0.21f), size = s(0.30f, 0.42f))
                drawLine(ink, p(0.36f, 0.72f), p(0.64f, 0.30f), strokeWidth = stroke * 0.55f, cap = StrokeCap.Round)
            }
            "deportes" -> {
                drawCircle(Color.White, radius = w * 0.30f, center = p(0.50f, 0.50f))
                drawCircle(ink, radius = w * 0.30f, center = p(0.50f, 0.50f), style = Stroke(width = stroke * 0.65f))
                drawLine(accent, p(0.27f, 0.50f), p(0.73f, 0.50f), strokeWidth = stroke * 0.5f, cap = StrokeCap.Round)
                drawLine(accent, p(0.50f, 0.22f), p(0.50f, 0.78f), strokeWidth = stroke * 0.5f, cap = StrokeCap.Round)
                drawArc(accent, startAngle = 75f, sweepAngle = 210f, useCenter = false, topLeft = p(0.28f, 0.22f), size = s(0.44f, 0.56f), style = Stroke(width = stroke * 0.5f, cap = StrokeCap.Round))
            }
            "familia" -> {
                drawCircle(accent, radius = w * 0.15f, center = p(0.33f, 0.34f))
                drawCircle(Color(0xFFFFC857), radius = w * 0.16f, center = p(0.62f, 0.32f))
                drawCircle(Color(0xFF3EB489), radius = w * 0.12f, center = p(0.50f, 0.58f))
                drawLine(muted, p(0.33f, 0.49f), p(0.43f, 0.76f), strokeWidth = stroke * 0.45f, cap = StrokeCap.Round)
                drawLine(muted, p(0.62f, 0.48f), p(0.54f, 0.76f), strokeWidth = stroke * 0.45f, cap = StrokeCap.Round)
            }
            "cine" -> {
                drawRoundRect(ink, topLeft = p(0.18f, 0.29f), size = s(0.64f, 0.44f), cornerRadius = CornerRadius(w * 0.07f, w * 0.07f))
                drawRoundRect(accent, topLeft = p(0.18f, 0.22f), size = s(0.64f, 0.18f), cornerRadius = CornerRadius(w * 0.05f, w * 0.05f))
                repeat(3) { index ->
                    val x = 0.27f + index * 0.18f
                    drawLine(Color.White, p(x, 0.23f), p(x + 0.08f, 0.39f), strokeWidth = stroke * 0.45f, cap = StrokeCap.Round)
                }
                drawCircle(Color.White, radius = w * 0.055f, center = p(0.50f, 0.55f))
            }
            "tecnologia", "networking", "negocios" -> {
                drawRoundRect(Color(0xFF3EB489), topLeft = p(0.27f, 0.27f), size = s(0.46f, 0.46f), cornerRadius = CornerRadius(w * 0.08f, w * 0.08f))
                drawRoundRect(ink, topLeft = p(0.36f, 0.36f), size = s(0.28f, 0.28f), cornerRadius = CornerRadius(w * 0.04f, w * 0.04f), style = Stroke(width = stroke * 0.55f))
                listOf(0.24f, 0.50f, 0.76f).forEach { x ->
                    drawLine(accent, p(x, 0.18f), p(x, 0.27f), strokeWidth = stroke * 0.45f, cap = StrokeCap.Round)
                    drawLine(accent, p(x, 0.73f), p(x, 0.82f), strokeWidth = stroke * 0.45f, cap = StrokeCap.Round)
                }
            }
            else -> {
                val star = Path().apply {
                    val cx = w * 0.50f
                    val cy = h * 0.46f
                    val outer = w * 0.31f
                    val inner = w * 0.14f
                    repeat(10) { index ->
                        val angle = Math.toRadians((index * 36 - 90).toDouble())
                        val r = if (index % 2 == 0) outer else inner
                        val x = cx + kotlin.math.cos(angle).toFloat() * r
                        val y = cy + kotlin.math.sin(angle).toFloat() * r
                        if (index == 0) moveTo(x, y) else lineTo(x, y)
                    }
                    close()
                }
                drawPath(star, accent)
                drawCircle(Color.White.copy(alpha = 0.92f), radius = w * 0.07f, center = p(0.50f, 0.46f))
            }
        }
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

private fun visibleCategorySlugs(feed: HomeFeed, listing: List<EventSummary>): List<String> {
    val fromCounts = feed.categories
        .filter { it.count > 0 }
        .map { it.slug }
    val fromEvents = listing.flatMap { it.categories }

    return (fromCounts + fromEvents)
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinct()
        .take(12)
}

private fun uniquePrimaryCategoryFirst(events: List<EventSummary>): List<EventSummary> {
    val firstByCategory = mutableListOf<EventSummary>()
    val remaining = mutableListOf<EventSummary>()
    val seen = linkedSetOf<String>()

    events.forEach { event ->
        val category = event.categories.firstOrNull()?.takeIf { it.isNotBlank() } ?: "otros"
        if (seen.add(category)) {
            firstByCategory += event
        } else {
            remaining += event
        }
    }

    return firstByCategory + remaining
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
