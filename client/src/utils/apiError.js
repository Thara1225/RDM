export function getApiError(error, fallbackMessage = 'Something went wrong') {
  if (!error) {
    return fallbackMessage;
  }

  return (
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.message ||
    fallbackMessage
  );
}
