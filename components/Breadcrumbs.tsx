import Link from "next/link";
import Icon from "./Icon";

export type Crumb = { label: string; href: string; icon?: string };

/**
 * Jalur lokasi: <nav> berisi <ol>. Pemisah dibuat CSS (tersembunyi dari pembaca layar).
 * Item terakhir tetap tautan dan bertanda aria-current="page" bila `current` diberikan.
 */
export default function Breadcrumbs({ items, current }: { items: Crumb[]; current?: Crumb }) {
  const all = current ? [...items, current] : items;
  return (
    <nav className="crumbs" aria-label="Jejak halaman">
      <ol>
        {all.map((c, i) => (
          <li key={c.href}>
            <Link href={c.href} aria-current={current && i === all.length - 1 ? "page" : undefined}>
              {c.icon && <Icon name={c.icon} size={14} />}
              {c.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
