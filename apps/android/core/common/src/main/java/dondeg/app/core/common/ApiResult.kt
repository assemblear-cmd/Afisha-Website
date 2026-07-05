package dondeg.app.core.common

sealed interface ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>
    data class HttpError(val code: Int, val message: String) : ApiResult<Nothing>
    data class NetworkError(val throwable: Throwable) : ApiResult<Nothing>
    data class UnknownError(val throwable: Throwable) : ApiResult<Nothing>
}

inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(value))
    is ApiResult.HttpError -> this
    is ApiResult.NetworkError -> this
    is ApiResult.UnknownError -> this
}
