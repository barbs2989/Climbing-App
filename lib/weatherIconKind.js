// Which glyph a WMO weather code draws as. Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of the
// component extraction) so WeatherIcon in src/components/ can read it without importing the page.

export function weatherIconKind(code){if(code==null)return null;if(code===0||code===1)return "sun";if(code===2)return "cloudSun";if(code===3)return "cloud";if(code===45||code===48)return "fog";if(code===95||code===96||code===99)return "storm";if([71,73,75,77,85,86].indexOf(code)>=0)return "snow";if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code)>=0)return "rain";return "cloud";}
