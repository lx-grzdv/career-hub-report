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

/** Начало периода наблюдения: 11:00 9 февраля (ISO). */
export const REPORT_START_DATETIME = '2026-02-09T11:00:00';

/** Подпись начала наблюдения для отчёта. */
export const REPORT_START_LABEL = '9 февраля 2026, 11:00';

/** Один срез данных: экран «Добавить папку» в момент времени. */
export interface SnapshotSlice {
  datetime: string;
  date: string;
  label: string;
  time: string;
  waveNumber: number;
  members: Record<string, number>;
  /** URL скриншота (путь в public/ или data URL) — показывается в модалке по клику на заголовок среза. */
  screenshotUrl?: string;
}

/**
 * Все загруженные срезы (скриншоты). При каждом новом скрине добавьте в массив новый объект
 * с datetime, date, label, time, waveNumber и members — таблица и графики автоматически
 * подхватят все срезы (колонки «Срез (HH:MM)» и «Волна N», точки на графиках).
 */
export const SNAPSHOTS: SnapshotSlice[] = [
  {
    datetime: '2026-02-09T14:17:05',
    date: '2026-02-09',
    label: '9 февраля 2026, 14:17',
    time: '14:17',
    waveNumber: 1,
    members: {
      prodtomorrow: 598,
      sshultse: 638,
      pxPerson_produced: 435,
      nix_ux_view: 557,
      tooltipp: 429,
      trueredorescue: 620,
      DesignDictatorship: 815,
      dsgn_thinking: 743,
      visuaaaals: 672,
      kuntsevich_design: 891,
      lx_grzdv_links: 730,
      yuliapohilko: 569,
    },
    screenshotUrl: '/screenshots/slice-2026-02-09-14-17.png',
  },
  {
    datetime: '2026-02-09T18:06:21',
    date: '2026-02-09',
    label: '9 февраля 2026, 18:06',
    time: '18:06',
    waveNumber: 2,
    members: {
      prodtomorrow: 605,
      sshultse: 648,
      pxPerson_produced: 435,
      nix_ux_view: 562,
      tooltipp: 433,
      trueredorescue: 626,
      DesignDictatorship: 823,
      dsgn_thinking: 754,
      visuaaaals: 673,
      kuntsevich_design: 903,
      lx_grzdv_links: 732,
      yuliapohilko: 585,
    },
    screenshotUrl: '/screenshots/slice-2026-02-09-18-06.png',
  },
  {
    datetime: '2026-02-09T23:56:28',
    date: '2026-02-09',
    label: '9 февраля 2026, 23:56',
    time: '23:56',
    waveNumber: 3,
    members: {
      prodtomorrow: 617,
      sshultse: 656,
      pxPerson_produced: 447,
      nix_ux_view: 575,
      tooltipp: 447,
      trueredorescue: 630,
      DesignDictatorship: 830,
      dsgn_thinking: 765,
      visuaaaals: 682,
      kuntsevich_design: 917,
      lx_grzdv_links: 745,
      yuliapohilko: 592,
    },
    screenshotUrl: '/screenshots/slice-2026-02-09-23-56.png',
  },
  {
    datetime: '2026-02-10T02:16:39',
    date: '2026-02-10',
    label: '10 февраля 2026, 02:16',
    time: '02:16',
    waveNumber: 4,
    members: {
      prodtomorrow: 618,
      sshultse: 658,
      pxPerson_produced: 455,
      nix_ux_view: 575,
      tooltipp: 448,
      trueredorescue: 638,
      DesignDictatorship: 836,
      dsgn_thinking: 766,
      visuaaaals: 688,
      kuntsevich_design: 918,
      lx_grzdv_links: 744,
      yuliapohilko: 590,
    },
    screenshotUrl: '/screenshots/slice-2026-02-10-02-16.png',
  },
  {
    datetime: '2026-02-10T10:28:17',
    date: '2026-02-10',
    label: '10 февраля 2026, 10:28',
    time: '10:28',
    waveNumber: 5,
    members: {
      prodtomorrow: 628,
      sshultse: 668,
      pxPerson_produced: 462,
      nix_ux_view: 582,
      tooltipp: 455,
      trueredorescue: 644,
      DesignDictatorship: 840,
      dsgn_thinking: 770,
      visuaaaals: 698,
      kuntsevich_design: 928,
      lx_grzdv_links: 750,
      yuliapohilko: 593,
    },
    screenshotUrl: '/screenshots/slice-2026-02-10-10-28.png',
  },
  {
    datetime: '2026-02-10T18:06:52',
    date: '2026-02-10',
    label: '10 февраля 2026, 18:06',
    time: '18:06',
    waveNumber: 6,
    members: {
      prodtomorrow: 634,
      sshultse: 672,
      pxPerson_produced: 468,
      nix_ux_view: 588,
      tooltipp: 460,
      trueredorescue: 648,
      DesignDictatorship: 842,
      dsgn_thinking: 772,
      visuaaaals: 704,
      kuntsevich_design: 932,
      lx_grzdv_links: 756,
      yuliapohilko: 594,
    },
    screenshotUrl: '/screenshots/slice-2026-02-10-18-06.png',
  },
  {
    datetime: '2026-02-11T10:29:34',
    date: '2026-02-11',
    label: '11 февраля 2026, 10:29',
    time: '10:29',
    waveNumber: 7,
    members: {
      prodtomorrow: 640,
      sshultse: 676,
      pxPerson_produced: 470,
      nix_ux_view: 591,
      tooltipp: 465,
      trueredorescue: 652,
      DesignDictatorship: 844,
      dsgn_thinking: 773,
      visuaaaals: 709,
      kuntsevich_design: 936,
      lx_grzdv_links: 759,
      yuliapohilko: 596,
    },
    screenshotUrl: '/screenshots/slice-2026-02-11-10-29.png',
  },
  {
    datetime: '2026-02-11T12:43:00',
    date: '2026-02-11',
    label: '11 февраля 2026, 12:43',
    time: '12:43',
    waveNumber: 8,
    members: {
      prodtomorrow: 640,
      sshultse: 676,
      pxPerson_produced: 470,
      nix_ux_view: 593,
      tooltipp: 468,
      trueredorescue: 652,
      DesignDictatorship: 846,
      dsgn_thinking: 779,
      visuaaaals: 710,
      kuntsevich_design: 936,
      lx_grzdv_links: 760,
      yuliapohilko: 596,
    },
    screenshotUrl: '/screenshots/slice-2026-02-11-12-43.png',
  },
  {
    datetime: '2026-02-11T21:34:42',
    date: '2026-02-11',
    label: '11 февраля 2026, 21:34',
    time: '21:34',
    waveNumber: 9,
    members: {
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
    },
    screenshotUrl: '/screenshots/slice-2026-02-11-21-34.png',
  },
  {
    datetime: '2026-02-12T00:37:40',
    date: '2026-02-12',
    label: '12 февраля 2026, 00:37',
    time: '00:37',
    waveNumber: 10,
    members: {
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
      yuliapohilko: 610,
    },
    screenshotUrl: '/screenshots/slice-2026-02-12-00-37.png',
  },
];

/** Последний срез (для обратной совместимости и подписей). */
const _last = SNAPSHOTS[SNAPSHOTS.length - 1];
export const SNAPSHOT_DATETIME = _last.datetime;
export const SNAPSHOT_DATE = _last.date;
export const SNAPSHOT_LABEL = _last.label;
export const SNAPSHOT_TIME = _last.time;
export const SNAPSHOT_WAVE_NUMBER = _last.waveNumber;
export const snapshotMembers = _last.members;
