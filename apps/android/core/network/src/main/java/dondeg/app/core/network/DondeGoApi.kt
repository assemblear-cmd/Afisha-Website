package dondeg.app.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface DondeGoApi {
    // --- Discovery (public) ---

    @GET("api/v1/feed")
    suspend fun feed(): FeedResponse

    @GET("api/v1/events")
    suspend fun events(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null,
        @Query("kind") kind: String? = null,
        @Query("date") date: String? = null,
        @Query("weekend") weekend: Boolean? = null,
    ): PagedResponse<EventSummaryDto>

    @GET("api/v1/events/native/{id}")
    suspend fun nativeEvent(@Path("id") id: String): EventDetailResponse

    @GET("api/v1/events/scraped/{id}")
    suspend fun scrapedEvent(@Path("id") id: String): EventDetailResponse

    // --- Auth (mobile: token in body, sent back as Bearer) ---

    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("api/v1/auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("api/v1/auth/google")
    suspend fun googleAuth(@Body body: GoogleAuthRequest): AuthResponse

    @GET("api/auth/me")
    suspend fun me(): MeResponse

    // --- Registration onboarding & per-account feed preferences ---

    @GET("api/v1/onboarding/options")
    suspend fun onboardingOptions(): OnboardingOptionsResponse

    @GET("api/v1/me/preferences")
    suspend fun myPreferences(): PreferencesDto

    @PUT("api/v1/me/preferences")
    suspend fun updatePreferences(@Body body: PreferencesRequest): PreferencesDto

    // --- Account tickets (Bearer required) ---

    // --- Events tab: organized events + liked feed items (Bearer required) ---

    @GET("api/v1/me/events")
    suspend fun myEvents(): EventListResponse

    @GET("api/v1/me/likes")
    suspend fun myLikes(): LikesResponse

    @POST("api/v1/me/likes")
    suspend fun like(@Body body: LikeRequest): LikeResponse

    @HTTP(method = "DELETE", path = "api/v1/me/likes", hasBody = true)
    suspend fun unlike(@Body body: LikeRequest): LikeResponse

    @GET("api/v1/me/tickets")
    suspend fun myTickets(
        @Query("scope") scope: String = "all",
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50,
    ): PagedResponse<TicketDto>

    @GET("api/v1/me/tickets/{id}")
    suspend fun ticket(@Path("id") id: String): TicketDetailResponse

    // --- Scanner (Bearer required; access enforced server-side) ---

    @GET("api/v1/scanner/events")
    suspend fun scannerEvents(): ScannerEventsResponse

    @POST("api/scan")
    suspend fun scan(@Body body: ScanRequest): ScanOutcomeDto
}

// --- Shared envelopes ---

@Serializable
data class PagedResponse<T>(
    val items: List<T> = emptyList(),
    val page: Int = 1,
    val pageSize: Int = 20,
    val total: Int = 0,
    val hasMore: Boolean = false,
)

// --- Discovery DTOs ---

@Serializable
data class FeedResponse(
    val categories: List<CategoryDto> = emptyList(),
    val hero: List<EventSummaryDto> = emptyList(),
    val upcoming: PagedResponse<EventSummaryDto> = PagedResponse(),
)

@Serializable
data class CategoryDto(
    val slug: String,
    val count: Int,
)

@Serializable
data class EventSummaryDto(
    val id: String,
    val kind: String,
    val title: String,
    val startsAt: String? = null,
    val venueName: String? = null,
    val imageUrl: String? = null,
    val categories: List<String> = emptyList(),
    val sourceUrl: String? = null,
    val priceText: String? = null,
    @SerialName("priceMinor")
    val scrapedPriceMinor: Long? = null,
    val minPriceMinor: Long? = null,
    val currency: String = "CLP",
)

@Serializable
data class EventDetailResponse(val event: EventDetailDto)

@Serializable
data class EventDetailDto(
    val id: String,
    val kind: String,
    val title: String,
    val shortDescription: String? = null,
    val description: String? = null,
    val category: String? = null,
    val categories: List<String> = emptyList(),
    val startsAt: String? = null,
    val endsAt: String? = null,
    val venueName: String? = null,
    val address: String? = null,
    val city: String? = null,
    val imageUrl: String? = null,
    val isFree: Boolean = false,
    val priceText: String? = null,
    val priceMinor: Long? = null,
    val currency: String = "CLP",
    val sourceUrl: String? = null,
    val organizer: OrganizerDto? = null,
    val theater: TheaterDto? = null,
    val ticketTypes: List<TicketTypeDto> = emptyList(),
)

@Serializable
data class OrganizerDto(val id: String, val name: String)

@Serializable
data class TheaterDto(
    val name: String,
    val slug: String? = null,
    val website: String? = null,
)

@Serializable
data class TicketTypeDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val priceMinor: Long = 0,
    val currency: String = "CLP",
    val status: String = "ACTIVE",
    val remaining: Int = 0,
    val perOrderLimit: Int? = null,
    val salesStartAt: String? = null,
    val salesEndAt: String? = null,
    val onSaleNow: Boolean = false,
)

