<template>
  <div class="chart-creator">
    <!-- Add Font Awesome -->
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    />
    <!-- Add Montserrat font -->
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />

    <h1>Chart Creator</h1>

    <div class="form-container">
      <div class="input-mode-toggle">
        <button 
          @click="inputMode = 'fields'" 
          :class="{ active: inputMode === 'fields' }"
        >
          Individual Fields
        </button>
        <button 
          @click="inputMode = 'json'" 
          :class="{ active: inputMode === 'json' }"
        >
          JSON Input
        </button>
      </div>

      <div v-if="inputMode === 'fields'" class="fields-input">
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

      <div v-else class="json-input-container">
        <div class="input-field">
          <label for="json-input">Chart Data (JSON)</label>
          <textarea
            id="json-input"
            v-model="jsonInput"
            placeholder='{"data": [{"metric": "Metric 1", "data": 10}, {"metric": "Metric 2", "data": 20}]}'
            @input="handleJsonInput"
            class="json-input"
          ></textarea>
          <div v-if="jsonError" class="error-message">{{ jsonError }}</div>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-header">
        <h2>Chart Preview</h2>
        <div class="chart-controls">
          <select v-model="chartType" class="chart-type-select">
            <option value="bar">Bar Chart</option>
            <option value="horizontalBar">Horizontal Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
          <button @click="downloadChart" class="download-button">
            Download as PNG
          </button>
          <button @click="uploadToSpaces" class="upload-button" :disabled="isUploading">
            <span v-if="isUploading">
              <i class="fas fa-spinner fa-spin"></i> Uploading...
            </span>
            <span v-else>Upload to Spaces</span>
          </button>
        </div>
      </div>
      <canvas ref="chartCanvas"></canvas>
      <div v-if="uploadedUrl" class="url-display">
        <div class="url-text">{{ uploadedUrl }}</div>
        <button @click="copyUrl" class="copy-button">
          <i class="fas fa-copy"></i>
        </button>
      </div>
      <div v-if="uploadError" class="error-message">{{ uploadError }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import Chart from "chart.js/auto";
import axios from 'axios';

const inputMode = ref('fields');
const jsonInput = ref('');
const jsonError = ref('');
const chartData = ref([{ metric: "", data: "" }]);
const chartType = ref("bar");
const chartCanvas = ref(null);
let chart = null;
const uploadedUrl = ref('');
const isUploading = ref(false);
const uploadError = ref('');

const chartAspectRatio = computed(() => {
  return chartType.value === "horizontalBar" ? 2 : 1;
});

// Define a modern color palette based on the brand color #204780
const colorPalette = {
  primary: "#ffffff",
};

// Generate a color array for the chart
const getChartColors = (count) => {
  const colors = Object.values(colorPalette);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
};

const handleJsonInput = () => {
  try {
    if (!jsonInput.value) {
      chartData.value = [{ metric: "", data: "" }];
      jsonError.value = '';
      return;
    }

    const parsedData = JSON.parse(jsonInput.value);
    if (!parsedData.data || !Array.isArray(parsedData.data)) {
      throw new Error('JSON must contain a "data" array');
    }

    // Validate each item in the data array
    parsedData.data.forEach((item, index) => {
      if (!item.metric || typeof item.metric !== 'string') {
        throw new Error(`Item ${index + 1} must have a "metric" string`);
      }
      if (typeof item.data !== 'number') {
        throw new Error(`Item ${index + 1} must have a numeric "data" value`);
      }
    });

    chartData.value = parsedData.data;
    jsonError.value = '';
  } catch (error) {
    jsonError.value = error.message;
  }
};

const updateChart = () => {
  if (chart) {
    chart.destroy();
  }

  const ctx = chartCanvas.value.getContext("2d");

  // Filter out empty rows and convert data to numbers
  const validData = chartData.value
    .filter((item) => item.metric && item.data !== "")
    .map((item) => ({
      metric: item.metric,
      data: parseFloat(item.data),
    }));

  if (validData.length === 0) return;

  const colors = getChartColors(validData.length);

  const commonConfig = {
    labels: validData.map((item) => item.metric),
    datasets: [
      {
        label: "",
        data: validData.map((item) => item.data),
        backgroundColor:
          chartType.value === "pie"
            ? validData.map((_, index) => {
                const opacity = 0.3 + index * 0.2; // Creates opacity from 0.3 to 0.9
                return `rgba(255, 255, 255, ${opacity})`;
              })
            : colors.map((color) => `${color}40`),
        borderColor: "#ffffff",
        borderWidth: 2,
        borderRadius: 6,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: chartAspectRatio.value,
    indexAxis: chartType.value === "horizontalBar" ? "y" : "x",
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    plugins: {
      legend: {
        display: chartType.value === "pie",
        position: "right",
        labels: {
          color: "#ffffff",
          font: {
            family: "Montserrat",
            weight: "700",
            size: 14,
          },
          padding: 20,
          boxWidth: 20,
          boxHeight: 20,
          usePointStyle: true,
          pointStyle: "circle",
          generateLabels: function (chart) {
            return chart.data.labels.map((label, i) => {
              const opacity = 0.3 + i * 0.2;
              return {
                text: label,
                fillStyle: `rgba(255, 255, 255, ${opacity})`,
                strokeStyle: "#ffffff",
                lineWidth: 2,
                hidden: false,
                index: i,
                fontColor: "#ffffff",
                font: {
                  family: "Montserrat",
                  weight: "700",
                  size: 14,
                },
              };
            });
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#240780",
        bodyColor: "#240780",
        borderColor: "#240780",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          family: "Montserrat",
          weight: "700",
          size: 14,
        },
        bodyFont: {
          family: "Montserrat",
          weight: "500",
          size: 14,
        },
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.raw}`;
          },
        },
      },
    },
    scales:
      chartType.value === "pie"
        ? undefined
        : {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
                drawBorder: false,
              },
              ticks: {
                font: {
                  size: 14,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
              title: {
                display: true,
                font: {
                  size: 16,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  size: 14,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
              title: {
                display: true,
                font: {
                  size: 16,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
            },
          },
  };

  chart = new Chart(ctx, {
    type: chartType.value === "horizontalBar" ? "bar" : chartType.value,
    data: commonConfig,
    options: options,
  });
};

const downloadChart = () => {
  if (!chart) return;

  // Get the canvas element
  const canvas = chartCanvas.value;

  // Create a temporary link element
  const link = document.createElement("a");
  link.download = "chart.png";

  // Convert the canvas to a data URL
  const dataUrl = canvas.toDataURL("image/png");

  // Set the link's href to the data URL
  link.href = dataUrl;

  // Trigger the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const addNewRow = () => {
  chartData.value.push({ metric: "", data: "" });
};

const uploadToSpaces = async () => {
  if (!chart) return;

  try {
    isUploading.value = true;
    uploadError.value = '';

    // Get the canvas element
    const canvas = chartCanvas.value;
    
    // Convert the canvas to a data URL
    const dataUrl = canvas.toDataURL("image/png");
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Create form data
    const formData = new FormData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    formData.append('image', blob, `Chart - ${timestamp}.png`);
    
    // Upload to backend
    const uploadResponse = await axios.post(`${process.env.VUE_APP_API_BASE_URL}/api/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    uploadedUrl.value = uploadResponse.data.url;
  } catch (error) {
    console.error('Error uploading to Spaces:', error);
    uploadError.value = 'Failed to upload chart. Please try again.';
  } finally {
    isUploading.value = false;
  }
};

const copyUrl = () => {
  if (uploadedUrl.value) {
    navigator.clipboard.writeText(uploadedUrl.value);
    // You might want to add a visual feedback here
  }
};

// Watch for changes in chartData and chartType
watch(
  [chartData, chartType],
  () => {
    updateChart();
  },
  { deep: true }
);

onMounted(() => {
  updateChart();
});
</script>

<style scoped>
.chart-creator {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Montserrat", sans-serif;
}

h1 {
  margin-bottom: 2rem;
  color: #204780;
  font-size: 2rem;
  font-weight: 600;
  font-family: "Montserrat", sans-serif;
}

.form-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
  font-family: "Montserrat", sans-serif;
}

.input-mode-toggle {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-mode-toggle button {
  padding: 0.75rem 1.5rem;
  background-color: #e5e9f2;
  color: #204780;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: "Montserrat", sans-serif;
}

.input-mode-toggle button.active {
  background-color: #204780;
  color: white;
}

.input-mode-toggle button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fields-input {
  margin-top: 1rem;
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

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e9f2;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: "Montserrat", sans-serif;
}

input:focus {
  outline: none;
  border-color: #204780;
  box-shadow: 0 0 0 3px rgba(32, 71, 128, 0.1);
}

.add-button {
  padding: 0.75rem 1.5rem;
  background-color: #204780;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: "Montserrat", sans-serif;
}

.add-button:hover {
  background-color: #1a3a6b;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-container {
  background: #204780;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  min-height: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.chart-header h2 {
  margin: 0;
  color: #ffffff;
  font-size: 1.4rem;
  font-weight: 700;
  font-family: "Montserrat";
}

.chart-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.chart-type-select {
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: transparent;
  cursor: pointer;
  color: #ffffff;
  transition: all 0.2s ease;
  font-family: "Montserrat";
  font-weight: 700;
}

.chart-type-select:focus {
  outline: none;
  border-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.chart-type-select option {
  background-color: #240780;
  color: #ffffff;
}

.download-button {
  padding: 0.75rem 1.5rem;
  background-color: #ffffff;
  color: #240780;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: "Montserrat";
  transition: all 0.2s ease;
}

.download-button:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

canvas {
  width: 100% !important;
  max-width: 600px;
  height: auto !important;
  min-height: 300px;
  aspect-ratio: v-bind(chartAspectRatio);
}

.json-input-container {
  margin-top: 1rem;
}

.json-input {
  width: 100%;
  min-height: 300px;
  padding: 1.5rem;
  border: 2px solid #e5e9f2;
  border-radius: 8px;
  font-size: 1rem;
  font-family: monospace;
  line-height: 1.5;
  transition: all 0.2s ease;
  resize: vertical;
  background-color: #f8f9fa;
}

.json-input:focus {
  outline: none;
  border-color: #204780;
  box-shadow: 0 0 0 3px rgba(32, 71, 128, 0.1);
  background-color: #ffffff;
}

.error-message {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: "Montserrat", sans-serif;
}

.upload-button {
  padding: 0.75rem 1.5rem;
  background-color: #ffffff;
  color: #240780;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: "Montserrat";
  transition: all 0.2s ease;
}

.upload-button:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.upload-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-button i {
  margin-right: 0.5rem;
}

.url-display {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
}

.url-text {
  flex: 1;
  color: #ffffff;
  font-family: monospace;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-button {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
