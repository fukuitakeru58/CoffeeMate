import { requireAuthUser } from "../auth";
import BeanLibrary from "./bean-library";

export const dynamic = "force-dynamic";

export default async function BeansPage() {
  const user = await requireAuthUser("/beans");
  return <BeanLibrary initialId={null} userId={user.userId} />;
}
