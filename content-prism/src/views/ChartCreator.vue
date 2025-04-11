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
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";

const chartData = ref([{ metric: "", data: "" }]);
const chartType = ref("bar");
const chartCanvas = ref(null);
let chart = null;

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

const addNewRow = () => {
  chartData.value.push({ metric: "", data: "" });
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
            ? colors.map((color) => `${color}80`) // 50% opacity for pie charts
            : colors.map((color) => `${color}40`), // 25% opacity for bar/line charts
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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#240780",
        bodyColor: "#240780",
        borderColor: "#240780",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
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
                  size: 30,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
              title: {
                display: true,
                font: {
                  size: 18,
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
                  size: 24,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
              title: {
                display: true,
                font: {
                  size: 18,
                  weight: "700",
                  family: "Montserrat",
                },
                color: "#ffffff",
              },
            },
          },
  };

  chart = new Chart(ctx, {
    type: chartType.value,
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
}

h1 {
  margin-bottom: 2rem;
  color: #204780;
  font-size: 2rem;
  font-weight: 600;
}

.form-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
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
  color: #204780;
  font-size: 0.9rem;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e9f2;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
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
  height: 400px !important;
}
</style>
