import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { recipes } from "../../../db/schema";
import { listRecipes, parseRecipe, type RecipeSort, type SortDirection } from "../../../lib/recipes";
import { generatedRecipeTitle, resolveBean, resolveDripper } from "../../../lib/catalog";
import { getProfile } from "../../../lib/profiles";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") || "feed";
  const sort = params.get("sort") || "date";
  const direction = params.get("direction") || "desc";
  if (!["feed", "mine", "saved", "following", "profile"].includes(scope)) return Response.json({ error: "表示範囲を確認してください" }, { status: 400 });
  if (!["date", "likes", "saves", "comments"].includes(sort) || !["asc", "desc"].includes(direction)) return Response.json({ error: "並び順を確認してください" }, { status: 400 });
  if (scope !== "feed" && scope !== "profile" && !user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const profileUserId = scope === "profile" ? params.get("userId") || "" : "";
  if (scope === "profile" && !profileUserId) return Response.json({ error: "作成者を指定してください" }, { status: 400 });
  try {
    return Response.json({ recipes: await listRecipes(scope, user?.userId, profileUserId, { roast: params.get("roast") || undefined, country: params.get("country") || undefined, dripper: params.get("dripper") || undefined, sort: sort as RecipeSort, direction: direction as SortDirection }) });
  } catch {
    return Response.json({ error: "レシピを読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const profile = await getProfile(user.userId);
  if (!profile) return Response.json({ error: "先にマイページを作成してください" }, { status: 409 });
  let data;
  try { data = parseRecipe(await request.json()); } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  if (!data) return Response.json({ error: "入力を確認してください" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const bean = await resolveBean(user.userId, data.beanId, data.bean);
    const dripper = await resolveDripper(user.userId, data.dripperId, data.dripper);
    const title = data.title || await generatedRecipeTitle(user.userId);
    const recipe = { ...data, title, bean: bean?.name ?? "", beanId: bean?.id ?? null, dripper: dripper?.name ?? "", dripperId: dripper?.id ?? null, id: crypto.randomUUID(), userId: user.userId, authorName: profile.displayName, steps: JSON.stringify(data.steps), actualBrew: data.actualBrew ? JSON.stringify(data.actualBrew) : null, createdAt: now, updatedAt: now };
    await getDb().insert(recipes).values(recipe);
    return Response.json({ id: recipe.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存できませんでした";
    return Response.json({ error: message }, { status: message.includes("見つかりません") ? 400 : 500 });
  }
}
