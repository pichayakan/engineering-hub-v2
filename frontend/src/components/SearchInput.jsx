// frontend/src/components/SearchInput.jsx
import React from 'react'
import './SearchInput.css'

function SearchInput({ value, onChange }) {
  return (
    <div className='search-container'>
      <input
        type='text'
        className='search-input'
        placeholder='Search projects...'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default SearchInput
