interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Strony katalogu">
      <button disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Poprzednia strona">‹</button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
        <button key={number} className={number === page ? 'pagination-active' : ''} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)}>{number}</button>
      ))}
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Następna strona">›</button>
    </nav>
  );
}
