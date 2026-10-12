import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { recipes } from "../../../db/schema";
import { listRecipes, parseRecipe } from "../../../lib/recipes";
import { generatedRecipeTitle, resolveBean } from "../../../lib/catalog";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const scope = new URL(request.url).searchParams.get("scope") || "feed";
  if (scope !== "feed" && !user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  try {
    return Response.json({ recipes: await listRecipes(scope, user?.userId) });
  } catch {
    return Response.json({ error: "レシピを読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let data;
  try { data = parseRecipe(await request.json()); } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  if (!data) return Response.json({ error: "入力を確認してください" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const bean = await resolveBean(user.userId, data.beanId, data.bean);
    const title = data.title || await generatedRecipeTitle(user.userId);
    const recipe = { ...data, title, bean: bean?.name ?? "", beanId: bean?.id ?? null, id: crypto.randomUUID(), userId: user.userId, authorName: user.displayName, steps: JSON.stringify(data.steps), createdAt: now, updatedAt: now };
    await getDb().insert(recipes).values(recipe);
    return Response.json({ id: recipe.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存できませんでした";
    return Response.json({ error: message }, { status: message.includes("コーヒー豆が見つかりません") ? 400 : 500 });
  }
}
