'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

type Props = {
  labels: string[];
  values: number[];
  rawLabels?: string[];
};

export function StagesChart({ labels, values, rawLabels }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Сделки по стадиям',
        data: values,
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',   // qualification — indigo
          'rgba(59, 130, 246, 0.6)',   // proposal — blue
          'rgba(168, 85, 247, 0.6)',   // negotiation — purple
          'rgba(16, 185, 129, 0.6)',   // won — emerald
          'rgba(244, 63, 94, 0.6)',    // lost — rose
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(16, 185, 129)',
          'rgb(244, 63, 94)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Сделки по стадиям воронки' },
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
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(...values, 1),
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
}