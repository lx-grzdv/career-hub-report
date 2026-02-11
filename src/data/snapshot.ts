/**
 * Снапшот из экрана «Добавить папку» Career Hub.
 * Куда сохраняется скрин: данные со скрина вводятся в этот файл (snapshotMembers);
 * сам файл скриншота (картинка) в репозитории не хранится.
 * Обновляйте этот файл после нового скрина: замените значения members
 * на актуальные числа участников по каждому каналу.
 *
 * Соответствие отображаемых названий и username:
 * - Завтра в прод | Таня и фин.. → prodtomorrow
 * - ІТ-Француженка → sshultse
 * - pxPerson выдал → pxPerson_produced
 * - Последний дизайнер → nix_ux_view
 * - Тултип | UX UI → tooltipp
 * - true°redörescue → trueredorescue
 * - Дизайн диктатура → DesignDictatorship
 * - дизайн овчарка → dsgn_thinking
 * - v.isuaaaals → visuaaaals
 * - Иван Кунцевич | Альфа-П... → kuntsevich_design
 * - Лёша Груздев про дизайн,.. → lx_grzdv_links
 * - Жюли | Дизайн и продукт → yuliapohilko
 */

/** Начало периода наблюдения: 11:00 9 февраля (ISO). При добавлении нового скрина обнови SNAPSHOT_DATETIME — длительность пересчитается. */
export const REPORT_START_DATETIME = '2026-02-09T11:00:00';

/** Подпись начала наблюдения для отчёта. */
export const REPORT_START_LABEL = '9 февраля 2026, 11:00';

/** Дата и время снапшота экрана «Добавить папку» (ISO). */
export const SNAPSHOT_DATETIME = '2026-02-11T21:34:42';

/** Дата снапшота (для подписи). */
export const SNAPSHOT_DATE = '2026-02-11';

/** Подпись для отчёта: дата и время снапшота. */
export const SNAPSHOT_LABEL = '11 февраля 2026, 21:34';

/** Время снапшота для диапазона волны (как в «11:00 → 11:30»). */
export const SNAPSHOT_TIME = '21:34';

/** Номер волны для текущего среза данных (снапшота). При добавлении нового скрина увеличьте на 1. */
export const SNAPSHOT_WAVE_NUMBER = 9;

/** Текущий срез данных по количеству участников (username без @). */
export const snapshotMembers: Record<string, number> = {
  prodtomorrow: 640,
  sshultse: 676,
  pxPerson_produced: 470,
  nix_ux_view: 594,
  tooltipp: 472,
  trueredorescue: 652,
  DesignDictatorship: 850,
  dsgn_thinking: 785,
  visuaaaals: 712,
  kuntsevich_design: 937,
  lx_grzdv_links: 762,
  yuliapohilko: 596,
};
