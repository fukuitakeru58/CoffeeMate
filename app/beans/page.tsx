import { requireChatGPTUser } from "../chatgpt-auth";
import BeanLibrary from "./bean-library";

export const dynamic = "force-dynamic";

export default async function BeansPage() {
  await requireChatGPTUser("/beans");
  return <BeanLibrary initialId={null} />;
}
