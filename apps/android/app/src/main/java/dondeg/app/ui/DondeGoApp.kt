package dondeg.app.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
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
import dondeg.app.feature.admin.AdminScreen
import dondeg.app.feature.auth.AuthScreen
import dondeg.app.feature.discover.DiscoverScreen
import dondeg.app.feature.discover.EventsScreen
import dondeg.app.feature.discover.SavedScreen
import dondeg.app.feature.eventdetail.EventDetailScreen
import dondeg.app.feature.organizer.OrganizerScreen
import dondeg.app.feature.scanner.ScannerScreen
import dondeg.app.feature.tickets.TicketsScreen
import kotlinx.coroutines.launch

private const val ROUTE_DISCOVER = "discover"
private const val ROUTE_SAVED = "saved"
private const val ROUTE_TICKETS = "tickets"
private const val ROUTE_ACCOUNT = "account"
private const val ROUTE_YOUR_EVENTS = "your_events"
private const val ROUTE_ORGANIZER = "organizer"
private const val ROUTE_SCANNER = "scanner"
private const val ROUTE_ADMIN = "admin"
private const val ROUTE_AUTH = "auth"
private const val ROUTE_ONBOARDING = "onboarding/{mode}"
private const val ROUTE_DETAIL = "detail/{kind}/{id}"

private data class Destination(
    val route: String,
    val labelRes: Int,
    val icon: ImageVector,
    val selectedIcon: ImageVector = icon,
)

// Reference-design tab bar: Discover, Saved, Tickets, Account — always the
// same four for everyone. Organizer/scanner/admin tools live in Account.
private val BOTTOM_DESTINATIONS = listOf(
    Destination(ROUTE_DISCOVER, R.string.nav_discover, Icons.Outlined.Home, Icons.Filled.Home),
    Destination(ROUTE_SAVED, R.string.nav_saved, Icons.Outlined.FavoriteBorder, Icons.Filled.Favorite),
    Destination(ROUTE_TICKETS, R.string.nav_tickets, Icons.Outlined.ConfirmationNumber),
    Destination(ROUTE_ACCOUNT, R.string.nav_account, Icons.Outlined.Person, Icons.Filled.Person),
)

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

    // Bumped when onboarding/preference edits save, so the personalized feed
    // reloads with the new server-side ordering.
    var prefsVersion by remember { mutableIntStateOf(0) }

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    fun switchTab(route: String) {
        navController.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(ROUTE_DISCOVER) { saveState = true }
        }
    }

    DondeGoTheme {
        Scaffold(
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    BOTTOM_DESTINATIONS.forEach { destination ->
                        val selected = currentRoute == destination.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = { switchTab(destination.route) },
                            icon = {
                                Icon(
                                    imageVector = if (selected) destination.selectedIcon else destination.icon,
                                    contentDescription = null,
                                )
                            },
                            label = { Text(stringResource(destination.labelRes)) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onBackground,
                                selectedTextColor = MaterialTheme.colorScheme.onBackground,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                indicatorColor = Color.Transparent,
                            ),
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
                        refreshKey = "${session?.id.orEmpty()}-$prefsVersion",
                    )
                }
                composable(ROUTE_SAVED) {
                    SavedScreen(
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
                composable(ROUTE_YOUR_EVENTS) {
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
                composable(ROUTE_ACCOUNT) {
                    AccountScreen(
                        session = session,
                        preferencesRepository = container.preferencesRepository,
                        prefsVersion = prefsVersion,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                        onSignOut = { container.authRepository.logout() },
                        onEditInterests = { navController.navigate("onboarding/interests") },
                        onEditVenues = { navController.navigate("onboarding/venues") },
                        onOpenYourEvents = { navController.navigate(ROUTE_YOUR_EVENTS) },
                        onOpenOrganizer = { navController.navigate(ROUTE_ORGANIZER) },
                        onOpenScanner = { navController.navigate(ROUTE_SCANNER) },
                        onOpenAdmin = { navController.navigate(ROUTE_ADMIN) },
                    )
                }
                composable(ROUTE_ORGANIZER) {
                    OrganizerScreen(
                        session = session,
                        onSignIn = { navController.navigate(ROUTE_AUTH) },
                        onOpenWeb = { uriHandler.openUri(container.webUrl("/organizer")) },
                        onGoToScanner = { navController.navigate(ROUTE_SCANNER) },
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
                        onAuthenticated = { registeredNewAccount ->
                            if (registeredNewAccount) {
                                // Fresh account → the two onboarding questions
                                // (categories + venues), replacing the auth screen.
                                navController.navigate("onboarding/full") {
                                    popUpTo(ROUTE_AUTH) { inclusive = true }
                                }
                            } else {
                                navController.popBackStack()
                            }
                        },
                    )
                }
                composable(
                    route = ROUTE_ONBOARDING,
                    arguments = listOf(navArgument("mode") { type = NavType.StringType }),
                ) { backStackEntry ->
                    val mode = when (backStackEntry.arguments?.getString("mode")) {
                        "interests" -> OnboardingMode.Interests
                        "venues" -> OnboardingMode.Venues
                        else -> OnboardingMode.Full
                    }
                    OnboardingScreen(
                        repository = container.preferencesRepository,
                        mode = mode,
                        onClose = { saved ->
                            if (saved) prefsVersion += 1
                            navController.popBackStack()
                        },
                    )
                }
            }
        }
    }
}
