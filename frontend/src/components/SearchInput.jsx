// frontend/src/components/SearchInput.jsx
import React, { useRef, useEffect } from "react";
import "./SearchInput.css";

function SearchInput({ value, onChange }) {
  const inputRef = useRef(null);

  // คงโฟกัสเมื่อ rerender
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // ป้องกัน Enter จากการ trigger reload
    }
  };

  return (
    <div className="search-container">
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search requests..." // แก้ placeholder ให้ตรงกับ procurement
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default SearchInput;
