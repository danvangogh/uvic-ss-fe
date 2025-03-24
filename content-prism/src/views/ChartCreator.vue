<template>
  <div class="chart-creator">
    <h1>Chart Creator</h1>
    
    <div class="form-container">
      <div v-for="(item, index) in chartData" :key="index" class="input-group">
        <div class="input-row">
          <div class="input-field">
            <label :for="'metric-' + index">Metric {{ index + 1 }}</label>
            <input 
              :id="'metric-' + index"
              v-model="item.metric"
              type="text"
              placeholder="Enter metric name"
            />
          </div>
          <div class="input-field">
            <label :for="'data-' + index">Data {{ index + 1 }}</label>
            <input 
              :id="'data-' + index"
              v-model="item.data"
              type="number"
              placeholder="Enter value"
            />
          </div>
          <button 
            v-if="index === chartData.length - 1"
            @click="addNewRow"
            class="add-button"
          >
            Add Row
          </button>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-header">
        <h2>Chart Preview</h2>
        <div class="chart-controls">
          <select v-model="chartType" class="chart-type-select">
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
          <button @click="downloadChart" class="download-button">
            Download as PNG
          </button>
        </div>
      </div>
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Chart from 'chart.js/auto';

const chartData = ref([
  { metric: '', data: '' }
]);
const chartType = ref('bar');
const chartCanvas = ref(null);
let chart = null;

const addNewRow = () => {
  chartData.value.push({ metric: '', data: '' });
};

const updateChart = () => {
  if (chart) {
    chart.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  
  // Filter out empty rows and convert data to numbers
  const validData = chartData.value
    .filter(item => item.metric && item.data !== '')
    .map(item => ({
      metric: item.metric,
      data: parseFloat(item.data)
    }));

  if (validData.length === 0) return;

  const commonConfig = {
    labels: validData.map(item => item.metric),
    datasets: [{
      label: 'Data Values',
      data: validData.map(item => item.data),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    scales: chartType.value === 'pie' ? undefined : {
      y: {
        beginAtZero: true
      }
    }
  };

  chart = new Chart(ctx, {
    type: chartType.value,
    data: commonConfig,
    options: options
  });
};

const downloadChart = () => {
  if (!chart) return;
  
  // Get the canvas element
  const canvas = chartCanvas.value;
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.download = 'chart.png';
  
  // Convert the canvas to a data URL
  const dataUrl = canvas.toDataURL('image/png');
  
  // Set the link's href to the data URL
  link.href = dataUrl;
  
  // Trigger the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Watch for changes in chartData and chartType
watch([chartData, chartType], () => {
  updateChart();
}, { deep: true });

onMounted(() => {
  updateChart();
});
</script>

<style scoped>
.chart-creator {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}

.form-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.input-group {
  margin-bottom: 1rem;
}

.input-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.input-field {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #007bff;
}

.add-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.add-button:hover {
  background-color: #0056b3;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.chart-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.chart-type-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  cursor: pointer;
}

.chart-type-select:focus {
  outline: none;
  border-color: #007bff;
}

.download-button {
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.download-button:hover {
  background-color: #218838;
}

@media (max-width: 768px) {
  .chart-creator {
    padding: 1rem;
  }

  .input-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-button {
    width: 100%;
    margin-top: 0.5rem;
  }

  .chart-controls {
    flex-direction: column;
    width: 100%;
  }

  .chart-type-select {
    width: 100%;
  }

  .download-button {
    width: 100%;
  }
}
</style> 