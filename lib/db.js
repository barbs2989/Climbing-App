// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

// Immediate children of an area (or the top level when parentId is null).
// GET /areas/:id  ->  select * from areas where parent_id = $1
export function useAreaChildren(parentId) {
  return useQuery({
    queryKey: ["area-children", parentId ?? "__root__"],
    enabled: !!supabase,
    queryFn: async () => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q.order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Routes in a leaf area, in cliff order ("by area").
// GET /areas/:id/routes  ->  select * from routes where area_id = $1 order by sort_order, name
export function useAreaRoutes(areaId) {
  return useQuery({
    queryKey: ["area-routes", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes").select("*").eq("area_id", areaId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}
