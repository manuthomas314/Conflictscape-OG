/* ══════════════════════════════════════════════════════════════════════════════
   Wildlife News Map — India
   ══════════════════════════════════════════════════════════════════════════════ */

// ── Constants ─────────────────────────────────────────────────────────────────
const INDIA_BOUNDS = [[6, 68], [37, 98]];

// ── State Color Palette ───────────────────────────────────────────────────────
const STATE_COLORS = {
  'Chhattisgarh':   '#f97316', // Orange
  'Jharkhand':      '#ef4444', // Crimson Red
  'Odisha':         '#10b981', // Emerald Green
  'West Bengal':    '#06b6d4', // Cyan
  'Goa':            '#f59e0b', // Amber
  'Madhya Pradesh': '#8b5cf6', // Violet
  'Rajasthan':      '#ec4899', // Pink
  'Maharashtra':    '#3b82f6', // Blue
  'Karnataka':      '#14b8a6', // Teal
  'Assam':          '#84cc16', // Lime
  'Meghalaya':      '#22c55e', // Green
  'Telangana':      '#eab308', // Yellow
  'Other States':   '#94a3b8', // Slate Gray
};

function getStateColor(state) {
  return STATE_COLORS[state] || STATE_COLORS['Other States'];
}

// ── Source metadata (for info popover) ───────────────────────────────────────
const SOURCE_META = {
  'India.com':            { region: 'National',        lang: 'English', desc: 'High-volume national digital outlet aggregating state-level protest, land and mining stories.' },
  'BBC News':             { region: 'International',   lang: 'English', desc: 'BBC\'s India and environment desks — international coverage of displacement, extraction and resistance.' },
  'Republic':             { region: 'National',        lang: 'English', desc: 'National TV & digital network covering breaking protest, blockade and law-and-order stories.' },
  'Mongabay India':       { region: 'National',        lang: 'English', desc: 'Dedicated environmental journalism — the deepest reporting on mining, forest rights & Adivasi resistance in India.' },
  'Research Matters':     { region: 'National',        lang: 'English', desc: 'Science communication outlet covering ecology, biodiversity & wildlife research from Indian institutions.' },
  'The Wire':             { region: 'National',        lang: 'English', desc: 'Independent news covering environment, science & forest rights across India.' },
  'The Hindu':            { region: 'National',        lang: 'English', desc: 'India\'s leading broadsheet with sustained coverage of mining policy, land acquisition & tribal rights.' },
  'Indian Express':       { region: 'National',        lang: 'English', desc: 'National daily with dedicated environment desk covering wildlife crime, conservation & forest policy.' },
  'Hindustan Times':      { region: 'National',        lang: 'English', desc: 'National daily covering mining clearances, displacement and community protest across Indian states.' },
  'Times of India':       { region: 'National',        lang: 'English', desc: 'India\'s highest-circulation English daily, with district-level reporting on mines, quarries & agitations.' },
  'NDTV':                 { region: 'National',        lang: 'English', desc: 'TV & digital news network whose environment desk covers mining protests and forest-clearance disputes.' },
  'Nature India':         { region: 'National',        lang: 'English', desc: 'Nature journal\'s India desk covering scientific research on biodiversity & ecology.' },
  'EastMojo':             { region: 'Northeast India', lang: 'English', desc: 'Digital newsroom covering all 8 Northeast states — strong on wildlife, forests & environment.' },
  'Northeast Now':        { region: 'Northeast India', lang: 'English', desc: 'Northeast-focused news with environment & wildlife coverage across Assam & neighbouring states.' },
  'Assam Tribune':        { region: 'Assam',           lang: 'English', desc: 'Assam\'s oldest English daily. Covers Kaziranga, Manas, Brahmaputra ecosystem & rhino protection.' },
  'Greater Kashmir':      { region: 'Jammu & Kashmir', lang: 'English', desc: 'J&K\'s largest English daily covering Dachigam, Hangul deer, snow leopard & forest management.' },
  'Rising Kashmir':       { region: 'Jammu & Kashmir', lang: 'English', desc: 'J&K-based daily with coverage of Dachigam National Park & Himalayan wildlife.' },
  'Daily Excelsior':      { region: 'Jammu & Kashmir', lang: 'English', desc: 'Jammu-based daily covering Trikuta hills, Chenab valley forests & wildlife of the Jammu region.' },
  'Hill Post':            { region: 'Himachal Pradesh', lang: 'English', desc: 'HP-focused outlet covering snow leopard, Himalayan brown bear & high-altitude wildlife.' },
  'The Pioneer':          { region: 'Central India',   lang: 'English', desc: 'Lucknow-based daily covering Dudhwa, Pilibhit tiger reserves & UP forest department.' },
  'Central Chronicle':    { region: 'Madhya Pradesh',  lang: 'English', desc: 'MP-based daily covering Kanha, Bandhavgarh, Pench & Satpura tiger reserves.' },
  'Tribune India':        { region: 'North India',     lang: 'English', desc: 'Chandigarh-based daily covering wildlife & forests of Punjab, Haryana & Himachal Pradesh.' },
  'Telegraph India':      { region: 'East India',      lang: 'English', desc: 'Kolkata-based daily with strong coverage of Sundarbans, Bengal tigers & Northeast wildlife.' },
  'Deccan Herald':        { region: 'Karnataka',       lang: 'English', desc: 'Bengaluru-based daily covering Nagarahole, Bandipur, Coorg forests & Western Ghats wildlife.' },
  'Down To Earth':        { region: 'National',        lang: 'English', desc: 'CSE\'s flagship magazine — India\'s most authoritative voice on extraction, environment & climate policy.' },
  'Scroll.in':            { region: 'National',        lang: 'English', desc: 'Independent digital outlet with strong environment & forest rights coverage.' },
  'The Wire Science':     { region: 'National',        lang: 'English', desc: 'Science desk of The Wire covering ecology, conservation biology & environmental research.' },
  'ThePrint':             { region: 'National',        lang: 'English', desc: 'Digital news platform with environment & policy reporting across India.' },
  'Frontline Magazine':   { region: 'National',        lang: 'English', desc: 'The Hindu\'s fortnightly magazine with in-depth environment, forest & tribal rights stories.' },
  'India Today':          { region: 'National',        lang: 'English', desc: 'National magazine & digital outlet reporting on mining, land conflict & tribal displacement.' },
  'Outlook India':        { region: 'National',        lang: 'English', desc: 'National magazine covering environment, wildlife conservation & forest policy.' },
  'Deccan Chronicle':     { region: 'South India',     lang: 'English', desc: 'Hyderabad-based daily covering Telangana, AP wildlife & Eastern Ghats forests.' },
  'The New Indian Express':{ region: 'South India',    lang: 'English', desc: 'South-India-focused daily with strong coverage of Western Ghats, Tamil Nadu & Kerala wildlife.' },
  'The News Minute':      { region: 'South India',     lang: 'English', desc: 'Digital outlet covering South Indian states — Nilgiris, Kerala forests & Western Ghats.' },
  'Telegraph India':      { region: 'East India',      lang: 'English', desc: 'Kolkata-based daily with strong coverage of Sundarbans, Bengal tigers & Northeast wildlife.' },
  'Sambad English':       { region: 'Odisha',          lang: 'English', desc: 'Odisha\'s leading daily covering Simlipal, Bhitarkanika & Chilika wildlife.' },
  'OdishaBytes':          { region: 'Odisha',          lang: 'English', desc: 'Odisha digital outlet covering state wildlife — elephants, leopards & Mahanadi basin.' },
  'Northeast Today':      { region: 'Northeast India', lang: 'English', desc: 'Northeast India outlet covering Assam, Meghalaya & Arunachal wildlife & forests.' },
  'Morung Express':       { region: 'Nagaland',        lang: 'English', desc: 'Nagaland\'s principal English daily covering Nagaland wildlife & Amur falcon migration.' },
  'Star of Mysore':       { region: 'Karnataka',       lang: 'English', desc: 'Mysuru-based daily covering Nagarahole, Bandipur & Kabini wildlife.' },
  'Gomantak Times':       { region: 'Goa',             lang: 'English', desc: 'Goa-based daily covering Bhagwan Mahavir Wildlife Sanctuary & coastal ecology.' },
  'Land Conflict Watch':  { region: 'National',        lang: 'English', desc: 'Data journalism outlet tracking land conflicts involving forests, wildlife & tribal communities.' },
  'India Development Review':{ region: 'National',    lang: 'English', desc: 'Development-focused platform covering conservation funding, forest rights & policy.' },
  'The Federal':          { region: 'National',        lang: 'English', desc: 'Independent digital outlet covering South Indian environment & forest stories.' },
  'Newsclick.in':         { region: 'National',        lang: 'English', desc: 'Left-leaning digital outlet covering forest rights, tribal communities & environment.' },
  'Business Standard':    { region: 'National',        lang: 'English', desc: 'Financial daily with environment & natural resource policy reporting.' },
  'ANI News':             { region: 'National',        lang: 'English', desc: 'Wire service distributing wildlife & forest news from government and official sources across India.' },

  // Variant names (same publications, different display names in feed)
  'The Indian Express':   { region: 'National',        lang: 'English', desc: 'National daily with dedicated environment desk covering wildlife crime, conservation & forest policy.' },
  'The Times of India':   { region: 'National',        lang: 'English', desc: 'India\'s highest-circulation English daily with environment & wildlife coverage.' },
  'The Assam Tribune':    { region: 'Assam',           lang: 'English', desc: 'Assam\'s oldest English daily. Covers Kaziranga, Manas, Brahmaputra ecosystem & rhino protection.' },
  'The Business Standard':{ region: 'National',        lang: 'English', desc: 'Financial daily with environment & natural resource policy reporting.' },
  'The Tribune':          { region: 'North India',     lang: 'English', desc: 'Chandigarh-based daily covering wildlife & forests of Punjab, Haryana & Himachal Pradesh.' },
  'MorungExpress':        { region: 'Nagaland',        lang: 'English', desc: 'Nagaland\'s principal English daily covering Nagaland wildlife & Amur falcon migration.' },
  'newsclick.in':         { region: 'National',        lang: 'English', desc: 'Digital outlet covering forest rights, tribal communities & environment.' },

  // Major national TV / digital
  'News18':               { region: 'National',        lang: 'English', desc: 'Major TV & digital network with environment & wildlife coverage across all Indian states.' },
  'Times Now':            { region: 'National',        lang: 'English', desc: 'National TV channel with breaking wildlife, forest fire & poaching news.' },
  'ETV Bharat':           { region: 'National',        lang: 'English', desc: 'Multilingual TV network with state-level wildlife & forest coverage across India.' },
  'NDTV Profit':          { region: 'National',        lang: 'English', desc: 'NDTV\'s business desk — covers natural resource, forest land-use & climate policy stories.' },

  // Financial / business dailies with environment desks
  'The Economic Times':   { region: 'National',        lang: 'English', desc: 'India\'s largest financial daily with environment, climate & natural resource policy coverage.' },
  'Mint':                 { region: 'National',        lang: 'English', desc: 'Business daily with coverage of forest carbon markets, wildlife policy & environmental regulation.' },
  'BusinessLine':         { region: 'National',        lang: 'English', desc: 'The Hindu\'s business daily — covers forest land acquisition, mining & biodiversity policy.' },

  // National digital outlets
  'The Quint':            { region: 'National',        lang: 'English', desc: 'Digital news outlet with environment & investigative wildlife coverage.' },
  'The Better India':     { region: 'National',        lang: 'English', desc: 'Solutions-focused journalism highlighting conservation success stories & community-led wildlife protection.' },
  'Indiaspend':           { region: 'National',        lang: 'English', desc: 'Data journalism outlet covering deforestation rates, wildlife census data & forest policy analysis.' },
  'Swarajyamag':          { region: 'National',        lang: 'English', desc: 'National magazine with coverage of tribal forest rights, conservation & environment policy.' },
  'PIB India':            { region: 'National',        lang: 'English', desc: 'Press Information Bureau — official government press releases on wildlife, forest & environment policy.' },
  'IUCN':                 { region: 'International',   lang: 'English', desc: 'International Union for Conservation of Nature — Red List updates, species assessments & India conservation reports.' },
  'India Today NE':       { region: 'Northeast India', lang: 'English', desc: 'Northeast edition of India Today covering Assam, Arunachal, Meghalaya & region\'s wildlife.' },

  // East / Northeast
  'The Statesman':        { region: 'East India',      lang: 'English', desc: 'Kolkata broadsheet covering Sundarbans, Bengal tigers & Northeast conservation stories.' },
  'Arunachal Observer':   { region: 'Arunachal Pradesh', lang: 'English', desc: 'Arunachal Pradesh\'s leading daily covering the state\'s rich biodiversity, tigers & elephant corridors.' },
  'The News Mill':        { region: 'Northeast India', lang: 'English', desc: 'Northeast digital outlet covering Manipur, Mizoram & Northeast India wildlife & forest stories.' },
  't2ONLINE':             { region: 'East India',      lang: 'English', desc: 'Telegraph India\'s lifestyle supplement — covers wildlife conservation & eco-tourism in eastern India.' },
  'The Asian Age':        { region: 'National',        lang: 'English', desc: 'National English daily with environment & wildlife stories from across India.' },

  // South India
  'NewsMeter':            { region: 'Telangana',       lang: 'English', desc: 'Hyderabad-based digital outlet covering Telangana & AP wildlife, forests & environmental conflicts.' },
  'Telangana Today':      { region: 'Telangana',       lang: 'English', desc: 'Telangana state daily covering Nagarjunasagar-Srisailam tiger reserve & AP/Telangana wildlife.' },
  'DT Next':              { region: 'Tamil Nadu',      lang: 'English', desc: 'Chennai-based daily (sister of Dinamalar) covering Tamil Nadu wildlife — nilgiris, Mudumalai & Guindy.' },
  'The South First':      { region: 'South India',     lang: 'English', desc: 'South India digital outlet covering forest rights, Western Ghats ecology & state-level wildlife policy.' },

  // Odisha
  'Odisha TV':            { region: 'Odisha',          lang: 'English', desc: 'Odisha\'s leading news channel covering Simlipal tiger reserve, Bhitarkanika & Odisha wildlife.' },
  'Ommcom News':          { region: 'Odisha',          lang: 'English', desc: 'Odisha digital outlet covering state forests, elephant corridors & wildlife conflict.' },
  'KalingaTV':            { region: 'Odisha',          lang: 'English', desc: 'Odisha TV channel covering Simlipal, Satkosia & eastern India wildlife stories.' },
  'orissapost.com':       { region: 'Odisha',          lang: 'English', desc: 'Odisha Post — digital daily covering Odisha wildlife, tribal forest communities & conservation.' },

  // Maharashtra / West India
  'Free Press Journal':   { region: 'Maharashtra',     lang: 'English', desc: 'Mumbai daily covering Maharashtra wildlife — Tadoba, Melghat tiger reserves & Sahyadri forests.' },
  'Bangalore Mirror':     { region: 'Karnataka',       lang: 'English', desc: 'Bengaluru city daily covering Bannerghatta, Nagarahole & urban leopard conflict stories.' },
  'lokmattimes.com':      { region: 'Maharashtra',     lang: 'English', desc: 'Lokmat English — Maharashtra outlet covering Vidarbha tigers, forest land conflicts & conservation.' },
  'thehitavada.com':      { region: 'Central India',   lang: 'English', desc: 'Nagpur-based daily covering central India tiger belt — Tadoba, Pench, Kanha & Melghat.' },

  // Goa
  'heraldgoa.in':         { region: 'Goa',             lang: 'English', desc: 'Goa Herald — covers Mhadei wildlife sanctuary, Western Ghats biodiversity & Goa forest conflicts.' },
  'Prudent Media':        { region: 'Goa',             lang: 'English', desc: 'Goa-based digital outlet covering coastal ecology, wildlife sanctuary news & Mhadei dispute.' },

  // Gujarat / West India
  'Ahmedabad Mirror':     { region: 'Gujarat',         lang: 'English', desc: 'Ahmedabad city daily covering Gir lion sanctuary, Little Rann & Gujarat wildlife stories.' },
  'Mid-day':              { region: 'Maharashtra',     lang: 'English', desc: 'Mumbai tabloid covering Sanjay Gandhi National Park, leopard conflict & Maharashtra forest news.' },

  // Himachal Pradesh / North
  'HimbuMail':            { region: 'Himachal Pradesh', lang: 'English', desc: 'HP-focused digital outlet covering snow leopard, Himalayan wildlife & forest news.' },
  'thepatriot.in':        { region: 'Northeast India', lang: 'English', desc: 'Northeast India outlet covering Manipur, Nagaland & regional wildlife stories.' },

  // Jharkhand / East
  'jharkhandstatenews.com': { region: 'Jharkhand',    lang: 'English', desc: 'Jharkhand news covering Palamau tiger reserve, elephant corridors & state forest department.' },

  // South / Andhra
  'Hyderabad Mail':       { region: 'Telangana',       lang: 'English', desc: 'Hyderabad-based outlet covering Telangana & AP wildlife, forest encroachment & urban wildlife conflict.' },
  'The Siasat Daily':     { region: 'Telangana',       lang: 'English', desc: 'Hyderabad-based daily covering Deccan wildlife, Amrabad tiger reserve & AP/Telangana forests.' },
  'EdexLive':             { region: 'South India',     lang: 'English', desc: 'The New Indian Express education & science desk covering biodiversity research & conservation.' },
  'YOCee':                { region: 'Tamil Nadu',      lang: 'English', desc: 'Chennai-focused digital outlet covering Tamil Nadu wildlife, Nilgiris & coastal ecology.' },

  // National news aggregators / wire
  'Devdiscourse':         { region: 'National',        lang: 'English', desc: 'Development & policy news aggregator covering environment, forest clearances & wildlife policy.' },
  'MSN':                  { region: 'National',        lang: 'English', desc: 'Microsoft News aggregator republishing Indian wildlife & environment stories from partner outlets.' },
  'Dailyhunt':            { region: 'National',        lang: 'Multilingual', desc: 'Indian news aggregator republishing wildlife & environment content from regional and national outlets.' },
  'Rediff':               { region: 'National',        lang: 'English', desc: 'Indian web portal aggregating wildlife & environment news from national sources.' },
  'India.Com':            { region: 'National',        lang: 'English', desc: 'Digital news aggregator covering Indian wildlife, environment & conservation stories.' },
  'Awaz The Voice':       { region: 'National',        lang: 'English', desc: 'Digital outlet covering minority communities, tribal forest rights & environment across India.' },

  // Financial / corporate
  'Moneycontrol.com':     { region: 'National',        lang: 'English', desc: 'Financial news site covering natural resource policy, forest land acquisitions & green economy.' },
  'CNBC TV18':            { region: 'National',        lang: 'English', desc: 'Business TV channel covering environment regulation, forest sector & green policy news.' },
  'Exchange4Media':       { region: 'National',        lang: 'English', desc: 'Media industry outlet occasionally covering wildlife documentary & conservation communication stories.' },

  // Science / research orgs
  'WWF India':            { region: 'National',        lang: 'English', desc: 'WWF India — publishes conservation updates, species reports & habitat protection news for India.' },
  'The Nature Conservancy': { region: 'International', lang: 'English', desc: 'TNC — international conservation organisation publishing India landscape & biodiversity news.' },
  'One Earth':            { region: 'International',   lang: 'English', desc: 'Conservation science publication covering global and India biodiversity & habitat protection.' },
  'Indian Council Of Agricultural Research': { region: 'National', lang: 'English', desc: 'ICAR — government research body, covers agroforestry, wildlife-agriculture interface & biodiversity.' },
  'Department of Science & Technology (DST)': { region: 'National', lang: 'English', desc: 'Government science ministry publishing research funding, ecology studies & conservation science news.' },

  // Legal
  'Live Law':             { region: 'National',        lang: 'English', desc: 'Legal news outlet covering NGT orders, Supreme Court forest cases & wildlife protection law.' },
  'SCC Online':           { region: 'National',        lang: 'English', desc: 'Legal database covering court judgments on forest rights, wildlife crime & environmental law.' },
  'The National Law Review': { region: 'International', lang: 'English', desc: 'Legal analysis outlet covering India environmental law, wildlife protection & forest regulation.' },
  'Nomad Lawyer':         { region: 'National',        lang: 'English', desc: 'Legal commentary covering environmental law, NGT & wildlife protection act cases in India.' },

  // Odisha Odia-language
  'pragativadi.com':      { region: 'Odisha',          lang: 'Odia', desc: 'Pragativadi — major Odia-language daily covering Odisha wildlife, Simlipal & elephant corridors.' },
  'Sambad English':       { region: 'Odisha',          lang: 'English', desc: 'English edition of Sambad, Odisha\'s largest Odia daily — wildlife & forest coverage.' },

  // CSR / development
  'The CSR Journal':      { region: 'National',        lang: 'English', desc: 'CSR-focused outlet covering corporate conservation funding, biodiversity projects & forest initiatives.' },

  // IAS / current affairs (factual wildlife content for exam prep)
  'GK Today':             { region: 'National',        lang: 'English', desc: 'Current affairs & exam prep outlet — covers wildlife reserves, species & conservation policy as factual summaries.' },
  'INSIGHTS IAS':         { region: 'National',        lang: 'English', desc: 'IAS exam preparation covering environment, biodiversity & conservation as current affairs topics.' },
  'Drishti IAS':          { region: 'National',        lang: 'English', desc: 'IAS coaching outlet covering environment & ecology as current affairs — wildlife reserves, species & policy.' },
  'AffairsCloud.com':     { region: 'National',        lang: 'English', desc: 'Current affairs aggregator covering wildlife conservation, PA notifications & forest policy for exam prep.' },
  'UPSC Colorfull notes': { region: 'National',        lang: 'English', desc: 'UPSC preparation resource covering environment & ecology topics — wildlife reserves & biodiversity.' },
  'PW':                   { region: 'National',        lang: 'English', desc: 'Physics Wallah / PW — edtech covering environment & ecology as UPSC/competitive exam topics.' },
  'Indianmasterminds':    { region: 'National',        lang: 'English', desc: 'Banking & govt exam outlet occasionally covering wildlife & environment as current affairs.' },

  // Travel / lifestyle (have wildlife-related content)
  'curlytales.com':       { region: 'National',        lang: 'English', desc: 'Travel & food outlet covering wildlife safaris, national park tourism & eco-travel in India.' },
  'NativePlanet':         { region: 'National',        lang: 'English', desc: 'India travel platform covering national parks, wildlife sanctuaries & safari destinations.' },
  'Indiahikes':           { region: 'National',        lang: 'English', desc: 'Trekking & outdoors platform covering Himalayan forests, wildlife sightings & mountain ecology.' },
  'Outlook Traveller':    { region: 'National',        lang: 'English', desc: 'Outlook\'s travel magazine covering wildlife sanctuaries, safari tourism & eco-destinations in India.' },
  'Condé Nast Traveller India': { region: 'National', lang: 'English', desc: 'Luxury travel magazine with wildlife safari & conservation-tourism coverage across India.' },
  'ET TravelWorld':       { region: 'National',        lang: 'English', desc: 'Economic Times travel vertical covering wildlife tourism, sanctuary developments & eco-travel.' },
  'Travel And Tour World': { region: 'International',  lang: 'English', desc: 'International travel trade outlet covering India wildlife tourism & national park developments.' },
  'Travel Trade Journal': { region: 'National',        lang: 'English', desc: 'Travel industry trade publication covering wildlife tourism trends & national park developments.' },
  'homegrown.co.in':      { region: 'National',        lang: 'English', desc: 'Youth culture & travel outlet covering India wildlife, forests & nature-related stories.' },

  // International
  'Khaleej Times':        { region: 'International',   lang: 'English', desc: 'UAE-based English daily covering India wildlife stories with international readership.' },
  'The Daily Star':       { region: 'International',   lang: 'English', desc: 'Bangladesh\'s leading English daily — covers Sundarbans shared ecosystem & regional wildlife.' },
  'RTL Today':            { region: 'International',   lang: 'English', desc: 'Luxembourg news outlet occasionally covering India wildlife & conservation stories.' },
  'dw.com':               { region: 'International',   lang: 'English', desc: 'Deutsche Welle — German international broadcaster covering India environment & wildlife stories.' },
  'The Diplomat – Asia-Pacific': { region: 'International', lang: 'English', desc: 'Asia-Pacific affairs magazine covering India environment policy, forest rights & wildlife regulation.' },
  'Prothom Alo English':  { region: 'International',   lang: 'English', desc: 'Bangladesh\'s Prothom Alo English — covers Sundarbans tiger reserve & Bangladesh-India shared wildlife.' },

  // Niche / investigative
  'Cobrapost':            { region: 'National',        lang: 'English', desc: 'Investigative journalism outlet covering wildlife crime, poaching networks & forest land scams.' },
  'organiser.org':        { region: 'National',        lang: 'English', desc: 'RSS-linked weekly covering tribal & forest community issues alongside wildlife & environment.' },
  'Doing Sociology':      { region: 'National',        lang: 'English', desc: 'Academic sociology platform covering human-wildlife conflict, forest communities & conservation policy.' },
  'WorldAtlas':           { region: 'International',   lang: 'English', desc: 'Geography & facts platform covering India national parks, endangered species & biodiversity data.' },
  'Goa News Hub':         { region: 'Goa',             lang: 'English', desc: 'Goa digital outlet covering Western Ghats biodiversity, Mhadei river & coastal wildlife.' },
  'usthadian.com':        { region: 'Northeast India', lang: 'English', desc: 'Northeast India outlet covering Tripura, Mizoram & northeast wildlife & forest news.' },
  'Construction World':   { region: 'National',        lang: 'English', desc: 'Infrastructure outlet covering forest land diversion for projects, environmental clearances & green building.' },
  'Architect and Interiors India': { region: 'National', lang: 'English', desc: 'Design publication covering sustainable architecture, forest materials & eco-design in India.' },
};

