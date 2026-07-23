<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const props = withDefaults(defineProps<{
  labels: string[]
  values: number[]
  title?: string
}>(), {
  title: '',
})

const chartData = {
  labels: props.labels,
  datasets: [{
    data: props.values,
    borderColor: '#B85C4A',
    backgroundColor: 'rgba(184, 92, 74, 0.1)',
    fill: true,
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 6,
  }],
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: props.title ? { display: true, text: props.title, font: { size: 14 } } : undefined,
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
}
</script>

<template>
  <div class="h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
