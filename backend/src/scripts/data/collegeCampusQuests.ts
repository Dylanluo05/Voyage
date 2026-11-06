// Place-specific college quests near the UC campuses, UW Seattle, NYU, and Ohio State.
//
// Every place is geocoded by the seed script and rejected if it lands further from its campus than
// `maxKm`, so a bad lookup can never put a pin on the wrong continent. Prefer durable places
// (landmarks, parks, trails, markets, piers) over businesses that might close.
//
// Same house rules as the trend quests: nothing requires alcohol (beach and park rules apply),
// nothing involves trespassing or risky stunts, and anything involving other people needs consent.

import type { RankCode, SuitCode } from './collegeTrendQuests';

export type CampusKey = 'ucb' | 'ucla' | 'ucsd' | 'ucd' | 'uci' | 'ucsb' | 'ucsc' | 'ucr' | 'ucm' | 'uw' | 'nyu' | 'osu';

export const CAMPUSES: Record<CampusKey, { name: string; lat: number; lng: number; maxKm: number }> = {
  ucb: { name: 'UC Berkeley', lat: 37.8719, lng: -122.2585, maxKm: 25 },
  ucla: { name: 'UCLA', lat: 34.0689, lng: -118.4452, maxKm: 30 },
  ucsd: { name: 'UC San Diego', lat: 32.8801, lng: -117.234, maxKm: 30 },
  ucd: { name: 'UC Davis', lat: 38.5382, lng: -121.7617, maxKm: 30 },
  uci: { name: 'UC Irvine', lat: 33.6405, lng: -117.8443, maxKm: 30 },
  ucsb: { name: 'UC Santa Barbara', lat: 34.414, lng: -119.8489, maxKm: 30 },
  ucsc: { name: 'UC Santa Cruz', lat: 36.9914, lng: -122.0609, maxKm: 25 },
  ucr: { name: 'UC Riverside', lat: 33.9737, lng: -117.3281, maxKm: 30 },
  ucm: { name: 'UC Merced', lat: 37.366, lng: -120.424, maxKm: 30 },
  uw: { name: 'University of Washington', lat: 47.6553, lng: -122.3035, maxKm: 15 },
  nyu: { name: 'NYU', lat: 40.7295, lng: -73.9965, maxKm: 30 },
  osu: { name: 'Ohio State', lat: 40.0, lng: -83.0158, maxKm: 25 },
};

/** `name` is what players see; `q` is only used to look up coordinates. `maxKm` overrides the campus default for day trips. */
export type PlaceDef = { name: string; q: string; campus: CampusKey; maxKm?: number };

