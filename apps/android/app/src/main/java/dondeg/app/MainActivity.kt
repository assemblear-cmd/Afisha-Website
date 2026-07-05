package dondeg.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dondeg.app.ui.AppLocale
import dondeg.app.ui.DondeGoApp

class MainActivity : ComponentActivity() {
    // Apply the language chosen in the in-app menu before any resources load.
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLocale.wrap(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as DondeGoApplication).container
        setContent {
            DondeGoApp(container = container)
        }
    }
}
