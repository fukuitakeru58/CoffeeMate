import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const localAccounts = sqliteTable("local_accounts", {
  userId: text("user_id").primaryKey().references(() => profiles.userId, { onDelete: "cascade" }),
  username: text("username").notNull(),
  usernameKey: text("username_key").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  recoveryHash: text("recovery_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("local_accounts_username_key").on(table.usernameKey)]);

export const localSessions = sqliteTable("local_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("local_sessions_user_idx").on(table.userId)]);

export const authThrottles = sqliteTable("auth_throttles", {
  bucketKey: text("bucket_key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
}, (table) => [index("auth_throttles_expires_idx").on(table.expiresAt)]);

export const follows = sqliteTable("follows", {
  followerUserId: text("follower_user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
  followedUserId: text("followed_user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.followerUserId, table.followedUserId] }),
  index("follows_followed_user_idx").on(table.followedUserId),
]);

export const beans = sqliteTable("beans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  country: text("country").notNull().default(""),
  region: text("region").notNull().default(""),
  farm: text("farm").notNull().default(""),
  variety: text("variety").notNull().default(""),
  roast: text("roast").notNull().default(""),
  altitude: integer("altitude"),
  process: text("process").notNull().default(""),
  terroir: text("terroir").notNull().default(""),
  purchasePlace: text("purchase_place").notNull().default(""),
  purchaseMapUrl: text("purchase_map_url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("beans_user_name_key").on(table.userId, table.nameKey)]);

export const grinders = sqliteTable("grinders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  maxClicks: integer("max_clicks").notNull().default(60),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("grinders_user_name").on(table.userId, table.name)]);

export const drippers = sqliteTable("drippers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("drippers_user_name_key").on(table.userId, table.nameKey)]);

export const recipeCounters = sqliteTable("recipe_counters", {
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  count: integer("count").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.date] })]);

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  method: text("method").notNull(),
  serving: text("serving").notNull().default(""),
  bean: text("bean").notNull(),
  beanId: text("bean_id").references(() => beans.id, { onDelete: "set null" }),
  dripper: text("dripper").notNull().default(""),
  dripperId: text("dripper_id").references(() => drippers.id, { onDelete: "set null" }),
  imageKey: text("image_key"),
  roast: text("roast").notNull().default("中煎り"),
  grinder: text("grinder").notNull().default(""),
  grind: text("grind").notNull().default("中挽き"),
  grindClicks: text("grind_clicks").notNull().default(""),
  dose: real("dose").notNull(),
  water: real("water").notNull(),
  temperature: real("temperature").notNull(),
  targetTime: integer("target_time").notNull(),
  actualTime: integer("actual_time"),
  actualBrew: text("actual_brew"),
  hypothesis: text("hypothesis").notNull().default(""),
  steps: text("steps").notNull().default("[]"),
  tasting: text("tasting").notNull().default(""),
  rating: integer("rating"),
  visibility: text("visibility").notNull().default("private"),
  moderationStatus: text("moderation_status").notNull().default("visible"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const likes = sqliteTable("likes", {
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
}, (table) => [primaryKey({ columns: [table.recipeId, table.userId] })]);

export const bookmarks = sqliteTable("bookmarks", {
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  note: text("note").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.recipeId, table.userId] })]);

export const ratings = sqliteTable("ratings", {
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  score: integer("score").notNull(),
}, (table) => [primaryKey({ columns: [table.recipeId, table.userId] })]);

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  moderationStatus: text("moderation_status").notNull().default("visible"),
  createdAt: text("created_at").notNull(),
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reporterUserId: text("reporter_user_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
}, (table) => [
  uniqueIndex("reports_reporter_target_unique").on(table.reporterUserId, table.targetType, table.targetId),
  index("reports_status_created_idx").on(table.status, table.createdAt),
]);

export const moderationActions = sqliteTable("moderation_actions", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("moderation_actions_created_idx").on(table.createdAt)]);
