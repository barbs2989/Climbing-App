-- Alpine/mountaineering routes carry a COMPOSITE grade: an overall alpine grade PLUS
-- separate technical grades (rock, ice). Store each facet so a route can show the full
-- picture, e.g. "Grade IV, AD+, 5.6, AI3, 60°" instead of collapsing to one number.
alter table routes
  add column if not exists alpine_grade text,   -- French adjectival F/PD/AD/D/TD/ED
  add column if not exists rock_grade   text,   -- hardest unavoidable rock pitch (YDS, e.g. 5.9)
  add column if not exists ice_grade    text;   -- ice / alpine-ice (WI3, AI3)
