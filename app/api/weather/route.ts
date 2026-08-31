import { json } from '@/lib/civic-db';

const ACCRA = { latitude: 5.6037, longitude: -0.187 };
const weatherResponse=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'public, max-age=300, s-maxage=600, stale-while-revalidate=1800'}});

async function metNorwayFallback(){
  const response=await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${ACCRA.latitude}&lon=${ACCRA.longitude}`,{headers:{Accept:'application/json','User-Agent':'FixMyCity-WebMCP/1.0 https://github.com/teckedd-code2save/fixmycity-webmcp'}});
  if(!response.ok)throw new Error(`MET Norway returned ${response.status}`);
  const data=await response.json() as {properties?:{timeseries?:Array<{time:string;data:{instant?:{details?:{air_temperature?:number;wind_speed?:number}};next_1_hours?:{summary?:{symbol_code?:string};details?:{precipitation_amount?:number}}}}>}};
  const periods=data.properties?.timeseries?.slice(0,6)??[];const current=periods[0];const details=current?.data.instant?.details;
  if(!current||details?.air_temperature===undefined)throw new Error('MET Norway returned no current conditions');
  const precipitationMm=periods.reduce((sum,period)=>sum+(period.data.next_1_hours?.details?.precipitation_amount??0),0);
  const symbols=periods.map(period=>period.data.next_1_hours?.summary?.symbol_code??'').join(' ');const rainWatch=precipitationMm>0.1||/(rain|showers|thunder|sleet)/i.test(symbols);
  return {source:'MET Norway Locationforecast',location:'Accra',observedAt:current.time,temperatureC:details.air_temperature,precipitationMm:Number(precipitationMm.toFixed(1)),windKph:details.wind_speed!==undefined?Number((details.wind_speed*3.6).toFixed(1)):undefined,next6HoursRainChance:null,rainWatch};
}

export async function GET() {
  const query = new URLSearchParams({
    latitude: String(ACCRA.latitude),
    longitude: String(ACCRA.longitude),
    current: 'temperature_2m,precipitation,rain,weather_code,wind_speed_10m',
    hourly: 'precipitation_probability',
    forecast_hours: '6',
    timezone: 'Africa/Accra',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);

    const data = (await response.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        precipitation?: number;
        rain?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      hourly?: { precipitation_probability?: number[] };
    };
    const current = data.current;
    if (!current) throw new Error('Weather provider returned no current conditions');

    const rainChance = Math.max(0, ...(data.hourly?.precipitation_probability ?? [0]));
    const rainWatch = rainChance >= 55 || (current.rain ?? 0) > 0;
    return weatherResponse({
      source: 'Open-Meteo',
      location: 'Accra',
      observedAt: current.time,
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      windKph: current.wind_speed_10m,
      weatherCode: current.weather_code,
      next6HoursRainChance: rainChance,
      rainWatch,
    });
  } catch (error) {
    try{return weatherResponse(await metNorwayFallback())}catch(fallbackError){return json({error:'Live weather is temporarily unavailable.',detail:[error,fallbackError].map(value=>value instanceof Error?value.message:'Unknown weather error').join(' · ')},503)}
  }
}
