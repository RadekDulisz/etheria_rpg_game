import type { BackpackCategory, BackpackIconSize, BackpackSort } from './backpack.types';
import { BACKPACK_CATEGORY_LABELS } from './backpack.types';

interface BackpackToolbarProps {
  search: string;
  category: BackpackCategory;
  grade: string;
  sort: BackpackSort;
  iconSize: BackpackIconSize;
  resultCount: number;
  onSearch: (value: string) => void;
  onCategory: (value: BackpackCategory) => void;
  onGrade: (value: string) => void;
  onSort: (value: BackpackSort) => void;
  onIconSize: (value: BackpackIconSize) => void;
}

export function BackpackToolbar(props: BackpackToolbarProps) {
  return (
    <div className="backpack-toolbar">
      <label className="backpack-search">
        <span aria-hidden="true">⌕</span>
        <input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Wyszukaj przedmiot…" />
      </label>

      <div className="backpack-category-tabs" role="group" aria-label="Kategorie plecaka">
        {(Object.keys(BACKPACK_CATEGORY_LABELS) as BackpackCategory[]).map((category) => (
          <button type="button" key={category} className={props.category === category ? 'active' : ''} onClick={() => props.onCategory(category)}>
            {BACKPACK_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className="backpack-toolbar-selects">
        <label>
          <span>Ranga</span>
          <select value={props.grade} onChange={(event) => props.onGrade(event.target.value)}>
            <option value="ALL">Wszystkie</option>
            <option value="NO_GRADE">Nowicjusz</option>
            <option value="D">D</option><option value="C">C</option><option value="B">B</option>
            <option value="A">A</option><option value="S">S</option><option value="RUNIC">Runiczna</option><option value="ANCIENT">Pradawna</option>
          </select>
        </label>
        <label>
          <span>Sortowanie</span>
          <select value={props.sort} onChange={(event) => props.onSort(event.target.value as BackpackSort)}>
            <option value="NEWEST">Najnowsze</option>
            <option value="NAME">Nazwa</option>
            <option value="LEVEL">Wymagany poziom</option>
            <option value="RARITY">Rzadkość</option>
            <option value="VALUE">Wartość</option>
            <option value="ENHANCEMENT">Ulepszenie</option>
          </select>
        </label>
        <div className="backpack-icon-size" role="group" aria-label="Wielkość ikon">
          <button type="button" className={props.iconSize === 'SMALL' ? 'active' : ''} onClick={() => props.onIconSize('SMALL')} title="Małe ikony">▦</button>
          <button type="button" className={props.iconSize === 'LARGE' ? 'active' : ''} onClick={() => props.onIconSize('LARGE')} title="Duże ikony">▣</button>
        </div>
        <output>{props.resultCount} poz.</output>
      </div>
    </div>
  );
}
