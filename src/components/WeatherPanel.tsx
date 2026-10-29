import { C, wpPlaced, wpIs, ROUTE_GAP, RSL as SL, wpType, wpColor, wpGlyph, uElev, DLOCALE, uTemp, uWind, uPrecip, uSnowfall, uTempDelta } from "../../ClimbMatchCore.jsx";
import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { fetchForecastRaw, nwsHeightShiftF } from "../../lib/forecast";
import CardHead from "./CardHead.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { wxTempColor, wxWindColor } from "../../lib/wxColors.js";
import WeatherIcon from "./WeatherIcon.tsx";
import Chevron from "./Chevron.tsx";
import { clockHr, compass, spanEnding } from "../../lib/HourTiles.jsx";
import { dayBox, dayLbl, dayVal, daySub } from "../../lib/dayStyles.js";

/** A point the forecast is fetched for: a placed waypoint (coordinates as numbers) or the crag/peak fallback. */
interface WxPoint {
  type?: string | null;
  name?: string | null;
  lat: number;
  lng: number;
  elev?: number | null;
  distMi?: number | null;
}
/** A waypoint as the route stores it (coordinates may still be strings). */
interface WxWaypoint {
  type?: string | null;
  name?: string | null;
  lat: number | string;
  lng: number | string;
  elev?: number | null;
  distMi?: number | null;
}
/** One part (AM, PM, Night) of a forecast day. `rain` is null when no figure exists; every comparison here treats that as no rain. */
interface WxPart {
  label: string;
  temp: number;
  wx: string | null;
  wxCode: number | null;
  wind: number;
  dir: string | null;
  rain: number;
  pop: number | null;
}
/** One hour of a forecast day; a series the source did not publish arrives as null. */
interface WxHour {
  hr: number;
  tempF: number | null;
  code: number;
  windMph: number | null;
  dir: number | null;
  pop: number | null;
  gustMph: number | null;
  precipIn: number | null;
}
/** A secondary source's high/low/wind/weather for a day. */
interface WxSecondary {
  lo: number;
  hi: number;
  wind: number | null;
  wx: string | null;
}
/** One forecast day. */
interface WxDay {
  date: string;
  tempLo: number;
  tempHi: number;
  feelsLo: number;
  feelsHi: number;
  wx: string | null;
  wxCode: number | null;
  windMax: number;
  wind10Max: number | null;
  gustMax: number;
  popMax: number;
  precipIn: number;
  snowIn: number;
  freezeMax: number;
  uvMax: number;
  parts: WxPart[];
  hours: WxHour[];
  /** NWS, shifted for the height difference (`adj`, degrees F). */
  nws: (WxSecondary & { adj: number }) | null;
  met: WxSecondary | null;
}
/** What one point's fetch left in state: its days, or that it failed. */
interface WxEntry {
  days?: WxDay[];
  error?: boolean;
}
/** The hourly arrays collected for one local day. */
interface DayBucket {
  temps: number[];
  feels: number[];
  codes: number[];
  winds: number[];
  winds10: number[];
  gusts: number[];
  pops: number[];
  precips: number[];
  snows: number[];
  fz: number[];
  uvs: number[];
  hours: WxHour[];
}
/** The arrays collected for one part of a day. */
interface PartBucket {
  temps: number[];
  codes: number[];
  winds: number[];
  dirs: number[];
  precips: number[];
  pops: number[];
}
/** One NWS grid value (temperature, wind) or weather entry. */
interface NwsValue {
  value?: number | null;
  validTime: string;
}
interface NwsWeatherValue {
  value?: { weather?: string | null }[] | null;
  validTime: string;
}
/** One MET Norway time-series entry. */
interface MetEntry {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary?: { symbol_code?: string } };
    next_6_hours?: { summary?: { symbol_code?: string } };
  };
}

export interface WeatherPanelProps {
  /** The route's waypoints; the trailhead, a mid point and the summit are forecast. Unused on a crag. */
  waypoints?: WxWaypoint[] | null;
  /** The Plan tab exists, so the empty state can point at it. */
  showPlan?: boolean;
  /** One point to forecast when no waypoint is placed (the peak or crag itself). */
  fallback?: WxPoint | null;
  /** A crag: forecast the fallback point only. */
  crag?: boolean;
}

