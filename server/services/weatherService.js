const axios = require('axios');

/**
 * Weather Service - Integrates with OpenWeatherMap API
 * Provides weather-aware route adjustments and training recommendations.
 */
class WeatherService {
  constructor() {
    this.WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    this.AQI_API_KEY = process.env.AQI_API_KEY;
    this.WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
    this.AQI_BASE_URL = 'https://api.waqi.info/feed';
  }

  async getWeatherData(lat, lng) {
    if (!this.WEATHER_API_KEY) {
      console.warn('Weather API Key missing. Returning default weather.');
      return this.getDefaultWeather();
    }

    try {
      const response = await axios.get(`${this.WEATHER_BASE_URL}/weather`, {
        params: {
          lat,
          lon: lng,
          appid: this.WEATHER_API_KEY,
          units: 'metric'
        }
      });

      // Get AQI data from WAQI API
      const aqiData = await this.getAQI(lat, lng);

      return {
        temp: response.data.main.temp,
        feels_like: response.data.main.feels_like,
        condition: response.data.weather[0].main,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        pressure: response.data.main.pressure,
        visibility: response.data.visibility / 1000, // Convert to km
        location: {
          city: response.data.name,
          country: response.data.sys.country,
          lat: response.data.coord.lat,
          lon: response.data.coord.lon
        },
        aqi: aqiData.aqi, // Numeric AQI value from WAQI
        pm25: aqiData.pm25, // PM2.5 concentration
        pollutants: aqiData.pollutants,
        aqiSource: 'WAQI (aqicn.org)'
      };
    } catch (error) {
      console.error('Error fetching weather:', error.message);
      return this.getDefaultWeather();
    }
  }

  async getAQI(lat, lng) {
    if (!this.AQI_API_KEY) {
      console.warn('AQI API Key missing. Using OpenWeather fallback.');
      return await this.getAQIFromOpenWeather(lat, lng);
    }

    try {
      // WAQI API endpoint: https://api.waqi.info/feed/geo:lat;lng/?token=TOKEN
      const response = await axios.get(`${this.AQI_BASE_URL}/geo:${lat};${lng}/`, {
        params: {
          token: this.AQI_API_KEY
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`WAQI API error: ${response.data.data}`);
      }

      const data = response.data.data;
      const aqi = data.aqi; // Numeric AQI value
      const iaqi = data.iaqi || {}; // Individual pollutant AQIs

      return {
        aqi: aqi === '-' ? 0 : parseInt(aqi), // Handle missing data
        pm25: iaqi.pm25?.v || 0,
        pollutants: {
          pm25: iaqi.pm25?.v || 0,
          pm10: iaqi.pm10?.v || 0,
          o3: iaqi.o3?.v || 0,
          no2: iaqi.no2?.v || 0,
          so2: iaqi.so2?.v || 0,
          co: iaqi.co?.v || 0
        }
      };
    } catch (error) {
      console.error('Error fetching AQI from WAQI:', error.message);
      // Fallback to OpenWeather
      return await this.getAQIFromOpenWeather(lat, lng);
    }
  }

  async getAQIFromOpenWeather(lat, lng) {
    try {
      const response = await axios.get(`${this.WEATHER_BASE_URL}/air_pollution`, {
        params: {
          lat,
          lon: lng,
          appid: this.WEATHER_API_KEY
        }
      });

      const data = response.data.list[0];
      const aqiIndex = data.main.aqi; // 1-5 scale
      
      // Convert OpenWeather 1-5 scale to approximate AQI values
      const aqiConversion = {
        1: 25,  // Good
        2: 75,  // Moderate
        3: 125, // Unhealthy for Sensitive Groups
        4: 175, // Unhealthy
        5: 250  // Very Unhealthy
      };

      return {
        aqi: aqiConversion[aqiIndex] || 50,
        pm25: data.components.pm2_5 || 0,
        pollutants: {
          pm25: Math.round(data.components.pm2_5 || 0),
          pm10: Math.round(data.components.pm10 || 0),
          o3: Math.round(data.components.o3 || 0),
          no2: Math.round(data.components.no2 || 0),
          so2: Math.round(data.components.so2 || 0),
          co: Math.round(data.components.co || 0)
        }
      };
    } catch (error) {
      console.error('Error fetching AQI from OpenWeather:', error.message);
      return {
        aqi: 50,
        pm25: 0,
        pollutants: { pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0 }
      };
    }
  }

  getTrainingRecommendation(weather) {
    const { temp, condition, aqi, pm25 } = weather;
    let recommendations = [];

    // Temperature-based recommendations
    if (temp > 35) recommendations.push('Extreme heat! Consider indoor training or postpone your run.');
    else if (temp > 30) recommendations.push('High heat! Stay hydrated and prefer shaded routes.');
    if (temp < 5) recommendations.push('Cold weather. Warm up thoroughly before starting.');
    if (temp < 0) recommendations.push('Freezing conditions! Indoor training recommended.');

    // Air quality recommendations based on AQI (standard scale)
    if (aqi > 200) recommendations.push(`Hazardous air quality (AQI: ${aqi}). Avoid all outdoor exercise.`);
    else if (aqi > 150) recommendations.push(`Very unhealthy air quality (AQI: ${aqi}). Avoid outdoor running.`);
    else if (aqi > 100) recommendations.push(`Unhealthy for sensitive groups (AQI: ${aqi}). Reduce intensity and duration.`);
    else if (aqi > 50) recommendations.push(`Moderate air quality (AQI: ${aqi}). Sensitive individuals should reduce exertion.`);
    
    // Weather condition warnings
    if (condition === 'Thunderstorm') {
      recommendations.push('Dangerous conditions (Thunderstorm). Postpone your run immediately.');
    } else if (['Rain', 'Snow'].includes(condition)) {
      recommendations.push(`Slippery conditions (${condition}). Use extra caution and proper footwear.`);
    }

    // Determine if safe to run (AQI < 150 is generally acceptable for healthy adults)
    const canRun = aqi < 150 && condition !== 'Thunderstorm';

    return {
      canRun,
      recommendations,
      intensityAdjustment: temp > 35 || aqi > 100 ? 0.7 : (aqi > 50 ? 0.85 : 1.0)
    };
  }

  getDefaultWeather() {
    return {
      temp: 20,
      condition: 'Clear',
      humidity: 50,
      windSpeed: 5,
      aqi: 1
    };
  }
}

module.exports = new WeatherService();
