type Props = { method: string; country?: string; roast?: string; serving?: string; dripper?: string; className?: string };

export default function RecipeBadges({ method, country, roast, serving, dripper, className = "" }: Props) {
  return <span className={`recipe-badges ${className}`}>
    <span className="recipe-method">{method}</span>
    {country && <span className="recipe-badge" title={`原産国: ${country}`}>{country}</span>}
    {roast && <span className="recipe-badge" title={`焙煎度: ${roast}`}>{roast}</span>}
    {serving && <span className={`recipe-badge serving-${serving}`}>{serving === "iced" ? "アイス" : "ホット"}</span>}
    {dripper && <span className="recipe-badge recipe-badge-dripper" title={`ドリッパー: ${dripper}`}>{dripper}</span>}
  </span>;
}
