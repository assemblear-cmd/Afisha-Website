package dondeg.app.core.data

import android.content.Context
import dondeg.app.core.network.NetworkModule

/**
 * Manual DI container, created once in the Application class. The session
 * repository feeds the network layer's Bearer-token provider, so signing in
 * or out immediately affects every subsequent API call.
 */
class DondeGoAppContainer(
    context: Context,
    val apiBaseUrl: String,
    /** Google OAuth *web* client ID used by the Sign in with Google flow. */
    val googleWebClientId: String = "",
) {
    val sessionRepository = SessionRepository(context)

    private val networkModule = NetworkModule(
        baseUrl = apiBaseUrl,
        tokenProvider = { sessionRepository.token() },
    )

    val discoveryRepository = DiscoveryRepository(networkModule.api)
    val eventsRepository = EventsRepository(networkModule.api)
    val authRepository = AuthRepository(networkModule.api, sessionRepository)
    val ticketsRepository = TicketsRepository(networkModule.api)
    val scannerRepository = ScannerRepository(networkModule.api)

    /** Absolute web URL on the API host (native event pages / web checkout). */
    fun webUrl(path: String): String = apiBaseUrl.trimEnd('/') + path
}
