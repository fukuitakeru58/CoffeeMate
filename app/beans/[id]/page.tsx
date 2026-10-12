import { requireAuthUser } from "../../auth";
import BeanLibrary from "../bean-library";

export const dynamic = "force-dynamic";

export default async function BeanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuthUser(`/beans/${id}`);
  return <BeanLibrary initialId={id} userId={user.userId} />;
}
