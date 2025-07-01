// frontend/src/components/Pagination.jsx
import React from 'react'
import './Pagination.css'

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null
  }

  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <nav className='pagination-container'>
      <ul className='pagination-list'>
        {pageNumbers.map((number) => (
          <li
            key={number}
            className={`page-item ${number === currentPage ? 'active' : ''}`}
          >
            <button onClick={() => onPageChange(number)} className='page-link'>
              {number}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Pagination
