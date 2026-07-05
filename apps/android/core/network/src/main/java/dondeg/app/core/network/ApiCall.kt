package dondeg.app.core.network

import dondeg.app.core.common.ApiResult
import java.io.IOException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

private val errorJson = Json { ignoreUnknownKeys = true }

/**
 * Extracts the backend's `{ "error": "message" }` body so screens can show
 * the server's own actionable message (e.g. sold-out ticket types) instead
 * of a generic HTTP status line.
 */
fun httpErrorMessage(error: HttpException): String {
    val raw = runCatching { error.response()?.errorBody()?.string() }.getOrNull()
    if (!raw.isNullOrBlank()) {
        runCatching {
            val parsed = errorJson.parseToJsonElement(raw).jsonObject["error"]?.jsonPrimitive?.content
            if (!parsed.isNullOrBlank()) return parsed
        }
    }
    return error.message()
}

/** Single mapping point from Retrofit calls to the app-wide ApiResult. */
suspend fun <T> safeApiCall(block: suspend () -> T): ApiResult<T> = try {
    ApiResult.Success(block())
} catch (error: IOException) {
    ApiResult.NetworkError(error)
} catch (error: HttpException) {
    ApiResult.HttpError(error.code(), httpErrorMessage(error))
} catch (error: Throwable) {
    ApiResult.UnknownError(error)
}
