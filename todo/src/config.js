// App-wide constants. Change behaviour here, not in scattered literals.
export const DB_NAME = "todo-app";
export const DB_VERSION = 1;
export const STORE = "tasks";
export const FILTER_KEY = "todo-app:filter";

// A task due within this many days (today included) is "due soon".
export const DUE_SOON_DAYS = 1;

export const REPEATS = ["none", "daily", "weekly", "monthly"];

// Task priority (#18). Unknown or missing values normalise to the default.
export const PRIORITIES = ["high", "medium", "low"];
export const DEFAULT_PRIORITY = "medium";
export const PRIORITY_FILTER_KEY = "todo-app:priority-filter";

// Statuses the footer counts as "open" (#20).
export const OPEN_STATUSES = ["active", "hold"];
