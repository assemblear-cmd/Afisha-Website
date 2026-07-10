package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.common.map
import dondeg.app.core.model.OnboardingOptions
import dondeg.app.core.model.UserPreferences
import dondeg.app.core.network.CategoryDto
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.PreferencesRequest
import dondeg.app.core.network.VenueOptionDto
import dondeg.app.core.network.safeApiCall

/**
 * Registration onboarding questions + per-account feed preferences. The
 * options endpoint is public; reading/saving preferences requires a session
 * (Bearer token attached by the network layer).
 */
class PreferencesRepository(
    private val api: DondeGoApi,
) {
    suspend fun options(): ApiResult<OnboardingOptions> =
        safeApiCall { api.onboardingOptions() }.map { response ->
            OnboardingOptions(
                categories = response.categories.map(CategoryDto::toModel),
                venues = response.venues.map(VenueOptionDto::toModel),
            )
        }

    suspend fun preferences(): ApiResult<UserPreferences> =
        safeApiCall { api.myPreferences() }.map { dto ->
            UserPreferences(categories = dto.preferredCategories, venues = dto.preferredVenues)
        }

    /** Replaces the account's saved answers; returns what the server kept. */
    suspend fun save(categories: List<String>, venues: List<String>): ApiResult<UserPreferences> =
        safeApiCall {
            api.updatePreferences(
                PreferencesRequest(preferredCategories = categories, preferredVenues = venues),
            )
        }.map { dto ->
            UserPreferences(categories = dto.preferredCategories, venues = dto.preferredVenues)
        }
}
