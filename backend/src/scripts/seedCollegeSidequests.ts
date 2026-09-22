import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicSidequest } from '../models/PublicSidequest';

const CREATOR_EMAIL = 'dylan.luo.777@gmail.com';

// Set to true to wipe the current sidequest deck before inserting this one.
// Set to false to add these on top of whatever is already there.
const REPLACE_EXISTING = false;

function computeXp(suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: 'J' | 'Q' | 'K' | 'A'): number {
  const BASE_XP = { J: 250, Q: 500, K: 750, A: 1000 };
  const MULTIPLIER = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
  return Math.round(BASE_XP[rank] * MULTIPLIER[suit] / 5) * 5;
}

// Card meaning, same convention as reseedSidequests.ts:
//   spades   = bold / adrenaline, solo dares
//   hearts   = social / connection
//   diamonds = discovery / creative / cultural
//   clubs    = leadership / hosting / organizing a group thing
const sidequests: Array<{
  title: string;
  description: string;
  location: string;
  cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  cardRank: 'J' | 'Q' | 'K' | 'A';
  event?: { daysFromNow: number; maxParticipants: number };
}> = [
  { title: "2AM Seaside Bakery Run", description: "Drive to a bakery near the water the second it opens at 2am and eat the first tray straight off the rack, still warm.", location: "A coastal town", cardSuit: 'spades', cardRank: 'J' },
  { title: "Talk Your Way Into a Rave", description: "Find a rave, warehouse show, or late-night set happening tonight and get yourself in \u2014 no ticket bought in advance.", location: "Anywhere with a scene", cardSuit: 'spades', cardRank: 'Q' },
  { title: "Sunrise Plunge", description: "Jump into open water \u2014 lake, ocean, or river \u2014 before the sun's fully up. Screaming is allowed.", location: "Nearest body of water", cardSuit: 'spades', cardRank: 'K' },
  { title: "Ride a Random Bus to the End of the Line", description: "Get on whatever bus or train is leaving next, ride it all the way to the last stop, and find your own way back.", location: "Your city", cardSuit: 'spades', cardRank: 'A' },
  { title: "Sleep Outside With No Tent", description: "Spend one night outdoors with just a sleeping bag. No tent, no cabin, no backup plan.", location: "A local campsite or trailhead", cardSuit: 'spades', cardRank: 'J' },
  { title: "Eat the Spiciest Thing on the Menu", description: "Order the hottest dish a local restaurant makes and finish the whole plate.", location: "Any restaurant with a heat rating", cardSuit: 'spades', cardRank: 'Q' },
  { title: "Climb to a Rooftop for Sunrise", description: "Find a rooftop, fire escape, or parking garage top level you have to work to reach, and watch the sunrise from up there.", location: "The tallest legal spot in town", cardSuit: 'spades', cardRank: 'K' },
  { title: "Cliff Jump Into Open Water", description: "Find a known, legal cliff-jumping spot, scout the depth and rocks, and take the leap.", location: "A local swimming hole", cardSuit: 'spades', cardRank: 'A' },
  { title: "Axe-Throwing Bullseye Night", description: "Book a lane at an axe-throwing bar and land a bullseye. Bring people who'll talk trash about your form.", location: "Nearest axe-throwing venue", cardSuit: 'spades', cardRank: 'J' },
  { title: "Road Trip to a Show in Another City", description: "Drive to a different city for one night, just to catch a set, then come home before your next class.", location: "A city 2+ hours away", cardSuit: 'spades', cardRank: 'Q' },
  { title: "24 Hours, No Phone", description: "Hand your phone to a friend for a full day. Navigate, order food, and make plans the old-fashioned way.", location: "Anywhere", cardSuit: 'spades', cardRank: 'K' },
  { title: "Sign Up for a Race You Didn't Train For", description: "Find a local 5K or fun run with less than a week's notice, register, and finish it.", location: "Your city", cardSuit: 'spades', cardRank: 'A' },
  { title: "Dance Until Sunrise at a Silent Disco", description: "Find (or start) a silent disco \u2014 everyone dancing to their own headphones \u2014 and keep it going until the sun's up.", location: "Wherever the headphones are", cardSuit: 'spades', cardRank: 'J' },
  { title: "One-Tank Road Trip, No Destination", description: "Get in the car with less than two hours' notice and drive until the tank hits a quarter. Pick the destination after you're already moving.", location: "Any direction out of town", cardSuit: 'spades', cardRank: 'Q' },
  { title: "All-Nighter That Ends in a Sunrise", description: "Pull a full all-nighter \u2014 studying, talking, whatever \u2014 that ends with you watching the sunrise, not asleep at your desk.", location: "Wherever you end up", cardSuit: 'spades', cardRank: 'K' },
  { title: "Camp Out Overnight for Tickets", description: "Line up overnight for a ticket drop, release, or pop-up, the way people did before phones could do it for you.", location: "Outside the venue or store", cardSuit: 'spades', cardRank: 'A' },
  { title: "Sing an Entire Album on a Drive", description: "Drive at least 45 minutes with a friend and sing one full album, start to finish, no skipping.", location: "The open road", cardSuit: 'spades', cardRank: 'J' },
  { title: "Bike Across Town at 3AM", description: "Ride your bike from one end of your college town to the other in the dead of night.", location: "Your college town", cardSuit: 'spades', cardRank: 'Q' },
  { title: "Cold Plunge Challenge, Timed", description: "Do a cold plunge or ice bath \u2014 organized or DIY \u2014 and time yourself. Beat your own nerves before you beat the clock.", location: "A cold plunge spot or your own bathtub", cardSuit: 'spades', cardRank: 'K' },
  { title: "Sunrise Double-Digit Run", description: "Log double-digit miles before your first class, finishing right as the sun comes up.", location: "Your usual running loop, extended", cardSuit: 'spades', cardRank: 'A' },
  { title: "48 Hours, No Plan", description: "Book a cheap trip to a new city with zero itinerary. Figure out what you're doing once you land.", location: "Anywhere a cheap flight or bus goes", cardSuit: 'spades', cardRank: 'A' },
  { title: "Outdoor Winter Swim Club", description: "Join or start a group that swims outdoors through the coldest months. Come back every week you can stand it.", location: "A local lake or coastline", cardSuit: 'spades', cardRank: 'K' },
  { title: "Summit Before Your First Class", description: "Wake up absurdly early, hike a nearby peak or big hill, and make it back to campus in time for a 9am.", location: "The nearest real hike", cardSuit: 'spades', cardRank: 'Q' },
  { title: "Last Train Out, No Return Ticket", description: "Catch the last train or bus of the night to somewhere you've never been, with no return trip booked yet.", location: "The end of a transit line", cardSuit: 'spades', cardRank: 'A' },
  { title: "Audition for Something Out of Your League", description: "Try out for a team, a play, or an open mic slot that's wildly outside your skill set. Show up anyway.", location: "Campus or your city", cardSuit: 'spades', cardRank: 'J' },
  { title: "Matcha Rave With Your Roommates", description: "Find a sober-curious daytime rave \u2014 matcha, music, movement, no alcohol required \u2014 and bring your whole apartment.", location: "A coffee/matcha clubbing pop-up", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Say Yes to a Random Invite", description: "The next time someone you barely know invites you somewhere, say yes. No overthinking it.", location: "Wherever the invite leads", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Cold Plunge, Then Coffee, With Someone New", description: "Do a cold plunge or morning workout with someone you just met, then grab coffee right after while you're both still wired.", location: "Anywhere with a plunge and a cafe nearby", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Two-Hour Conversation With Someone New", description: "Sit down with someone you just met and let the conversation run past two hours. No agenda, just curiosity.", location: "A cafe, bar, or dorm lounge", cardSuit: 'hearts', cardRank: 'K' },
  { title: "Crash a Club Meeting You Know Nothing About", description: "Walk into a student club meeting for something you've never done before and stay for the whole thing.", location: "Campus", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Slow Dance in the Middle of a Party", description: "When the vibe's right, pull someone into a slow dance in the middle of whatever's playing.", location: "Wherever the party is", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "2AM Diner Date", description: "Take someone on a date to a 24-hour diner at 2am. Order too much food and stay until they turn the lights up.", location: "Nearest 24-hour diner", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Tell the Group Chat You're Free, Say Yes to Whatever They Pick", description: "Text your group chat that you're open all weekend and let them plan it. Show up to whatever they decide.", location: "Wherever they send you", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Cook Dinner for Your Found Family", description: "Cook a full dinner for your roommates or closest friends, the people who've become your family away from home.", location: "Your kitchen", cardSuit: 'hearts', cardRank: 'K' },
  { title: "Karaoke Something You've Never Sung Out Loud", description: "Get up at karaoke and sing a song you've never performed in front of anyone before.", location: "A karaoke bar or room", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Last One Standing at Silent Disco", description: "Go to a silent disco and be one of the last people still dancing when it wraps.", location: "A silent disco event", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Friend-Set-Up Double Date", description: "Let your friends set up a double date for you, no veto power over who they pick.", location: "Wherever the double date lands", cardSuit: 'hearts', cardRank: 'K' },
  { title: "Sit With Someone Eating Alone", description: "Notice someone eating alone in the dining hall or a cafe, and ask to join them.", location: "Your dining hall or a cafe", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Tell Someone Exactly Why You Admire Them", description: "In person, not over text, tell someone specifically what you admire about them.", location: "Anywhere in person", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Surprise Your Roommate in Under 24 Hours", description: "Plan and pull off a surprise for your roommate's birthday or big day with less than a day's notice.", location: "Your place", cardSuit: 'hearts', cardRank: 'K' },
  { title: "Rooftop Sunset With Someone You Just Met", description: "Find a rooftop or high point and watch the sunset with someone you met this week.", location: "The best rooftop or hill you know", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Send a Letter to Someone You've Lost Touch With", description: "Write an actual letter, not a text, to an old friend you've drifted from, and mail it.", location: "Anywhere with a mailbox", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Solo Karaoke Night", description: "Go to karaoke by yourself and sing anyway.", location: "A karaoke bar or room", cardSuit: 'hearts', cardRank: 'K' },
  { title: "No-Phones Dinner", description: "Have a full dinner with your closest friends where every phone stays face-down and untouched.", location: "Your kitchen or a restaurant", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Say Thank You Out Loud to Your People", description: "Tell your roommates or closest friends, directly, what they mean to you. No text message shortcut.", location: "Wherever you all are", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Take the Long Way Home on Purpose", description: "When the conversation's good, take the long way home so it doesn't have to end yet.", location: "The walk home", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Coffee With a Professor, Off Topic", description: "Ask a professor to coffee to talk about anything except the class you're in with them.", location: "A campus cafe", cardSuit: 'hearts', cardRank: 'K' },
  { title: "Show Up for a Friend's Thing You'd Normally Skip", description: "Go support a friend at something you'd usually pass on \u2014 their recital, their game, their open mic.", location: "Wherever they need you", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Go Solo to a Group Fitness Class", description: "Show up alone to a group workout class and talk to at least one person by the end.", location: "A local gym or studio", cardSuit: 'hearts', cardRank: 'Q' },
  { title: "Care Package for a Rough Week", description: "Put together and deliver a care package for a friend who's having a hard week, no occasion needed.", location: "Their door", cardSuit: 'hearts', cardRank: 'J' },
  { title: "Thrift a Full Outfit Under $20", description: "Build one complete outfit from a thrift store, total spend under $20.", location: "A local thrift store", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Read Every Placard in One Museum Wing", description: "Go to a museum's free night and actually stop and read every single placard in one wing, start to finish.", location: "A local museum", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Try Every Stall at a Night Market", description: "Go to a night market or food fair and try something from every single stall.", location: "A night market or food festival", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Learn a Dish From Your Roommate's Culture", description: "Ask a roommate or friend to teach you a dish from their family, hands-on, not from a recipe card.", location: "Your kitchen", cardSuit: 'diamonds', cardRank: 'A' },
  { title: "Find the Hole-in-the-Wall With No Reviews", description: "Track down a restaurant with almost no reviews online and go eat there anyway.", location: "Off the beaten path", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Perform at an Open Mic, Even Badly", description: "Sign up for an open mic and get on stage, whether or not you're any good.", location: "A local open mic", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Sketch a Stranger in a Coffee Shop", description: "With their permission, sketch a stranger while you're both in a coffee shop.", location: "Any coffee shop", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Redecorate on a Thrift-Store Budget in One Weekend", description: "Give your room a full refresh using only thrifted or secondhand finds, done in one weekend.", location: "Your room", cardSuit: 'diamonds', cardRank: 'A' },
  { title: "Watch a Film With No Subtitles and Guess the Plot", description: "Watch a foreign film with no subtitles on and try to follow the story anyway.", location: "Anywhere with a screen", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Explore a Neighborhood You've Never Set Foot In", description: "Spend a full day walking a part of your city or college town you've genuinely never explored.", location: "A new neighborhood nearby", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Try a Pottery or Ceramics Class", description: "Take a pottery or ceramics class for the first time and bring home whatever you make.", location: "A local studio", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Chase the Viral Food Trend Before It Dies", description: "Try whatever food trend is currently blowing up online before everyone moves on to the next one.", location: "Your kitchen or a local spot serving it", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Find a Local Band on Instagram, Not Spotify", description: "Discover a band through a flyer or an Instagram post, not an algorithm, and go see them play.", location: "A local venue", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Hit Every Coffee Shop Within a Mile in One Week", description: "Visit every coffee shop within a mile of campus over the course of one week and rank them.", location: "Around campus", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Make a Zine About Your Semester", description: "Start and finish a small zine \u2014 photos, writing, whatever \u2014 documenting this semester.", location: "Anywhere you can print and fold paper", cardSuit: 'diamonds', cardRank: 'A' },
  { title: "Learn Three Chords and Play Someone a Song", description: "Learn three chords on a guitar or ukulele and play a full song for someone, badly is fine.", location: "Anywhere with an instrument", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Find the Oldest Building in Town", description: "Track down the oldest building in your college town and learn its actual history.", location: "Your college town", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Write for a Poetry Slam the Night Before", description: "Go to a poetry slam, write something the night before, and read it.", location: "A local poetry slam", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Cook From a Cookbook, Not a Video", description: "Cook a full recipe using only a physical or PDF cookbook, no video tutorial allowed.", location: "Your kitchen", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Buy a Record You've Never Heard", description: "Go to a record store and buy something based purely on the cover or the title.", location: "A local record store", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Solo Day Trip, No Plan", description: "Take yourself on a solo trip to a city an hour away with no itinerary set in advance.", location: "A city an hour from campus", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Try a Life Drawing Class as a Beginner", description: "Take a life drawing class having never done one before.", location: "A local studio", cardSuit: 'diamonds', cardRank: 'Q' },
  { title: "Learn to Pull a Shot From an Actual Barista", description: "Get a barista to actually show you how they make a drink, not just hand it over.", location: "A local cafe", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Name Three Constellations From Somewhere Dark", description: "Find a spot with as little light pollution as you can manage and identify three constellations.", location: "Somewhere away from campus lights", cardSuit: 'diamonds', cardRank: 'K' },
  { title: "Trade Outfits With a Friend for a Day", description: "Swap your entire outfit with a friend and wear theirs for a full day.", location: "Anywhere", cardSuit: 'diamonds', cardRank: 'J' },
  { title: "Throw a Darty", description: "Plan and host a full day party \u2014 music, sun, snacks, starting way too early. Sober, wellness, or classic, make it a whole thing.", location: "Your place, a yard, or a roof", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 10, maxParticipants: 20 } },
  { title: "Host a Wellness Darty", description: "Organize a sober-curious day party \u2014 a group run or workout, a cold plunge, coffee or matcha, all before noon.", location: "A park, gym, or your place", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 12, maxParticipants: 15 } },
  { title: "Organize a Silent Disco Night", description: "Rent or rally headphones, pick the playlists, and run a silent disco for anyone who shows up.", location: "A dorm lounge, yard, or rooftop", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 14, maxParticipants: 25 } },
  { title: "Plan a Progressive Dinner Across 3+ Places", description: "Organize appetizers, mains, and dessert at three different apartments or dorms, moving the group between each course.", location: "Three or more apartments/dorms", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 14, maxParticipants: 12 } },
  { title: "Host a Clothing Swap for Your Floor", description: "Organize a clothing swap \u2014 everyone brings what they don't wear, everyone leaves with something new to them.", location: "A dorm lounge or common room", cardSuit: 'clubs', cardRank: 'J', event: { daysFromNow: 10, maxParticipants: 20 } },
  { title: "Run a Trivia Night", description: "Write the questions, book the space, and MC a trivia night for your friend group or floor.", location: "A local bar or common room", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 10, maxParticipants: 24 } },
  { title: "Organize a Sunrise Hike for Anyone Who'll Show", description: "Pick a trail, post the time, and lead a sunrise hike for whoever's willing to wake up for it.", location: "A nearby trail", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 7, maxParticipants: 12 } },
  { title: "Plan a Group Trip in Under a Week", description: "Pick a destination, book it, and get a group together for a trip with less than seven days' notice.", location: "Wherever you can get everyone to agree on", cardSuit: 'clubs', cardRank: 'A', event: { daysFromNow: 7, maxParticipants: 8 } },
  { title: "Host a Potluck Where Everyone Brings Home", description: "Organize a potluck where every dish has to be something from someone's home or family.", location: "Your place", cardSuit: 'clubs', cardRank: 'J', event: { daysFromNow: 10, maxParticipants: 15 } },
  { title: "Start a Study Group That Sticks", description: "Organize a recurring study group for a hard class and get it to actually meet more than once.", location: "A library or common room", cardSuit: 'clubs', cardRank: 'J' },
  { title: "Run a Campus Scavenger Hunt", description: "Design a scavenger hunt full of your group's inside jokes and hidden prizes, then run it.", location: "Campus", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 10, maxParticipants: 20 } },
  { title: "Plan a Themed Alter-Ego Night", description: "Pick a theme, set a date, and get your friend group to dress and act as their alter egos for a night out.", location: "Wherever you go out", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 14, maxParticipants: 15 } },
  { title: "Run a 48-Hour Bake Sale Fundraiser", description: "Organize a bake sale for a cause you care about, from planning to selling, in under 48 hours.", location: "A campus common area", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 2, maxParticipants: 10 } },
  { title: "Coordinate a Group Costume for a Random Tuesday", description: "Get a group to commit to a matching costume or theme for a completely ordinary day.", location: "Campus", cardSuit: 'clubs', cardRank: 'J', event: { daysFromNow: 7, maxParticipants: 15 } },
  { title: "Organize a Building-Wide Movie Night", description: "Pick the film by vote, book the space, and run a movie night for your whole dorm or building.", location: "A dorm lounge", cardSuit: 'clubs', cardRank: 'J', event: { daysFromNow: 7, maxParticipants: 30 } },
  { title: "Lead a Day Trip Nobody's Been On", description: "Research, plan, and lead a day trip for five or more people to somewhere none of you have been.", location: "Somewhere new to the whole group", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 14, maxParticipants: 8 } },
  { title: "Host and MC Your Own Karaoke Night", description: "Book a room or set up at home, put together the song list, and MC the whole night yourself.", location: "A karaoke room or your place", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 10, maxParticipants: 15 } },
  { title: "Start a Standing Sunday Dinner", description: "Organize the first Sunday dinner with friends and set it up to happen again.", location: "Your kitchen", cardSuit: 'clubs', cardRank: 'J', event: { daysFromNow: 5, maxParticipants: 10 } },
  { title: "Organize a Group Cold Plunge Meetup", description: "Find a spot, pick a time, and get a group to do a cold plunge together \u2014 then get everyone coffee after.", location: "A local lake, river, or cold plunge spot", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 10, maxParticipants: 12 } },
  { title: "Recruit a Team for a Charity 5K", description: "Sign up for a charity run and recruit a full team of friends to run it with you.", location: "A local charity race", cardSuit: 'clubs', cardRank: 'A', event: { daysFromNow: 21, maxParticipants: 10 } },
  { title: "Pull Off a Surprise Party in 72 Hours", description: "Plan and execute a full surprise party for a friend with less than three days to put it together.", location: "Wherever you can keep it secret", cardSuit: 'clubs', cardRank: 'A', event: { daysFromNow: 3, maxParticipants: 15 } },
  { title: "Host a Backyard Show for a Friend's Band", description: "Organize a backyard or rooftop show for a friend's band, from sound to guest list.", location: "A backyard or rooftop", cardSuit: 'clubs', cardRank: 'K', event: { daysFromNow: 14, maxParticipants: 30 } },
  { title: "Organize a Volunteer Day and Bring 5 People", description: "Find a local volunteer opportunity, sign up, and get at least five friends to come with you.", location: "A local nonprofit or shelter", cardSuit: 'clubs', cardRank: 'Q', event: { daysFromNow: 14, maxParticipants: 8 } },
  { title: "Plan a Whole Spring Break Trip for the Group", description: "Take the lead on planning an entire spring break trip for your friend group \u2014 dates, place, budget, all of it.", location: "Wherever the group decides", cardSuit: 'clubs', cardRank: 'A', event: { daysFromNow: 30, maxParticipants: 10 } },
  { title: "Throw the Rager Everyone Still Talks About", description: "Pick a theme, plan the details, and throw the party your friend group is still bringing up next semester.", location: "Your place", cardSuit: 'clubs', cardRank: 'A', event: { daysFromNow: 14, maxParticipants: 40 } },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('[db] connected');

  if (REPLACE_EXISTING) {
    const deleted = await PublicSidequest.deleteMany({});
    console.log(`[clear] deleted ${deleted.deletedCount} existing sidequests`);
  }

  const creator = await User.findOne({ email: CREATOR_EMAIL }).select('_id name');
  if (!creator) {
    console.error(`User ${CREATOR_EMAIL} not found — create an account first`);
    process.exit(1);
  }

  const now = new Date();
  const docs = sidequests.map(sq => ({
    title: sq.title,
    description: sq.description,
    location: sq.location,
    cardSuit: sq.cardSuit,
    cardRank: sq.cardRank,
    xpReward: computeXp(sq.cardSuit, sq.cardRank),
    createdBy: { userId: creator._id, userName: creator.name },
    claims: [],
    completions: [],
    ...(sq.event && {
      event: {
        date: new Date(now.getTime() + sq.event.daysFromNow * 86_400_000),
        maxParticipants: sq.event.maxParticipants,
        enrollments: [],
      },
    }),
  }));

  const inserted = await PublicSidequest.insertMany(docs);
  console.log(`[seed] inserted ${inserted.length} sidequests`);
  inserted.forEach(s => console.log(`  ${s.cardSuit.padEnd(9)} ${s.cardRank} — ${s.xpReward} XP — ${s.title}`));

  await mongoose.disconnect();
  console.log('[done]');
}

main().catch(err => { console.error(err); process.exit(1); });
