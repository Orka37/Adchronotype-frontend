import axios from 'axios';

export function parseApiError(err) {
  if (!err.response) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and try again.';
    }
    return 'Could not reach the server. Check your internet connection.';
  }

  const { status, data } = err.response;
  const detail = data?.detail;

  switch (status) {
    case 400: return detail || 'Something looks wrong with your input.';
    case 401: return detail || 'Incorrect credentials.';
    case 403: return 'You do not have permission to do that.';
    case 404: return detail || 'Not found.';
    case 409: return detail || 'That email or username is already taken.';
    case 422:
      if (Array.isArray(data?.detail)) {
        return data.detail[0]?.msg || 'Some fields are invalid.';
      }
      return detail || 'Validation failed. Please check your input.';
    case 429: return 'Too many attempts. Please wait a moment.';
    case 500:
    case 502:
    case 503: return 'The server ran into a problem. Please try again shortly.';
    default: return detail || `Unexpected error (${status}). Please try again.`;
  }
}
