// frontend/src/components/ProcessStepper.jsx
import React from 'react'
import './ProcessStepper.css'

function ProcessStepper({ steps, currentStepId, history }) {
  if (!steps || steps.length === 0) {
    return null
  }

  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId)
  const historyStepIds = history.map((h) => h.step.id)

  // Calculate progress bar width
  let progressPercentage = 0
  if (currentStepIndex >= 0) {
    progressPercentage = (currentStepIndex / (steps.length - 1)) * 100
  } else if (history.length >= steps.length) {
    // Completed
    progressPercentage = 100
  }

  return (
    <div className='stepper-container'>
      <div className='stepper-line'></div>
      <div
        className='stepper-progress'
        style={{ width: `${progressPercentage}%` }}
      ></div>
      {steps.map((step, index) => {
        let status = 'upcoming'
        if (historyStepIds.includes(step.id)) {
          status = 'completed'
        }
        if (step.id === currentStepId) {
          status = 'current'
        }

        return (
          <div className={`step ${status}`} key={step.id}>
            <div className='step-circle'>{index + 1}</div>
            <div className='step-label'>{step.name}</div>
          </div>
        )
      })}
    </div>
  )
}

export default ProcessStepper
