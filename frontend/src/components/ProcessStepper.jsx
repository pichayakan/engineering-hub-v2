// frontend/src/components/ProcessStepper.jsx
import React from "react";
import "./ProcessStepper.css";

function ProcessStepper({ steps, currentStepId, history }) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const historyByStepId = {};
  history.forEach((h) => {
    // Store the latest history record for each step ID
    historyByStepId[h.step.id] = h;
  });

  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);
  const historyStepIds = history.map((h) => h.step.id);

  // Calculate progress bar width
  let progressPercentage = 0;
  if (currentStepIndex >= 0) {
    progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;
  } else if (history.length >= steps.length) {
    // Completed
    progressPercentage = 100;
  }

  return (
    <div className="stepper-container">
      <div className="stepper-line"></div>
      <div
        className="stepper-progress"
        style={{ width: `${progressPercentage}%` }}
      ></div>
      {steps.map((step, index) => {
        let status = "upcoming";
        const historyRecord = historyByStepId[step.id];

        if (historyRecord) {
          // If the latest action for this step was SENT_BACK, it is now the current step.
          // Or if it's the official currentStepId from the main request object.
          if (
            historyRecord.action === "SENT_BACK" ||
            step.id === currentStepId
          ) {
            status = "current";
          } else {
            status = "completed";
          }
        }

        // The official currentStepId always takes precedence
        if (step.id === currentStepId) {
          status = "current";
        }

        return (
          <div className={`step ${status}`} key={step.id}>
            <div className="step-circle">{index + 1}</div>
            <div className="step-label">{step.name}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ProcessStepper;
