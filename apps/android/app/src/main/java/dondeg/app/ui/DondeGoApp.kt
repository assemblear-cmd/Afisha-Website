package dondeg.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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
import dondeg.app.core.designsystem.categoryLabel
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

// Category shortcuts shown in the main menu; mirrors the web's
// FEATURED_EVENT_CATEGORIES so both menus stay in sync.
private val MENU_CATEGORIES = listOf(
    "concierto",
    "festival",
    "exposicion",
    "charla",
    "obra-de-teatro",
    "evento-interactivo",
    "otros",
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

    fun switchTab(route: String) {
        navController.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(ROUTE_DISCOVER) { saveState = true }
        }
    }

    // Category picked in the main menu; consumed by DiscoverScreen after it
    // applies the filter, so re-picking the same category works again later.
    var categoryRequest by remember { mutableStateOf<String?>(null) }

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
                        Text(
                            text = stringResource(R.string.app_name),
                            modifier = Modifier.clickable { switchTab(ROUTE_DISCOVER) },
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    },
                    actions = {
                        if (session == null) {
                            TextButton(onClick = { navController.navigate(ROUTE_AUTH) }) {
                                Text(
                                    text = stringResource(R.string.account_sign_in),
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                        MainMenu(
                            session = session,
                            onSelectCategory = { slug ->
                                categoryRequest = slug
                                switchTab(ROUTE_DISCOVER)
                            },
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
                        categoryRequest = categoryRequest,
                        onCategoryRequestConsumed = { categoryRequest = null },
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

/**
 * Main menu: account action on top, language switch (flags), then event
 * category shortcuts that filter the home feed. Navigation sections live in
 * the bottom bar; organizer tools live inside "My events".
 */
@Composable
private fun MainMenu(
    session: SessionUser?,
    onSelectCategory: (String) -> Unit,
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
            modifier = Modifier.width(236.dp),
            shape = RoundedCornerShape(20.dp),
            containerColor = MaterialTheme.colorScheme.surface,
        ) {
            DropdownMenuItem(
                text = {
                    Text(
                        text = stringResource(
                            if (session == null) R.string.account_sign_in else R.string.account_sign_out,
                        ),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                onClick = {
                    expanded = false
                    if (session == null) onSignIn() else onSignOut()
                },
            )

            MenuDivider()
            MenuSectionLabel(stringResource(R.string.language_menu))
            AppLanguage.entries.forEach { language ->
                val selected = language.tag == currentLang
                DropdownMenuItem(
                    text = {
                        Text(
                            text = "${language.flag}   ${language.label}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (selected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                        )
                    },
                    onClick = {
                        expanded = false
                        if (!selected) {
                            AppLocale.persist(context, language.tag)
                            context.findActivity()?.recreate()
                        }
                    },
                )
            }

            MenuDivider()
            MenuSectionLabel(stringResource(R.string.menu_categories))
            MENU_CATEGORIES.forEach { slug ->
                DropdownMenuItem(
                    text = {
                        Text(
                            text = categoryLabel(slug),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    },
                    onClick = {
                        expanded = false
                        onSelectCategory(slug)
                    },
                )
            }
        }
    }
}

@Composable
private fun MenuDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
    )
}

@Composable
private fun MenuSectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        modifier = Modifier.padding(start = 16.dp, top = 6.dp, end = 16.dp, bottom = 4.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 1.2.sp,
    )
}

/**
 * Bottom-bar destinations. Organizer and Scanner are intentionally absent:
 * they are per-event tools reached from "My events" after creating an event.
 */
private fun visibleDestinations(session: SessionUser?): List<Destination> = buildList {
    add(Destination(ROUTE_DISCOVER, R.string.nav_home, Icons.Outlined.Home))
    add(Destination(ROUTE_EVENTS, R.string.nav_events, Icons.Outlined.Event))
    if (session?.role == UserRole.Admin) {
        add(Destination(ROUTE_ADMIN, R.string.nav_admin, Icons.Outlined.AdminPanelSettings))
    }
}
