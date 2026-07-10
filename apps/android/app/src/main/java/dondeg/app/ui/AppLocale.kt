package dondeg.app.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import java.util.Locale

/**
 * Languages offered by the in-app language menu. Labels are endonyms, so they
 * read the same regardless of the current UI language. The tag matches an
 * Android resource qualifier (`values-es`, default `values` = English) and the
 * backend locale codes exposed by `/api/v1/config`.
 */
enum class AppLanguage(val tag: String, val label: String, val flag: String) {
    English("en", "English", "🇺🇸"),
    Spanish("es", "Español", "🇪🇸"),
}

/**
 * Per-app language selection without AppCompat. The chosen tag lives in plain
 * prefs (it is not sensitive) and is applied by wrapping the Activity's base
 * context in [wrap]; changing it recreates the Activity so every
 * `stringResource` re-resolves in the new language.
 */
object AppLocale {
    private const val PREFS = "dondego_prefs"
    private const val KEY_LANG = "app_language"

    /** Stored language tag, or null to follow the system language. */
    fun stored(context: Context): String? = prefs(context).getString(KEY_LANG, null)

    fun persist(context: Context, tag: String?) {
        val editor = prefs(context).edit()
        if (tag == null) editor.remove(KEY_LANG) else editor.putString(KEY_LANG, tag)
        editor.apply()
    }

    /** Wraps [base] so its resources resolve in the stored language. */
    fun wrap(base: Context): Context {
        val tag = stored(base) ?: return base
        val locale = Locale.forLanguageTag(tag)
        Locale.setDefault(locale)
        val config = Configuration(base.resources.configuration)
        config.setLocale(locale)
        return base.createConfigurationContext(config)
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

/** Nearest [Activity] for a [Context], needed to recreate on a language change. */
tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
