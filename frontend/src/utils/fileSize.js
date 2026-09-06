// Shared client-side cap for document uploads.
// Toast-library agnostic on purpose — the app mounts both `sonner` and
// `react-toastify`, so callers surface the returned message with whichever
// toast they already import.
export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const isFileTooLarge = (file) => !!file && file.size > MAX_UPLOAD_SIZE_BYTES;

/**
 * Returns an error message when the file exceeds the cap, otherwise null.
 */
export const getFileSizeError = (file) =>
  isFileTooLarge(file)
    ? `"${file.name}" is larger than ${MAX_UPLOAD_SIZE_MB}MB. Please upload a smaller file.`
    : null;

/**
 * Splits a FileList/array into the files within the cap and a message
 * describing how many were skipped (null when none were).
 */
export const filterOversizedFiles = (fileList) => {
  const all = Array.from(fileList ?? []);
  const allowed = all.filter((file) => !isFileTooLarge(file));
  const rejected = all.length - allowed.length;

  return {
    allowed,
    error:
      rejected === 0
        ? null
        : rejected === 1
          ? `1 file is larger than ${MAX_UPLOAD_SIZE_MB}MB and was skipped.`
          : `${rejected} files are larger than ${MAX_UPLOAD_SIZE_MB}MB and were skipped.`,
  };
};
