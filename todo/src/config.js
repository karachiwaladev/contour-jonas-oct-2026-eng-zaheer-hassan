// App-wide constants. Change behaviour here, not in scattered literals.
export const DB_NAME = "todo-app";
export const DB_VERSION = 1;
export const STORE = "tasks";
export const FILTER_KEY = "todo-app:filter";

// A task due within this many days (today included) is "due soon".
export const DUE_SOON_DAYS = 1;

// Stryker disable next-line StringLiteral: normalize() falls back to "none" for any unknown value, so mutating "none" here is equivalent
export const REPEATS = ["none", "daily", "weekly", "monthly"];
