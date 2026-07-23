<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

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
    backgroundColor: '#B85C4A',
    borderRadius: 4,
  }],
}

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: props.title ? { display: true, text: props.title, font: { size: 14 } } : undefined,
    legend: { display: false },
  },
  scales: {
    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { grid: { display: false } },
  },
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
