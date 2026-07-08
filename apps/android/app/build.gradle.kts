plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "dondeg.app"
    compileSdk = 37

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "dondeg.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        // Google OAuth *web* client ID for Sign in with Google. Supply per build:
        //   ./gradlew :app:assembleDebug -PdondegoGoogleClientId=<web-client-id>
        // Empty by default, which hides the in-app Google button until configured.
        val googleWebClientId = (project.findProperty("dondegoGoogleClientId") as String?).orEmpty()
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
    }

    buildTypes {
        debug {
            // Default host is the Next.js dev server as seen from the Android
            // emulator (10.0.2.2). For a physical phone on the same Wi-Fi,
            // override with the computer's LAN IP, e.g.:
            //   ./gradlew :app:assembleDebug -PdondegoApiBase=http://192.168.1.81:3000/
            val devApiBase = (project.findProperty("dondegoApiBase") as String?)
                ?: "http://10.0.2.2:3000/"
            buildConfigField("String", "API_BASE_URL", "\"$devApiBase\"")
        }
        release {
            // Production API host. Defaults to the live domain; override per
            // build with -PdondegoApiBase=https://<host>/ (e.g. a staging URL).
            val releaseApiBase = (project.findProperty("dondegoApiBase") as String?)
                ?: "https://dondego.cl/"
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBase\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core:common"))
    implementation(project(":core:data"))
    implementation(project(":core:designsystem"))
    implementation(project(":core:model"))
    implementation(project(":feature:admin"))
    implementation(project(":feature:auth"))
    implementation(project(":feature:checkout"))
    implementation(project(":feature:discover"))
    implementation(project(":feature:eventdetail"))
    implementation(project(":feature:organizer"))
    implementation(project(":feature:scanner"))
    implementation(project(":feature:tickets"))

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.navigation.compose)

    debugImplementation(libs.androidx.compose.ui.tooling)
}
