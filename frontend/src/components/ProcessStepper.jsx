// frontend/src/components/ProcessStepper.jsx
import React from "react";
import "./ProcessStepper.css";

function ProcessStepper({ steps, currentStepId, history }) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const historyByStepId = {};
  history.forEach((h) => {
    historyByStepId[h.step.id] = h;
  });

  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);

  let progressPercentage = 0;
  if (currentStepIndex >= 0) {
    progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;
  } else if (history.length >= steps.length) {
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
          if (
            historyRecord.action === "SENT_BACK" ||
            step.id === currentStepId
          ) {
            status = "current";
          } else {
            status = "completed";
          }
        }

        if (step.id === currentStepId) {
          status = "current";
        }

        // The official currentStepId always takes precedence for the progress bar
        const isCompletedForProgress = currentStepIndex > index;
        if (isCompletedForProgress) {
          status = "completed";
        }
        if (step.id === currentStepId) {
          status = "current";
        }

        return (
          <div className={`step ${status}`} key={step.id}>
            {/* --- ✅ UPDATED LINE --- */}
            {/* Changed to show a checkmark on completed steps */}
            <div className="step-circle">
              {status === "completed" ? "✓" : index + 1}
            </div>
            <div className="step-label">{step.name}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ProcessStepper;
