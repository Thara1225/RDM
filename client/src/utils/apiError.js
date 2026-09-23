const fieldLabels = {
  productId: 'Product',
  materialId: 'Material',
  quantityCut: 'Quantity cut',
  clothUsed: 'Cloth used',
  cutDate: 'Date',
  fromDate: 'From date',
  toDate: 'To date',
  name: 'Name',
  email: 'Email',
  password: 'Password'
};

function getValidationMessage(details) {
  const issue = Array.isArray(details) ? details[0] : null;
  if (!issue) {
    return null;
  }

  const field = fieldLabels[issue.path] || issue.path || 'This field';
  const message = issue.message || 'has an invalid value';

  if (message.includes('expected number') || message.includes('Too small')) {
    return `${field} is required and must be greater than 0.`;
  }

  if (message.includes('Invalid date')) {
    return `${field} must be a valid date.`;
  }

  return `${field}: ${message}`;
}

export function getApiError(error, fallbackMessage = 'Something went wrong') {
  if (!error) {
    return fallbackMessage;
  }

  const responseError = error.response?.data?.error;
  return (
    getValidationMessage(responseError?.details) ||
    responseError?.message ||
    error.response?.data?.message ||
    error.message ||
    fallbackMessage
  );
}
