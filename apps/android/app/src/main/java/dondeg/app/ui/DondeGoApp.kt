package dondeg.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dondeg.app.R
import dondeg.app.core.data.DondeGoAppContainer
import dondeg.app.core.designsystem.DondeGoTheme
import dondeg.app.core.model.EventKind
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.UserRole
import dondeg.app.feature.admin.AdminScreen
import dondeg.app.feature.auth.AuthScreen
import dondeg.app.feature.discover.DiscoverScreen
import dondeg.app.feature.eventdetail.EventDetailScreen
import dondeg.app.feature.organizer.OrganizerScreen
import dondeg.app.feature.discover.EventsScreen
import dondeg.app.feature.scanner.ScannerScreen
import dondeg.app.feature.tickets.TicketsScreen
import kotlinx.coroutines.launch

private const val ROUTE_DISCOVER = "discover"
private const val ROUTE_EVENTS = "events"
private const val ROUTE_TICKETS = "tickets"
private const val ROUTE_ORGANIZER = "organizer"
private const val ROUTE_SCANNER = "scanner"
private const val ROUTE_ADMIN = "admin"
private const val ROUTE_AUTH = "auth"
private const val ROUTE_DETAIL = "detail/{kind}/{id}"

private data class Destination(
    val route: String,
    val labelRes: Int,
    val icon: ImageVector,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DondeGoApp(container: DondeGoAppContainer) {
    val navController = rememberNavController()
    val uriHandler = LocalUriHandler.current
    val session by container.authRepository.session.collectAsStateWithLifecycle()

    // Validate the stored token against the backend once on launch; expired
    // sessions are cleared so role-gated UI falls back to logged-out state.
    LaunchedEffect(Unit) { container.authRepository.refresh() }

    val scope = rememberCoroutineScope()
    val likedKeys by container.likesRepository.likedKeys.collectAsStateWithLifecycle()
    // Keep the feed hearts in sync with the account whenever the session changes.
    LaunchedEffect(session) { container.likesRepository.refresh() }
    val onToggleLike: (String) -> Unit = { wireId ->
        if (session == null) {
            navController.navigate(ROUTE_AUTH)
        } else {
            scope.launch { container.likesRepository.toggle(wireId) }
        }
    }

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    val destinations = remember(session) { visibleDestinations(session) }
    var topSearchQuery by remember { mutableStateOf("") }
    var topSearchVersion by remember { mutableStateOf(0) }

    fun switchTab(route: String) {
        navController.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(ROUTE_DISCOVER) { saveState = true }
        }
    }

    fun updateSearch(query: String) {
        topSearchQuery = query
        topSearchVersion += 1
        if (currentRoute != ROUTE_DISCOVER) switchTab(ROUTE_DISCOVER)
    }

    DondeGoTheme {
        Scaffold(
            topBar = {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.onBackground,
                        actionIconContentColor = MaterialTheme.colorScheme.onBackground,
                    ),
                    title = {
                        if (currentRoute == ROUTE_DISCOVER) {
                            DiscoverTopSearch(
                                query = topSearchQuery,
                                onQueryChange = ::updateSearch,
                                onLogoClick = { switchTab(ROUTE_DISCOVER) },
                            )
                        } else {
                            DondeGoLogo(onClick = { switchTab(ROUTE_DISCOVER) })
                        }
                    },
                    actions = {
                        MainMenu(
                            session = session,
                            onNavigate = { route -> switchTab(route) },
                            onSignIn = { navController.navigate(ROUTE_AUTH) },
                            onSignOut = { container.authRepository.logout() },
                        )
                    },
                )
            },
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    destinations.forEach { destination ->
                        NavigationBarItem(
                            selected = currentRoute == destination.route,
                            onClick = { switchTab(destination.route) },
                            icon = { Icon(destination.icon, contentDescription = null) },
                            label = { Text(stringResource(destination.labelRes)) },
                        )
                    }
                }
            },
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = ROUTE_DISCOVER,
                modifier = Modifier.padding(innerPadding),
            ) {
                composable(ROUTE_DISCOVER) {
                    DiscoverScreen(
                        discoveryRepository = container.discoveryRepository,
                        eventsRepository = container.eventsRepository,
                        likedKeys = likedKeys,
                        onToggleLike = onToggleLike,
                        onOpenEvent = { kind, id ->
                            navController.navigate("detail/${kind.name}/${id}")
                        },
                        requestedQuery = topSearchQuery,
                        queryRequestVersion = topSearchVersion,
                    )
                }
                composable(ROUTE_EVENTS) {
                    EventsScreen(
                        likesRepository = container.likesRepository,
                        likedKeys = likedKeys,
                        onToggleLike = onToggleLike,
                        onOpenEvent = { kind, id ->
                            navController.navigate("detail/${kind.name}/${id}")
                        },
                        isSignedIn = session != null,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                    )
                }
                composable(
                    route = ROUTE_DETAIL,
                    arguments = listOf(
                        navArgument("kind") { type = NavType.StringType },
                        navArgument("id") { type = NavType.StringType },
                    ),
                ) { backStackEntry ->
                    val kind = when (backStackEntry.arguments?.getString("kind")) {
                        EventKind.Native.name -> EventKind.Native
                        else -> EventKind.Scraped
                    }
                    val id = backStackEntry.arguments?.getString("id").orEmpty()
                    EventDetailScreen(
                        kind = kind,
                        id = id,
                        repository = container.eventsRepository,
                        currentUserId = session?.id,
                        nativeWebUrl = { path -> container.webUrl(path) },
                        onOpenExternal = { url -> uriHandler.openUri(url) },
                        onOpenOrganizer = { rawId ->
                            uriHandler.openUri(container.webUrl("/organizer/events/$rawId"))
                        },
                        onBack = { navController.popBackStack() },
                    )
                }
                composable(ROUTE_TICKETS) {
                    TicketsScreen(
                        repository = container.ticketsRepository,
                        session = session,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                    )
                }
                composable(ROUTE_ORGANIZER) {
                    OrganizerScreen(
                        session = session,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                        onOpenWeb = { uriHandler.openUri(container.webUrl("/organizer")) },
                        onGoToScanner = { switchTab(ROUTE_SCANNER) },
                    )
                }
                composable(ROUTE_SCANNER) {
                    ScannerScreen(
                        repository = container.scannerRepository,
                        session = session,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                    )
                }
                composable(ROUTE_ADMIN) {
                    AdminScreen(
                        session = session,
                        onOpenWeb = { uriHandler.openUri(container.webUrl("/admin")) },
                    )
                }
                composable(ROUTE_AUTH) {
                    AuthScreen(
                        repository = container.authRepository,
                        googleWebClientId = container.googleWebClientId,
                        onAuthenticated = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}

@Composable
private fun DondeGoLogo(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .size(width = 44.dp, height = 38.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFF4B0015),
        contentColor = Color.White,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = "D",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
            )
        }
    }
}

