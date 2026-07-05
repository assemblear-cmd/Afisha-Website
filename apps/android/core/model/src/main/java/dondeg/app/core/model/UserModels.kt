package dondeg.app.core.model

enum class UserRole {
    Visitor,
    Organizer,
    Admin,
    Unknown,
}

data class SessionUser(
    val id: String,
    val email: String,
    val name: String,
    val role: UserRole,
)
