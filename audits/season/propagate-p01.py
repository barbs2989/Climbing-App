# Propagation round p01: a compact system's window, confirmed by independent research on several of
# its sub-areas (rounds 1-10, see research-*.json), extended to its remaining sub-areas and to the
# system area itself. Exclusions are sub-areas the sources do not plainly cover or that may climb
# in a different season. Writes apply-p01.json (area-page-apply shape); names from the census cache.
import json, sys
cache = json.load(open(sys.argv[1]))
by = {a['id']: a for a in cache}
JT = [10, 11, 12, 1, 2, 3, 4]; RRG = [3, 4, 9, 10, 11]; GUNKS = [4, 5, 9, 10, 11]; NRG = [4, 5, 6, 9, 10]
TEN = [5, 6, 7, 8, 9, 10]; HUECO = [11, 12, 1, 2, 3]; STONE = [10, 11, 12, 1, 2, 3, 4]; RR = [10, 11, 12, 1, 2, 3, 4]
plan = {
    # Joshua Tree NP: Lost Horse, Outback, Echo Cove, Jumbo Rock, Real Hidden Valley, Rattlesnake, Roadside, Indian Cove CG, N Wonderland
    'ca_joshua_tree_national_park': JT, 'ca_central_joshua_tree': JT, 'ca_indian_cove': JT, 'ca_quail_springs_area': JT,
    # Red River Gorge: Northern Gorge, MFRP, PMRP (high), Muir, CDCA, BRRP, Natural Bridge
    'ky_red_river_gorge': RRG, 'ky_brrp_bald_rock_recreational_preserve': RRG, 'ky_cathedral_domain': RRG,
    'ky_crp_cliffview_recreational_preserve': RRG, 'ky_red_river_gorge_bouldering': RRG, 'ky_southern_region_crags_miscellaneous': RRG,
    # The Gunks: Trapps Bouldering, Near Trapps, Peterskill, Trapps
    'ny_the_gunks': GUNKS, 'ny_antlion_cliff': GUNKS, 'ny_white_dot': GUNKS,
    # New River Gorge proper (NPS window): Endless Wall, Bubba City, NRG Proper
    'wv_beauty_mountain': NRG, 'wv_bridge_area': NRG, 'wv_cotton_hill': NRG, 'wv_fern_buttress': NRG, 'wv_interp_boulders': NRG,
    'wv_junkyard_area': NRG, 'wv_kaymoor': NRG, 'wv_needleseye_boulder_park': NRG, 'wv_sunshine_boulders': NRG, 'wv_treasure_planet': NRG,
    # Ten Sleep Canyon: Ten Sleep, Valhalla, Old Road Crags
    'wy_crag_6': TEN, 'wy_downtown': TEN, 'wy_dry_wall': TEN, 'wy_french_cattle_ranch': TEN, 'wy_lake_point': TEN, 'wy_mecca': TEN,
    'wy_mondo_beyondo': TEN, 'wy_resurrection_rocks': TEN, 'wy_salt_lick': TEN, 'wy_sphinx_sector': TEN,
    # Hueco Tanks: North Mountain (high), East Mountain
    'tx_hueco_tanks': HUECO, 'tx_east_spur': HUECO, 'tx_west_mountain': HUECO,
    # Stone Fort: Stone Fort Bouldering (area-page batch 2), Front Area
    'tn_jungle_gym_fromundathunda_area': STONE, 'tn_main_area': STONE, 'tn_moss_man_area': STONE, 'tn_sternum_area': STONE,
    'tn_super_mario_area': STONE, 'tn_the_destroyer_boulders': STONE, 'tn_the_fairways': STONE, 'tn_the_hidden_area': STONE,
    # Red Rock bouldering: Kraft Boulders + the Red Rocks system round s01 (Icebox excluded: shaded)
    'nv_red_rock_bouldering': RR, 'nv_first_pullout_boulders': RR, 'nv_gateway_canyon_boulders': RR, 'nv_mustang_canyon': RR,
    'nv_red_spring_boulders': RR, 'nv_second_pullout_boulders': RR, 'nv_willow_springs_boulders': RR, 'nv_windy_canyon_boulders': RR,
}
out = {}
for k, m in plan.items():
    a = by[k]
    out[k] = {'_expect': {'name': a['name'], 'region': a['region']}, 'season_months': sorted(m)}
json.dump(out, open('audits/season/apply-p01.json', 'w'), indent=1)
att = set(json.load(open('audits/season/attempted.json'))) | set(out)
json.dump(sorted(att), open('audits/season/attempted.json', 'w'), indent=1)
print(len(out), 'areas -> audits/season/apply-p01.json')