const WX_CODE_LABEL: Record<number,string>={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light rain showers",81:"Rain showers",82:"Heavy rain showers",85:"Snow showers",86:"Heavy snow showers",95:"Thunderstorms",96:"Thunderstorms",99:"Thunderstorms"};
const WX_COMPASS=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
function degToCompass(deg: number | null | undefined){if(deg==null||isNaN(deg))return null;return WX_COMPASS[Math.round((((deg%360)+360)%360)/22.5)%16];}
function circMeanDeg(arr: number[] | null | undefined){if(!arr||!arr.length)return null;let sx=0,sy=0;arr.forEach(function(d){const r=d*Math.PI/180;sx+=Math.cos(r);sy+=Math.sin(r);});return (Math.atan2(sy,sx)*180/Math.PI+360)%360;}
function modeOf<T extends string | number>(arr: T[] | null | undefined){if(!arr||!arr.length)return null;const c={} as Record<T,number>;let best=arr[0],bc=0;arr.forEach(function(v){c[v]=(c[v]||0)+1;if(c[v]>bc){bc=c[v];best=v;}});return best;}
/* WHEN a day's rain falls, Mountain-Forecast style: " · mostly at night" when one part of the day holds 60% or more of
   the rain its parts carry. The parts' night runs on to 6 AM, so this names a part, never a share of the day total. */
const RAIN_PART_WORD: Record<string,string>={AM:"in the morning",PM:"in the afternoon",Night:"at night"};
function rainMostly(dy: {parts?: WxPart[] | null; precipIn: number}){const ps=(dy.parts||[]).filter(function(p){return p.rain>0;});const tot=ps.reduce(function(a,p){return a+p.rain;},0);if(!(dy.precipIn>0)||!ps.length||tot<0.01)return "";const top=ps.reduce(function(a,p){return p.rain>a.rain?p:a;});return top.rain>=0.6*tot&&RAIN_PART_WORD[top.label]?" · mostly "+RAIN_PART_WORD[top.label]:"";}
function gustWorthShowing(dy: {wind10Max?: number | null; gustMax: number}){const surf=dy.wind10Max;return !(typeof surf==="number"&&isFinite(surf))||dy.gustMax>surf;}
function wxCondColor(code: number | null | undefined){if(code==null)return C.blue;if(code>=95)return C.red;if(code===0||code===1)return C.green;if(code===2||code===3||code===45||code===48)return C.textSub;return C.blue;}
function wxUvColor(uv: number){return uv>=11?C.purple:uv>=8?C.red:uv>=6?C.amber:uv>=3?C.yellow||C.amber:C.green;}
function wxUvLabel(uv: number){return uv>=11?"Extreme":uv>=8?"Very High":uv>=6?"High":uv>=3?"Moderate":"Low";}
const FROSTBITE_WINDCHILL_F=-19;
function metWxLabel(code: string | null | undefined){
  if(!code)return null;
  const s=code.replace(/_(day|night|polartwilight)$/,"");
  const MAP: Record<string,string>={clearsky:"Clear",fair:"Fair",partlycloudy:"Partly cloudy",cloudy:"Cloudy",fog:"Fog",rain:"Rain",lightrain:"Light rain",heavyrain:"Heavy rain",rainshowers:"Rain showers",lightrainshowers:"Light rain showers",heavyrainshowers:"Heavy rain showers",sleet:"Sleet",lightsleet:"Light sleet",heavysleet:"Heavy sleet",sleetshowers:"Sleet showers",lightsleetshowers:"Light sleet showers",heavysleetshowers:"Heavy sleet showers",snow:"Snow",lightsnow:"Light snow",heavysnow:"Heavy snow",snowshowers:"Snow showers",lightsnowshowers:"Light snow showers",heavysnowshowers:"Heavy snow showers"};
  if(MAP[s])return MAP[s];
  if(s.indexOf("thunder")>=0)return "Thunderstorms";
  return s;
}
function pickForecastWaypoints(waypoints: WxWaypoint[] | null | undefined){
  const wps=(waypoints||[]).filter(wpPlaced).map(function(w){return (typeof w.lat==="number"&&typeof w.lng==="number")?w as WxPoint:{...w,lat:+w.lat,lng:+w.lng};});
  const trailhead=wps.find(function(w){return wpIs(w,"Trailhead");})||null;
  const summit=wps.find(function(w){return wpIs(w,"Summit")||wpIs(w,"Topout");})||null;
  const rest=wps.filter(function(w){return w!==trailhead&&w!==summit;});
  const camps=rest.filter(function(w){return wpIs(w,"Campsite");});
  let mid: WxPoint|null=null;
  if(camps.length){
    mid=camps.slice().sort(function(a,b){return (b.elev||0)-(a.elev||0);})[0]; // the highest camp is the most useful mid-mountain read
  }else if(rest.length){
    const midElev=(trailhead&&trailhead.elev!=null&&summit&&summit.elev!=null)?(trailhead.elev+summit.elev)/2:null;
    const midDist=(trailhead&&trailhead.distMi!=null&&summit&&summit.distMi!=null)?(trailhead.distMi+summit.distMi)/2:null;
    mid=rest.slice().sort(function(a,b){
      const sa=midElev!=null&&a.elev!=null?Math.abs(a.elev-midElev):(midDist!=null&&a.distMi!=null?Math.abs(a.distMi-midDist)*1000:99999);
      const sb=midElev!=null&&b.elev!=null?Math.abs(b.elev-midElev):(midDist!=null&&b.distMi!=null?Math.abs(b.distMi-midDist)*1000:99999);
      return sa-sb;
    })[0]; // no camp on the route — fall back to whichever waypoint sits closest to the trailhead/summit midpoint
  }
  return [trailhead,mid,summit].filter(Boolean) as WxPoint[];
}
/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function WeatherPanel({waypoints,showPlan,fallback,crag}: WeatherPanelProps){
  const _picked=crag?[]:pickForecastWaypoints(waypoints);
  const points=_picked.length||!fallback?_picked:[fallback];
  const [data,setData]=useState<Record<string,WxEntry>>({});
  const [expandedDay,setExpandedDay]=useState<Record<string,string|null>>({});
  const key=points.map(function(w){return w.type+"_"+w.name;}).join("|");
  useEffect(function(){
    if(!points.length)return;
    // Cancelled on cleanup: the three forecast fetches resolve after an unmount (leaving the route
    // page) or after the waypoint set changes, and each used to write into a dead panel.
    let live=true;
    points.forEach(function(w){
      const k=w.type+"_"+w.name;
      // forecast_days=16 is Open-Meteo's max — pulls the full range it forecasts
      // out to, not just the next 24 hours, so the panel below can lay it out
      // day by day instead of a single next-day summary.
      // precipitation_unit=inch also switches freezing_level_height (and other
      // length fields) from meters to feet, so freezeMax arrives in CANONICAL
      // FEET — never scale it by 3.28 again. DISPLAYING it still goes through
      // uElev(), exactly like every other tile in this panel: converting the
      // canonical value to the climber's own unit is a different operation
      // from the re-conversion this warns about, and skipping it is what left
      // the Freezing level tile reading feet to a metric climber.
      // The three requests live in lib/forecast.js now (fetchForecastRaw), shared with the Safety tab.
      // Open-Meteo, NWS, and MET Norway run different models from different
      // organizations and can legitimately disagree by several degrees over
      // complex mountain terrain — fetch both secondary sources' own series too
      // so the panel can flag divergence instead of presenting one number as
      // gospel. Both secondary sources are short-range (~4-7 days); Open-Meteo
      // alone still drives the full 16-day view and is the only one broken into
      // AM/PM/Night + hourly detail — the secondary sources stay lighter (a
      // high/low, wind, and one weather label) by design, not full parity.
      // MET Norway (api.met.no) — an independent forecast from a different
      // national weather service (ECMWF-derived outside the Nordics), not
      // affiliated with NOAA. Browsers won't let JS set a custom User-Agent
      // (a forbidden fetch header), so this relies on the browser's own UA —
      // fine at this request volume, but MET Norway's own guidance prefers an
      // identifying one for high-traffic server-side use.
      fetchForecastRaw(w).then(function(res){return {res:res};}).then(function(o){
        const res=o.res;
        const json=res[0],nwsJson=res[1],metJson=res[2];
        const h=json&&json.hourly;
        if(!h||!h.temperature_2m||!h.time)throw new Error("no data");
        const offsetSec=json.utc_offset_seconds||0;
        const toLocalDay=function(utcIso: string){return new Date(new Date(utcIso).getTime()+offsetSec*1000).toISOString().slice(0,10);};
        const prevDayStr=function(dateStr: string){return new Date(new Date(dateStr+"T00:00:00Z").getTime()-86400000).toISOString().slice(0,10);};
        // Group hourly samples by the local calendar date Open-Meteo returns
        // (timezone=auto) rather than by 24-hour blocks from fetch time, so
        // "today" lines up with the site's own day instead of drifting with
        // whatever hour the request happened to go out. AM/PM/Night parts are
        // bucketed separately: pre-dawn hours (0-5) join the PRECEDING day's
        // "Night" bucket rather than starting a new one, since the coldest
        // part of an overnight is usually just before dawn — matching how
        // mountain-forecast sites group an alpine-start overnight window.
        const byDay: Record<string,DayBucket>={},byPart: Record<string,PartBucket>={};
        h.time.forEach(function(t: string,i: number){
          const date=t.slice(0,10),hr=parseInt(t.slice(11,13),10);
          if(!byDay[date])byDay[date]={temps:[],feels:[],codes:[],winds:[],winds10:[],gusts:[],pops:[],precips:[],snows:[],fz:[],uvs:[],hours:[]};
          const dd=byDay[date];
          dd.temps.push(h.temperature_2m[i]);
          dd.feels.push(h.apparent_temperature[i]);
          dd.codes.push(h.weather_code[i]);
          dd.winds.push(h.wind_speed_80m[i]);
          if(h.wind_speed_10m)dd.winds10.push(h.wind_speed_10m[i]);
          dd.gusts.push(h.wind_gusts_10m[i]);
          dd.pops.push(h.precipitation_probability[i]);
          dd.precips.push(h.precipitation[i]);
          dd.snows.push(h.snowfall[i]);
          dd.fz.push(h.freezing_level_height[i]);
          dd.uvs.push(h.uv_index[i]);
          /* The HOURLY rows pair the wind with the gust beside it, and the only gust published is at 10 m -- so the hour's
             wind (and its direction) is the 10 m one too. The 80 m figure in that box read a calm-looking 10 m gust as
             weaker than its own wind. The day tile's headline stays at 80 m (check:units says why). An older saved
             forecast without the 10 m series shows "Not measured", never an 80 m figure under a 10 m label. */
          dd.hours.push({hr:hr,tempF:h.temperature_2m[i],code:h.weather_code[i],windMph:h.wind_speed_10m?h.wind_speed_10m[i]:null,dir:h.wind_direction_10m?h.wind_direction_10m[i]:null,pop:h.precipitation_probability[i],gustMph:h.wind_gusts_10m[i],precipIn:h.precipitation[i]});
          const partKey=hr<6?"night":hr<12?"am":hr<18?"pm":"night";
          const partDate=hr<6?prevDayStr(date):date;
          const pk=partDate+"_"+partKey;
          if(!byPart[pk])byPart[pk]={temps:[],codes:[],winds:[],dirs:[],precips:[],pops:[]};
          /* RAIN BY PART OF THE DAY. precipitation[T] is the rain of the hour BEFORE T, so it belongs to the part that
             hour BEGAN in: the 6 AM value is the night's, the noon value the morning's. */
          const bHr=hr===0?23:hr-1,bDate=hr===0?prevDayStr(date):date;
          const rk=(bHr<6?prevDayStr(bDate):bDate)+"_"+(bHr<6?"night":bHr<12?"am":bHr<18?"pm":"night");
          if(!byPart[rk])byPart[rk]={temps:[],codes:[],winds:[],dirs:[],precips:[],pops:[]};
          if(h.precipitation[i]!=null)byPart[rk].precips.push(h.precipitation[i]);
          if(h.precipitation_probability[i]!=null)byPart[rk].pops.push(h.precipitation_probability[i]);
          byPart[pk].temps.push(h.temperature_2m[i]);
          byPart[pk].codes.push(h.weather_code[i]);
          byPart[pk].winds.push(h.wind_speed_80m[i]);
          byPart[pk].dirs.push(h.wind_direction_80m[i]);
        });
        const sum=function(arr: number[]){return arr.reduce(function(s,v){return s+(v||0);},0);};
        const avg=function(arr: number[]){return arr.length?sum(arr)/arr.length:0;};
        const buildPart=function(label: string,pk: string){const b=byPart[pk];if(!b||!b.temps.length)return null;const pCode=modeOf(b.codes);return {label:label,temp:Math.round(avg(b.temps)),wx:WX_CODE_LABEL[pCode as number]||null,wxCode:pCode,wind:Math.round(avg(b.winds)),dir:degToCompass(circMeanDeg(b.dirs)),rain:b.precips.length?Math.round(sum(b.precips)*1000)/1000:null,pop:b.pops.length?Math.round(Math.max.apply(null,b.pops)):null};};
        // Secondary-source extras (wind + one weather label per day) — a
        // lighter read than Open-Meteo's per-part/hourly breakdown, by design.
        const nwsByDay: Record<string,number[]>={},nwsWindByDay: Record<string,number[]>={},nwsWxByDay: Record<string,string[]>={};
        /* NWS temperatures are for THEIR grid cell's own height, not this point's. Raw, they read warmer than the
           height-adjusted series beside them at every summit (Rainier: cell 3,890 m, pin 4,392 m) and tripped
           "differs" on a difference of height, not of forecast. Shifted by the standard lapse rate, stated. */
        const nwsShift=nwsHeightShiftF(nwsJson,w.elev);
        if(nwsJson&&nwsJson.properties){
          const tvals=nwsJson.properties.temperature&&nwsJson.properties.temperature.values;
          if(tvals)tvals.forEach(function(v: NwsValue){if(typeof v.value!=="number")return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsByDay[day])nwsByDay[day]=[];nwsByDay[day].push(v.value*9/5+32+nwsShift);});
          const wvals=nwsJson.properties.windSpeed&&nwsJson.properties.windSpeed.values;
          if(wvals)wvals.forEach(function(v: NwsValue){if(typeof v.value!=="number")return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsWindByDay[day])nwsWindByDay[day]=[];nwsWindByDay[day].push(v.value*0.621371);});
          const xvals=nwsJson.properties.weather&&nwsJson.properties.weather.values;
          if(xvals)xvals.forEach(function(v: NwsWeatherValue){const w0=v.value&&v.value[0]&&v.value[0].weather;if(!w0)return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsWxByDay[day])nwsWxByDay[day]=[];nwsWxByDay[day].push(w0);});
        }
        const metByDay: Record<string,number[]>={},metWindByDay: Record<string,number[]>={},metWxByDay: Record<string,string[]>={};
        if(metJson&&metJson.properties&&metJson.properties.timeseries){
          metJson.properties.timeseries.forEach(function(e: MetEntry){
            const det=e&&e.data&&e.data.instant&&e.data.instant.details;
            if(!det||typeof det.air_temperature!=="number")return;
            const day=toLocalDay(e.time);
            if(!metByDay[day])metByDay[day]=[];
            metByDay[day].push(det.air_temperature*9/5+32);
            if(typeof det.wind_speed==="number"){if(!metWindByDay[day])metWindByDay[day]=[];metWindByDay[day].push(det.wind_speed*2.23694);}
            const sym=(e.data.next_1_hours&&e.data.next_1_hours.summary&&e.data.next_1_hours.summary.symbol_code)||(e.data.next_6_hours&&e.data.next_6_hours.summary&&e.data.next_6_hours.summary.symbol_code);
            if(sym){if(!metWxByDay[day])metWxByDay[day]=[];metWxByDay[day].push(sym);}
          });
        }
        const cap=function(s: string | null | undefined){return s?s.charAt(0).toUpperCase()+s.slice(1):null;};
        /* NWS ships its weather values as snake_case English (rain_showers, freezing_rain,
           blowing_snow), so replacing the separator LABELS THE WHOLE VOCABULARY rather than
           the codes somebody remembered -- unlike metWxLabel, which needs a map because
           `clearsky` and `partlycloudy` are not words. */
        const nwsWxLabel=function(s: string | null | undefined){return s?cap(String(s).replace(/_/g," ")):null;};
        const days=Object.keys(byDay).sort().map(function(date){
          const d=byDay[date];
          const parts=[buildPart("AM",date+"_am"),buildPart("PM",date+"_pm"),buildPart("Night",date+"_night")].filter(Boolean) as WxPart[];
          const nd=nwsByDay[date];
          const nws=(nd&&nd.length>=3)?{adj:nwsShift,lo:Math.round(Math.min.apply(null,nd)),hi:Math.round(Math.max.apply(null,nd)),wind:nwsWindByDay[date]?Math.round(Math.max.apply(null,nwsWindByDay[date])):null,wx:nwsWxLabel(modeOf(nwsWxByDay[date]))}:null;
          const md=metByDay[date];
          const met=(md&&md.length>=3)?{lo:Math.round(Math.min.apply(null,md)),hi:Math.round(Math.max.apply(null,md)),wind:metWindByDay[date]?Math.round(Math.max.apply(null,metWindByDay[date])):null,wx:metWxLabel(modeOf(metWxByDay[date]))}:null;
          const wxCode=modeOf(d.codes);
          return {date:date,tempLo:Math.round(Math.min.apply(null,d.temps)),tempHi:Math.round(Math.max.apply(null,d.temps)),feelsLo:Math.round(Math.min.apply(null,d.feels)),feelsHi:Math.round(Math.max.apply(null,d.feels)),wx:WX_CODE_LABEL[wxCode as number]||null,wxCode:wxCode,windMax:Math.round(Math.max.apply(null,d.winds)),wind10Max:d.winds10.length?Math.round(Math.max.apply(null,d.winds10)):null,gustMax:Math.round(Math.max.apply(null,d.gusts)),popMax:Math.round(Math.max.apply(null,d.pops)),precipIn:Math.round(sum(d.precips)*1000)/1000,snowIn:Math.round(sum(d.snows)*100)/100,freezeMax:Math.round(Math.max.apply(null,d.fz)),uvMax:Math.round(Math.max.apply(null,d.uvs)*10)/10,parts:parts,hours:d.hours,nws:nws,met:met};
        });
        if(!live)return;
        setData(function(p){return Object.assign({},p,{[k]:{days:days}});});
      }).catch(function(){if(!live)return;setData(function(p){return Object.assign({},p,{[k]:{error:true}});});});
    });
    return function(){live=false;};
  },[key]); // eslint-disable-line react-hooks/exhaustive-deps -- key is derived from points; refetch only when the point set changes, not on array identity
  if(!points.length)return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}><CardHead style={{marginBottom:6}}>WEATHER FORECAST</CardHead><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{crag?"No forecast yet — this crag has no location to forecast from.":"No forecast yet — this route has no named waypoints to forecast from. "+(showPlan?"Add a trailhead and summit waypoint on the Plan tab to unlock AM/PM/Night forecasts here.":"Once a trailhead and summit waypoint are added, AM/PM/Night forecasts appear here.")}</div></div>;
  /* A fourth copy of the waypoint colour/icon map lived here, under its own names, which is
     why the first sweep missed it: a grep for the other copies' variable name cannot find a
     synonym. It happened to agree with them today and would not have for long — that is the
     whole failure mode, three copies agreeing with each other while all three were wrong.
     Reads from the shared WP_STYLE now, like everything else. */
  return <div style={{marginBottom:ROUTE_GAP}}>
    <SL>{crag?"Forecast at the crag":"Forecast at key points"}</SL>
    <div style={{display:"flex",flexDirection:"column",gap:ROUTE_GAP}}>{points.map(function(w){const k=w.type+"_"+w.name;const d=data[k];const expDate=expandedDay[k];const _wty=wpType(w);const wCol=wpColor(_wty);return <div key={k} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:wCol+"22",border:"1.5px solid "+wCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:wCol,flexShrink:0}}>{wpGlyph(_wty)}</div>
        <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{w.name+(w.elev!=null?" · "+uElev(w.elev):"")}</div>
      </div>
      {!d?<LoadingRows C={C} label="Loading forecast…"/>:d.error?<div style={{fontSize:12,color:C.textMuted}}>Forecast unavailable — check your connection.</div>:<><div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:3}}>{(d.days as WxDay[]).map(function(dy,di){
        const dt=new Date(dy.date+"T12:00:00");
        const lbl=di===0?"Today":dt.toLocaleDateString(DLOCALE,{weekday:"short"});
        const sub=dt.toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});
        const chilly=dy.feelsLo<=dy.tempLo-5;
        const frostbite=dy.feelsLo<=FROSTBITE_WINDCHILL_F;
        const hasSnow=dy.snowIn>=0.05;
        const omMid=(dy.tempHi+dy.tempLo)/2;
        const nwsMid=dy.nws?(dy.nws.hi+dy.nws.lo)/2:null;
        const diverges=nwsMid!=null&&Math.abs(nwsMid-omMid)>=6;
        const metMid=dy.met?(dy.met.hi+dy.met.lo)/2:null;
        const metDiverges=metMid!=null&&Math.abs(metMid-omMid)>=6;
        const isExpanded=expDate===dy.date;
        const condColor=wxCondColor(dy.wxCode);
        return <div key={dy.date} style={{flexShrink:0,width:272,display:"flex",flexDirection:"column",background:C.surface,borderRadius:12,padding:"12px 13px",border:"1px solid "+C.border,borderTop:"3px solid "+wxTempColor(dy.tempLo)}}>
          <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:800,color:C.text}}>{lbl}</div>
              <div style={{fontSize:10.5,color:C.textMuted}}>{sub}</div>
            </div>
            {dy.wx?<span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:condColor,background:condColor+"1a",border:"1px solid "+condColor+"55",borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}><WeatherIcon code={dy.wxCode} color={condColor} size={12}/>{dy.wx}</span>:null}
          </div>
          <div style={{fontSize:17,fontWeight:800,marginBottom:3}}><span style={{color:wxTempColor(dy.tempHi)}}>{"High "+uTemp(dy.tempHi)}</span><span style={{color:C.textMuted,fontWeight:600}}>{"  ·  "}</span><span style={{color:wxTempColor(dy.tempLo)}}>{"Low "+uTemp(dy.tempLo)}</span></div>
          <div style={{fontSize:11,fontWeight:frostbite?700:400,color:frostbite?C.red:chilly?C.blue:C.textMuted,marginBottom:10}}>{"Feels like: High "+uTemp(dy.feelsHi)+" · Low "+uTemp(dy.feelsLo)+(chilly?" (wind chill)":"")+(frostbite?" — frostbite risk in 30 min":"")}</div>
          {dy.parts.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>{dy.parts.map(function(p){return <div key={p.label} style={{background:C.card,borderRadius:9,padding:"7px 6px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{p.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9.5,color:C.textSub,marginBottom:5,minHeight:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={p.wxCode} color={C.textMuted} size={11}/>{p.wx||"—"}</div>
            <div style={{fontSize:13.5,fontWeight:800,color:wxTempColor(p.temp)}}>{uTemp(p.temp)}</div>
            <div style={{fontSize:9,fontWeight:600,color:wxWindColor(p.wind),marginTop:2}}>{uWind(p.wind)+(p.dir?" "+p.dir:"")}</div>
            <div style={{fontSize:9.5,fontWeight:700,color:p.rain>0?C.blue:C.textMuted,marginTop:3}}>{p.rain==null?"Rain —":p.rain>0?uPrecip(p.rain)+(p.pop!=null?" · "+p.pop+"%":""):"No rain"+(p.pop?" · "+p.pop+"%":"")}</div>
          </div>;})}</div>:null}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:diverges||metDiverges?10:0}}>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Wind</div><div style={{fontSize:13,fontWeight:800,color:wxWindColor(dy.windMax)}}>{uWind(dy.windMax)}</div>{gustWorthShowing(dy)?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{"gusts to "+uWind(dy.gustMax)+", any hour"}</div>:null}</div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Precip</div><div style={{fontSize:13,fontWeight:800,color:dy.precipIn>0?C.blue:C.text}}>{dy.precipIn>0?uPrecip(dy.precipIn):"None"}</div><div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{dy.popMax+"% chance"+rainMostly(dy)}</div></div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>UV index</div><div style={{fontSize:13,fontWeight:800,color:wxUvColor(dy.uvMax)}}>{dy.uvMax}</div><div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{wxUvLabel(dy.uvMax)}</div></div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Freezing level</div><div style={{fontSize:13,fontWeight:800,color:C.text}}>{uElev(dy.freezeMax)}</div></div>
            {hasSnow?<div style={{gridColumn:"span 2",background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4}}>Snow expected</div><div style={{fontSize:13,fontWeight:800,color:C.blue}}>{uSnowfall(dy.snowIn)}</div></div>:null}
          </div>
          {diverges||metDiverges?<div style={{display:"flex",flexDirection:"column",gap:5}}>
            {diverges?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>NWS</span><span style={{color:C.amber,lineHeight:1.4}}>{"High "+uTemp((dy.nws as NonNullable<WxDay["nws"]>).hi)+" · Low "+uTemp((dy.nws as NonNullable<WxDay["nws"]>).lo)+" — differs "+uTempDelta(Math.abs(nwsMid-omMid))+"°"+(Math.abs((dy.nws as NonNullable<WxDay["nws"]>).adj)>=1?" · adjusted "+uTempDelta(Math.abs((dy.nws as NonNullable<WxDay["nws"]>).adj))+"° "+((dy.nws as NonNullable<WxDay["nws"]>).adj<0?"colder":"warmer")+" for this height":"")}</span></div>:null}
            {metDiverges?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>MET</span><span style={{color:C.amber,lineHeight:1.4}}>{"High "+uTemp((dy.met as WxSecondary).hi)+" · Low "+uTemp((dy.met as WxSecondary).lo)+" — differs "+uTempDelta(Math.abs(metMid-omMid))+"°"}</span></div>:null}
          </div>:null}
          </div>
          {dy.hours&&dy.hours.length?<div style={{marginTop:"auto",paddingTop:10}}>
          <button onClick={function(){setExpandedDay(function(p){const o=Object.assign({},p);o[k]=isExpanded?null:dy.date;return o;});}} aria-expanded={isExpanded} style={{minHeight:44,width:"100%",padding:"8px",borderRadius:9,border:"1px solid "+C.blueDim,background:isExpanded?C.blueBg:C.card,color:isExpanded?"#fff":C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>{isExpanded?"Hide hourly ":"Hourly forecast "}<Chevron inline open={isExpanded} size={12} color={C.blue}/></button>
          {isExpanded?<div>
            <div style={{marginTop:8,maxHeight:380,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:9}}>{dy.hours.map(function(hh,hi){const t=typeof hh.tempF==="number"?Math.round(hh.tempF):null,wm=typeof hh.windMph==="number"?Math.round(hh.windMph):null,gm=typeof hh.gustMph==="number"?Math.round(hh.gustMph):null;return <div key={hi} style={{padding:"8px 9px",background:hi%2?"transparent":C.card,borderBottom:hi<dy.hours.length-1?"1px solid "+C.borderLight:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{width:62,flexShrink:0,fontSize:15,fontWeight:800,color:C.text}}>{clockHr(hh.hr)}</span><span style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={hh.code} color={C.textMuted} size={14}/>{WX_CODE_LABEL[hh.code]||"—"}</span></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:5}}>
                <span style={dayBox as CSSProperties}><span style={dayLbl}>Temp</span><span style={Object.assign({},dayVal,{color:t!=null?wxTempColor(t):C.textMuted}) as CSSProperties}>{t!=null?uTemp(t):"Not measured"}</span><span style={daySub}>{"At "+clockHr(hh.hr)}</span></span>
                <span style={dayBox as CSSProperties}><span style={dayLbl}>Wind</span><span style={Object.assign({},dayVal,{color:wm!=null?wxWindColor(wm):C.textMuted}) as CSSProperties}>{wm!=null?uWind(wm):"Not measured"}</span><span style={daySub}>{"At "+clockHr(hh.hr)+", 10 m up"+(wm!=null&&compass(hh.dir)?", from the "+compass(hh.dir):"")}</span></span>
                <span style={dayBox as CSSProperties}><span style={dayLbl}>Gusts</span><span style={Object.assign({},dayVal,{color:gm!=null?wxWindColor(gm):C.textMuted}) as CSSProperties}>{gm!=null?uWind(gm):"Not measured"}</span><span style={daySub}>{"During "+spanEnding(hh.hr)}</span></span>
                <span style={dayBox as CSSProperties}><span style={dayLbl}>Rain</span><span style={Object.assign({},dayVal,{color:(hh.precipIn as number)>0?C.blue:C.text}) as CSSProperties}>{hh.precipIn==null?"Not measured":hh.precipIn>0?uPrecip(hh.precipIn):"None"}</span><span style={daySub}>{(hh.pop!=null?hh.pop+"% chance, ":"")+"during "+spanEnding(hh.hr)}</span></span>
              </div></div>;})}</div></div>:null}
          </div>:null}
        </div>;
      })}</div></>}
    </div>;})}</div>
  </div>;
}
