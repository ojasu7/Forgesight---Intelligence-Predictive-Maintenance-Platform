# ForgeSight — Manufacturing Intelligence

## Tagline
Turn machine telemetry into explainable anomaly signals and better production scheduling decisions.

## Track
AI + Business

## Inspiration and problem
Small 3D-print farms need to decide what machine receives each order. A sensor dashboard can show temperature and motor current, but it does not necessarily connect abnormal machine behavior to a delayed customer order or wasted material. ForgeSight connects those layers in a single interactive prototype.

## What it does
ForgeSight provides a six-printer manufacturing sandbox. It generates sensor observation windows, classifies patterns with a trained machine-learning model, explains which signals differ from a healthy baseline, and compares production schedules using deadlines, machine availability, material compatibility, and a transparent cost model. Operators can inject a fault, take a machine offline, change cost assumptions, and compare a baseline queue with a computed alternative. Real CSV files can be imported using the stated sensor schema, but the model is not validated for real-printer deployment.

## How it was built
The interface uses HTML, CSS, and JavaScript. A Python pipeline generates labeled synthetic telemetry windows and fits a standardized multinomial logistic regression using scikit-learn. The learned coefficients are exported as JSON so the browser performs actual model inference without an API or LLM. A deadline-aware greedy dispatch algorithm is improved through local machine-assignment and sequence search; it retains the baseline if the candidate does not improve the objective. Explanations are deterministic templates linked to the model output.

## AI contribution
The product's own AI is a trained classifier distinguishing normal operation, extrusion blockage, thermal instability, and mechanical vibration. Separately, ChatGPT/Codex assisted with implementing and documenting the project. The model, simulator, scheduler, and interface were created during this build. Personal/team roles should be listed accurately on the final submission.

## Evaluation and claims
Training: 3,600 synthetic windows. Test: 1,200 held-out synthetic windows generated with an independent seed from the same simulator. Accuracy: 98.58%; macro F1: 0.986. These are synthetic benchmark results, not real-machine performance. The anomaly score describes model resemblance to simulated fault classes; it is not a calibrated failure probability or remaining-life prediction.

Scheduling results are computed from the live scenario and stated cost assumptions. They do not establish actual revenue, savings, downtime reduction, or industrial deployment. The source includes tests for inference normalization, fault-pattern recognition, schedule feasibility, cost arithmetic, and CSV input validation.

## What is working
- Six-machine telemetry dashboard and three injected fault types.
- Trained classification with inspectable learned weights.
- Deadline-aware schedule comparison and Gantt display.
- Adjustable business-cost assumptions and machine constraints.
- CSV input, CSV and JSON export, and sandbox plan acceptance.
- Built-in demo walkthrough and transparent model evidence.

## What is next
A pilot with labeled printer telemetry, machine-specific baselines, real-data evaluation and score calibration, and scheduling comparisons using measured outcomes. Camera defect detection and machine control are possible future features; neither is implemented in this version.

## Links to add before submission
- Public GitHub source: https://github.com/ojasu7/Forgesight---Intelligence-Predictive-Maintenance-Platform
- Public 2–4 minute video: [paste your video URL]
- Public live demo: https://forgesight.stableash8.chatgpt.site
- Architecture diagram: https://forgesight.stableash8.chatgpt.site/docs/architecture.png

## Recording script (approximately 2–3 minutes)

**Automatic recording option:** Start a screen recording, then press **Start demo · 3 min** in the app header. After a 3-second countdown, the complete 180-second guided sequence runs itself with on-screen narration and transitions. Stop recording at the completion screen. Use fullscreen and keep the tab visible. No narration audio is generated; the script below is optional if you want to add your own voice.

0:00–0:25 — “A small print farm needs to decide which machine gets the next job. A late order or a bad print costs time and material. ForgeSight connects machine signals to those business decisions.”

0:25–0:55 — Open Factory overview and click Hold telemetry. Select P03; inject Extrusion blockage. “These sensor readings are simulated. Motor current rises and extrusion flow falls. A trained classifier recognizes the pattern, and the strongest signal deviations are visible.”

0:55–1:35 — Click Optimize production. Read the actual displayed baseline and proposed costs and late-order counts. “A compatible round-robin schedule is compared with a deadline-aware local search. Current jobs stay where they are; only future work is replanned. The cost assumptions are editable.” Take P03 offline and recalculate if time permits.

1:35–2:15 — Open Model & evidence. “This is a four-class logistic regression trained on 3,600 synthetic windows and tested on 1,200 new ones. The weights run directly in the browser. The test generator is the same as the training generator, so this is a synthetic benchmark—not real-world validation.”

2:15–2:40 — “You can import telemetry in the sample CSV format. The next step is collecting labeled real-printer data, calibrating the model, and testing whether the recommendations actually improve outcomes.”

## Submission checklist

1. Confirm the source files and README are visible in the public GitHub repository.
2. Open the public live demo and architecture diagram from the links above.
3. Record the functioning app; upload the video publicly and verify playback.
4. Add both links to Devpost; select AI + Business and list teammates.
5. Add the public live demo and architecture diagram to Devpost so judges can view the project without running it.
6. Include screenshots if desired and retain the synthetic-data and AI-assistance disclosures above.
7. Submit through your own account before the event deadline. This project has not been submitted automatically.

## Resume wording after you understand and complete the project

“Created an AI-assisted manufacturing decision-support prototype; integrated a four-class telemetry model trained on synthetic sensor windows with material-constrained scheduling and transparent scenario-cost analysis.”

Only list an award if awarded. Describe personally written code, deployments, real users, or measured improvements only if they actually occurred.
