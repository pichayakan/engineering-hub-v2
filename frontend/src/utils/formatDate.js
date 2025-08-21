// frontend/src/utils/formatDate.js

export const formatDate = (dateString) => {
  // If the date string is null, empty, or invalid, return a placeholder
  if (!dateString) {
    return "---";
  }

  const date = new Date(dateString);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed, so we add 1
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};
