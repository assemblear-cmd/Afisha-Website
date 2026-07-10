package dondeg.app.core.model

/** One venue the user can follow during onboarding (a scraped-source Theater). */
data class VenueOption(
    val slug: String,
    val name: String,
    val city: String,
    val categories: List<String>,
    val upcomingCount: Int,
)

/** Options for the two registration questions: categories + venues. */
data class OnboardingOptions(
    val categories: List<CategoryCount>,
    val venues: List<VenueOption>,
)

/** The account's saved onboarding answers; drive personalized feed order. */
data class UserPreferences(
    val categories: List<String>,
    val venues: List<String>,
) {
    val isEmpty: Boolean get() = categories.isEmpty() && venues.isEmpty()
}
