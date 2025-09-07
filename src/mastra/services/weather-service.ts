import { CONFIG } from '../config';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
}

export interface ForecastData {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationChance: number;
  condition: string;
  location: string;
}

export class WeatherService {
  static async geocodeLocation(location: string): Promise<GeocodingResult> {
    const geocodingUrl = `${CONFIG.WEATHER_API_BASE}?name=${encodeURIComponent(location)}&count=1`;
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (!data.results?.[0]) {
      throw new Error(`Location '${location}' not found`);
    }

    return {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude,
      name: data.results[0].name,
    };
  }

  static async getCurrentWeather(location: string): Promise<WeatherData> {
    const geo = await this.geocodeLocation(location);

    const weatherUrl = `${CONFIG.WEATHER_FORECAST_API}?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (!data.current) {
      throw new Error('Weather data not found');
    }

    return {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windGust: data.current.wind_gusts_10m,
      conditions: this.getWeatherCondition(data.current.weather_code),
      location: geo.name,
    };
  }

  static async getForecast(location: string, days: number = 7): Promise<ForecastData[]> {
    const geo = await this.geocodeLocation(location);

    const forecastUrl = `${CONFIG.WEATHER_FORECAST_API}?latitude=${geo.latitude}&longitude=${geo.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=${days}`;
    const response = await fetch(forecastUrl);
    const data = await response.json();

    if (!data.daily) {
      throw new Error('Forecast data not found');
    }

    return data.daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: data.daily.temperature_2m_max[index],
      minTemp: data.daily.temperature_2m_min[index],
      precipitationChance: data.daily.precipitation_probability_max[index],
      condition: this.getWeatherCondition(data.daily.weather_code[index]),
      location: geo.name,
    }));
  }

  private static getWeatherCondition(code: number): string {
    const conditions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      95: 'Thunderstorm',
    };
    return conditions[code] || 'Unknown';
  }
}
