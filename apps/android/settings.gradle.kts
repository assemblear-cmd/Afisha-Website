pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DondeGO"

include(":app")
include(":core:common")
include(":core:designsystem")
include(":core:model")
include(":core:network")
include(":core:data")
include(":feature:discover")
include(":feature:eventdetail")
include(":feature:auth")
include(":feature:tickets")
include(":feature:checkout")
include(":feature:organizer")
include(":feature:scanner")
include(":feature:admin")