// --- Auth DTOs ---

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val role: String = "visitor",
)

@Serializable
data class GoogleAuthRequest(val idToken: String)

// --- Onboarding / preferences DTOs ---

@Serializable
data class OnboardingOptionsResponse(
    val categories: List<CategoryDto> = emptyList(),
    val venues: List<VenueOptionDto> = emptyList(),
)

@Serializable
data class VenueOptionDto(
    val slug: String,
    val name: String,
    val city: String = "Santiago",
    val categories: List<String> = emptyList(),
    val upcomingCount: Int = 0,
)

@Serializable
data class PreferencesDto(
    val preferredCategories: List<String> = emptyList(),
    val preferredVenues: List<String> = emptyList(),
)

// No property defaults: both lists always serialize, PUT replaces the account
// preferences atomically.
@Serializable
data class PreferencesRequest(
    val preferredCategories: List<String>,
    val preferredVenues: List<String>,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String = "visitor",
)

@Serializable
data class AuthResponse(val token: String, val user: UserDto)

@Serializable
data class MeResponse(val user: UserDto? = null)

// --- Events tab / likes DTOs ---

@Serializable
data class EventListResponse(val items: List<EventSummaryDto> = emptyList())

@Serializable
data class LikesResponse(
    val items: List<EventSummaryDto> = emptyList(),
    val keys: List<String> = emptyList(),
)

@Serializable
data class LikeRequest(val id: String)

@Serializable
data class LikeResponse(val ok: Boolean = true, val liked: Boolean = false)

// --- Ticket DTOs ---

@Serializable
data class TicketEventDto(
    val id: String,
    val title: String,
    val startsAt: String? = null,
    val venue: String? = null,
    val address: String? = null,
    val city: String? = null,
    val imageUrl: String? = null,
)

@Serializable
data class TicketDto(
    val id: String,
    val status: String,
    val checkedInAt: String? = null,
    val ticketTypeName: String = "",
    val event: TicketEventDto,
)

// --- Scanner DTOs ---

@Serializable
data class ScannerEventsResponse(val events: List<ScannerEventDto> = emptyList())

@Serializable
data class ScannerEventDto(
    val id: String,
    val title: String,
    val startsAt: String? = null,
    val isFree: Boolean = false,
    val scannerEnabled: Boolean = true,
)

@Serializable
data class ScanRequest(val eventId: String, val value: String)

@Serializable
data class ScanOutcomeDto(
    val result: String,
    val message: String,
    val ticket: ScanTicketDto? = null,
)

@Serializable
data class ScanTicketDto(
    val id: String,
    val attendeeName: String? = null,
    val ticketTypeName: String = "",
    val eventTitle: String = "",
    val checkedInAt: String? = null,
)

@Serializable
data class TicketDetailResponse(val ticket: TicketDetailDto)

@Serializable
data class TicketDetailDto(
    val id: String,
    val status: String,
    val checkedInAt: String? = null,
    val attendeeName: String? = null,
    val ticketTypeName: String = "",
    val qrPayload: String? = null,
    val event: TicketEventDto,
)