export const PLACES: Record<string, PlaceDef> = {
  // UC Berkeley
  ucb_campanile: { name: 'Sather Tower (the Campanile)', q: 'Sather Tower, Berkeley', campus: 'ucb' },
  ucb_indian_rock: { name: 'Indian Rock Park', q: 'Indian Rock Park, Berkeley', campus: 'ucb' },
  ucb_marina: { name: 'Cesar Chavez Park', q: 'Cesar Chavez Park, Berkeley', campus: 'ucb' },
  ucb_cheeseboard: { name: 'Gourmet Ghetto, Shattuck Ave', q: 'Gourmet Ghetto, Berkeley', campus: 'ucb' },
  ucb_telegraph: { name: 'Telegraph Avenue', q: 'Telegraph Avenue, Berkeley', campus: 'ucb' },
  ucb_glade: { name: 'Memorial Glade', q: 'Memorial Glade, Berkeley', campus: 'ucb' },
  ucb_tilden: { name: 'Tilden Regional Park', q: 'Tilden Regional Park, Berkeley', campus: 'ucb' },
  ucb_rose: { name: 'Berkeley Rose Garden', q: 'Berkeley Rose Garden', campus: 'ucb' },
  // UCLA
  ucla_janss: { name: 'Janss Steps, UCLA', q: 'Janss Steps, Los Angeles', campus: 'ucla' },
  ucla_pier: { name: 'Santa Monica Pier', q: 'Santa Monica Pier', campus: 'ucla' },
  ucla_westwood: { name: 'Westwood Village', q: 'Westwood Village, Los Angeles', campus: 'ucla' },
  ucla_venice: { name: 'Venice Beach Boardwalk', q: 'Venice Beach Boardwalk, Los Angeles', campus: 'ucla' },
  ucla_runyon: { name: 'Runyon Canyon Park', q: 'Runyon Canyon Park, Los Angeles', campus: 'ucla' },
  ucla_getty: { name: 'The Getty Center', q: 'Getty Center, Los Angeles', campus: 'ucla' },
  ucla_farmers: { name: 'Original Farmers Market', q: 'Original Farmers Market, Los Angeles', campus: 'ucla' },
  ucla_bruinwalk: { name: 'Bruin Walk', q: 'Bruin Walk, Los Angeles', campus: 'ucla' },
  // UC San Diego
  ucsd_torrey: { name: 'Torrey Pines State Natural Reserve', q: 'Torrey Pines State Natural Reserve', campus: 'ucsd' },
  ucsd_sunset: { name: 'Sunset Cliffs Natural Park', q: 'Sunset Cliffs Natural Park, San Diego', campus: 'ucsd' },
  ucsd_geisel: { name: 'Geisel Library', q: 'Geisel Library, La Jolla', campus: 'ucsd' },
  ucsd_shores: { name: 'La Jolla Shores', q: 'La Jolla Shores Beach', campus: 'ucsd' },
  ucsd_cove: { name: 'La Jolla Cove', q: 'La Jolla Cove', campus: 'ucsd' },
  ucsd_balboa: { name: 'Balboa Park', q: 'Balboa Park, San Diego', campus: 'ucsd' },
  ucsd_mission_beach: { name: 'Mission Beach Boardwalk', q: 'Belmont Park, Mission Beach, San Diego', campus: 'ucsd' },
  // UC Davis
  ucd_arboretum: { name: 'UC Davis Arboretum', q: 'Arboretum, Davis, California', campus: 'ucd' },
  ucd_farmers: { name: 'Davis Farmers Market', q: 'Central Park, Davis, California', campus: 'ucd' },
  ucd_downtown: { name: 'Downtown Davis, G Street', q: 'G Street, Davis, California', campus: 'ucd' },
  ucd_capitol: { name: 'California State Capitol', q: 'California State Capitol, Sacramento', campus: 'ucd' },
  ucd_old_sac: { name: 'Old Sacramento Waterfront', q: 'Old Sacramento State Historic Park', campus: 'ucd' },
  ucd_bike_hall: { name: 'US Bicycling Hall of Fame', q: 'U.S. Bicycling Hall of Fame, Davis', campus: 'ucd' },
  // UC Irvine
  uci_aldrich: { name: 'Aldrich Park', q: 'Aldrich Park, Irvine', campus: 'uci' },
  uci_spectrum: { name: 'Irvine Spectrum Center', q: 'Irvine Spectrum Center', campus: 'uci' },
  uci_crystal: { name: 'Crystal Cove State Park', q: 'Crystal Cove State Park', campus: 'uci' },
  uci_balboa_island: { name: 'Balboa Island', q: 'Balboa Island, Newport Beach', campus: 'uci' },
  uci_hb_pier: { name: 'Huntington Beach Pier', q: 'Huntington Beach Pier', campus: 'uci' },
  uci_backbay: { name: 'Upper Newport Bay', q: 'Upper Newport Bay Ecological Reserve', campus: 'uci' },
  uci_laguna: { name: 'Main Beach, Laguna Beach', q: 'Main Beach, Laguna Beach', campus: 'uci' },
  // UC Santa Barbara
  ucsb_lagoon: { name: 'UCSB Campus Lagoon', q: 'Campus Lagoon, Santa Barbara', campus: 'ucsb' },
  ucsb_stearns: { name: 'Stearns Wharf', q: 'Stearns Wharf, Santa Barbara', campus: 'ucsb' },
  ucsb_courthouse: { name: 'Santa Barbara County Courthouse', q: 'Santa Barbara County Courthouse', campus: 'ucsb' },
  ucsb_funk: { name: 'Funk Zone', q: 'Funk Zone, Santa Barbara', campus: 'ucsb' },
  ucsb_goleta: { name: 'Goleta Beach Park', q: 'Goleta Beach Park', campus: 'ucsb' },
  ucsb_elings: { name: 'Elings Park', q: 'Elings Park, Santa Barbara', campus: 'ucsb' },
  ucsb_mission: { name: 'Old Mission Santa Barbara', q: 'Mission Santa Barbara, Laguna Street', campus: 'ucsb' },
  ucsb_coal_oil: { name: 'Coal Oil Point Reserve', q: 'Coal Oil Point Reserve', campus: 'ucsb' },
  // UC Santa Cruz
  ucsc_cowell: { name: 'Henry Cowell Redwoods State Park', q: 'Henry Cowell Redwoods State Park', campus: 'ucsc' },
  ucsc_lighthouse: { name: 'Lighthouse Point (Steamer Lane)', q: 'Steamer Lane, Santa Cruz', campus: 'ucsc' },
  ucsc_boardwalk: { name: 'Santa Cruz Beach Boardwalk', q: 'Santa Cruz Beach Boardwalk', campus: 'ucsc' },
  ucsc_pacific: { name: 'Pacific Avenue, Santa Cruz', q: 'Pacific Avenue, Santa Cruz', campus: 'ucsc' },
  ucsc_natural_bridges: { name: 'Natural Bridges State Beach', q: 'Natural Bridges State Beach', campus: 'ucsc' },
  ucsc_long_marine: { name: 'Long Marine Laboratory', q: 'Seymour Marine Discovery Center, Santa Cruz', campus: 'ucsc' },
  // UC Riverside
  ucr_rubidoux: { name: 'Mount Rubidoux', q: 'Mount Rubidoux Park, Riverside', campus: 'ucr' },
  ucr_box_springs: { name: 'Box Springs Mountain Reserve', q: 'Box Springs Mountain Reserve, Riverside', campus: 'ucr' },
  ucr_botanic: { name: 'UCR Botanic Gardens', q: 'UC Riverside Botanic Gardens', campus: 'ucr' },
  ucr_mission_inn: { name: 'Mission Inn, Downtown Riverside', q: 'Mission Inn, Riverside', campus: 'ucr' },
  ucr_joshua_tree: { name: 'Joshua Tree National Park', q: 'Joshua Tree National Park', campus: 'ucr', maxKm: 160 },
  ucr_big_bear: { name: 'Big Bear Lake', q: 'Big Bear Lake, California', campus: 'ucr', maxKm: 120 },
  ucr_bell_tower: { name: 'UCR Bell Tower', q: 'Bell Tower, University of California Riverside', campus: 'ucr' },
  // UC Merced
  ucm_lake: { name: 'Lake Yosemite', q: 'Lake Yosemite, Merced', campus: 'ucm' },
  ucm_yosemite: { name: 'Yosemite Valley', q: 'Yosemite Valley', campus: 'ucm', maxKm: 140 },
  ucm_castle: { name: 'Castle Air Museum', q: 'Castle Air Museum, Atwater', campus: 'ucm' },
  ucm_courthouse: { name: 'Merced County Courthouse Museum', q: 'Merced County Courthouse Museum', campus: 'ucm' },
  ucm_downtown: { name: 'Downtown Merced', q: 'Main Street, Merced, California', campus: 'ucm' },
  ucm_campus: { name: 'UC Merced Campus', q: 'University of California, Merced', campus: 'ucm' },
  ucm_vernal: { name: 'Merced Vernal Pools', q: 'Merced Vernal Pools and Grassland Reserve', campus: 'ucm' },
  // University of Washington
  uw_suzzallo: { name: 'Suzzallo Library Reading Room', q: 'Suzzallo Library, Seattle', campus: 'uw' },
  uw_ave: { name: 'The Ave (University Way NE)', q: 'University Way NE, Seattle', campus: 'uw' },
  uw_green_lake: { name: 'Green Lake Park', q: 'Green Lake Park, Seattle', campus: 'uw' },
  uw_kerry: { name: 'Kerry Park', q: 'Kerry Park, Seattle', campus: 'uw' },
  uw_waf: { name: 'Waterfront Activities Center', q: 'Waterfront Activities Center, Seattle', campus: 'uw' },
  uw_troll: { name: 'Fremont Troll', q: 'Fremont Troll, Seattle', campus: 'uw' },
  uw_pike: { name: 'Pike Place Market', q: 'Pike Place Market, Seattle', campus: 'uw' },
  // NYU
  nyu_wsp: { name: 'Washington Square Park', q: 'Washington Square Park, New York', campus: 'nyu' },
  nyu_tompkins: { name: 'Tompkins Square Park', q: 'Tompkins Square Park, New York', campus: 'nyu' },
  nyu_si_ferry: { name: 'Staten Island Ferry Terminal', q: 'Whitehall Terminal, New York', campus: 'nyu' },
  nyu_strand: { name: 'Strand Bookstore', q: 'Strand Bookstore, New York', campus: 'nyu' },
  nyu_highline: { name: 'The High Line', q: 'The High Line, New York', campus: 'nyu' },
  nyu_govs: { name: 'Governors Island', q: 'Governors Island, New York', campus: 'nyu' },
  nyu_coney: { name: 'Coney Island Boardwalk', q: 'Coney Island Boardwalk, Brooklyn', campus: 'nyu' },
  // Ohio State
  osu_short_north: { name: 'Short North Arts District', q: 'Short North, Columbus, Ohio', campus: 'osu' },
  osu_high_st: { name: 'North High Street, Campus', q: 'North High Street, Columbus, Ohio State University', campus: 'osu' },
  osu_oval: { name: 'The Oval', q: 'Thompson Library, Columbus, Ohio', campus: 'osu' },
  osu_shoe: { name: 'Ohio Stadium', q: 'Ohio Stadium, Columbus', campus: 'osu' },
  osu_german_village: { name: 'German Village', q: 'German Village, Columbus', campus: 'osu' },
  osu_north_market: { name: 'North Market', q: 'North Market, Columbus', campus: 'osu' },
  osu_hocking: { name: 'Hocking Hills State Park', q: 'Hocking Hills State Park', campus: 'osu', maxKm: 120 },
  osu_scioto: { name: 'Scioto Mile', q: 'Scioto Mile, Columbus', campus: 'osu' },
};

