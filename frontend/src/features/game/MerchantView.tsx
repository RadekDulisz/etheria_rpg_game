import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getShopCatalog, getShopCatalogSummary, purchaseCatalogItem } from '../../api/shop.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { GameIcon } from '../../components/ui/GameIcon';
import type { GameIconName } from '../../lib/game-icons';
import { getApiErrorMessage } from '../../lib/api-errors';
import { formatItemGrade } from '../../lib/item-grades';
import type { CatalogSection, ItemGrade } from '../../types/game';
import { ShopItemCard } from './ShopItemCard';

const PAGE_SIZE = 12;

const catalogSections: Array<{ id: CatalogSection; title: string; description: string; icon: GameIconName }> = [
  { id: 'WEAPONS', title: 'Broń', description: 'Miecze, topory, łuki i inne rodzaje uzbrojenia.', icon: 'weapons' },
  { id: 'ARMOR', title: 'Pancerze', description: 'Tarcze i części pancerza chroniące przed obrażeniami.', icon: 'armor' },
  { id: 'JEWELRY', title: 'Biżuteria', description: 'Naszyjniki, kolczyki i pierścienie zapewniające dodatkowe premie.', icon: 'jewelry' },
  { id: 'SPECIAL', title: 'Dodatki', description: 'Płaszcze, pasy, bransolety, brosze i ozdoby.', icon: 'special' },
];

const gradeRanges: Record<ItemGrade, string> = {
  NO_GRADE: 'Poziomy 1–19', D: 'Poziomy 20–39', C: 'Poziomy 40–51', B: 'Poziomy 52–60',
  A: 'Poziomy 61–75', S: 'Poziomy 76–79', RUNIC: 'Poziomy 80–83', ANCIENT: 'Poziom 84+',
};

const gradeMarks: Record<ItemGrade, string> = {
  NO_GRADE: 'N', D: 'D', C: 'C', B: 'B', A: 'A', S: 'S', RUNIC: 'R', ANCIENT: 'P',
};

export function MerchantView({ characterGold }: { characterGold: string }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<CatalogSection | null>(null);
  const [activeGrade, setActiveGrade] = useState<ItemGrade | null>(null);
  const [page, setPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const summaryQuery = useQuery({ queryKey: ['shop', 'catalog', 'summary'], queryFn: getShopCatalogSummary, retry: false });
  const catalogQuery = useQuery({
    queryKey: ['shop', 'catalog', activeSection, activeGrade, page],
    queryFn: () => getShopCatalog(activeSection as CatalogSection, activeGrade as ItemGrade, page, PAGE_SIZE),
    enabled: activeSection !== null && activeGrade !== null,
    placeholderData: (previous) => previous,
    retry: false,
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => purchaseCatalogItem(itemId, quantity),
    onSuccess: async (_, variables) => {
      const item = catalogQuery.data?.items.find((entry) => entry.id === variables.itemId);
      setSuccessMessage(`Kupiec przekazał ${item?.name ?? 'przedmiot'} ×${variables.quantity}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      ]);
    },
  });

  const activeDefinition = catalogSections.find((section) => section.id === activeSection);
  const activeSummary = summaryQuery.data?.find((entry) => entry.section === activeSection);

  function openSection(section: CatalogSection) {
    setPage(1);
    setActiveGrade(null);
    setActiveSection(section);
  }

  function back() {
    setPage(1);
    if (activeGrade) setActiveGrade(null);
    else setActiveSection(null);
  }

  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Kupiec" title="Stała oferta" description="Wybierz kategorię i rangę wyposażenia. Na każdej stronie znajdziesz najwyżej dwanaście przedmiotów." />
      {successMessage ? <ActionNotice tone="success" onDismiss={() => setSuccessMessage(null)}>{successMessage}</ActionNotice> : null}
      {purchaseMutation.isError ? <ActionNotice tone="error" onDismiss={() => purchaseMutation.reset()}>{getApiErrorMessage(purchaseMutation.error)}</ActionNotice> : null}

      {activeSection === null ? (
        <div className="catalog-sections">
          {catalogSections.map((section) => {
            const count = summaryQuery.data?.find((entry) => entry.section === section.id)?.count;
            return <button key={section.id} className="catalog-section-card" onClick={() => openSection(section.id)}>
              <span className="catalog-section-mark" aria-hidden="true"><GameIcon name={section.icon} /></span>
              <span><strong>{section.title}</strong><small>{section.description}</small></span>
              <span className="game-number ml-auto text-amber-200/70">{count ?? '—'}</span>
            </button>;
          })}
        </div>
      ) : activeGrade === null ? (
        <div>
          <div className="catalog-heading"><Button variant="secondary" onClick={back}>← Wróć do kategorii</Button><div><p className="text-lg text-amber-100 fantasy-title">{activeDefinition?.title} · wybierz rangę</p><p className="mt-1 text-xs text-stone-500">Ranga wskazuje poziom wymagany do założenia przedmiotu.</p></div></div>
          <div className="catalog-grade-grid">
            {activeSummary?.grades.map(({ grade, count }) => <button key={grade} className={`catalog-grade-card catalog-grade-${grade.toLowerCase()}`} onClick={() => { setPage(1); setActiveGrade(grade); }}>
              <span className="catalog-grade-rune"><span>{gradeMarks[grade]}</span></span>
              <span><strong>{formatItemGrade(grade)}</strong><small>{gradeRanges[grade]}</small></span>
              <span className="game-number ml-auto text-amber-200/70">{count}</span>
            </button>)}
          </div>
        </div>
      ) : (
        <div>
          <div className="catalog-heading"><Button variant="secondary" onClick={back}>← Wróć do rang</Button><div><p className="text-lg text-amber-100 fantasy-title">{activeDefinition?.title} · {formatItemGrade(activeGrade)}</p><p className="mt-1 text-xs text-stone-500">{catalogQuery.data?.total ?? 0} przedmiotów · strona {page}</p></div></div>
          {catalogQuery.isLoading ? <EmptyState title="Kupiec sprawdza magazyn">Trwa przygotowywanie wybranej części oferty.</EmptyState> : catalogQuery.data?.items.length ? <>
            <div className="shop-grid">{catalogQuery.data.items.map((item) => <ShopItemCard key={item.id} item={item} price={item.price} characterGold={characterGold} locked={item.locked} purchasing={purchaseMutation.isPending && purchaseMutation.variables?.itemId === item.id} onPurchase={(quantity) => purchaseMutation.mutate({ itemId: item.id, quantity })} />)}</div>
            <Pagination page={page} totalPages={catalogQuery.data.totalPages} onChange={(nextPage) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </> : <EmptyState title="Brak przedmiotów">Kupiec nie ma obecnie wyposażenia tej rangi.</EmptyState>}
        </div>
      )}
    </div>
  );
}
