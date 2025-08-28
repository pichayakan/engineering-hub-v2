// frontend/src/utils/formatDate.js

export const formatDate = (dateString, includeTime = false) => {
  // If the date string is null, empty, or invalid, return a placeholder
  if (!dateString) {
    console.warn("formatDate: dateString is null or empty", { dateString });
    return "---";
  }

  // Log input for debugging
  console.log("formatDate: Input dateString", { dateString });

  // Append timezone if dateString lacks time component
  let parsedDateString = dateString;
  if (includeTime && !dateString.includes("T")) {
    parsedDateString = `${dateString}T00:00:00+07:00`; // Assume midnight Thailand time
  }

  const date = new Date(parsedDateString);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn("formatDate: Invalid date parsed", {
      dateString,
      parsedDateString,
    });
    return "Invalid Date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const monthIndex = date.getMonth(); // 0-indexed (0 = January, 11 = December)
  const year = date.getFullYear() + 543; // Convert to Buddhist Era (BE)

  // Thai month names
  const thaiMonths = [
    "ม.ค.",
    "ก.พ",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  let formatted = `${day} ${thaiMonths[monthIndex]} ${year}`;

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    console.log("formatDate: Time components", { hours, minutes });
    formatted += ` ${hours}:${minutes} น.`;
  }

  return formatted;
};