@Composable
private fun DiscoverTopSearch(
    query: String,
    onQueryChange: (String) -> Unit,
    onLogoClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DondeGoLogo(onClick = onLogoClick)
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier
                .weight(1f)
                .height(52.dp),
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyMedium.copy(lineHeight = 20.sp),
            shape = RoundedCornerShape(12.dp),
            leadingIcon = {
                Icon(
                    imageVector = Icons.Outlined.Search,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            },
            placeholder = {
                Text(
                    text = stringResource(dondeg.app.feature.discover.R.string.discover_search_hint),
                    style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 20.sp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            },
        )
    }
}

/**
 * Premium top-bar menu: account action first, then language flags. Section
 * navigation stays in the bottom bar or event dashboards.
 */
@Composable
private fun MainMenu(
    session: SessionUser?,
    onNavigate: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current
    val currentLang = LocalConfiguration.current.locales[0].language
    var expanded by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(
                imageVector = Icons.Outlined.Menu,
                contentDescription = stringResource(R.string.menu_more),
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.width(292.dp),
        ) {
            if (session == null) {
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.account_sign_in)) },
                    onClick = { expanded = false; onSignIn() },
                )
            } else {
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.account_sign_out)) },
                    onClick = { expanded = false; onSignOut() },
                )
            }
            HorizontalDivider()
            MenuCaption(stringResource(R.string.language_menu))
            AppLanguage.entries.forEach { language ->
                DropdownMenuItem(
                    text = {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(languageFlag(language.tag))
                            Text(language.label)
                        }
                    },
                    onClick = {
                        expanded = false
                        if (language.tag != currentLang) {
                            AppLocale.persist(context, language.tag)
                            context.findActivity()?.recreate()
                        }
                    },
                    trailingIcon = if (language.tag == currentLang) {
                        { Icon(Icons.Outlined.Check, contentDescription = null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

@Composable
private fun MenuCaption(text: String) {
    Text(
        text = text.uppercase(),
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Bold,
    )
}

private fun languageFlag(tag: String): String = when (tag) {
    "es" -> "🇨🇱"
    "en" -> "🇺🇸"
    else -> "🌐"
}

/** Bottom-bar destinations, filtered by the signed-in role. */
private fun visibleDestinations(session: SessionUser?): List<Destination> = buildList {
    add(Destination(ROUTE_DISCOVER, R.string.nav_home, Icons.Outlined.Home))
    add(Destination(ROUTE_EVENTS, R.string.nav_events, Icons.Outlined.Event))
    if (session?.role == UserRole.Admin) {
        add(Destination(ROUTE_ADMIN, R.string.nav_admin, Icons.Outlined.AdminPanelSettings))
    }
}
