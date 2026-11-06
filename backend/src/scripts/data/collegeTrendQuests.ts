// College-student quests that work anywhere (no pinned place). Themes come from what is
// trending with Gen Z / college students: in-person and double dating, daytime "darties" and soft
// clubbing, run clubs, sober-curious socials, thrift and fit-check culture, nostalgia ("2026 vs 2016",
// film cameras), food tier lists, Dubai chocolate, RushTok, study "lock-in" culture.
//
// House rules for everything here: nothing requires alcohol, nothing involves trespassing or risky
// stunts, and anything involving other people needs their consent.
//
// Tuple: [suit, rank, title, description, location label]
// Suits: S spades (physical), H hearts (social), D diamonds (intellectual), C clubs (teamwork).

export type SuitCode = 'S' | 'H' | 'D' | 'C';
export type RankCode = 'J' | 'Q' | 'K' | 'A';
export type TrendQuest = [SuitCode, RankCode, string, string, string];

export const TREND_QUESTS: TrendQuest[] = [
  // ── Dating, in person ────────────────────────────────────────────────────────
  ['H', 'Q', 'Go on a Double Date With a Pair You Barely Know', 'Set up a double date: you and your date plus another pair. Pick a plan that beats dinner, keep phones in pockets, and make sure all four of you actually talk. Photo of the four of you at the spot.', 'Your city'],
  ['H', 'K', "Buy Your Date's Fit for the Day at a Thrift Store", 'Take your date (or a friend) to a thrift store with a $25 budget and pick their entire outfit. They wear it for the rest of the day. Bonus if they pick yours too.', 'A local thrift store'],
  ['H', 'J', 'Ask Someone Out in Person, Not Over Text', 'Skip the DMs. Ask someone to a specific plan, face to face, with a time and a place. Yes or no, you did the brave thing. Photo of the spot you picked.', 'In person'],
  ['H', 'Q', 'Plan a $15 Date With No Food and No Screens', 'Mini golf, a used-bookstore crawl, a free museum night, a sunset walk. Keep it under $15 total and phone-free. Photo of the activity.', 'Your city'],
  ['H', 'J', 'Trade Book Picks With Your Crush at a Bookstore', 'Each of you picks one book for the other, with a one-sentence reason. Buy them and write a note inside the cover.', 'A local bookstore'],
  ['H', 'Q', 'Cook a Three-Course Dinner for a Date in a Tiny Kitchen', 'Appetizer, main, dessert, in a dorm or a small apartment. Set the table properly, even if the plates do not match.', 'Your kitchen'],
  ['H', 'J', 'Take a Friend on a Proper Friend Date, Flowers Included', 'Plan a real date for a platonic friend: a reservation, a small bouquet, a toast to the friendship. Photo of the flowers on the table.', 'A cafe or restaurant'],
  ['H', 'Q', 'Play Matchmaker With a Low-Pressure Group Hang', 'Invite two friends who would click, plus a few others so it does not feel like a setup, and plan a hang that gives them space to talk.', 'Wherever your group hangs'],
  ['H', 'K', 'Hand-Write a Hype Letter to a Friend and Deliver It in Person', 'Two pages, specific memories, no generic compliments. Hand it over and watch them read it, or leave it where they will find it.', 'Anywhere'],
  ['D', 'Q', 'Write a Compatibility Quiz and Have Your Friend Group Take It', 'Write 10 spicy-but-harmless questions (pineapple on pizza, shower at night or morning), score everyone, and reveal your most and least compatible pairs.', 'Wherever your group hangs'],
  ['H', 'Q', 'Go on a Walk-and-Talk With No Destination', 'Pick someone, walk for an hour with no plan and no phone out, and let the route decide itself. Photo of the strangest place you ended up.', 'Your city'],
  ['C', 'Q', 'Run a Speed-Friending Night for Your Floor or Club', 'Gather at least 10 people, rotate partners every four minutes with a conversation prompt on each table, and see who exchanges numbers.', 'A dorm lounge or club room'],
  ['H', 'K', 'Take a Date to Something You Are Both Terrible At', 'Ice skating, pottery, climbing, bowling. The goal is to laugh, not to win. Photo of the worst attempt.', 'Somewhere new'],
  ['H', 'Q', 'Have a Phone-Free Coffee Date and Ask Five Real Questions', 'No small talk allowed. Ask five questions you would actually want the answer to, and answer theirs honestly too.', 'A local cafe'],

  // ── Daytime parties, soft clubbing, sober-curious ───────────────────────────────
  ['C', 'Q', 'Run a Free Cram Session for Your Floor Before Finals', 'Book a lounge, bring snacks, and have each person teach their strongest topic for 15 minutes. Photo of the whiteboard.', 'A dorm lounge or library'],
  ['H', 'Q', 'Dance Before Noon at a Coffee Rave or Morning Dance Event', 'Find a morning or daytime dance event and dance like it is midnight. Sober-friendly by design.', 'A morning dance event'],
  ['S', 'J', 'Join a Run Club and Stay for the Hangout Afterward', 'Show up, run at your own pace, and stay for the social part. Learn two names before you leave.', 'A local run club'],
  ['C', 'Q', 'Start a Weekly Walk Club for Your Floor', 'Pick a day and a time, post it, and get at least five people to show up for the first walk.', 'Your campus or neighborhood'],
  ['C', 'K', 'Host a Sober-Curious Social With a Real Mocktail Menu', 'Design a three-drink mocktail menu, print it, and host a night where nobody needs alcohol to have a great time.', 'Your place or a lounge'],
  ['C', 'Q', 'Run a Game Night Tournament With a Real Trophy', 'Brackets, a scoreboard, a ridiculous trophy. At least eight players and at least two different games.', 'Your place or a lounge'],
  ['H', 'Q', 'Host a Silent Book Club Followed by Snacks and a Debrief', 'Everyone reads their own book together in silence for an hour, then shares one line they loved.', 'A cafe or common room'],
  ['C', 'K', 'Throw a Clothing Swap for 15+ People', 'Everyone brings clothes they no longer wear and leaves with something new to them. Donate whatever is left.', 'A lounge or community space'],
  ['S', 'Q', 'Throw a Sunrise Dance Party at a Scenic Spot', 'Bring a small speaker kept at a considerate volume, a few friends, and a thermos. Dance while the sun comes up.', 'A scenic overlook'],
  ['H', 'J', 'Take Your Floor to a Free Campus Event You Would Never Pick', 'A guest lecture, a cultural night, a recital. Go together, sit near the front, and ask one question.', 'On campus'],
  ['C', 'Q', 'Host a Roommate Olympics With Five Events and a Podium', 'Medals, a podium photo, and the loser buys snacks. Events like trash-can basketball and a sock-toss count.', 'Your place'],
  ['H', 'K', 'Throw a 2016 Throwback Party With an Era-Accurate Playlist', 'Choker necklaces, Snapchat filter props, the playlist from your middle school bus. Prizes for the most accurate outfit.', 'Your place or a lounge'],

  // ── Thrift, fits, GRWM ────────────────────────────────────────────────────────
  ['D', 'Q', 'Thrift a Full Outfit Under $20 and Run a Runway Fit Check', 'Shirt, pants, shoes, one accessory, all under $20. Stage a runway walk for your friends.', 'A local thrift store'],
  ['D', 'K', 'Do a Thrift Flip: Turn a $5 Find Into Something You Would Actually Wear', 'Cut it, sew it, patch it, dye it. Before and after photos required.', 'A local thrift store or your room'],
  ['H', 'Q', 'Let a Friend Pick Your Entire Outfit for the Day', 'They choose everything from your closet or a store budget of your choosing, and you wear it all day without complaint.', 'Anywhere'],
  ['D', 'J', 'Film a GRWM With a Friend, Getting Ready Together', 'Record yourselves getting ready side by side, narrating the plan for the night. Keep the footage private if you want. Photo while getting ready.', 'Your room'],
  ['D', 'Q', "Recreate Your Parent's College Photo in a Thrifted Version of Their Outfit", 'Ask for an old photo of them in college, hunt down a close match, and recreate the pose and location as best you can.', 'Anywhere'],
  ['C', 'K', 'Host a Thrift Haul Competition: Best $15 Look Wins', 'Four or more friends, $15 each, one hour in a thrift store. Vote on the best outfit.', 'A local thrift store'],
  ['H', 'Q', 'Wear a Full Costume Outfit to Class and Commit to the Bit', 'Pick a character or theme and stay in it all day, even when people ask. Photo with the evidence.', 'On campus'],
  ['D', 'K', 'Build a Seven-Day Capsule Wardrobe From 10 Items', 'Ten pieces, seven different looks, one photo a day.', 'Your closet'],

  // ── Food and tier lists ───────────────────────────────────────────────────────
  ['D', 'Q', 'Create a Tier List of Every Food Spot Near Campus', 'Eat at 10 or more local spots over a few weeks, rank them S to F with honest reasons, and defend it in the group chat.', 'Around campus'],
  ['D', 'K', 'Rank Every Boba or Matcha Spot Within Two Miles', 'Try them all, rate sweetness, price, and texture, and publish a tier list your friends can argue with.', 'Around campus'],
  ['H', 'J', 'Hunt Down Dubai Chocolate and Taste-Test Three Versions', 'Find three different Dubai-style pistachio chocolate bars, taste them side by side, and crown a winner.', 'A local dessert shop'],
  ['D', 'Q', 'Make Dubai-Style Chocolate From Scratch in Your Kitchen', 'Pistachio cream, kataifi, and chocolate. Photograph the snap when you break it.', 'Your kitchen'],
  ['H', 'Q', 'Eat Five Tacos at Five Different Places in One Afternoon', 'One taco per place, no repeats. Rate each and rank them.', 'Around town'],
  ['D', 'J', 'Cook a Family Recipe and Make Friends Guess the Ingredients', 'Bring a dish from home, serve it blind, and see who can name the secret ingredient.', 'Your kitchen'],
  ['C', 'Q', 'Run a Ramen Glow-Up Cook-Off With a $5 Upgrade Limit', 'Everyone gets a pack of instant ramen and $5 to upgrade it. Judge on flavor, creativity, and presentation.', 'Your kitchen or a lounge'],
  ['H', 'Q', 'Order the Weirdest Thing on the Menu and Have a Stranger Rate It', 'Ask the person at the next table to take one bite and give it a score out of ten.', 'A local restaurant or cafe'],
  ['D', 'Q', 'Find the Best Meal Under $8 Near You and Make a One-Slide Case for It', 'Make a single slide with a photo, the price, and three reasons it wins. Share it with your friends.', 'Around campus'],
  ['C', 'J', 'Cook Dinner for Six on a $30 Budget', 'Plan the menu, shop together, and feed everyone. Photo of the full table.', 'Your kitchen'],
  ['H', 'Q', 'Bring Cookies to the Night Shift', 'Bake or buy a batch and bring them to late-night staff: security, library workers, dining crew. Say thank you to each one by name.', 'On campus'],
  ['D', 'K', 'Run a Blind Taste Test of Five Brands and Crown a Champion', 'Chips, soda, instant noodles, or ice cream. Hide the labels and keep score.', 'Your place'],
  ['H', 'Q', "Learn the Name of the Person Who Serves You Coffee or Meals and Use It All Week", 'Ask their name, remember it, and greet them by name every time for a week.', 'Your campus cafe or dining hall'],

  // ── Nostalgia and analog ─────────────────────────────────────────────────────────
  ['D', 'Q', 'Recreate a 2016 Photo With the Same Friend in 2026', 'Find an old photo of the two of you and match the pose and place. Post them side by side.', 'Anywhere'],
  ['D', 'J', 'Shoot a Full Roll of Film or a Disposable Camera and Get It Developed', 'No peeking, no retakes. Photograph the print you like most.', 'A photo lab'],
  ['H', 'Q', 'Make a Mixtape for a Friend and Hand It Over With a Handwritten Tracklist', 'Fifteen songs, a story behind each one, and a decorated cover.', 'Anywhere'],
  ['D', 'A', 'Spend 24 Hours on a Dumbphone Setup', 'Lock the smartphone away (keep it reachable for emergencies) and live a day with calls, texts, and a paper map only. Photo of the setup.', 'Anywhere'],
  ['D', 'Q', 'Build a Polaroid Wall of Your Semester So Far', 'At least 15 prints, in a layout you like. Photo of the finished wall.', 'Your room'],
  ['C', 'K', 'Host a Retro Console Tournament With a Bracket', 'Dust off a Wii, N64, or GameCube and run a full bracket with at least eight players.', 'Your place or a lounge'],
  ['D', 'K', 'Visit Campus Special Collections and Hold Something Old', 'Ask a librarian to see an old book, map, or manuscript, and learn its story.', 'Your campus library'],
  ['D', 'Q', 'Buy the Used Book With the Weirdest Inscription', 'Browse a used bookstore until you find a handwritten note inside, and figure out the story.', 'A used bookstore'],
  ['D', 'Q', 'Bury a Time Capsule With Friends to Open at Graduation', 'A letter to yourselves, a photo, a playlist, and one prediction each. Seal it and hide it somewhere safe.', 'Anywhere'],

  // ── Study, lock-in, career ───────────────────────────────────────────────────────
  ['D', 'J', 'Run a Four-Hour Lock-In With Friends, Phones in a Bowl', 'Snacks out, phones off, everyone works on something real. Photo of the bowl full of phones.', 'A library or common room'],
  ['H', 'J', 'Send Care Packages to Five Friends During Finals Week', 'Snacks, a note, and one small treat each. Leave them at their door.', 'On campus'],
  ['D', 'Q', 'Teach Your Major to a Friend in 10 Minutes Using Only Snacks as Props', 'Build the explanation from whatever food is on the table and see if it sticks.', 'Anywhere'],
  ['D', 'K', 'Sit In on a Lecture in a Department You Know Nothing About', 'Choose a subject you have never studied, sit in on a class with permission, and write down three things you learned.', 'On campus'],
  ['D', 'J', 'Go to Office Hours Once, Even If You Do Not Need Help', 'Ask your professor about their work or how they got started, and listen.', 'On campus'],
  ['D', 'K', 'Book a Mock Interview and Practice Until You Nail One Answer', 'Visit the career center, run a full mock interview, and record your best answer afterward.', 'On campus'],
  ['D', 'K', 'Learn One Small Skill in a Weekend and Show It Off', 'Juggling, a Rubik cube, a three-chord song, a card trick. Show someone on Monday.', 'Anywhere'],
  ['C', 'J', 'Host a Silent Study Date at a Cafe and Reward Yourselves With Dessert', 'Two hours of focused work, a break every 50 minutes, and a treat when you finish.', 'A local cafe'],
  ['D', 'A', 'Complete the Ultimate Lock-In: 12 Productive Hours With Proof of Output', 'Plan the day, take 15-minute breaks, and show what you finished. No doomscrolling.', 'Your favorite study spot'],
  ['D', 'Q', 'Ask a Grad Student to Explain Their Research in Five Minutes Over Coffee', 'Buy the coffee, ask good questions, and try to repeat the idea back to a friend.', 'On campus'],

  // ── Social courage ───────────────────────────────────────────────────────────────
  ['H', 'K', 'Give Five Genuine Compliments to Strangers in One Day', 'Specific and respectful: their jacket, their laugh, their dog. Keep a tally.', 'Around campus'],
  ['H', 'Q', 'Ask a Stranger for a Song Recommendation and Listen Together', 'Ask politely, put an earbud in each, and listen to the whole thing.', 'A public space'],
  ['H', 'J', 'Invite a Stranger to Your Table and Learn Their Whole Story', 'Ask someone eating alone if they want company and listen to what they tell you.', 'Your dining hall'],
  ['C', 'Q', 'Serenade a Friend on Their Birthday With a Group', 'Four or more of you, one song, one surprise. Perform it in front of them.', 'Wherever they will be'],
  ['H', 'Q', 'Turn a Group Chat Idea Into a Real Hangout Within Two Hours', 'Pick the next idea someone throws out and make it happen before the night is over.', 'Wherever the idea leads'],
  ['H', 'J', "Learn Three Phrases in a Classmate's Native Language and Use Them", 'Ask them to teach you and practice until you can say them naturally.', 'On campus'],
  ['H', 'K', 'Include Someone Who Looks Left Out', 'Spot someone alone at an event, start a conversation, and bring them into your group.', 'Anywhere'],
  ['H', 'Q', 'Do a Yes Day: Say Yes to Every Reasonable Plan for 24 Hours', 'Anything safe, legal, and kind counts. Keep a list of everything you said yes to.', 'Anywhere'],
  ['H', 'K', 'Host a Friendsgiving for People Who Cannot Go Home', 'Cook, invite, and make a place for everyone. Photo of the full table.', 'Your place'],
  ['H', 'K', 'Throw a Surprise Party for Someone Who Thinks Everyone Forgot', 'Coordinate with at least five of their friends and keep it a secret until the reveal.', 'Wherever they will be'],

  // ── Clubs and community ────────────────────────────────────────────────────────
  ['H', 'Q', 'Rush Three Clubs in One Week', 'Go to three interest meetings like it is recruitment week. Bonus for a coordinated outfit.', 'On campus'],
  ['C', 'A', 'Start a New Club With Five Founding Members', 'Pick a purpose, find four others, and hold your first meeting.', 'On campus'],
  ['C', 'J', 'Volunteer for a Day as a Group and Take a Team Photo', 'Food bank, shelter, park cleanup. Show up together and work hard.', 'A local nonprofit'],
  ['C', 'Q', 'Clean Up a Park or Street Block With Four or More People', 'Gloves, bags, and a goal. Photo of the haul.', 'A local park'],
  ['H', 'J', 'Write a Thank-You Note to a Professor or TA Who Helped You', 'Be specific about what they did and how it mattered.', 'On campus'],
  ['C', 'A', 'Organize a Charity Drive and Collect 50 Items in a Week', 'Coats, cans, books, or school supplies. Photo of the finished pile.', 'On campus'],
  ['C', 'Q', 'Run a Free Skill Workshop for Eight People', 'Teach something you are good at for an hour. Collect feedback from each person.', 'On campus'],
  ['H', 'Q', 'Attend a Cultural Event Outside Your Own Background and Ask Questions', 'Go with respect, ask what to know, and learn something new.', 'On campus or in town'],
  ['C', 'K', 'Plan a Campus Scavenger Hunt for 20 People', 'Write the clues, set the route, and judge the winners.', 'On campus'],

  // ── Physical ─────────────────────────────────────────────────────────────────────
  ['S', 'Q', 'Play Pickleball With Strangers and Win One Game', 'Join an open court, find partners, and win a game.', 'A local pickleball court'],
  ['S', 'J', 'Touch Grass: 60 Minutes Outside With No Phone', 'Leave your phone behind, walk, sit, or read outdoors for a full hour.', 'A park or lawn'],
  ['S', 'K', 'Complete a 5K as a Group in Costume', 'Pick a theme, sign up together, and finish side by side.', 'A local 5K'],
  ['S', 'Q', 'Try Three Intramural or Rec Sports in One Month', 'Sign up, show up, and finish each one even if you are bad.', 'Your campus rec center'],
  ['S', 'K', 'Take a Sunrise Hike and Cook Breakfast at the Top', 'Bring a small stove, eggs, and coffee. Photo of your breakfast at the summit.', 'A nearby trail'],
  ['S', 'Q', 'Bike to a Town 10+ Miles Away and Back in One Day', 'Plan the route, pack water, and get a snack at the far end.', 'A nearby town'],
  ['S', 'Q', 'Take a Group Fitness Class You Would Never Try', 'Pole, aerial, boxing, dance cardio. Stay for the whole class.', 'A local studio'],
  ['S', 'A', 'Run a Half Marathon', 'Sign up, train, and cross the finish line.', 'A local half marathon'],

  // ── Creative and content ───────────────────────────────────────────────────────
  ['D', 'Q', 'Film a One-Minute Movie With Friends in a Single Take', 'Plan the choreography, rehearse, and shoot it in one continuous shot.', 'Anywhere'],
  ['D', 'A', 'Shoot a Mini-Documentary About a Local Business Owner', 'Ask permission, interview them, and cut it down to three minutes.', 'A local business'],
  ['D', 'J', "Make a Wrapped for Your Friend Group and Rank Everyone's Music Taste", "Pull everyone's top songs, score them, and reveal the results to the group.", 'Wherever your group hangs'],
  ['C', 'K', 'Recreate a Famous Movie Scene With Four People on Campus', 'Costumes, props, and a faithful reenactment. Photo of the finished shot.', 'On campus'],
  ['C', 'Q', 'Choreograph a 30-Second Dance With Friends and Perform It in Public', 'Learn it, rehearse it, and do it once in front of a few strangers. Photo of the performance.', 'A public space'],
  ['D', 'K', 'Interview Five Seniors: What Do You Wish You Had Known?', 'Ask each the same question and compile the answers into a short guide.', 'On campus'],

  // ── Travel and budget ──────────────────────────────────────────────────────────
  ['S', 'Q', 'Take a $50 Day Trip Using Only Public Transit', 'Choose a destination, plan the transit route, and stay under $50 all in.', 'A nearby city'],
  ['D', 'Q', 'Go to a Free Museum Day and Find Your Favorite Piece', 'Spend an hour wandering, pick one work, and explain why it is the best.', 'A local museum'],
  ['C', 'K', 'Take a Day Road Trip With Four Friends and a Car-Voted Playlist', 'Each person gets three songs. The car votes on the order.', 'A nearby destination'],
  ['S', 'K', 'Camp Overnight Within an Hour of Campus', 'Pack light, set up camp, cook a real dinner, and wake up outside.', 'A nearby campsite'],
  ['H', 'Q', 'Show a Friend Your Hometown Favorite Spot, or Show Them Your Neighborhood', 'Take them to the place that made you who you are and tell them why it matters.', 'Your neighborhood'],
];
