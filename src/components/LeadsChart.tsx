'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

type Props = {
  labels: string[];
  values: number[];
  rawLabels?: string[];
};

export function LeadsChart({ labels, values, rawLabels }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Лиды по статусам',
        data: values,
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',   // new — indigo
          'rgba(245, 158, 11, 0.6)',   // processed — amber
          'rgba(16, 185, 129, 0.6)',   // converted — emerald
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      title: { display: true, text: 'Лиды по статусам' },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const idx = items[0].dataIndex;
            const ru = labels[idx];
            const en = rawLabels?.[idx];
            return en ? `${ru} (${en})` : ru;
          },
        },
      },
    },
    layout: {
      padding: { top: 8, bottom: 0, left: 0, right: 0 },
    },
  };

  // a11y: текстовый эквивалент графика для скринридеров (canvas невидим для AT).
  const summary = labels.map((l, i) => `${l}: ${values[i] ?? 0}`).join(', ');
  const ariaLabel = `Диаграмма лидов по статусам. ${summary}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ position: 'relative', height: '100%', width: '100%' }}
    >
      <Doughnut data={data} options={options} />
    </div>
  );
}