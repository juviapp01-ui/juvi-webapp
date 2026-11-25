import { AxiosError } from 'axios';

// Firebase's native error messages ("[auth/invalid-phone-number] The format
// of the phone number provided is incorrect.") are accurate but not something
// to show a user — map the codes people actually hit during phone sign-in.
const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'That phone number doesn’t look right. Please check and try again.',
  'auth/missing-phone-number': 'Please enter a phone number.',
  'auth/quota-exceeded': 'Too many attempts right now. Please try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a bit before trying again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/invalid-verification-code': 'That code isn’t right. Please check and try again.',
  'auth/code-expired': 'This code has expired. Please request a new one.',
  'auth/session-expired': 'This code has expired. Please request a new one.',
};

// True when a request never got any HTTP response: the connection couldn't be
// made or was dropped. Axios reports this as a bare "Network Error", which is
// meaningless to a user (App Review flagged exactly that on the verify step).
export function isNetworkFailure(error: unknown): boolean {
  const axiosError = error as AxiosError;
  return !!axiosError?.isAxiosError && !axiosError.response && axiosError.code !== AxiosError.ECONNABORTED;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if ((error as { code?: string })?.code === 'NO_AUTH_TOKEN') {
    return 'Your session could not be verified. Please log out and log back in.';
  }
  const firebaseCode = (error as { code?: string })?.code;
  if (firebaseCode && FIREBASE_AUTH_ERROR_MESSAGES[firebaseCode]) {
    return FIREBASE_AUTH_ERROR_MESSAGES[firebaseCode];
  }
  const axiosError = error as AxiosError<{ message?: string }>;
  if (axiosError?.response?.data?.message) return axiosError.response.data.message;
  if (isNetworkFailure(error)) {
    return 'Couldn’t reach JUVI. Please check your internet connection and try again.';
  }
  if (axiosError?.isAxiosError && axiosError.code === AxiosError.ECONNABORTED) {
    return 'JUVI is taking too long to respond. Please try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
