<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Title, Tooltip, Legend)

const COLORS = ['#B85C4A', '#E8A87C', '#F4D03F', '#85C1E9', '#82E0AA', '#BB8FCE']

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
    backgroundColor: COLORS.slice(0, props.labels.length),
    borderWidth: 0,
  }],
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: props.title ? { display: true, text: props.title, font: { size: 14 } } : undefined,
    legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12 } },
  },
  cutout: '60%',
}
</script>

<template>
  <div class="h-64">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>
