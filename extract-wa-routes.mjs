import { createClient } from "@supabase/supabase-js";

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

const supabase = createClient(url, key);

async function fetchAllRoutes() {
  const PAGE = 1000;
  let allRoutes = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("routes")
      .select("id, name, area_id, discipline, grade_system, grade, description, rack, features, hazards")
      .in("discipline", ["alpine", "mountaineering"])
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Error fetching routes:", error);
      break;
    }

    if (!data || !data.length) break;
    allRoutes = allRoutes.concat(data);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return allRoutes;
}

async function fetchAreaNames(areaIds) {
  const { data, error } = await supabase
    .from("areas")
    .select("id, name, parent_id, area_type")
    .in("id", areaIds);

  if (error) {
    console.error("Error fetching areas:", error);
    return {};
  }

  const areaMap = {};
  (data || []).forEach(a => {
    areaMap[a.id] = a;
  });

  return areaMap;
}

async function main() {
  console.log("Fetching all WA alpine/mountaineering routes...");
  const routes = await fetchAllRoutes();

  console.log(`Found ${routes.length} routes`);

  // Get unique area IDs
  const areaIds = [...new Set(routes.map(r => r.area_id))];
  console.log(`Across ${areaIds.length} areas`);

  // Fetch area details
  const areaMap = await fetchAreaNames(areaIds);

  // Group by area and prepare output
  const byArea = {};
  routes.forEach(route => {
    const area = areaMap[route.area_id];
    const areaName = area?.name || route.area_id;

    if (!byArea[areaName]) {
      byArea[areaName] = [];
    }

    byArea[areaName].push({
      id: route.id,
      name: route.name,
      discipline: route.discipline,
      grade: route.grade,
      gradeSystem: route.grade_system,
      areaId: route.area_id,
      description: route.description?.substring(0, 100) || "",
    });
  });

  // Output as JSON
  console.log(JSON.stringify(byArea, null, 2));
}

main().catch(console.error);