// Order matters — first match wins. conservation is the fallback (not listed here).
const CATEGORY_KEYWORDS = {
  poaching:  ['poach', 'snare', 'traffick', 'smuggl', 'ivory', 'wildlife crime', 'confiscat', 'illegal hunt', 'crime against'],
  discovery: ['new species', 'new-to-science', 'records first', 'first record', 'scientists discover', 'new fanged', 'new toad', 'new frog', 'new fish species', 'new gecko', 'new snake eel', 'emerges from ancient', 'solves evolutionary'],
  conflict:  ['elephant attack', 'leopard attack', 'tiger attack', 'bear attack', 'mauled', 'conflict hotspot', 'human-wildlife', 'man-animal', 'human-animal', 'drone squad'],
  research:  ['finds study', 'reveals survey', 'reveals study', 'population rises', 'population survey', 'census', 'behaviour', 'behavior', 'foraging', 'camera trap', 'odonate', 'migratory pastoralist'],
};

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
  center: [22, 82],
  zoom: 5,
  minZoom: 4,
  maxZoom: 15,
  zoomSnap: 0.25,            // allows fractional zoom so fitBounds fills India tightly
  maxBounds: [[1, 63], [41, 102]],  // contains India + small buffer; prevents far panning
  maxBoundsViscosity: 1.0,   // hard boundary — no drag outside India area
  zoomControl: false,
});