/** [suit, rank, title, description, one or more PLACES keys] */
export type PlaceQuest = [SuitCode, RankCode, string, string, string | string[]];

export const PLACE_QUESTS: PlaceQuest[] = [
  // ── UC Berkeley ─────────────────────────────────────────────────────────────────
  ['D', 'J', 'Ride to the Top of the Campanile and Name Five Landmarks Across the Bay', 'Go up Sather Tower and identify five landmarks around the Bay. Photo of the view with you in it.', 'ucb_campanile'],
  ['S', 'Q', 'Scramble Up Indian Rock at Sunset', 'Climb the rock (stay on the paths and mind your footing) and watch the sun drop behind the Golden Gate.', 'ucb_indian_rock'],
  ['C', 'J', 'Fly a Kite With Your Floor at Cesar Chavez Park', 'Bring a kite, bring four friends, and keep it in the air for a full ten minutes.', 'ucb_marina'],
  ['H', 'Q', 'Eat Cheese Board Pizza on the Shattuck Median and Chat With the Table Next to You', 'Grab a slice, sit near the music, and start a conversation with a stranger.', 'ucb_cheeseboard'],
  ['H', 'K', 'Thrift a Full Telegraph Ave Outfit for $25 and Strut Sproul Plaza in It', 'Hit the vintage shops on Telegraph with a $25 budget, then walk the plaza like it is a runway.', 'ucb_telegraph'],
  ['C', 'Q', 'Host a Glade Picnic for 10+ People and Run a Game of Ultimate', 'Blankets, snacks, and a frisbee. Photo of the full group on Memorial Glade.', 'ucb_glade'],
  ['S', 'K', 'Hike Wildcat Peak in Tilden for a Sunrise Photo', 'Start early, hike up, and photograph the Bay waking up. Bring layers.', 'ucb_tilden'],
  ['H', 'J', 'Take a Date to the Berkeley Rose Garden at Golden Hour', 'Walk the terraces, find the best bench, and stay until the light turns gold.', 'ucb_rose'],

  // ── UCLA ────────────────────────────────────────────────────────────────────────
  ['S', 'Q', 'Run the Janss Steps Ten Times and Take a Group Photo at the Top', 'Rest as you need to, but finish all ten with your crew.', 'ucla_janss'],
  ['H', 'K', "Buy Your Date's Fit at a Thrift Shop, Then Wear It to the Santa Monica Pier", 'Thrift their outfit with a $25 budget, then take them to the pier in it.', 'ucla_pier'],
  ['D', 'Q', 'Tier List Every Late-Night Food Spot in Westwood', 'Try at least eight spots after dark, rank them S to F, and defend your list.', 'ucla_westwood'],
  ['C', 'K', 'Host an Alcohol-Free Beach Day Darty at Venice', 'Playlist at a considerate volume, a snack spread, and a dress code. Follow the beach rules, including no alcohol on LA beaches.', 'ucla_venice'],
  ['S', 'Q', 'Hike Runyon Canyon at Sunrise and Race a Friend Back Down', 'Stay on the trail, bring water, and photograph the view from the top.', 'ucla_runyon'],
  ['D', 'Q', 'Wander the Getty Center and Rank Five Pieces Against a Friend', 'Pick your top five each and argue about who is right over coffee.', 'ucla_getty'],
  ['H', 'J', 'Share a Table at the Original Farmers Market and Trade Food Picks', 'Sit at a shared table and swap recommendations with whoever is nearby.', 'ucla_farmers'],
  ['H', 'Q', 'Walk Bruin Walk and Hand Out Compliments Instead of Flyers', 'Say something genuine and specific to ten people walking by. Keep a tally.', 'ucla_bruinwalk'],

  // ── UC San Diego ──────────────────────────────────────────────────────────────────
  ['S', 'Q', 'Hike Torrey Pines to the Cliffs for Sunrise', 'Walk down through the pines to the cliffs and watch the Pacific light up.', 'ucsd_torrey'],
  ['H', 'J', 'Watch Sunset at Sunset Cliffs With Someone New', 'Invite a classmate you have only talked to in lecture and stay until dusk.', 'ucsd_sunset'],
  ['D', 'Q', 'Tier List Every Taco Shop Near Campus', 'Eat at six or more taco shops, rank them S to F, and defend your list.', 'ucsd_geisel'],
  ['C', 'K', 'Host an Alcohol-Free Beach Darty at La Jolla Shores', 'Daytime playlist at low volume, snacks, and games. Follow the beach rules.', 'ucsd_shores'],
  ['D', 'J', 'Spot Seals and Sea Lions at La Jolla Cove and Learn How to Tell Them Apart', 'Watch from a respectful distance. Photo of the animals and a note on how to tell them apart.', 'ucsd_cove'],
  ['H', 'J', 'Take a Date to Balboa Park and Find the Quietest Garden', 'Wander the paths until you find a peaceful spot, then sit and talk for an hour.', 'ucsd_balboa'],
  ['S', 'Q', 'Bike the Boardwalk From Belmont Park to Pacific Beach and Back', 'Rent bikes if you need to, watch the pedestrians, and end with something sweet.', 'ucsd_mission_beach'],
  ['D', 'J', 'Find the Best Floor in Geisel Library and Tier List All of Them', 'Study on at least three floors, rate noise, light, and seats, and rank them.', 'ucsd_geisel'],

  // ── UC Davis ─────────────────────────────────────────────────────────────────────
  ['S', 'J', 'Bike the Arboretum Loop at Dawn', 'Ride the full loop while the campus is quiet. Photo of the water at sunrise.', 'ucd_arboretum'],
  ['C', 'Q', 'Shop the Davis Farmers Market and Cook Dinner for Six on $30', 'Buy only what is in season, plan the menu on the spot, and feed everyone.', 'ucd_farmers'],
  ['C', 'K', 'Organize a 10-Person Costume Bike Parade Through Downtown Davis', 'Pick a theme, decorate your bikes, and ride in formation on G Street.', 'ucd_downtown'],
  ['D', 'Q', 'Tier List Every Boba and Coffee Spot on G Street', 'Try at least six, rate each, and defend your ranking.', 'ucd_downtown'],
  ['D', 'J', 'Tour the California State Capitol on a Day Trip From Davis', 'Take the train or bus, walk the halls, and learn one fact about how a bill becomes a law.', 'ucd_capitol'],
  ['H', 'J', "Wander Old Sacramento's Wooden Sidewalks and Try the Candy Shops", 'Walk the boardwalks and find the best treat in the district.', 'ucd_old_sac'],
  ['H', 'Q', 'Take a Date on a Bike Picnic Through the Arboretum', 'Pack a lunch, ride to a quiet spot, and spend the afternoon talking.', 'ucd_arboretum'],
  ['D', 'J', 'Visit the US Bicycling Hall of Fame and Learn One Fact Nobody Knows', 'Find something surprising and teach it to your friends.', 'ucd_bike_hall'],

  // ── UC Irvine ─────────────────────────────────────────────────────────────────────
  ['S', 'J', 'Run the Aldrich Park Loop at Sunrise With a Friend', 'Run the full loop and take a photo at the center of the park.', 'uci_aldrich'],
  ['H', 'J', 'Ride the Ferris Wheel at Irvine Spectrum With Someone You Like', 'Take a date or a best friend and pick out your favorite spot from the top.', 'uci_spectrum'],
  ['S', 'Q', 'Hike Crystal Cove to the Tide Pools at Low Tide', 'Check the tide times, walk down, and look but do not touch the wildlife.', 'uci_crystal'],
  ['H', 'Q', 'Take the Balboa Island Ferry and Eat a Frozen Banana', 'Ride the ferry across, walk the island, and find the classic treat.', 'uci_balboa_island'],
  ['C', 'K', 'Host an Alcohol-Free Darty at Huntington Beach', 'Daytime playlist at low volume, snack table, and beach games. Follow local beach rules.', 'uci_hb_pier'],
  ['D', 'K', 'Tier List Every Boba Spot Around UCI', 'Try at least eight, rank them S to F, and argue your list with a friend.', 'uci_aldrich'],
  ['S', 'K', 'Kayak or Paddleboard Upper Newport Bay', 'Rent a boat, paddle through the reserve, and photograph a bird you cannot name.', 'uci_backbay'],
  ['H', 'J', 'Watch the Sunset From Laguna Main Beach and Meet Someone New', 'Sit near the waterline, talk to a stranger, and learn their story.', 'uci_laguna'],

  // ── UC Santa Barbara ──────────────────────────────────────────────────────────────
  ['S', 'J', 'Bike to the Campus Lagoon at Sunset and Race the Sun', 'Time it right and take a photo of the sky over the water.', 'ucsb_lagoon'],
  ['S', 'Q', 'Rent Cruiser Bikes and Ride to Stearns Wharf', 'Cruise the beach path, ride to the wharf, and eat something on the pier.', 'ucsb_stearns'],
  ['D', 'J', 'Climb the Courthouse Clock Tower and Spot the Mountains', 'Go up the tower, find the Santa Ynez Mountains and the ocean in one shot.', 'ucsb_courthouse'],
  ['D', 'Q', 'Eat Through the Funk Zone: Six Bites, One Tier List', 'Try six different spots, rate each, and defend your ranking.', 'ucsb_funk'],
  ['C', 'K', 'Host an Alcohol-Free Beach Darty at Goleta Beach', 'Daytime playlist at low volume, snacks, and games. Follow beach rules.', 'ucsb_goleta'],
  ['S', 'Q', 'Hike Elings Park to the Best View and Take a Group Photo', 'Hike to the viewpoint with at least three friends.', 'ucsb_elings'],
  ['H', 'J', 'Take a Date to the Old Mission Rose Garden', 'Walk the grounds, find the best bench, and share something sweet.', 'ucsb_mission'],
  ['D', 'Q', 'Spot Five Shorebird Species at Coal Oil Point Reserve', 'Stay on the trails and keep your distance. Photo of your favorite bird.', 'ucsb_coal_oil'],

  // ── UC Santa Cruz ─────────────────────────────────────────────────────────────────
  ['S', 'J', 'Hike Among the Redwoods at Henry Cowell and Find the Tallest One', 'Take the trails, find the biggest tree, and take a photo to show its scale.', 'ucsc_cowell'],
  ['H', 'J', 'Watch the Surfers at Steamer Lane and Learn Three Terms From a Local', 'Ask someone nearby to explain a few surf terms and use them correctly.', 'ucsc_lighthouse'],
  ['C', 'J', 'Ride the Giant Dipper With Your Whole Friend Group', 'Four or more riders, one coaster. Photo of all of you after.', 'ucsc_boardwalk'],
  ['S', 'K', 'Take a Surf Lesson at Cowell Beach', 'Book a beginner lesson and stand up at least once.', 'ucsc_lighthouse'],
  ['D', 'Q', 'Tier List Every Burrito Spot in Santa Cruz', 'Try at least six, rank them, and argue your list with someone.', 'ucsc_pacific'],
  ['H', 'J', 'Take a Sunset Walk to Natural Bridges With a Date', 'Walk the cliffs, explore the tide pools, and stay until the light fades.', 'ucsc_natural_bridges'],
  ['D', 'J', 'Visit Long Marine Lab and Learn One Fact About the Ocean', 'Find something surprising and teach it to a friend.', 'ucsc_long_marine'],
  ['C', 'Q', 'Organize a Beach Cleanup at Natural Bridges With Six or More People', 'Gloves, bags, and a goal. Photo of the collected trash.', 'ucsc_natural_bridges'],

  // ── UC Riverside ──────────────────────────────────────────────────────────────────
  ['S', 'Q', 'Hike Mount Rubidoux at Sunrise', 'Walk to the summit and photograph the city waking up.', 'ucr_rubidoux'],
  ['S', 'K', 'Climb Box Springs Mountain at Sunrise', 'Start in the dark, bring water, and photograph the view from the top.', 'ucr_box_springs'],
  ['D', 'J', 'Wander the UCR Botanic Gardens and Identify a Plant Without Googling', 'Read the signs, pick a plant, and teach it to a friend.', 'ucr_botanic'],
  ['H', 'J', 'Take a Date to Downtown Riverside and Tour the Mission Inn Lobby', 'Walk the downtown, stop in the lobby, and find the best detail.', 'ucr_mission_inn'],
  ['C', 'A', 'Plan a Group Day Trip to Joshua Tree and Stay for the Stars', 'Plan the route, share the drive, and stay until after dark.', 'ucr_joshua_tree'],
  ['C', 'Q', 'Road Trip to Big Bear for a Lake Day or a Snow Day', 'Pick the season, pack the car, and make it a day.', 'ucr_big_bear'],
  ['D', 'K', 'Tier List Every Boba Spot Within Three Miles of UCR', 'Try at least eight, rate each, and defend your ranking.', 'ucr_bell_tower'],
  ['S', 'J', 'Run to the Bell Tower Before Class and Take a Photo at the Base', 'Do it at dawn with a friend and photograph the tower.', 'ucr_bell_tower'],

  // ── UC Merced ───────────────────────────────────────────────────────────────────
  ['S', 'J', 'Walk the Loop Around Lake Yosemite at Golden Hour', 'Take the trail, bring a friend, and photograph the light on the water.', 'ucm_lake'],
  ['C', 'J', 'Organize a Dorm-Floor Sunset Picnic at Lake Yosemite', 'Blankets, snacks, and at least six people from your floor.', 'ucm_lake'],
  ['C', 'A', 'Plan a Floor Road Trip to Yosemite Valley for 8 People', 'Organize rides, snacks, and a route, and get everyone to a waterfall.', 'ucm_yosemite'],
  ['H', 'J', 'Pose Next to a Fighter Jet at Castle Air Museum for the Cheesiest Date Photo', 'Bring a date or a friend and recreate a cheesy movie poster.', 'ucm_castle'],
  ['D', 'J', 'Visit the Merced Courthouse Museum and Learn One Local Secret', 'Find something surprising and share it.', 'ucm_courthouse'],
  ['D', 'Q', 'Photograph Three Wildflowers at the Vernal Pools in Spring', 'Go in season, stay on the trail, and identify each flower.', 'ucm_vernal'],
  ['D', 'Q', 'Tier List the Eats on Main Street in Downtown Merced', 'Try at least six spots, rank them, and defend your list.', 'ucm_downtown'],
  ['C', 'K', 'Start a Weekly Tradition: Pick a Spot, a Time, and Get 10 People to Show Up', 'Choose a place on campus and make it happen for three weeks in a row.', 'ucm_campus'],

  // ── University of Washington ──────────────────────────────────────────────────────────
  ['D', 'J', 'Read in the Suzzallo Reading Room for an Hour and Find the Best Seat', 'Find the seat with the best light and photograph the room.', 'uw_suzzallo'],
  ['H', 'K', "Thrift a Date's Fit on The Ave and Wear It Across the Quad", 'Thrift their outfit with a $25 budget and wear it for the rest of the day.', 'uw_ave'],
  ['S', 'J', 'Run the Green Lake Loop and Stop for Coffee Halfway', 'Run or walk the full loop and photograph your coffee.', 'uw_green_lake'],
  ['H', 'J', 'Watch the Sunset Over Seattle From Kerry Park With a Crew', 'Bring snacks and rate the view out of ten.', 'uw_kerry'],
  ['S', 'Q', 'Rent a Canoe at the Waterfront Activities Center and Paddle Out', 'Rent a canoe and paddle through the cut toward the Arboretum.', 'uw_waf'],
  ['D', 'Q', 'Tier List the Coffee Spots Within a Mile of The Ave', 'Try at least six, rate each, and defend your list.', 'uw_ave'],
  ['C', 'Q', 'Stage the Funniest Group Photo at the Fremont Troll', 'Four or more people, one troll, one unforgettable pose.', 'uw_troll'],
  ['H', 'Q', "Eat Something at Pike Place You Cannot Name and Rate It", 'Point at something unfamiliar, order it, and rate it.', 'uw_pike'],

  // ── NYU ───────────────────────────────────────────────────────────────────────────────
  ['H', 'K', "Buy Your Date's Fit at an East Village Thrift Store and Wear It to Tompkins Square", 'Thrift their outfit with a $25 budget and spend the afternoon in the park.', 'nyu_tompkins'],
  ['D', 'Q', 'Tier List Every Dollar Slice Within Ten Blocks of Washington Square', 'Try at least six slices, rank them S to F, and defend your list.', 'nyu_wsp'],
  ['H', 'J', 'Ride the Staten Island Ferry at Sunset and Strike Up a Conversation', 'It is free. Photograph the skyline and talk to someone new.', 'nyu_si_ferry'],
  ['D', 'Q', 'Find the Weirdest Book at the Strand and Read the First Page Aloud to Your Friends', 'Hunt through the stacks, pick the strangest find, and read it out loud.', 'nyu_strand'],
  ['H', 'K', 'Start a Spontaneous Dance Circle in Washington Square Park', 'Bring a speaker at a considerate volume, invite passersby, and keep it going for one full song.', 'nyu_wsp'],
  ['S', 'J', 'Walk the High Line End to End and Count Every Piece of Public Art', 'Photograph your favorite one and report the final count.', 'nyu_highline'],
  ['C', 'K', 'Take Six Friends to Governors Island and Ride Bikes as a Convoy', 'Rent bikes, ride the loop together, and take a photo with the skyline behind you.', 'nyu_govs'],
  ['H', 'J', 'Walk the Coney Island Boardwalk to the Pier and Eat a Hot Dog', 'Walk the boardwalk, find the pier, and share a classic.', 'nyu_coney'],

  // ── Ohio State ──────────────────────────────────────────────────────────────────────
  ['H', 'J', 'Take a Date to a Short North Gallery Hop', 'Walk the district, step into three galleries, and pick a favorite piece each.', 'osu_short_north'],
  ['D', 'Q', 'Tier List Every Late-Night Spot on High Street', 'Try at least six, rate each, and defend your ranking.', 'osu_high_st'],
  ['S', 'J', 'Run the Oval at Sunrise and Finish on the Library Steps', 'Run a lap or two, then take a photo from the steps.', 'osu_oval'],
  ['C', 'K', 'Throw an Alcohol-Free Tailgate Darty and Run a Buckeye Trivia Tournament', 'Snacks, a scoreboard, and a trophy. Make sure the whole group can join in.', 'osu_shoe'],
  ['H', 'J', 'Pick a Date Spot in German Village and Share Dessert', 'Walk the brick streets, find a cozy spot, and share a treat.', 'osu_german_village'],
  ['D', 'Q', 'Eat Your Way Through North Market and Rank Every Stall', 'Try at least five stalls and rank them S to F.', 'osu_north_market'],
  ['C', 'K', 'Road Trip Six Friends to Hocking Hills for a Fall Hike', 'Plan the route, pack water, and hike to a waterfall.', 'osu_hocking'],
  ['S', 'J', 'Walk the Scioto Mile at Golden Hour and Take the Best Skyline Photo', 'Walk the riverfront and pick your favorite shot.', 'osu_scioto'],
];
