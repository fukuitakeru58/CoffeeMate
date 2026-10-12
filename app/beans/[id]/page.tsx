import { requireChatGPTUser } from "../../chatgpt-auth";
import BeanLibrary from "../bean-library";

export const dynamic = "force-dynamic";

export default async function BeanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireChatGPTUser(`/beans/${id}`);
  return <BeanLibrary initialId={id} />;
}