// Zoom control — top right
L.control.zoom({ position: 'topright' }).addTo(map);

// Tile layer
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  maxZoom: 16,
}).addTo(map);

// Fit India — generous bounds so J&K (38.5°N) and Nicobar (3.5°N) are comfortably visible
map.fitBounds([[3.5, 66], [38.5, 99]], { padding: [10, 10] });

// India official boundary overlay (follows India's claimed boundary incl. Arunachal Pradesh,
// full J&K/PoK/Gilgit-Baltistan, and Aksai Chin). Non-interactive; sits above tile layer.
fetch('india_boundary.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color: '#ffffff', weight: 1, opacity: 0.3, fill: false },
      interactive: false,
    }).addTo(map);
  })
  .catch(() => {}); // silently ignore if file missing (e.g. local dev without the file)

// ── Cluster group ─────────────────────────────────────────────────────────────
const clusters = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  iconCreateFunction(cluster) {
    const count = cluster.getChildCount();
    const large = count >= 10 ? ' large' : '';
    return L.divIcon({
      html: `<div class="cluster-icon${large}">${count}</div>`,
      className: '',
      iconSize: large ? [44, 44] : [38, 38],
    });
  },
});
map.addLayer(clusters);

// ── State ─────────────────────────────────────────────────────────────────────
let allArticles = [];
let allMarkers  = [];
let activeStates = new Set();
const activeSrcs = new Set();

