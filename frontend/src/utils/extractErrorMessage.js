/**
 * Backend error responses arrive in one of three shapes:
 *  1. sendError() plain string:  {success:false, message: "INVALID_CREDENTIALS"}
 *  2. sendError() with a validator MessageBag: {success:false, message: {field: ["msg"]}}
 *  3. Laravel ValidationException (rate limits): {message: "generic", errors: {field: ["msg"]}}
 *     — errors is a SIBLING of message here, not nested inside it, and is the
 *     actually-useful text (message is just "The given data was invalid.").
 * This checks `errors` first since it's the most specific when present.
 */
export default function extractErrorMessage(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (!data) return fallback;

  if (data.errors && typeof data.errors === "object") {
    const joined = Object.values(data.errors).flat().join(", ");
    if (joined) return joined;
  }

  if (data.message) {
    if (typeof data.message === "object") {
      const joined = Object.values(data.message).flat().join(", ");
      if (joined) return joined;
    } else {
      return data.message;
    }
  }

  return fallback;
}
