// frontend/src/pages/AllTasksPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api'
import Pagination from '../components/Pagination.jsx'
import SearchInput from '../components/SearchInput.jsx'
import './AllTasksPage.css'

const FILTER_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: '14days', label: 'Last 14 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

function AllTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalTasks, setTotalTasks] = useState(0)

  // --- State for Filters ---
  const [filters, setFilters] = useState({
    date_range: '',
    search: '',
    project: '',
    status: '',
    priority: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // --- State for Dropdown Data ---
  const [projectOptions, setProjectOptions] = useState([])
  const [visiblePhoneUser, setVisiblePhoneUser] = useState(null)

  // Fetch data for dropdowns on initial load
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const projectsRes = await apiClient.get('/api/projects/')
        setProjectOptions(projectsRes.data.results || [])
      } catch (error) {
        console.error('Failed to fetch filter options', error)
      }
    }
    fetchFilterOptions()
  }, [])

  const fetchAllTasks = useCallback(async (page, currentFilters) => {
    setLoading(true)
    try {
      const params = { page, ...currentFilters }
      // Remove empty filter values before sending
      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === null) {
          delete params[key]
        }
      })
      const response = await apiClient.get('/api/all-tasks/', { params })
      setTasks(response.data.results)
      setTotalTasks(response.data.count)
      setTotalPages(Math.ceil(response.data.count / 6)) // 6 is the page_size
    } catch (error) {
      console.error('Failed to fetch all tasks', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce filters
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        fetchAllTasks(1, filters)
      }
    }, 500)
    return () => clearTimeout(handler)
  }, [filters])

  useEffect(() => {
    fetchAllTasks(currentPage, filters)
  }, [currentPage, fetchAllTasks])

  const handleFilterChange = (filterName, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterName]: value,
    }))
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const togglePhoneVisibility = (user) => {
    if (visiblePhoneUser && visiblePhoneUser.id === user.id) {
      setVisiblePhoneUser(null)
    } else {
      setVisiblePhoneUser(user)
    }
  }

  const getDaysRemainingClass = (days) => {
    if (days === null || days === undefined) return 'text-gray-500'
    if (days < 0) return 'text-red-500 font-bold'
    if (days <= 7) return 'text-yellow-500'
    return 'text-green-500'
  }

  const formatDaysRemaining = (days) => {
    if (days === null || days === undefined) return 'N/A'
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return 'Today'
    if (days === 1) return '1 day left'
    return `${days} days left`
  }

  return (
    <div>
      <h1>All Tasks Report</h1>
      <p style={{ color: '#6c757d', marginTop: 0, marginBottom: '2rem' }}>
        A complete overview of all tasks in the system. Total: {totalTasks}{' '}
        tasks.
      </p>

      <div className='controls-wrapper'>
        <SearchInput
          value={filters.search}
          onChange={(val) => handleFilterChange('search', val)}
        />
        <div className='filter-bar'>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-button ${
                filters.date_range === opt.value ? 'active' : ''
              }`}
              onClick={() => handleFilterChange('date_range', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className='advanced-filters'>
        <select
          className='filter-select'
          value={filters.project}
          onChange={(e) => handleFilterChange('project', e.target.value)}
        >
          <option value=''>All Projects</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className='filter-select'
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value=''>All Statuses</option>
          <option value='To Do'>To Do</option>
          <option value='In Progress'>In Progress</option>
          <option value='Done'>Done</option>
        </select>
        <select
          className='filter-select'
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
        >
          <option value=''>All Priorities</option>
          <option value='Low'>Low</option>
          <option value='Medium'>Medium</option>
          <option value='High'>High</option>
        </select>
      </div>

      <div className='tasks-table-wrapper'>
        <table className='tasks-table'>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Assigned By</th>
              <th>Assigned To</th>
              <th>Date Assigned</th>
              <th>Due Date</th>
              <th>Days Remaining</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan='10'
                  style={{ textAlign: 'center', padding: '2rem' }}
                >
                  Loading...
                </td>
              </tr>
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link
                      to={`/projects/${task.project}`}
                      className='task-title-link'
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td>{task.project_name || 'N/A'}</td>
                  <td>
                    {task.created_by_details ? (
                      <button
                        onClick={() =>
                          togglePhoneVisibility(task.created_by_details)
                        }
                        className='name-button'
                      >
                        {task.created_by_details.first_name}{' '}
                        {task.created_by_details.last_name}
                      </button>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className='assigned-to-cell'>
                    <div className='assignee-group'>
                      {task.assignees_details?.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => togglePhoneVisibility(a)}
                          className='assignee-badge clickable'
                        >
                          {a.first_name} {a.last_name}
                        </button>
                      ))}
                    </div>
                    {task.assigned_department_details && (
                      <div className='assignee-group'>
                        <span className='team-badge'>
                          Dept: {task.assigned_department_details.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>{new Date(task.created_at).toLocaleDateString()}</td>
                  <td>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className={getDaysRemainingClass(task.days_remaining)}>
                    {formatDaysRemaining(task.days_remaining)}
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td className='accepted-status'>
                    {task.accepted_by_details?.length > 0 ? (
                      task.accepted_by_details.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => togglePhoneVisibility(a)}
                          className='accepted clickable'
                        >
                          ✔ {a.first_name} {a.last_name}
                        </button>
                      ))
                    ) : (
                      <span className='not-accepted'>Pending Acceptance</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan='10'
                  style={{ textAlign: 'center', padding: '2rem' }}
                >
                  No tasks found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      {visiblePhoneUser && (
        <div className='phone-tooltip'>
          <strong>{visiblePhoneUser.first_name}'s Contact:</strong>
          <br />
          {visiblePhoneUser.phone_number || 'No phone number available'}
        </div>
      )}
    </div>
  )
}

export default AllTasksPage
