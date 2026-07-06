export const LEAD_SOURCE_LABELS: Record<string, string> = {
  site: 'Сайт',
  email: 'Email',
  phone: 'Телефон',
  referral: 'Рекомендация',
  manual: 'Вручную',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  processed: 'В работе',
  converted: 'Конвертирован',
};

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  open: 'Открыта',
  won: 'Выиграна',
  lost: 'Проиграна',
};

export const STAGE_LABELS: Record<string, string> = {
  qualification: 'Квалификация',
  proposal: 'Предложение',
  negotiation: 'Переговоры',
  won: 'Победа',
  lost: 'Отказ',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: 'Заметка',
  task: 'Задача',
};

export function leadSourceLabel(v: string): string {
  return LEAD_SOURCE_LABELS[v] ?? v;
}

export function leadStatusLabel(v: string): string {
  return LEAD_STATUS_LABELS[v] ?? v;
}

export function opportunityStatusLabel(v: string): string {
  return OPPORTUNITY_STATUS_LABELS[v] ?? v;
}

export function stageLabel(v: string): string {
  return STAGE_LABELS[v] ?? v;
}

export function activityTypeLabel(v: string): string {
  return ACTIVITY_TYPE_LABELS[v] ?? v;
}

export const TABLE_HEADERS = {
  leads: {
    name: 'Имя',
    source: 'Источник',
    status: 'Статус',
    company: 'Компания',
    created: 'Создан',
  },
  accounts: {
    name: 'Название',
    website: 'Сайт',
    contacts: 'Контакты',
    opportunities: 'Сделки',
  },
  contacts: {
    name: 'Имя',
    email: 'Email',
    phone: 'Телефон',
    company: 'Компания',
  },
  opportunities: {
    title: 'Название',
    amount: 'Сумма',
    stage: 'Стадия',
    status: 'Статус',
    company: 'Компания',
    contact: 'Контакт',
  },
} as const;