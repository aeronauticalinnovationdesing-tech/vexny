import React, { useState, useEffect } from "react";
import { Cloud, Wind, Droplets, Eye, Thermometer, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WMO_CODES = {
  0: "Despejado ☀️", 1: "Principalmente despejado 🌤️", 2: "Parcialmente nublado ⛅", 3: "Nublado ☁️",
  45: "Niebla 🌫️", 48: "Niebla con escarcha 🌫️",
  51: "Llovizna ligera 🌧️", 53: "Llovizna moderada 🌧️", 55: "Llovizna densa 🌧️",
  61: "Lluvia ligera 🌧️", 63: "Lluvia moderada 🌧️", 65: "Lluvia intensa ⛈️",
  71: "Nevada ligera 🌨️", 73: "Nevada moderada 🌨️", 75: "Nevada intensa 🌨️",
  80: "Chubascos 🌦️", 81: "Chubascos moderados 🌦️", 82: "Chubascos fuertes ⛈️",
  95: "Tormenta eléctrica ⛈️", 96: "Tormenta con granizo ⛈️", 99: "Tormenta fuerte ⛈️"
};

function getDroneFlyability(weather) {
  const issues = [];
  let canFly = true;

  if (weather.windspeed_10m > 25) { issues.push("Viento > 25 km/h - No recomendado"); canFly = false; }
  else if (weather.windspeed_10m > 15) { issues.push("Viento moderado - Precaución"); }

  if ([45, 48, 51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.weathercode)) {
    issues.push("Precipitación o niebla detectada"); canFly = false;
  }

  if (weather.visibility < 5000) { issues.push("Visibilidad < 5km"); canFly = false; }
  if (weather.temperature_2m < 0) issues.push("Temperatura bajo cero - revisar batería");
  if (weather.relativehumidity_2m > 90) issues.push("Humedad > 90%");

  return { canFly, issues };
}

export default function WeatherWidget({ onWeatherData, compact = false }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [searchCity, setSearchCity] = useState("Bogotá");
  const [error, setError] = useState("");

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError("");
    try {
      // Geocoding con Open-Meteo (gratis, sin API key)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=es&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results?.length) { setError("Ciudad no encontrada"); setLoading(false); return; }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Clima actual con Open-Meteo (completamente gratis)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,visibility,windspeed_10m,temperature_2m&current=temperature_2m,relativehumidity_2m,windspeed_10m,weathercode,visibility&timezone=auto&forecast_days=1`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current;

      const result = {
        city: `${name}, ${country}`,
        latitude, longitude,
        temperature_2m: current.temperature_2m,
        windspeed_10m: current.windspeed_10m,
        relativehumidity_2m: current.relativehumidity_2m,
        weathercode: current.weathercode,
        visibility: current.visibility || 10000,
        time: current.time,
      };

      setWeather(result);
      if (onWeatherData) onWeatherData(result);
    } catch (e) {
      setError("Error al obtener datos del clima");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWeather("Bogotá");
  }, []);

  const flyability = weather ? getDroneFlyability(weather) : null;

  if (compact && weather) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs", flyability?.canFly ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
        {flyability?.canFly ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        <span className="font-medium">{weather.city}</span>
        <span>|</span>
        <Thermometer className="w-3 h-3" />{weather.temperature_2m}°C
        <Wind className="w-3 h-3" />{weather.windspeed_10m} km/h
        <span>{WMO_CODES[weather.weathercode]?.split(" ")[1] || "—"}</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-500" /> Condiciones Meteorológicas
        </h3>
        <Button variant="ghost" size="sm" onClick={() => fetchWeather(searchCity)} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ciudad (ej: Medellín)"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setSearchCity(city); fetchWeather(city); } }}
          className="text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => { setSearchCity(city); fetchWeather(city); }} disabled={loading}>
          Buscar
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {weather && !loading && (
        <>
          {/* Alerta de vuelo */}
          <div className={cn("flex items-start gap-3 p-3 rounded-xl", flyability.canFly ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
            {flyability.canFly
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className={cn("text-sm font-bold", flyability.canFly ? "text-green-700" : "text-red-700")}>
                {flyability.canFly ? "✓ Condiciones aptas para volar" : "✗ No recomendado para operar"}
              </p>
              {flyability.issues.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {flyability.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground">{weather.city}</p>

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Thermometer, label: "Temperatura", val: `${weather.temperature_2m}°C`, color: "text-orange-500" },
              { icon: Wind, label: "Viento", val: `${weather.windspeed_10m} km/h`, color: weather.windspeed_10m > 25 ? "text-red-500" : weather.windspeed_10m > 15 ? "text-yellow-500" : "text-sky-500" },
              { icon: Droplets, label: "Humedad", val: `${weather.relativehumidity_2m}%`, color: "text-blue-500" },
              { icon: Eye, label: "Visibilidad", val: weather.visibility >= 10000 ? ">10 km" : `${(weather.visibility / 1000).toFixed(1)} km`, color: weather.visibility < 5000 ? "text-red-500" : "text-emerald-500" },
            ].map(m => (
              <div key={m.label} className="bg-muted rounded-lg p-3 text-center">
                <m.icon className={cn("w-4 h-4 mx-auto mb-1", m.color)} />
                <p className="text-sm font-bold">{m.val}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="text-sm text-center text-muted-foreground">
            {WMO_CODES[weather.weathercode] || "Condición desconocida"}
          </div>
        </>
      )}
    </div>
  );
}