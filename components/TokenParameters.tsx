type Props = { t: (key: string) => string };

const allocations = [
  { id: 'public', share: 30, label: 'litepaper.metrics_public_label', note: 'litepaper.metrics_public_note' },
  { id: 'liquidity', share: 30, label: 'litepaper.metrics_liquidity_label', note: 'litepaper.metrics_liquidity_note' },
  { id: 'ecosystem', share: 15, label: 'token_model_ecosystem_label', note: 'token_model_ecosystem_note' },
  { id: 'founder', share: 10, label: 'litepaper.metrics_founder_label', note: 'litepaper.metrics_founder_note' },
  { id: 'partners', share: 10, label: 'token_model_partners_label', note: 'token_model_partners_note' },
  { id: 'future', share: 5, label: 'token_model_future_label', note: 'token_model_future_note' },
];

export default function TokenParameters({ t }: Props) {
  return (
    <section id="token-parameters" className="min-w-0 scroll-mt-24 space-y-3" aria-labelledby="token-parameters-title">
      <h2 id="token-parameters-title" className="text-base font-semibold">
        {t('litepaper.metrics_heading')}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'litepaper.metrics_total_supply_label', value: '10 000 000 000', note: 'litepaper.metrics_total_supply_note' },
          { label: 'litepaper.metrics_tge_price_label', value: '€0.0008', note: 'litepaper.metrics_tge_price_note' },
        ].map((item) => (
          <div key={item.label} className="card min-w-0 p-3">
            <h3 className="text-xs text-zinc-600 dark:text-zinc-300">{t(item.label)}</h3>
            <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{t(item.note)}</p>
          </div>
        ))}
      </div>

      <div className="card min-w-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <caption className="px-3 pb-3 pt-3 text-left">
            <span className="block font-semibold">{t('token_model_allocation_title')}</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {t('token_model_allocation_note')}
            </span>
          </caption>
          <thead className="bg-zinc-50 text-xs dark:bg-white/5">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{t('token_model_purpose')}</th>
              <th scope="col" className="w-24 px-3 py-2 text-right font-medium">{t('token_model_share')}</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((item) => (
              <tr key={item.id} className="border-t border-zinc-200 dark:border-zinc-700">
                <td colSpan={2} className="px-3 py-2.5 align-top">
                  <details>
                    <summary className="cursor-pointer rounded-sm font-medium leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                      <span className="float-right ml-3 font-semibold tabular-nums">
                        {item.share}%
                      </span>
                      {t(item.label)}
                    </summary>
                    <div className="mt-2 space-y-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                      {item.id === 'public' && (
                        <p>
                          <strong>{t('litepaper.metrics_claim_label')}: </strong>
                          {t('litepaper.metrics_claim_note')}
                        </p>
                      )}
                      <p>{t(item.note)}</p>
                      {item.id === 'public' && <p>{t('token_model_claim_math')}</p>}
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-white/5">
            <tr>
              <th scope="row" className="px-3 py-2.5 font-semibold">{t('token_model_total')}</th>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {allocations.reduce((sum, item) => sum + item.share, 0)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
