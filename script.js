
const L = window.L

// =====================================================
// API Configuration - Its PUBLIC SO it doesnt need hiding.
// =====================================================

const GEOCODING_API_URL = "https://nominatim.openstreetmap.org/search"
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"

// =====================================================
// DOM Elements
// =====================================================

const searchInput = document.getElementById("search-input")
const searchButton = document.getElementById("search-button")
const weatherPopup = document.getElementById("weather-popup")
const weatherContent = document.getElementById("weather-content")
const popupClose = document.getElementById("popup-close")
const loadingIndicator = document.getElementById("loading-indicator")
const errorToast = document.getElementById("error-toast")
const errorMessage = document.getElementById("error-message")
const coordsText = document.getElementById("coords-text")

// =====================================================
// Leaflet Map Initialization
// =====================================================

// Initialize the map centered on Tehran, Iran with zoom level 6
const map = L.map("map", {
  center: [35.6892, 51.389], // Tehran, Iran coordinates
  zoom: 6, // Regional view showing surrounding area
  minZoom: 2,
  maxZoom: 19,
  zoomControl: true,
})

// Add OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map)

// Add scale control
L.control
  .scale({
    metric: true,
    imperial: false,
    position: "bottomleft",
  })
  .addTo(map)

// Layer group for markers
const markersLayer = L.layerGroup().addTo(map)

// Current marker reference
let currentMarker = null

// =====================================================
// Utility Functions
// =====================================================

function showLoading() {
  loadingIndicator.classList.remove("hidden")
}

function hideLoading() {
  loadingIndicator.classList.add("hidden")
}

function showError(message) {
  errorMessage.textContent = message
  errorToast.classList.remove("hidden")
  setTimeout(() => {
    errorToast.classList.add("hidden")
  }, 5000)
}

function updateCoordsDisplay(lat, lon) {
  coordsText.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`
}

// Custom marker icon
const markerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
        width: 24px;
        height: 24px;
        background-color: #2563eb;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function addMarker(lat, lon) {
  // Clear existing markers
  markersLayer.clearLayers()

  // Add new marker
  currentMarker = L.marker([lat, lon], { icon: markerIcon }).addTo(markersLayer)

  return currentMarker
}

function animateToLocation(lat, lon, zoom = 14) {
  map.flyTo([lat, lon], zoom, {
    duration: 1.5,
  })
}

// =====================================================
// Geocoding Functions
// =====================================================

async function geocodeLocation(location) {
  const url = `${GEOCODING_API_URL}?format=json&q=${encodeURIComponent(location)}&limit=1`

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`)
  }

  const data = await response.json()

  if (data && data.length > 0) {
    const result = data[0]
    return {
      lat: Number.parseFloat(result.lat),
      lon: Number.parseFloat(result.lon),
      displayName: result.display_name || location,
    }
  } else {
    throw new Error("Location not found. Please try a different search term.")
  }
}

async function handleSearch() {
  const query = searchInput.value.trim()

  if (!query) {
    showError("Please enter a location to search.")
    return
  }

  searchButton.disabled = true
  showLoading()
  hideWeatherPopup()

  try {
    const result = await geocodeLocation(query)

    addMarker(result.lat, result.lon)
    animateToLocation(result.lat, result.lon)
    updateCoordsDisplay(result.lat, result.lon)

    console.log(`Found: ${result.displayName} at (${result.lat}, ${result.lon})`)
  } catch (error) {
    showError(error.message || "Failed to find location.")
  } finally {
    searchButton.disabled = false
    hideLoading()
  }
}

// =====================================================
// Weather Functions
// =====================================================

async function fetchWeatherData(lat, lon) {
  const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&timezone=auto`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`)
  }

  return await response.json()
}

function getWeatherInfo(code) {
  const weatherCodes = {
    0: { description: "Clear sky", icon: "sun" },
    1: { description: "Mainly clear", icon: "sun" },
    2: { description: "Partly cloudy", icon: "cloud-sun" },
    3: { description: "Overcast", icon: "cloud" },
    45: { description: "Foggy", icon: "cloud" },
    48: { description: "Depositing rime fog", icon: "cloud" },
    51: { description: "Light drizzle", icon: "cloud-rain" },
    53: { description: "Moderate drizzle", icon: "cloud-rain" },
    55: { description: "Dense drizzle", icon: "cloud-rain" },
    61: { description: "Slight rain", icon: "cloud-rain" },
    63: { description: "Moderate rain", icon: "cloud-rain" },
    65: { description: "Heavy rain", icon: "cloud-rain" },
    71: { description: "Slight snow", icon: "snowflake" },
    73: { description: "Moderate snow", icon: "snowflake" },
    75: { description: "Heavy snow", icon: "snowflake" },
    80: { description: "Rain showers", icon: "cloud-rain" },
    81: { description: "Moderate showers", icon: "cloud-rain" },
    82: { description: "Violent showers", icon: "cloud-rain" },
    95: { description: "Thunderstorm", icon: "cloud-lightning" },
    96: { description: "Thunderstorm with hail", icon: "cloud-lightning" },
    99: { description: "Severe thunderstorm", icon: "cloud-lightning" },
  }

  return weatherCodes[code] || { description: "Unknown", icon: "cloud" }
}

