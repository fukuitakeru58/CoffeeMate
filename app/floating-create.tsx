import { Plus } from "lucide-react";

export default function FloatingCreate() {
  return <a className="floating-create" href="/?new=1" aria-label="新しいレシピを作成" title="新しいレシピを作成"><Plus size={29} strokeWidth={2.2} aria-hidden="true" /></a>;
}
