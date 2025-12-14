/**
 * Operations Pattern - Central export file for all crawler operations
 * 
 * This file exports all operations grouped by category.
 * Each operation is a pure function that takes dependencies as parameters.
 */

// Browser operations
export * from './browser/create-browser-session.operation';
export * from './browser/navigate-to-page.operation';

// Authentication operations
export * from './authentication/login-and-select-world.operation';
export * from './authentication/check-login-status.operation';

// Validation operations
export * from './validation/validate-auto-scavenging-enabled.operation';
export * from './validation/validate-orchestrator-enabled.operation';
export * from './validation/validate-construction-queue-enabled.operation';
export * from './validation/validate-mini-attacks-enabled.operation';
export * from './validation/validate-army-training-enabled.operation';
export * from './validation/validate-player-village-attacks-enabled.operation';

// Query operations
export * from './query/get-scavenging-time-data.operation';
export * from './query/get-village-scavenging-data.operation';
export * from './query/get-active-servers.operation';
export * from './query/get-server-info.operation';
export * from './query/get-enabled-villages.operation';
export * from './query/get-multi-server-status.operation';

// Scavenging operations
export * from './scavenging/pre-filter-villages.operation';
export * from './scavenging/collect-scavenging-time-data.operation';
export * from './scavenging/process-village-scavenging.operation';
export * from './scavenging/perform-scavenging.operation';
export * from './scavenging/perform-scavenging-for-village.operation';
export * from './scavenging/dispatch-scavenging-level.operation';
export * from './scavenging/update-village-state-after-dispatch.operation';
export * from './scavenging/calculate-optimal-schedule-time.operation';
export * from './scavenging/reset-scavenging-time-data.operation';

// Scheduling operations
export * from './scheduling/schedule-next-scavenge-run.operation';
export * from './scheduling/calculate-next-execution-time.operation';
export * from './scheduling/update-next-construction-time.operation';
export * from './scheduling/update-next-scavenging-time.operation';
export * from './scheduling/update-next-mini-attack-time.operation';
export * from './scheduling/update-next-player-village-attack-time.operation';
export * from './scheduling/update-next-army-training-time.operation';
export * from './scheduling/update-next-execution-time-for-failed-task.operation';
export * from './scheduling/find-next-task-to-execute.operation';

// Execution operations
export * from './execution/execute-scavenging-task.operation';
export * from './execution/execute-construction-queue-task.operation';
export * from './execution/execute-mini-attacks-task.operation';
export * from './execution/execute-army-training-task.operation';
export * from './execution/execute-player-village-attacks-task.operation';
export * from './execution/execute-server-task.operation';

// Attacks operations
export * from './attacks/perform-attack.operation';
export * from './attacks/perform-support.operation';
export * from './attacks/schedule-all-attacks.operation';
export * from './attacks/fill-attack-units.operation';

// Captcha operations
export * from './captcha/click-bot-protection-quest.operation';
export * from './captcha/click-captcha-button.operation';
export * from './captcha/resolve-captcha.operation';
export * from './captcha/solve-captcha-challenge.operation';
export * from './captcha/check-bot-protection.operation';

// State management operations
export * from './state-management/initialize-multi-server-state.operation';
export * from './state-management/initialize-server-plan.operation';
export * from './state-management/refresh-active-servers.operation';
export * from './state-management/update-server-task-states.operation';
export * from './state-management/reset-scavenging-data.operation';

// Monitoring operations
export * from './monitoring/start-monitoring.operation';
export * from './monitoring/check-and-start-orchestrator.operation';
export * from './monitoring/start-memory-monitoring.operation';
export * from './monitoring/log-detailed-task-schedule.operation';

// Calculations operations
export * from './calculations/calculate-random-construction-interval.operation';
export * from './calculations/calculate-random-mini-attack-interval.operation';
export * from './calculations/calculate-random-army-training-interval.operation';
export * from './calculations/get-mini-attack-intervals.operation';
export * from './calculations/get-initial-intervals.operation';

// Execution operations
export * from './execution/execute-server-task.operation';
export * from './execution/execute-scavenging-task.operation';
export * from './execution/execute-construction-queue-task.operation';
export * from './execution/execute-mini-attacks-task.operation';
export * from './execution/execute-army-training-task.operation';
export * from './execution/execute-player-village-attacks-task.operation';

// Utilities operations
export * from './utilities/minutes-to-milliseconds.operation';
export * from './utilities/format-execution-time.operation';
export * from './utilities/format-memory-usage.operation';


