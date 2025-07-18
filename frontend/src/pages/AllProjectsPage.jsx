// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useDebounce } from 'use-debounce'

import apiClient from '../api.js'
import ProjectList from '../components/ProjectList.jsx'
import AddProject from '../components/AddProject.jsx'
import SearchInput from '../components/SearchInput.jsx'
import Pagination from '../components/Pagination.jsx'
import './HomePage.css'

function HomePage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchProjects = useCallback(
    async (pageToFetch) => {
      setLoading(true)
      try {
        const params = {
          search: debouncedSearchTerm,
          page: pageToFetch || currentPage,
        }
        const response = await apiClient.get('/api/projects/', { params })
        setProjects(response.data.results)
        const count = response.data.count
        setTotalPages(Math.ceil(count / 6))
      } catch (error) {
        console.error('Fetch Error:', error)
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearchTerm, currentPage]
  )

  useEffect(() => {
    // เมื่อ search term เปลี่ยน, ให้กลับไปหน้า 1 เสมอ
    if (debouncedSearchTerm) {
      setCurrentPage(1)
    }
    fetchProjects()
  }, [debouncedSearchTerm, currentPage, fetchProjects])

  const handleProjectAdded = async (newProjectData) => {
    try {
      await apiClient.post('/api/projects/', newProjectData)

      // --- ส่วนที่แก้ไข ---
      // 1. เคลียร์ช่องค้นหา
      setSearchTerm('')

      // 2. ตรวจสอบว่าอยู่หน้า 1 หรือไม่
      if (currentPage === 1) {
        // ถ้าอยู่หน้า 1 แล้ว ให้ดึงข้อมูลใหม่โดยตรงเลย
        fetchProjects(1)
      } else {
        // ถ้าอยู่หน้าอื่น ให้เปลี่ยนไปหน้า 1 แล้ว useEffect จะดึงข้อมูลให้เอง
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Add Error:', error)
      alert('Failed to add project.')
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <div className='homepage-layout'>
      <div className='project-list-section'>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
        {loading ? (
          <p>Loading projects...</p>
        ) : (
          <ProjectList projects={projects} />
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
      <div className='add-project-section'>
        <AddProject onProjectAdded={handleProjectAdded} />
      </div>
    </div>
  )
}

export default HomePage
