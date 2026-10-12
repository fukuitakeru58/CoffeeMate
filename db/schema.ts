import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  method: text("method").notNull(),
  bean: text("bean").notNull(),
  roast: text("roast").notNull().default("中煎り"),
  grinder: text("grinder").notNull().default(""),
  grind: text("grind").notNull().default("中挽き"),
  grindClicks: text("grind_clicks").notNull().default(""),
  dose: real("dose").notNull(),
  water: real("water").notNull(),
  temperature: real("temperature").notNull(),
  targetTime: integer("target_time").notNull(),
  actualTime: integer("actual_time"),
  hypothesis: text("hypothesis").notNull().default(""),
  steps: text("steps").notNull().default("[]"),
  tasting: text("tasting").notNull().default(""),
  rating: integer("rating"),
  visibility: text("visibility").notNull().default("private"),
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
  createdAt: text("created_at").notNull(),
});
