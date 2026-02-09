/**
 * Базовые данные отчёта (8 фев). Финал и прирост подставляются из снапшота (src/data/snapshot.ts).
 * Используется в App и в скрипте генерации вывода (scripts/generate-conclusion).
 */
export const BASE_CHANNEL_DATA = [
  { channel: '@visuaaaals', base: 580, wave1: 596, wave2: 672, current: 673, final: 681, growth1: 16, growth2: 76, growth3: 8, total: 101, type: 'beneficiary' as const },
  { channel: '@tooltipp', base: 342, wave1: 392, wave2: 429, current: 433, final: 440, growth1: 50, growth2: 37, growth3: 7, total: 98, type: 'beneficiary' as const },
  { channel: '@nix_ux_view', base: 473, wave1: 523, wave2: 557, current: 562, final: 569, growth1: 50, growth2: 34, growth3: 7, total: 96, type: 'beneficiary' as const },
  { channel: '@DesignDictatorship', base: 734, wave1: 782, wave2: 815, current: 823, final: 825, growth1: 48, growth2: 33, growth3: 2, total: 91, type: 'donor' as const },
  { channel: '@prodtomorrow', base: 520, wave1: 568, wave2: 598, current: 605, final: 609, growth1: 48, growth2: 30, growth3: 4, total: 89, type: 'stable' as const },
  { channel: '@sshultse', base: 566, wave1: 604, wave2: 638, current: 648, final: 653, growth1: 38, growth2: 34, growth3: 5, total: 87, type: 'stable' as const },
  { channel: '@lx_grzdv_links', base: 650, wave1: 694, wave2: 730, current: 732, final: 737, growth1: 44, growth2: 36, growth3: 5, total: 87, type: 'stable' as const },
  { channel: '@kuntsevich_design', base: 828, wave1: 870, wave2: 891, current: 903, final: 911, growth1: 42, growth2: 21, growth3: 8, total: 83, type: 'donor' as const },
  { channel: '@pxPerson_produced', base: 366, wave1: 401, wave2: 435, current: 435, final: 445, growth1: 35, growth2: 34, growth3: 10, total: 79, type: 'stable' as const },
  { channel: '@yuliapohilko', base: 510, wave1: 521, wave2: 569, current: 585, final: 589, growth1: 11, growth2: 48, growth3: 4, total: 79, type: 'beneficiary' as const },
  { channel: '@dsgn_thinking', base: 678, wave1: 721, wave2: 743, current: 754, final: 756, growth1: 43, growth2: 22, growth3: 2, total: 78, type: 'donor' as const },
  { channel: '@trueredorescue', base: 550, wave1: 587, wave2: 620, current: 626, final: 626, growth1: 37, growth2: 33, growth3: 0, total: 76, type: 'stable' as const },
];
