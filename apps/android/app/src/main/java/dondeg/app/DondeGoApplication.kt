package dondeg.app

import android.app.Application
import dondeg.app.core.data.DondeGoAppContainer

class DondeGoApplication : Application() {
    lateinit var container: DondeGoAppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = DondeGoAppContainer(
            context = this,
            apiBaseUrl = BuildConfig.API_BASE_URL,
            googleWebClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID,
        )
    }
}