function getWeatherEmoji(code) {
  const emojis = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "❄️",
    75: "❄️",
    80: "🌦️",
    81: "🌧️",
    82: "⛈️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  }
  return emojis[code] || "❓"
}

function createWeatherHTML(weatherData, lat, lon) {
  const current = weatherData.current
  const temp = Math.round(current.temperature_2m)
  const feelsLike = Math.round(current.apparent_temperature)
  const humidity = current.relative_humidity_2m
  const windSpeed = current.wind_speed_10m.toFixed(1)
  const pressure = Math.round(current.surface_pressure)
  const weatherCode = current.weather_code
  const weatherInfo = getWeatherInfo(weatherCode)
  const emoji = getWeatherEmoji(weatherCode)
  const timezone = weatherData.timezone || "Unknown"

  return `
        <div class="weather-header">
            <div class="weather-icon-large">${emoji}</div>
            <div class="weather-main">
                <span class="weather-temp">${temp}°C</span>
                <span class="weather-desc">${weatherInfo.description}</span>
                <span class="weather-location">${timezone}</span>
            </div>
        </div>
        <div class="weather-details">
            <div class="weather-detail-item">
                <span class="weather-detail-label">Feels Like</span>
                <span class="weather-detail-value">${feelsLike}°C</span>
            </div>
            <div class="weather-detail-item">
                <span class="weather-detail-label">Humidity</span>
                <span class="weather-detail-value">${humidity}%</span>
            </div>
            <div class="weather-detail-item">
                <span class="weather-detail-label">Wind Speed</span>
                <span class="weather-detail-value">${windSpeed} km/h</span>
            </div>
            <div class="weather-detail-item">
                <span class="weather-detail-label">Pressure</span>
                <span class="weather-detail-value">${pressure} hPa</span>
            </div>
        </div>
        <div class="weather-coords">
            ${lat.toFixed(4)}°, ${lon.toFixed(4)}°
        </div>
    `
}

function positionWeatherPopup(lat, lon) {
  const point = map.latLngToContainerPoint([lat, lon])
  const mapContainer = document.getElementById("map")
  const mapRect = mapContainer.getBoundingClientRect()

  // Position popup near the clicked point
  let left = point.x + mapRect.left
  let top = point.y + mapRect.top - 20

  // Get popup dimensions
  const popupRect = weatherPopup.getBoundingClientRect()

  // Adjust if popup goes off screen
  if (left + popupRect.width > window.innerWidth - 20) {
    left = window.innerWidth - popupRect.width - 20
  }
  if (left < 20) {
    left = 20
  }
  if (top < 100) {
    top = point.y + mapRect.top + 30
  }

  weatherPopup.style.left = `${left}px`
  weatherPopup.style.top = `${top}px`
}

async function showWeatherPopup(lat, lon) {
  showLoading()

  try {
    const weatherData = await fetchWeatherData(lat, lon)

    weatherContent.innerHTML = createWeatherHTML(weatherData, lat, lon)

    positionWeatherPopup(lat, lon)
    weatherPopup.classList.add("visible")

    updateCoordsDisplay(lat, lon)
  } catch (error) {
    showError(error.message || "Failed to fetch weather data.")
    hideWeatherPopup()
  } finally {
    hideLoading()
  }
}

function hideWeatherPopup() {
  weatherPopup.classList.remove("visible")
}

// =====================================================
// Event Listeners
// =====================================================

// Search button click
searchButton.addEventListener("click", handleSearch)

// Enter key in search input
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    handleSearch()
  }
})

// Map click event for weather display
map.on("click", (event) => {
  const lat = event.latlng.lat
  const lon = event.latlng.lng
  showWeatherPopup(lat, lon)
})

// Popup close button
popupClose.addEventListener("click", hideWeatherPopup)

// Update coordinates on mouse move
map.on("mousemove", (event) => {
  updateCoordsDisplay(event.latlng.lat, event.latlng.lng)
})

// Close popup when pressing Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideWeatherPopup()
  }
})

// =====================================================
// Initialization
// =====================================================

function init() {
  console.log("WebGIS Application initialized with Leaflet.js")
  console.log("Using FREE APIs - No API keys required!")
  console.log("  - Geocoding: Nominatim (OpenStreetMap)")
  console.log("  - Weather: Open-Meteo")

  // Add cursor style
  document.getElementById("map").style.cursor = "crosshair"
}

init()
