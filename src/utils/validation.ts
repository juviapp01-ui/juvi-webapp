export const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidOtp = (otp: string, len = 6) =>
  new RegExp(`^\\d{${len}}$`).test(otp);
export const isValidIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
// UPI ID / VPA: name@handle, e.g. priya.k@okaxis or 9876543210@ybl.
export const isValidUpi = (upi: string) => /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(upi);
