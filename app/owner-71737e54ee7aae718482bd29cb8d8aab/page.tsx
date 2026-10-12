import type { Metadata } from "next";
import { Coffee, LockKeyhole } from "lucide-react";
import { ADMIN_PAGE_PATH, ADMIN_SIGN_IN_PATH, getSiteAdmin } from "../../lib/site-admin";
import AdminDashboard from "../admin/admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getSiteAdmin();
  if (admin) return <AdminDashboard />;
  return <div className="site-shell"><header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><a className="outline-button" href="/">サイトに戻る</a></div></header><main className="admin-gate"><div className="admin-gate-icon"><LockKeyhole size={27} /></div><span className="section-kicker">SITE MANAGEMENT</span><h1>管理人ページ</h1><p>管理操作には、CoffeeMateの所有者のChatGPTアカウントでのログインが必要です。レシピの投稿など通常の利用にはCoffeeMateのユーザー名とパスワードを使えます。</p><a className="primary-button" href={ADMIN_SIGN_IN_PATH} target="_top">ChatGPTで管理人ログイン</a><a className="admin-switch-account" href={`/signout-with-chatgpt?return_to=${encodeURIComponent(ADMIN_PAGE_PATH)}`} target="_top">別のChatGPTアカウントでログイン</a></main></div>;
}
