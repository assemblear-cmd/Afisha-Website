package dondeg.app.core.network

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Retrofit/OkHttp wiring. `tokenProvider` supplies the current session JWT;
 * when present it is attached as `Authorization: Bearer <jwt>` — the mobile
 * auth contract of the DondeGO backend. The token itself lives in encrypted
 * storage owned by the data layer; this module never persists it.
 */
class NetworkModule(
    private val baseUrl: String,
    private val tokenProvider: () -> String? = { null },
) {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val builder = chain.request().newBuilder()
                .header("User-Agent", "DondeGO Android")
            tokenProvider()?.let { token ->
                builder.header("Authorization", "Bearer $token")
            }
            chain.proceed(builder.build())
        }
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                // BASIC never logs headers, so the Bearer token stays out of logcat.
                level = HttpLoggingInterceptor.Level.BASIC
            },
        )
        .build()

    val api: DondeGoApi = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(DondeGoApi::class.java)
}