const HISTORY_DAYS = 60;
let showHistorical = localStorage.getItem('wl_history') === '1';

// ── Helpers ───────────────────────────────────────────────────────────────────
function categorize(headline) {
  const lower = (headline || '').toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return 'conservation'; // fallback — Conservation & Policy catches everything else
}

function markerRadius(published) {
  const days = (Date.now() - new Date(published).getTime()) / 86400000;
  return Math.max(5, 10 - days * 0.12);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function popupBadgeStyle(cat) {
  const colors = {
    poaching:     { bg: 'rgba(251,113,133,0.15)', border: 'rgba(251,113,133,0.35)', text: '#fda4af', dot: '#fb7185' },
    discovery:    { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.35)',  text: '#fde68a', dot: '#fbbf24' },
    conflict:     { bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)',  text: '#fed7aa', dot: '#fb923c' },
    research:     { bg: 'rgba(45,212,191,0.15)',  border: 'rgba(45,212,191,0.35)',  text: '#99f6e4', dot: '#2dd4bf' },
    conservation: { bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.35)',  text: '#a7f3d0', dot: '#34d399' },
  };
  return colors[cat] || colors.conservation;
}

function buildPopup(a) {
  const stateColor  = getStateColor(a.state);
  const mineral     = a.mineral || 'Mining';
  const protestType = a.protest_type ? ` · ${a.protest_type}` : '';

  return `
    <div class="popup">
      <div class="popup-header">
        <div class="popup-cat-badge" style="background:${stateColor}22;border:1px solid ${stateColor}66;color:#f8fafc">
          <span class="popup-cat-dot" style="background:${stateColor}"></span>
          ${escapeHtml(a.state || 'India')} · ${escapeHtml(mineral)}${escapeHtml(protestType)}
        </div>
        <div class="popup-headline">${escapeHtml(a.headline)}</div>
      </div>
      <div class="popup-meta">
        <div class="popup-meta-row">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="popup-meta-text">${escapeHtml(a.place_name ? a.place_name + ', ' + (a.state || '') : (a.state || ''))}</span>
        </div>
        <div class="popup-meta-row">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span class="popup-meta-text">${escapeHtml(a.source)} · ${formatDate(a.published)}</span>
        </div>
      </div>
      <div class="popup-footer">
        <a class="popup-link" href="${a.url}" target="_blank" rel="noopener noreferrer">
          Read article
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
      </div>
    </div>`;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ── State Filters (Dynamic) ───────────────────────────────────────────────────
function buildStateFilters(articles) {
  const container = document.getElementById('state-filters');
  if (!container) return;
  container.innerHTML = '';

  const stateCounts = {};
  articles.forEach(a => {
    const s = a.state || 'Other States';
    stateCounts[s] = (stateCounts[s] || 0) + 1;
  });

  const sortedStates = Object.keys(stateCounts).sort((a, b) => stateCounts[b] - stateCounts[a]);

  // Initially activate all states
  sortedStates.forEach(s => activeStates.add(s));

  sortedStates.forEach(state => {
    const chip = document.createElement('div');
    chip.className = 'state-chip active';
    chip.dataset.state = state;
    chip.setAttribute('role', 'checkbox');
    chip.setAttribute('aria-checked', 'true');
    chip.setAttribute('tabindex', '0');

    const color = getStateColor(state);
    chip.innerHTML = `
      <span class="state-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>
      <span class="state-name">${escapeHtml(state)}</span>
      <span class="state-count">${stateCounts[state]}</span>
    `;

    const toggle = () => {
      if (activeStates.has(state)) {
        activeStates.delete(state);
        chip.classList.remove('active');
        chip.setAttribute('aria-checked', 'false');
      } else {
        activeStates.add(state);
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');
      }
      applyFilters();
    };

    chip.addEventListener('click', toggle);
    chip.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });

    container.appendChild(chip);
  });

  // Select All / Clear Handlers
  document.getElementById('select-all-states')?.addEventListener('click', () => {
    sortedStates.forEach(s => activeStates.add(s));
    document.querySelectorAll('.state-chip').forEach(c => {
      c.classList.add('active');
      c.setAttribute('aria-checked', 'true');
    });
    applyFilters();
  });

  document.getElementById('clear-states')?.addEventListener('click', () => {
    activeStates.clear();
    document.querySelectorAll('.state-chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    applyFilters();
  });
}

function updateStateCounters(filtered) {
  const counts = {};
  filtered.forEach(({ article: a }) => {
    const s = a.state || 'Other States';
    counts[s] = (counts[s] || 0) + 1;
  });

  document.querySelectorAll('.state-chip').forEach(chip => {
    const state = chip.dataset.state;
    const countEl = chip.querySelector('.state-count');
    if (countEl) countEl.textContent = counts[state] || 0;
  });
}

// ── Render markers ────────────────────────────────────────────────────────────
function renderMarkers(filtered) {
  clusters.clearLayers();
  filtered.forEach(({ marker }) => clusters.addLayer(marker));
  const total = allArticles.length;
  const shown = filtered.length;
  document.getElementById('stats').textContent =
    shown === total
      ? `${total} article${total !== 1 ? 's' : ''} on map`
      : `${shown} of ${total} articles`;

  updateHistoryBar();
  updateStateCounters(filtered);

  // Empty state
  const empty = document.getElementById('empty-state');
  if (empty) empty.classList.toggle('visible', shown === 0);
}

// ── History toggle ────────────────────────────────────────────────────────────
function updateHistoryBar() {
  const bar = document.getElementById('history-bar');
  if (!bar) return;
  const total = allArticles.length;
  if (showHistorical) {
    bar.innerHTML = `All time &nbsp;·&nbsp; <button class="history-link" id="history-toggle-btn">Show recent only →</button>`;
  } else {
    bar.innerHTML = `Last 60 days &nbsp;·&nbsp; <button class="history-link" id="history-toggle-btn">Show all ${total} →</button>`;
  }
  document.getElementById('history-toggle-btn').addEventListener('click', () => {
    showHistorical = !showHistorical;
    localStorage.setItem('wl_history', showHistorical ? '1' : '0');
    applyFilters();
  });
}

// ── Weekly stats + hotspot ────────────────────────────────────────────────────
function computeWeeklyStats(articles) {
  const bar = document.getElementById('week-stats');
  if (!bar) return;
  const states = new Set(articles.map(a => a.state).filter(Boolean));
  const minerals = new Set(articles.map(a => a.mineral).filter(Boolean));
  bar.innerHTML = `<span class="week-pill">Timeline</span>2018–Present · ${articles.length} protests · across ${states.size} states`;
}

function computeHotspot(articles) {
  const counts = {};
  articles.forEach(a => {
    const loc = a.place_name ? `${a.place_name} (${a.state})` : a.state;
    if (loc) counts[loc] = (counts[loc] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const card = document.getElementById('hotspot-card');
  if (!card) return;
  if (!top) { card.setAttribute('hidden', ''); return; }
  card.removeAttribute('hidden');
  document.getElementById('hotspot-header').innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Top Protest Epicenter`;
  document.getElementById('hotspot-place').textContent = top[0];
  document.getElementById('hotspot-count').textContent = `${top[1]} documented protests`;
}

function updateCategoryCounters(filtered) {
  const counts = {};
  filtered.forEach(({article:a}) => { const c = categorize(a.headline); counts[c]=(counts[c]||0)+1; });
  document.querySelectorAll('#cat-filters .filter-chip').forEach(chip => {
    const cat = chip.dataset.cat;
    let el = chip.querySelector('.chip-count');
    if (!el) {
      el = document.createElement('span');
      el.className = 'chip-count';
      chip.insertBefore(el, chip.querySelector('.chip-check'));
    }
    el.textContent = counts[cat] || 0;
  });
}

// ── Apply filters ─────────────────────────────────────────────────────────────
function applyFilters() {
  const query    = (document.getElementById('search').value || '').toLowerCase().trim();
  const dateFrom = document.getElementById('date-from').value;
  const dateTo   = document.getElementById('date-to').value;

  const filtered = allMarkers.filter(({ article: a }) => {
    // State Filter
    if (activeStates.size > 0 && !activeStates.has(a.state || 'Other States')) return false;
    // Source Filter
    if (activeSrcs.size > 0 && !activeSrcs.has(a.source)) return false;
    // Date Range (strictly 2018 onwards)
    if (a.published < '2018-01-01') return false;
    if (dateFrom && a.published < dateFrom) return false;
    if (dateTo   && a.published > dateTo)   return false;
    // Query search
    if (query && !(
      (a.headline || '').toLowerCase().includes(query) ||
      (a.place_name || '').toLowerCase().includes(query) ||
      (a.state || '').toLowerCase().includes(query) ||
      (a.mineral || '').toLowerCase().includes(query) ||
      (a.source || '').toLowerCase().includes(query)
    )) return false;
    return true;
  });

  renderMarkers(filtered);
}

// ── Build source filters (compact dropdown) ───────────────────────────────────
let _srcDropdownSources = [];

function buildSourceFilters(articles) {
  _srcDropdownSources = [...new Set(articles.map(a => a.source))].sort();
  _srcDropdownSources.forEach(s => activeSrcs.add(s));

  const panel  = document.getElementById('src-dropdown-panel');
  const btn    = document.getElementById('src-dropdown-btn');

  // Source search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'src-search-wrap';
  searchWrap.innerHTML = `<input id="src-search-input" type="search" placeholder="Search sources…" autocomplete="off" aria-label="Search sources" />`;
  panel.appendChild(searchWrap);

  // Header row: Select All / Clear
  const header = document.createElement('div');
  header.className = 'src-dd-header';
  header.innerHTML = `
    <button class="src-dd-action" id="src-select-all">All</button>
    <span class="src-dd-sep">·</span>
    <button class="src-dd-action" id="src-clear-all">None</button>`;
  panel.appendChild(header);

  // One row per source
  _srcDropdownSources.forEach(src => {
    const row = document.createElement('div');
    row.className = 'src-dd-row active';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'true');
    row.setAttribute('tabindex', '0');
    row.dataset.src = src;

    const hasMeta = !!SOURCE_META[src];
    const count   = (window._allArticles || []).filter(a => a.source === src).length;

    row.innerHTML = `
      <span class="src-dd-check">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span class="src-dd-name">${escapeHtml(src)}</span>
      <span class="src-dd-count">${count}</span>
      ${hasMeta ? `<button class="src-info-btn src-dd-info" aria-label="About ${escapeHtml(src)}" tabindex="-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
      </button>` : ''}`;

    const toggle = () => {
      const active = activeSrcs.has(src);
      if (active) { activeSrcs.delete(src); row.classList.remove('active'); row.setAttribute('aria-selected','false'); }
      else        { activeSrcs.add(src);    row.classList.add('active');    row.setAttribute('aria-selected','true'); }
      updateSrcBtn();
      applyFilters();
    };

    row.addEventListener('click', toggle);
    row.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

    if (hasMeta) {
      const infoBtn = row.querySelector('.src-dd-info');
      if (infoBtn) {
        infoBtn.setAttribute('tabindex', '0');
        infoBtn.addEventListener('click', e => { e.stopPropagation(); showSourcePopover(src, infoBtn); });
        infoBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); showSourcePopover(src, infoBtn); } });
      }
    }

    panel.appendChild(row);
  });

  // Select All / None handlers
  document.getElementById('src-select-all').addEventListener('click', () => {
    _srcDropdownSources.forEach(s => activeSrcs.add(s));
    panel.querySelectorAll('.src-dd-row').forEach(r => { r.classList.add('active'); r.setAttribute('aria-selected','true'); });
    updateSrcBtn(); applyFilters();
  });
  document.getElementById('src-clear-all').addEventListener('click', () => {
    _srcDropdownSources.forEach(s => activeSrcs.delete(s));
    panel.querySelectorAll('.src-dd-row').forEach(r => { r.classList.remove('active'); r.setAttribute('aria-selected','false'); });
    updateSrcBtn(); applyFilters();
  });

  // Source search filter
  document.getElementById('src-search-input').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    panel.querySelectorAll('.src-dd-row').forEach(r => {
      r.style.display = r.dataset.src.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // Toggle dropdown open/close
  btn.addEventListener('click', e => { e.stopPropagation(); toggleSrcDropdown(); });

  updateSrcBtn();
}

function updateSrcBtn() {
  const total  = _srcDropdownSources.length;
  const active = _srcDropdownSources.filter(s => activeSrcs.has(s)).length;
  const label  = document.getElementById('src-dropdown-label');
  const btn    = document.getElementById('src-dropdown-btn');
  label.textContent = active === total ? 'All sources' : active === 0 ? 'No sources' : `${active} of ${total} sources`;
  btn.classList.toggle('src-btn-filtered', active !== total);
}

function toggleSrcDropdown() {
  const panel = document.getElementById('src-dropdown-panel');
  const btn   = document.getElementById('src-dropdown-btn');
  const open  = !panel.hidden;
  if (open) { closeSrcDropdown(); return; }
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('open');
}

function closeSrcDropdown() {
  const panel = document.getElementById('src-dropdown-panel');
  const btn   = document.getElementById('src-dropdown-btn');
  panel.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('open');
}

// Close on outside click / Escape
document.addEventListener('click', e => {
  if (!document.getElementById('src-section').contains(e.target)) closeSrcDropdown();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSrcDropdown(); });

// ── Source info popover ───────────────────────────────────────────────────────
let _popoverSrc = null;

function showSourcePopover(src, anchor) {
  const pop = document.getElementById('src-popover');
  const meta = SOURCE_META[src];
  if (!meta) return;

  // If same source clicked again, close
  if (_popoverSrc === src && !pop.hidden) { hideSourcePopover(); return; }
  _popoverSrc = src;

  const count = (window._allArticles || []).filter(a => a.source === src).length;

  pop.innerHTML = `
    <div class="src-pop-header">
      <span class="src-pop-name">${escapeHtml(src)}</span>
      <button class="src-pop-close" aria-label="Close">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="src-pop-tags">
      <span class="src-pop-tag">${escapeHtml(meta.region)}</span>
      <span class="src-pop-tag">${escapeHtml(meta.lang)}</span>
      <span class="src-pop-tag">${count} article${count !== 1 ? 's' : ''}</span>
    </div>
    <p class="src-pop-desc">${escapeHtml(meta.desc)}</p>`;

  pop.hidden = false;

  // Position: below the anchor, aligned to panel left edge
  const rect = anchor.getBoundingClientRect();
  const panelW = document.getElementById('panel').offsetWidth;
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = '12px';
  pop.style.width = (panelW - 24) + 'px';

  // Clamp to viewport bottom
  requestAnimationFrame(() => {
    const popH = pop.offsetHeight;
    const maxTop = window.innerHeight - popH - 8;
    if (parseFloat(pop.style.top) > maxTop) pop.style.top = Math.max(8, maxTop) + 'px';
  });

  pop.querySelector('.src-pop-close').addEventListener('click', hideSourcePopover);
}

function hideSourcePopover() {
  const pop = document.getElementById('src-popover');
  pop.hidden = true;
  _popoverSrc = null;
}

// Close on outside click or Escape
document.addEventListener('click', e => {
  const pop = document.getElementById('src-popover');
  if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.src-info-btn')) hideSourcePopover();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideSourcePopover(); closeSrcDropdown(); } });

// ── Date defaults ─────────────────────────────────────────────────────────────
function setDefaultDates() {
  document.getElementById('date-from').value = '2018-01-01';
  document.getElementById('date-to').value   = '';
}

// ── Category chip wiring ──────────────────────────────────────────────────────
document.querySelectorAll('#cat-filters .filter-chip').forEach(chip => {
  const cat = chip.dataset.cat;

  const toggle = () => {
    const active = activeCats.has(cat);
    if (active) { activeCats.delete(cat); chip.classList.remove('active'); chip.setAttribute('aria-checked','false'); }
    else        { activeCats.add(cat);    chip.classList.add('active');    chip.setAttribute('aria-checked','true'); }
    applyFilters();
  };

  chip.addEventListener('click', toggle);
  chip.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
});

// ── Section collapse wiring ───────────────────────────────────────────────────
document.querySelectorAll('.section-header').forEach(header => {
  const bodyId = header.dataset.target;
  const body   = document.getElementById(bodyId);
  if (!body) return;

  header.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    header.setAttribute('aria-expanded', open);
    body.classList.toggle('collapsed', !open);
  });
});

// ── Search wiring ─────────────────────────────────────────────────────────────
const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('search-clear');

searchEl.addEventListener('input', () => {
  clearBtn.style.display = searchEl.value ? 'flex' : 'none';
  applyFilters();
});

clearBtn.addEventListener('click', () => {
  searchEl.value = '';
  clearBtn.style.display = 'none';
  searchEl.focus();
  applyFilters();
});

document.getElementById('date-from').addEventListener('change', applyFilters);
document.getElementById('date-to').addEventListener('change', applyFilters);

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  searchEl.value = '';
  clearBtn.style.display = 'none';

  allArticles.forEach(a => activeStates.add(a.state || 'Other States'));
  document.querySelectorAll('.state-chip').forEach(c => {
    c.classList.add('active');
    c.setAttribute('aria-checked', 'true');
  });

  allArticles.forEach(a => activeSrcs.add(a.source));
  document.querySelectorAll('.src-dd-row').forEach(row => {
    row.classList.add('active');
    row.setAttribute('aria-selected', 'true');
  });
  updateSrcBtn();

  setDefaultDates();
  applyFilters();
});

// ── Panel collapse ────────────────────────────────────────────────────
const panel  = document.getElementById('panel');
const toggle = document.getElementById('panel-toggle');

toggle.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed');
  toggle.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
  setTimeout(() => map.invalidateSize(), 230);
});

// ── Load data ─────────────────────────────────────────────────────────────────
function initializeWithArticles(articles) {
  allArticles = articles;
  window._allArticles = articles;

  allMarkers = articles.map(a => {
    const color  = getStateColor(a.state);
    const radius = Math.max(6, markerRadius(a.published));

    const marker = L.circleMarker([a.lat, a.lon], {
      radius,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 1.5,
      opacity: 0.9,
    });

    marker.bindPopup(buildPopup(a), {
      maxWidth: 300,
      closeButton: true,
      className: '',
    });

    // Subtle pulse on hover
    marker.on('mouseover', function() {
      this.setStyle({ weight: 2.5, fillOpacity: 1 });
    });
    marker.on('mouseout', function() {
      this.setStyle({ weight: 1.5, fillOpacity: 0.85 });
    });

    return { article: a, marker };
  });

  buildStateFilters(articles);
  buildSourceFilters(articles);
  setDefaultDates();
  computeWeeklyStats(articles);
  computeHotspot(articles);
  applyFilters();
}

function loadData() {
  if (window.location.protocol === 'file:' && window.DECIPHER_DATA && window.DECIPHER_DATA.length > 0) {
    console.info('Loaded data directly from data.js (file:// protocol mode)');
    initializeWithArticles(window.DECIPHER_DATA);
    return;
  }

  fetch('news.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(articles => {
      initializeWithArticles(articles);
    })
    .catch(err => {
      console.warn('Network fetch failed or CORS blocked news.json, attempting fallback to embedded data:', err);
      if (window.DECIPHER_DATA && window.DECIPHER_DATA.length > 0) {
        initializeWithArticles(window.DECIPHER_DATA);
      } else {
        document.getElementById('stats').textContent = 'Failed to load articles.';
      }
    });
}

loadData();

// ── Visit counter ─────────────────────────────────────────────────────────────
(function () {
  const wrap = document.getElementById('visit-count');
  const num  = document.getElementById('visit-num');
  if (!wrap || !num) return;

  fetch('https://api.counterapi.dev/v1/wilderlens-app/pageviews/up', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject('non-ok'))
    .then(data => {
      if (data && typeof data.count === 'number') {
        num.textContent = data.count.toLocaleString('en-IN');
        wrap.style.display = 'flex';
      }
    })
    .catch(() => {}); // non-critical — silently hide if unreachable
}());

// ── Tour ──────────────────────────────────────────────────────────────────────
function startTour() {
  // Driver.js v1 IIFE: this.driver={}, this.driver.js = module, module.driver = fn
  const mod = window.driver && window.driver.js;
  if (!mod || !mod.driver) {
    console.warn('Deciphering Conflicts: Driver.js not loaded — tour unavailable');
    return;
  }

  mod.driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText:  'Next →',
    prevBtnText:  '← Back',
    doneBtnText:  'Done',
    steps: [
      {
        element: '#panel-brand',
        popover: {
          title:       'Welcome to Deciphering Conflicts',
          description: 'Documenting community, farmer, and Adivasi resistance against mining activities across Indian states from 2018 to the present.',
          side: 'right', align: 'start',
        },
      },
      {
        element: '#state-body',
        popover: {
          title:       'Filter by Geographical State',
          description: 'Explore documented protests across Indian states — Chhattisgarh, Jharkhand, Odisha, West Bengal, Goa, and more. Toggle any state to filter incidents on the map.',
          side: 'right', align: 'start',
        },
      },
      {
        element: '#src-body',
        popover: {
          title:       'Filter by source',
          description: 'Choose which publications to include — NDTV, India.com, BBC News, Times of India, India Today, Republic, Hindustan Times, Mongabay India, The Hindu and Down To Earth.',
          side: 'right', align: 'start',
        },
      },
      {
        element: '#search',
        popover: {
          title:       'Search',
          description: 'Search across headlines, place names, and source names in real time.',
          side: 'right', align: 'start',
        },
      },
      {
        element: '#map',
        popover: {
          title:       'The map',
          description: 'Each pin is a news article. Click a pin to see the headline, location, date, and a link to the full story. Clusters expand when you zoom in.',
          side: 'left', align: 'center',
        },
      },
      {
        element: '#chat-fab',
        popover: {
          title:       'Ask Deciphering Conflicts',
          description: 'Ask natural-language questions about the reports — try <em>how many coal mining protests?</em>, <em>show protests in Chhattisgarh</em>, <em>reports from this week</em>, or <em>which state has the most protests?</em>',
          side: 'left', align: 'end',
        },
      },
    ],
  }).drive();
}

// Auto-start on first visit (after map has a moment to render)
if (!localStorage.getItem('deciphering-conflicts-tour-done')) {
  localStorage.setItem('deciphering-conflicts-tour-done', '1');
  setTimeout(startTour, 1400);
}

document.getElementById('tour-btn')?.addEventListener('click', startTour);

// ── Chat widget ───────────────────────────────────────────────────────────────
(function chatWidget() {
  const fab      = document.getElementById('chat-fab');
  const widget   = document.getElementById('chat-widget');
  const closeBtn = document.getElementById('chat-close');
  const msgs     = document.getElementById('chat-messages');
  const inp      = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('chat-send');

  if (!fab || !widget) return;

  let isOpen = false;

  function openChat() {
    isOpen = true;
    widget.classList.add('open');
    inp.focus();
    if (!msgs.childElementCount) {
      addBot('Hi! Ask me about mining protests across Indian states (2018–Present) — try:<ul>' +
        '<li><em>Which state has the most mining protests?</em></li>' +
        '<li><em>Protests in Hasdeo Arand</em></li>' +
        '<li><em>Bauxite resistance in Odisha</em></li>' +
        '<li><em>How many coal mining protests?</em></li>' +
        '</ul>');
    }
  }
  function closeChat() { isOpen = false; widget.classList.remove('open'); }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeChat(); });

  function addMsg(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${role}`;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function addBot(html) { addMsg('bot', html); }

  const STOP_WORDS = new Set([
    'list', 'show', 'find', 'display', 'see', 'get', 'give', 'tell', 'please',
    'articles', 'article', 'news', 'related', 'about', 'to', 'for', 'from',
    'the', 'a', 'an', 'any', 'some', 'all', 'me', 'in', 'of', 'on', 'at',
    'with', 'how', 'many', 'what', 'which', 'where', 'latest', 'recent',
    'newest', 'last', 'count', 'number',
  ]);

  const SPECIES = [
    'snow leopard', 'sloth bear', 'tiger', 'elephant', 'leopard', 'lion',
    'rhino', 'rhinoceros', 'bear', 'wolf', 'gharial', 'crocodile', 'vulture',
    'bustard', 'dolphin', 'python', 'pangolin', 'jackal', 'deer', 'bird',
  ];

  const CAT_ALIAS = {
    poaching: 'poaching', crime: 'poaching', smuggl: 'poaching', traffick: 'poaching', snare: 'poaching',
    discovery: 'discovery', sighting: 'discovery',
    conflict: 'conflict', attack: 'conflict',
    research: 'research', census: 'research', study: 'research', survey: 'research',
    conservation: 'conservation', policy: 'conservation',
  };

  function artMatches(a, kw) {
    return (a.headline    || '').toLowerCase().includes(kw) ||
           (a.place_name  || '').toLowerCase().includes(kw);
  }

  function aLink(a) {
    return `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.headline)}</a>`;
  }

  function parseChatDate(q) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    // Use local time — toISOString() converts to UTC and shifts day back in IST (+5:30)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    if (/\btoday\b/.test(q))     return { from: fmt(now), to: fmt(now) };
    if (/\byesterday\b/.test(q)) { const d = new Date(now); d.setDate(d.getDate()-1); return { from: fmt(d), to: fmt(d) }; }
    if (/\blast\s+week\b|\bthis\s+week\b|\bpast\s+(one\s+)?week\b/.test(q)) { const d = new Date(now); d.setDate(d.getDate()-7); return { from: fmt(d), to: fmt(now) }; }
    if (/\blast\s+month\b|\bthis\s+month\b|\bpast\s+(one\s+)?month\b/.test(q)) { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: fmt(d), to: fmt(now) }; }

    // "past N days" / "past N weeks" / "last N days"
    const pastN = q.match(/\b(?:past|last)\s+(\d+|one|two|three|four|five|six|seven|ten|fourteen|thirty)\s+(day|week|month)s?\b/);
    if (pastN) {
      const words = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,ten:10,fourteen:14,thirty:30 };
      const n = parseInt(pastN[1]) || words[pastN[1]] || 1;
      const unit = pastN[2];
      const d = new Date(now);
      if (unit === 'day')   d.setDate(d.getDate() - n);
      if (unit === 'week')  d.setDate(d.getDate() - n * 7);
      if (unit === 'month') d.setMonth(d.getMonth() - n);
      return { from: fmt(d), to: fmt(now) };
    }

    const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
      january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11 };
    const mk = Object.keys(MONTHS).find(m => new RegExp(`\\b${m}\\b`).test(q));
    if (mk) {
      const mi = MONTHS[mk];
      const dm = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dm) {
        let d = new Date(now.getFullYear(), mi, parseInt(dm[1]));
        if (d > now) d.setFullYear(d.getFullYear() - 1);
        return { from: fmt(d), to: fmt(d) };
      }
      return { from: fmt(new Date(now.getFullYear(), mi, 1)), to: fmt(new Date(now.getFullYear(), mi+1, 0)) };
    }

    const iso = q.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) { const d = new Date(+iso[1], +iso[2]-1, +iso[3]); return { from: fmt(d), to: fmt(d) }; }

    return null;
  }

  function respond(raw) {
    const q = raw.toLowerCase().trim();
    if (!q) return;
    addMsg('user', escapeHtml(raw));

    const arts = allArticles;
    if (!arts.length) { addBot('Articles are still loading — try again in a moment.'); return; }

    const isCount  = /\bhow many\b|\bcount\b|\bnumber of\b|\btotal\b/.test(q);
    const isLatest = /\blatest\b|\bmost recent\b|\bnewest\b|\blast\b/.test(q);
    const isShow   = /\bshow\b|\bfind\b|\blist\b|\bdisplay\b|\bsee\b/.test(q);
    const isTop    = /\bmost\b|\btop\b|\bwhich (place|state|location|area)\b|\bwhere (are|is) most\b/.test(q);
    const isHelp   = /\bhelp\b|\bwhat can\b|\bwhat do you\b/.test(q);
    const isStats  = /\bstats\b|\bsummary\b|\boverview\b/.test(q);

    if (isHelp) {
      addBot('I can answer questions like:<ul>' +
        '<li><em>How many coal mining protests?</em></li>' +
        '<li><em>Show protests in Chhattisgarh</em></li>' +
        '<li><em>Latest protest in Odisha</em></li>' +
        '<li><em>Which state has the most protests?</em></li>' +
        '<li><em>Reports from Mongabay India</em></li>' +
        '<li><em>Stats / overview</em></li>' +
        '</ul>');
      return;
    }

    // detect subject (State, Mineral, Source, or Keyword)
    const stateMatched = Object.keys(STATE_COLORS).find(s => q.includes(s.toLowerCase()));
    const MINERALS = ['coal', 'bauxite', 'iron ore', 'sandstone', 'diamond', 'chromite', 'uranium'];
    const mineralMatched = MINERALS.find(m => q.includes(m));
    const source   = [...new Set(arts.map(a => a.source))].find(s => q.includes(s.toLowerCase()));

    let filtered = arts;
    let desc = 'documented mining protests';
    let mapKw = '';

    if (stateMatched) {
      filtered = arts.filter(a => (a.state || '').toLowerCase() === stateMatched.toLowerCase());
      desc = `protests in ${stateMatched}`;
      mapKw = stateMatched;
    } else if (mineralMatched) {
      filtered = arts.filter(a => (a.mineral || '').toLowerCase().includes(mineralMatched) || (a.headline || '').toLowerCase().includes(mineralMatched));
      desc = `${mineralMatched} mining protests`;
      mapKw = mineralMatched;
    } else if (source) {
      filtered = arts.filter(a => a.source === source);
      desc = `reports from ${source}`;
    } else {
      const terms = q.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
      if (terms.length) {
        const phrase = terms.join(' ');
        const phraseMatches = arts.filter(a => artMatches(a, phrase));
        filtered = phraseMatches.length
          ? phraseMatches
          : arts.filter(a => terms.every(t => artMatches(a, t)));
        if (filtered.length && filtered.length < arts.length) {
          desc = `"${phrase}" protests`;
          mapKw = phrase;
        } else {
          filtered = arts;
        }
      }
    }

    // date filter — stacks on top of any subject filter
    const dateRange = parseChatDate(q);
    const noSubject = filtered === arts;
    if (dateRange) {
      filtered = filtered.filter(a => a.published >= dateRange.from && a.published <= dateRange.to);
      const sameDay = dateRange.from === dateRange.to;
      const label = new Date(dateRange.from + 'T12:00:00').toLocaleDateString('en-IN',
          sameDay ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' }) +
        (sameDay ? '' : ' – ' + new Date(dateRange.to + 'T12:00:00').toLocaleDateString('en-IN',
          { day: 'numeric', month: 'short', year: 'numeric' }));
      desc = noSubject ? `articles on ${label}` : `${desc} on ${label}`;
    }

    // date query without other intent → treat as show
    const doShow = isShow || (dateRange && !isCount && !isLatest && !isTop && !isStats);

    // stats / overview (by state)
    if (isStats || (isCount && noSubject && !dateRange)) {
      const byState = {};
      arts.forEach(a => { const s = a.state || 'Other States'; byState[s] = (byState[s] || 0) + 1; });
      const lines = Object.entries(byState)
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `<li><strong>${escapeHtml(s)}</strong>: ${n} protests</li>`).join('');
      addBot(`<strong>${arts.length} mining protests (2018–Present)</strong> documented across Indian states:<ul>${lines}</ul>`);
      return;
    }

    // top places
    if (isTop) {
      const counts = {};
      filtered.forEach(a => { counts[a.place_name] = (counts[a.place_name] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) { addBot(`No ${desc} found.`); return; }
      addBot(`Top locations for ${desc}:<ul>${top.map(([p, n]) => `<li>${escapeHtml(p)} — ${n}</li>`).join('')}</ul>`);
      return;
    }

    // latest
    if (isLatest) {
      const sorted = [...filtered].sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 3);
      if (!sorted.length) { addBot(`No ${desc} found.`); return; }
      addBot(`Latest ${desc}:<ul>${sorted.map(a =>
        `<li>${aLink(a)} <span class="chat-meta">${escapeHtml(a.place_name)}, ${formatDate(a.published)}</span></li>`
      ).join('')}</ul>`);
      return;
    }

    // count
    if (isCount) {
      if (!filtered.length) { addBot(`No ${desc} found on the map right now.`); return; }
      addBot(`There are <strong>${filtered.length}</strong> ${desc} on the map.`);
      return;
    }

    // show / find / date query — update the map to match
    if (doShow) {
      if (!filtered.length) { addBot(`No ${desc} found.`); return; }

      if (stateMatched) {
        activeStates.clear();
        activeStates.add(stateMatched);
        document.querySelectorAll('.state-chip').forEach(chip => {
          const on = chip.dataset.state === stateMatched;
          chip.classList.toggle('active', on);
          chip.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      } else if (mapKw) {
        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = mapKw;
        const clearBtn = document.getElementById('search-clear');
        if (clearBtn) clearBtn.style.display = 'flex';
      }
      if (dateRange) {
        document.getElementById('date-from').value = dateRange.from;
        document.getElementById('date-to').value   = dateRange.to;
      }
      applyFilters();

      const preview = filtered.slice(0, 4).map(a =>
        `<li>${aLink(a)} <span class="chat-meta">${escapeHtml(a.place_name)}</span></li>`
      ).join('');
      const more = filtered.length > 4
        ? `<p style="margin-top:4px;color:var(--text-muted);font-size:10px">…and ${filtered.length - 4} more</p>`
        : '';
      const foundMsg = desc === 'all articles'
        ? `Showing all <strong>${filtered.length}</strong> articles`
        : `Found <strong>${filtered.length}</strong> ${desc}`;
      addBot(`${foundMsg} — map updated:<ul>${preview}</ul>${more}`);
      return;
    }

    // subject detected but no specific intent — suggest
    if (filtered !== arts && filtered.length > 0) {
      addBot(`Found <strong>${filtered.length}</strong> ${desc}. Try:<ul>` +
        `<li><em>Show me ${desc}</em></li>` +
        `<li><em>Latest ${species || catAlias || ''} article</em></li>` +
        `</ul>`);
      return;
    }

    // fallback
    addBot(`<strong>${arts.length}</strong> documented mining protests (2018–Present). Try asking: <em>Which state has the most protests?</em>, <em>Hasdeo Arand</em>, or <em>Coal protests</em>.`);
  }

  function send() {
    const v = inp.value.trim();
    if (!v) return;
    inp.value = '';
    respond(v);
  }

  sendBtn.addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
}());
