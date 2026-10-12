"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Coffee, Heart, LogOut, Pencil, UserPlus, Users } from "lucide-react";
import DripperPicker, { type DripperOption } from "../dripper-picker";
import RecipeBadges from "../recipe-badges";

type Profile = { userId: string; displayName: string; bio: string; createdAt: string; followerCount: number; followingCount: number; publicRecipeCount: number; isFollowing: boolean; isOwn: boolean };
type RecipePreview = { id: string; title: string; method: string; serving: "hot" | "iced" | ""; bean: string; beanCountry: string; roast: string; dripper: string; dose: number; water: number; temperature: number; createdAt: string; imageKey: string | null; visibility: "public" | "private" };

export default function ProfileView({ profileId, initialName, initialBio, accountName, currentUserId, currentUserAuthKind }: { profileId: string; initialName: string; initialBio: string; accountName: string | null; currentUserId: string | null; currentUserAuthKind: "chatgpt" | "local" | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<RecipePreview[]>([]);
  const [dripperOptions, setDripperOptions] = useState<DripperOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [busyFollow, setBusyFollow] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [profileResponse, recipeResponse] = await Promise.all([
      fetch(`/api/profiles/${encodeURIComponent(profileId)}`),
      fetch(`/api/recipes?scope=profile&userId=${encodeURIComponent(profileId)}`),
    ]);
    const profileData = await profileResponse.json() as { profile?: Profile; error?: string };
    const recipeData = await recipeResponse.json() as { recipes?: RecipePreview[]; error?: string };
    if (!profileResponse.ok || !profileData.profile || !recipeResponse.ok) throw new Error(profileData.error || recipeData.error || "マイページを読み込めませんでした");
    setProfile(profileData.profile);
    setRecipes(recipeData.recipes || []);
  }, [profileId]);

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "読み込めませんでした")); }, [load]);
  useEffect(() => { if (!currentUserId || currentUserId !== profileId) return; void fetch("/api/drippers").then(async (response) => { if (response.ok) setDripperOptions(((await response.json()) as { drippers: DripperOption[] }).drippers); }); }, [currentUserId, profileId]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, bio }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "保存できませんでした");
      await load(); setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存できませんでした"); }
    finally { setSaving(false); }
  }

  async function toggleFollow() {
    if (!profile) return;
    setBusyFollow(true); setError("");
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/follow`, { method: profile.isFollowing ? "DELETE" : "PUT" });
      const data = await response.json() as { following?: boolean; followerCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "フォローを変更できませんでした");
      setProfile((current) => current ? { ...current, isFollowing: Boolean(data.following), followerCount: data.followerCount ?? current.followerCount } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "フォローを変更できませんでした"); }
    finally { setBusyFollow(false); }
  }

  const name = profile?.displayName || initialName;
  const own = currentUserId === profileId;
  return <div className="site-shell profile-page"><header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><nav className="top-nav"><a href="/">レシピ</a>{currentUserId && <a href={`/users/${encodeURIComponent(currentUserId)}`}>マイページ</a>}<a href="/beans">コーヒー豆</a></nav><div className="header-actions"><a className="profile-back-link" href="/"><ArrowLeft size={15} /> レシピ一覧</a>{currentUserId ? <a className="logout-link" href="/logout" target="_top"><LogOut size={15} /> ログアウト</a> : <a className="login-link" href={`/login?return_to=${encodeURIComponent(`/users/${profileId}`)}`} target="_top">ログイン</a>}</div></div></header>
    <main className="profile-wrap"><section className="profile-banner"><div className="profile-banner-pattern" /><span>COFFEE PEOPLE</span></section><section className="profile-card"><div className="profile-avatar">{name.slice(0, 1).toUpperCase()}</div><div className="profile-intro"><span className="section-kicker">{own ? "MY COFFEE PAGE" : "COFFEE MATE PROFILE"}</span><h1>{name}</h1>{accountName && <span className="profile-handle">@{accountName}</span>}<p>{profile?.bio || initialBio || "コーヒーの記録を少しずつ。"}</p><div className="profile-counts"><span><strong>{profile?.publicRecipeCount ?? 0}</strong> 公開レシピ</span><span><strong>{profile?.followerCount ?? 0}</strong> フォロワー</span><span><strong>{profile?.followingCount ?? 0}</strong> フォロー中</span></div></div><div className="profile-actions">{own ? <><button className="outline-button" onClick={() => { setDisplayName(name); setBio(profile?.bio || ""); setEditing(!editing); }}><Pencil size={15} /> {editing ? "編集を閉じる" : "プロフィールを編集"}</button>{currentUserAuthKind === "chatgpt" && !accountName && <a className="outline-button" href={`/login?return_to=${encodeURIComponent(`/users/${profileId}`)}`}>ユーザー名ログインを追加</a>}</> : currentUserId ? <button className={profile?.isFollowing ? "outline-button" : "primary-button"} disabled={busyFollow || !profile} onClick={() => void toggleFollow()}><UserPlus size={16} /> {profile?.isFollowing ? "フォロー中" : "フォローする"}</button> : <a className="primary-button" href={`/login?return_to=${encodeURIComponent(`/users/${profileId}`)}`} target="_top"><UserPlus size={16} /> ログインしてフォロー</a>}</div></section>
    {editing && own && <form className="profile-edit" onSubmit={(event) => void saveProfile(event)}><h2>プロフィールを編集</h2><div className="profile-edit-fields"><label>表示名 <strong>必須</strong><input required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>自己紹介 <span>任意</span><textarea rows={3} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="好きな豆や淹れ方など" /></label></div><button className="primary-button" type="submit" disabled={saving || !displayName.trim()}>{saving ? "保存中..." : "変更を保存"}</button></form>}
    {error && <p className="profile-error" role="alert">{error}</p>}
    {own && <section className="profile-drippers"><div><span className="section-kicker">MY TOOLS</span><h2>マイドリッパー</h2><p>レシピ作成時にここで登録したドリッパーを選べます。</p></div><DripperPicker options={dripperOptions} onAdded={(item) => setDripperOptions((current) => current.some((saved) => saved.id === item.id) ? current : [...current, item])} onError={setError} /></section>}
    <section className="profile-recipes"><div className="profile-recipes-title"><div><span className="section-kicker">BREW JOURNAL</span><h2>{own ? "あなたのレシピ" : `${name}さんのレシピ`}</h2><p>{own ? "非公開のレシピもここに表示されます。" : "一般公開されたレシピをまとめて見られます。"}</p></div><span className="profile-recipes-count"><Coffee size={16} /> {recipes.length} 件</span></div>{recipes.length ? <div className="profile-recipe-grid">{recipes.map((recipe) => <a className={`profile-recipe-card${recipe.imageKey ? " with-image" : ""}`} key={recipe.id} href={`/?recipe=${encodeURIComponent(recipe.id)}`}>{recipe.imageKey && <img className="profile-recipe-image" src={`/api/recipes/${encodeURIComponent(recipe.id)}/image?v=${encodeURIComponent(recipe.imageKey)}`} alt="" loading="lazy" />}<RecipeBadges className="profile-recipe-badges" method={recipe.method} country={recipe.beanCountry} roast={recipe.roast} serving={recipe.serving} dripper={recipe.dripper} />{recipe.visibility === "private" && <span className="private-tag">非公開</span>}<h3>{recipe.title}</h3><p>{recipe.bean || "豆未設定"}</p><div className="profile-recipe-stats"><span>{recipe.dose}g</span><span>{recipe.water}ml</span><span>{recipe.temperature}℃</span></div><span className="profile-recipe-more">レシピを見る <ArrowRight size={15} /></span></a>)}</div> : <div className="profile-empty"><Users size={29} /><h3>公開レシピはまだありません</h3><p>{own ? "新しい一杯を記録してみましょう。" : "新しいレシピが投稿されるのを待ちましょう。"}</p>{own && <a className="primary-button" href="/">レシピを作成</a>}</div>}</section></main></div>;
}
