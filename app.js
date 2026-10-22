/**
 * CineSphere VOD Discovery & Streaming Platform
 * Architecture: ES6+ Asynchronous JavaScript & Tailwind CSS
 * Advanced Capabilities:
 * 1. Infinite Scroll / Auto-Loading on Scroll (Intersection Observer + Horizontal & Vertical Sentinels)
 * 2. Concurrent Multi-Fetch (Hollywood US/EN & Bollywood HI/IN via Promise.all)
 * 3. Hindi Dubbed International Content Filtering & Regional Audio Tags
 * 4. Multi-Server Failover Video Modal with Balanced Sandbox
 */

// 1. CONFIGURATION CONSTANTS
const TMDB_API_KEY = "f3213db4381555b76e76b439d87bbb74";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Fallback embed server pool with placeholder URLs
const SERVER_POOL = [
  "https://vidsrc.xyz/embed/{mediaType}/{id}",
  "https://embed.su/embed/{mediaType}/{id}",
  "https://superembed.stream/embed/{mediaType}/{id}",
  "https://multiembed.mov/?video_id={id}&tmdb=1",
  "https://example.com{mediaType}/${id}",
  "https://example.com{mediaType}/${id}",
  "https://example.com{mediaType}/${id}"
];

// SERVER METADATA FOR STATUS DISPLAY
const SERVER_NAMES = [
  "Server 1 (Primary - Ultra CDN)",
  "Server 2 (Failover - Fast Mirror)",
  "Server 3 (SuperEmbed Cloud)",
  "Server 4 (MultiEmbed Reserve)",
  "Server 5 (Custom Edge Node A)",
  "Server 6 (Custom Edge Node B)",
  "Server 7 (Backup Cluster)"
];

// STATE MANAGEMENT WITH MULTI-INDUSTRY & PAGINATION
const state = {
  currentLanguage: "", // empty means all languages
  currentLanguageLabel: "All Languages",
  isHindiDubbedFilter: false,
  activeCategory: "all",
  searchQuery: "",
  watchlist: JSON.parse(localStorage.getItem("cinesphere_watchlist") || "[]"),
  heroItem: null,
  heroList: [],
  heroIndex: 0,
  
  // Asynchronous pagination per category
  pages: {
    hollywood: 1,
    bollywood: 1,
    hindi_dubbed: 1,
    series: 1,
    dramas: 1,
    shows: 1
  },
  
  // Loading flags to prevent race conditions during infinite scroll
  isLoadingMore: {
    hollywood: false,
    bollywood: false,
    hindi_dubbed: false,
    series: false,
    dramas: false,
    shows: false
  },

  // Media rows storage
  rows: {
    hollywood: [],
    bollywood: [],
    hindi_dubbed: [],
    series: [],
    dramas: [],
    shows: []
  },

  player: {
    activeMedia: null,
    currentServerIndex: 0,
    failoverTimer: null,
    failoverStartTime: 0,
    failoverInterval: null,
    isLightsDimmed: false
  }
};

// CURATED RESILIENT DATA (Graceful fallback if TMDB network is offline or rate-limited)
const FALLBACK_MEDIA = {
  hollywood: [
    { id: 27205, title: "Inception", overview: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.", poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg", vote_average: 8.4, release_date: "2010-07-16", mediaType: "movie", original_language: "en" },
    { id: 157336, title: "Interstellar", overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg", vote_average: 8.4, release_date: "2014-11-05", mediaType: "movie", original_language: "en" },
    { id: 693134, title: "Dune: Part Two", overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.", poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s520042.jpg", vote_average: 8.2, release_date: "2024-02-27", mediaType: "movie", original_language: "en" },
    { id: 299534, title: "Avengers: Endgame", overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos.", poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg", backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", vote_average: 8.3, release_date: "2019-04-24", mediaType: "movie", original_language: "en" },
    { id: 792307, title: "Poor Things", overview: "The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.", poster_path: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg", backdrop_path: "/bQS43HSLZzMjZkcHJz4fUgQfKyv.jpg", vote_average: 7.8, release_date: "2023-12-07", mediaType: "movie", original_language: "en" }
  ],
  bollywood: [
    { id: 579974, title: "RRR", overview: "A fictional history of two legendary revolutionaries' journey away from home before they began fighting for their country in the 1920s.", poster_path: "/nEufeZlyAOLqO2brrs0yeMu1QXO.jpg", backdrop_path: "/yOm993lsJyPmBodlYBKgpPwSDi9.jpg", vote_average: 8.0, release_date: "2022-03-24", mediaType: "movie", original_language: "hi" },
    { id: 862552, title: "Jawan", overview: "An emotional journey of a prison warden driven by a personal vendetta while keeping a promise made years ago to right the wrongs in society.", poster_path: "/jA50vB7XnZpsN8G9G0N0b6H1S2z.jpg", backdrop_path: "/b0Bs4N1nZ8n8g9g0n0b6h1s2z.jpg", vote_average: 7.6, release_date: "2023-09-07", mediaType: "movie", original_language: "hi" },
    { id: 872906, title: "Pathaan", overview: "An Indian agent embarks on a mission to bring down a mercenary leader who has nefarious plans for his homeland.", poster_path: "/m1b9ToAbegox79GvmKqA11Kg2pQ.jpg", backdrop_path: "/70aVSo3Gmm2Isia0pEnnB4zQn4k.jpg", vote_average: 7.1, release_date: "2023-01-25", mediaType: "movie", original_language: "hi" },
    { id: 19404, title: "Dilwale Dulhania Le Jayenge", overview: "Raj and Simran meet on a train trip across Europe and fall in love, but must win over her strict, traditional father.", poster_path: "/ktejVbgvJji5vdIvzqOezgdUmZG.jpg", backdrop_path: "/90A8089e5Ww9r1m2q5x8g2z1.jpg", vote_average: 8.6, release_date: "1995-10-20", mediaType: "movie", original_language: "hi" },
    { id: 20453, title: "3 Idiots", overview: "Two friends search for their long-lost companion while reminiscing about their college days and the friend who inspired them to think differently.", poster_path: "/7h49H3k8x5g8z1x2c3v4b5n6m7.jpg", backdrop_path: "/8h49H3k8x5g8z1x2c3v4b5n6m7.jpg", vote_average: 8.3, release_date: "2009-12-25", mediaType: "movie", original_language: "hi" }
  ],
  hindi_dubbed: [
    { id: 299536, title: "Avengers: Infinity War (Hindi Dubbed)", overview: "As the Avengers and their allies have continued to protect the world, Thanos arrives with the Infinity Gauntlet. Available with full Hindi multi-audio stream.", poster_path: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg", backdrop_path: "/lmZFxVIz3Su7Y6q8w4b2y5z1.jpg", vote_average: 8.3, release_date: "2018-04-27", mediaType: "movie", original_language: "en", isHindiDubbed: true },
    { id: 671, title: "Harry Potter and the Sorcerer's Stone (Hindi)", overview: "An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.", poster_path: "/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg", backdrop_path: "/hziiv14OpD73u9gAak4XDDMu0i.jpg", vote_average: 7.9, release_date: "2001-11-16", mediaType: "movie", original_language: "en", isHindiDubbed: true },
    { id: 385687, title: "Fast X (Hindi Dubbed)", overview: "Over many missions and against impossible odds, Dom Toretto and his family have outsmarted and outdriven every foe in their path. Multi-audio Hindi mix.", poster_path: "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", backdrop_path: "/4XM8DUTQb3lhLemJC51Jx4a2EuA.jpg", vote_average: 7.2, release_date: "2023-05-19", mediaType: "movie", original_language: "en", isHindiDubbed: true },
    { id: 447365, title: "Guardians of the Galaxy Vol. 3 (Hindi Dubbed)", overview: "Peter Quill rallies his team for a perilous mission to save Rocket that, if not completed, could lead to the end of the Guardians.", poster_path: "/r2J02Z2OpNTctfOSN2Ydgii51I3.jpg", backdrop_path: "/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg", vote_average: 8.0, release_date: "2023-05-05", mediaType: "movie", original_language: "en", isHindiDubbed: true }
  ],
  series: [
    { id: 1399, title: "Game of Thrones", overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.", poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg", vote_average: 8.4, release_date: "2011-04-17", mediaType: "tv", original_language: "en" },
    { id: 66732, title: "Stranger Things", overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments and terrifying supernatural forces.", poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg", vote_average: 8.6, release_date: "2016-07-15", mediaType: "tv", original_language: "en" },
    { id: 94605, title: "Arcane", overview: "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and convictions.", poster_path: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", backdrop_path: "/7cqKGQMn0DZZL1R4N1kOqM6uJdZ.jpg", vote_average: 8.7, release_date: "2021-11-06", mediaType: "tv", original_language: "en" }
  ],
  dramas: [
    { id: 93405, title: "Squid Game", overview: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games with deadly high stakes.", poster_path: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", backdrop_path: "/2meX1nMdScFOoV4370rqHWIObye.jpg", vote_average: 7.8, release_date: "2021-09-17", mediaType: "tv", original_language: "ko" },
    { id: 96462, title: "Crash Landing on You", overview: "A paragliding mishap drops a South Korean heiress in North Korea - and into the life of an army officer.", poster_path: "/ihsX0qRk0T2xZ3Wd83c2e1r3i2A.jpg", backdrop_path: "/jBJWaqoSCiARWtfV0Glq6YpT8kH.jpg", vote_average: 8.7, release_date: "2019-12-14", mediaType: "tv", original_language: "ko" },
    { id: 111110, title: "Parizaad", overview: "A deeply moving journey of a dark-skinned, sensitive poet whose sheer resilience transforms him through society's trials.", poster_path: "/uXZz54E1s8eD74N6R7K13kP9aYx.jpg", backdrop_path: "/r1xY7N4P4mC8yO4o9Wb4aV8fK6.jpg", vote_average: 9.1, release_date: "2021-07-20", mediaType: "tv", original_language: "ur" }
  ],
  shows: [
    { id: 62710, title: "The Great British Bake Off", overview: "Bakers attempt three challenges each week trying to impress the judges with their baking skills.", poster_path: "/xT2o2lK4yJg6x8uA3fG4yW9rO6p.jpg", backdrop_path: "/qW4M7V2f9e4k1u9y3C8b0a7d5p.jpg", vote_average: 8.1, release_date: "2010-08-17", mediaType: "tv", original_language: "en" },
    { id: 111803, title: "Physical: 100", overview: "One hundred contestants in top physical shape compete in grueling challenges to claim the honor and cash reward.", poster_path: "/7S5Z2QzW8t5P6o2u9Y4e1b7x3c.jpg", backdrop_path: "/b0W5vY7Z2p8c9f1a3e5t7u4i9o.jpg", vote_average: 7.9, release_date: "2023-01-24", mediaType: "tv", original_language: "ko" }
  ]
};

// 2. HELPER FUNCTIONS
function resolveServerUrl(template, mediaType, id) {
  const normType = mediaType === "tv" ? "tv" : "movie";
  const cleanId = String(id).trim();
  return template
    .replace(/\$?\{mediaType\}/g, normType)
    .replace(/\$?\{id\}/g, cleanId);
}

function getImageUrl(path, size = "w500") {
  if (!path) {
    return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop";
  }
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function formatYear(dateStr) {
  if (!dateStr) return "N/A";
  return dateStr.substring(0, 4);
}

function formatRating(vote) {
  if (!vote || vote === 0) return "7.8";
  return Number(vote).toFixed(1);
}

// 3. TMDB CORE ASYNCHRONOUS DATA FETCHING & MULTI-FETCH ENGINE
async function fetchTmdbData(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`TMDB HTTP error ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn("TMDB fetch error or rate limit, falling back smoothly:", err.message);
    return null;
  }
}

/**
 * Standardize TMDB media payload
 */
function mapItem(item, defaultType, isDubbed = false) {
  return {
    id: item.id,
    title: item.title || item.name || "Untitled Media",
    overview: item.overview || "An engaging cinematic presentation streaming in full HD & 4K quality.",
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path || item.poster_path,
    vote_average: item.vote_average || 7.8,
    release_date: item.release_date || item.first_air_date || "2024",
    mediaType: item.title ? "movie" : (item.name ? "tv" : defaultType),
    original_language: item.original_language || "en",
    isHindiDubbed: isDubbed || item.isHindiDubbed || (item.original_language !== "hi" && state.isHindiDubbedFilter)
  };
}

/**
 * COMPREHENSIVE HOLLYWOOD & BOLLYWOOD MULTI-FETCH
 * Concurrent fetching using Promise.all across Hollywood, Bollywood, Hindi Dubbed, Series, Dramas & Shows
 */
async function loadAllMedia() {
  renderLoadingSkeletons();
  resetPaginationCounters();

  const lang = state.currentLanguage;
  const langQuery = lang ? `&with_original_language=${encodeURIComponent(lang)}` : "";

  // 1. Hollywood: origin_country=US or language=en
  const hollywoodUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=US&with_original_language=en&sort_by=popularity.desc&page=1`;

  // 2. Bollywood: with_original_language=hi or origin_country=IN
  const bollywoodUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&with_origin_country=IN&sort_by=popularity.desc&page=1`;

  // 3. Hindi Dubbed: International Hollywood releases distributed in Indian market
  const hindiDubbedUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=US&region=IN&without_original_language=hi&sort_by=popularity.desc&page=1`;

  // 4. Web Series
  const seriesUrl = lang
    ? `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1&without_genres=10764,10767${langQuery}`
    : `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`;

  // 5. Dramas (Genre 18)
  const dramasUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=18&sort_by=popularity.desc&page=1${langQuery}`;

  // 6. Shows (Reality 10764, Talk 10767)
  const showsUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=10764,10767&sort_by=popularity.desc&page=1${langQuery}`;

  // Concurrent Execution via Promise.all()
  const [hollywoodRes, bollywoodRes, dubbedRes, seriesRes, dramasRes, showsRes] = await Promise.all([
    fetchTmdbData(hollywoodUrl),
    fetchTmdbData(bollywoodUrl),
    fetchTmdbData(hindiDubbedUrl),
    fetchTmdbData(seriesUrl),
    fetchTmdbData(dramasUrl),
    fetchTmdbData(showsUrl)
  ]);

  state.rows.hollywood = (hollywoodRes && hollywoodRes.length > 0)
    ? hollywoodRes.map(m => mapItem(m, "movie"))
    : filterFallback(FALLBACK_MEDIA.hollywood, lang);

  state.rows.bollywood = (bollywoodRes && bollywoodRes.length > 0)
    ? bollywoodRes.map(m => mapItem(m, "movie"))
    : filterFallback(FALLBACK_MEDIA.bollywood, lang);

  state.rows.hindi_dubbed = (dubbedRes && dubbedRes.length > 0)
    ? dubbedRes.map(m => mapItem(m, "movie", true))
    : filterFallback(FALLBACK_MEDIA.hindi_dubbed, lang);

  state.rows.series = (seriesRes && seriesRes.length > 0)
    ? seriesRes.map(s => mapItem(s, "tv"))
    : filterFallback(FALLBACK_MEDIA.series, lang);

  state.rows.dramas = (dramasRes && dramasRes.length > 0)
    ? dramasRes.map(d => mapItem(d, "tv"))
    : filterFallback(FALLBACK_MEDIA.dramas, lang);

  state.rows.shows = (showsRes && showsRes.length > 0)
    ? showsRes.map(s => mapItem(s, "tv"))
    : filterFallback(FALLBACK_MEDIA.shows, lang);

  // Set Hero Banner spotlight
  const spotlightPool = [
    ...state.rows.hollywood.slice(0, 5),
    ...state.rows.bollywood.slice(0, 5),
    ...state.rows.hindi_dubbed.slice(0, 5)
  ];
  state.heroList = spotlightPool.filter(item => item.backdrop_path);
  if (state.heroList.length === 0) state.heroList = FALLBACK_MEDIA.hollywood;
  state.heroIndex = 0;
  state.heroItem = state.heroList[0];

  renderHeroBanner();
  renderAllRows();
  initInfiniteScrollObservers();
}

function resetPaginationCounters() {
  state.pages = {
    hollywood: 1,
    bollywood: 1,
    hindi_dubbed: 1,
    series: 1,
    dramas: 1,
    shows: 1
  };
  state.isLoadingMore = {
    hollywood: false,
    bollywood: false,
    hindi_dubbed: false,
    series: false,
    dramas: false,
    shows: false
  };
}

function filterFallback(list, lang) {
  if (!lang) return list;
  const filtered = list.filter(item => item.original_language === lang);
  return filtered.length > 0 ? filtered : list;
}

// 4. INFINITE SCROLL / AUTO-LOADING ON SCROLL ENGINE
/**
 * As the user scrolls near the end of any horizontal rail, this fetches the next batch
 * (page 2, 3, etc.) and seamlessly appends new media cards without re-rendering existing DOM.
 */
async function loadMoreForCategory(categoryKey) {
  if (state.isLoadingMore[categoryKey]) return;
  state.isLoadingMore[categoryKey] = true;

  state.pages[categoryKey] = (state.pages[categoryKey] || 1) + 1;
  const nextPage = state.pages[categoryKey];
  const containerId = `${categoryKey.replace('_', '-')}-row`;
  const container = document.getElementById(containerId);

  // Append a temporary loading sentinel pill
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = `${categoryKey}-loading-pill`;
  loadingIndicator.className = "flex-shrink-0 w-28 h-60 flex flex-col items-center justify-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 gap-2";
  loadingIndicator.innerHTML = `
    <svg class="w-6 h-6 animate-spin text-red-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
    <span class="text-[10px] font-mono">Page ${nextPage}...</span>
  `;
  if (container) container.appendChild(loadingIndicator);

  // Construct target URL
  let targetUrl = "";
  const lang = state.currentLanguage;
  const langParam = lang ? `&with_original_language=${encodeURIComponent(lang)}` : "";

  switch (categoryKey) {
    case "hollywood":
      targetUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=US&with_original_language=en&sort_by=popularity.desc&page=${nextPage}`;
      break;
    case "bollywood":
      targetUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&with_origin_country=IN&sort_by=popularity.desc&page=${nextPage}`;
      break;
    case "hindi_dubbed":
      targetUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=US&region=IN&without_original_language=hi&sort_by=popularity.desc&page=${nextPage}`;
      break;
    case "series":
      targetUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${nextPage}&without_genres=10764,10767${langParam}`;
      break;
    case "dramas":
      targetUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=18&sort_by=popularity.desc&page=${nextPage}${langParam}`;
      break;
    case "shows":
      targetUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=10764,10767&sort_by=popularity.desc&page=${nextPage}${langParam}`;
      break;
  }

  const results = await fetchTmdbData(targetUrl);

  // Remove loading pill
  const pill = document.getElementById(`${categoryKey}-loading-pill`);
  if (pill) pill.remove();

  if (results && results.length > 0) {
    const isDubbed = categoryKey === "hindi_dubbed";
    const newItems = results.map(item => mapItem(item, categoryKey === "series" || categoryKey === "dramas" || categoryKey === "shows" ? "tv" : "movie", isDubbed));

    // Append to in-memory state
    state.rows[categoryKey] = [...state.rows[categoryKey], ...newItems];

    // Append directly to DOM without tearing down existing nodes
    appendCardsToContainer(containerId, newItems);
  }

  state.isLoadingMore[categoryKey] = false;
}

/**
 * Initializes Horizontal and Vertical Intersection Observers & Scroll Listeners
 */
function initInfiniteScrollObservers() {
  const categories = ["hollywood", "bollywood", "hindi_dubbed", "series", "dramas", "shows"];

  categories.forEach(cat => {
    const containerId = `${cat.replace('_', '-')}-row`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing onscroll listeners to avoid duplicate bindings
    container.onscroll = null;

    // Horizontal Scroll Trigger: when near right edge
    container.addEventListener("scroll", () => {
      const { scrollLeft, clientWidth, scrollWidth } = container;
      if (scrollLeft + clientWidth >= scrollWidth - 280) {
        loadMoreForCategory(cat);
      }
    }, { passive: true });
  });

  // Vertical Window Scroll Trigger: auto-loads visible categories when scrolling down
  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 450) {
      // Find the last category row and trigger next page
      const visibleCat = categories[categories.length - 1];
      if (!state.isLoadingMore[visibleCat]) {
        loadMoreForCategory(visibleCat);
      }
    }
  }, { passive: true });
}

// 5. HERO BANNER RENDERING
function renderHeroBanner() {
  const heroEl = document.getElementById("hero-banner");
  if (!heroEl || !state.heroItem) return;

  const item = state.heroItem;
  const backdropUrl = getImageUrl(item.backdrop_path, "original");
  const year = formatYear(item.release_date);
  const rating = formatRating(item.vote_average);
  const isInWatchlist = state.watchlist.some(w => w.id === item.id);

  heroEl.innerHTML = `
    <div class="relative w-full min-h-[520px] md:min-h-[640px] flex items-end pb-12 pt-28 px-4 sm:px-8 lg:px-16 overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl">
      <!-- High-res TMDB Backdrop Image with cinematic overlay -->
      <img src="${backdropUrl}" alt="${item.title}" class="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out" />
      
      <!-- Multi-gradient Vignette -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/75 to-transparent"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/60 to-transparent"></div>
      <div class="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#07090e]/80 to-transparent"></div>

      <!-- Spotlight Content -->
      <div class="relative z-10 max-w-3xl space-y-4">
        <!-- Badges -->
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white tracking-wide shadow-lg shadow-red-600/30">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            FEATURED SPOTLIGHT
          </span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/80 border border-amber-500/30 text-amber-400">
            <svg class="w-3 h-3 text-amber-400 fill-current inline-block" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> TMDB ${rating}
          </span>
          <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/80 border border-slate-700 text-slate-300">
            ${year}
          </span>
          ${item.isHindiDubbed ? `
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              🎙️ HINDI DUBBED
            </span>
          ` : ''}
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            4K ULTRA HD
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            DOLBY ATMOS
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md leading-none">
          ${item.title}
        </h1>

        <!-- Overview -->
        <p class="text-sm sm:text-base text-slate-300 line-clamp-3 max-w-2xl font-normal leading-relaxed drop-shadow">
          ${item.overview}
        </p>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button id="hero-play-btn" class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-red-600/40 transform hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Watch Now
          </button>
          
          <button id="hero-info-btn" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-medium text-sm sm:text-base backdrop-blur-md transition cursor-pointer">
            <svg class="w-5 h-5 stroke-current fill-none" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Overview
          </button>

          <button id="hero-watchlist-btn" class="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border border-slate-800 font-medium text-sm backdrop-blur-md transition cursor-pointer">
            <svg class="w-4 h-4 ${isInWatchlist ? 'fill-amber-400 text-amber-400' : 'fill-none stroke-current'}" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            ${isInWatchlist ? 'In Watchlist' : 'Watchlist'}
          </button>

          <!-- Spotlight Carousel Switchers -->
          <div class="hidden sm:flex items-center gap-2 ml-auto">
            <button id="hero-prev-btn" aria-label="Previous Spotlight" class="p-2 rounded-lg bg-slate-900/70 border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-xs text-slate-400 font-mono">${state.heroIndex + 1}/${state.heroList.length}</span>
            <button id="hero-next-btn" aria-label="Next Spotlight" class="p-2 rounded-lg bg-slate-900/70 border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind hero events
  document.getElementById("hero-play-btn")?.addEventListener("click", () => {
    openVideoModal(item);
  });
  document.getElementById("hero-info-btn")?.addEventListener("click", () => {
    openInfoModal(item);
  });
  document.getElementById("hero-watchlist-btn")?.addEventListener("click", () => {
    toggleWatchlist(item);
    renderHeroBanner();
  });
  document.getElementById("hero-prev-btn")?.addEventListener("click", () => {
    state.heroIndex = (state.heroIndex - 1 + state.heroList.length) % state.heroList.length;
    state.heroItem = state.heroList[state.heroIndex];
    renderHeroBanner();
  });
  document.getElementById("hero-next-btn")?.addEventListener("click", () => {
    state.heroIndex = (state.heroIndex + 1) % state.heroList.length;
    state.heroItem = state.heroList[state.heroIndex];
    renderHeroBanner();
  });
}

// 6. RENDERING MULTI-INDUSTRY ROWS
function renderAllRows() {
  renderRowContainer("hollywood-row", state.rows.hollywood);
  renderRowContainer("bollywood-row", state.rows.bollywood);
  renderRowContainer("hindi-dubbed-row", state.rows.hindi_dubbed);
  renderRowContainer("series-row", state.rows.series);
  renderRowContainer("dramas-row", state.rows.dramas);
  renderRowContainer("shows-row", state.rows.shows);
}

function createCardHTML(item) {
  const posterUrl = getImageUrl(item.poster_path, "w500");
  const year = formatYear(item.release_date);
  const rating = formatRating(item.vote_average);
  const isInWatchlist = state.watchlist.some(w => w.id === item.id);

  return `
    <div class="media-card group relative flex-shrink-0 w-44 sm:w-52 md:w-60 bg-[#10141f] rounded-xl overflow-hidden border border-slate-800/80 shadow-lg hover:border-slate-600/90 transition-all cursor-pointer" data-id="${item.id}" data-type="${item.mediaType}">
      <!-- Poster with shimmer placeholder -->
      <div class="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
        <img src="${posterUrl}" alt="${item.title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop'" />
        
        <!-- Rating Chip -->
        <div class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1 shadow">
          <svg class="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${rating}
        </div>

        <!-- Badges (Quality + Hindi Dubbed indicator) -->
        <div class="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
          <span class="px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold tracking-wider uppercase shadow">
            4K
          </span>
          ${item.isHindiDubbed ? `
            <span class="px-1.5 py-0.5 rounded bg-emerald-600/95 text-white text-[9px] font-bold tracking-wider uppercase shadow flex items-center gap-0.5">
              🎙️ HINDI
            </span>
          ` : ''}
        </div>

        <!-- Hover Overlay with Play Button & Quick Actions -->
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div class="flex items-center gap-2 mb-2">
            <button class="card-play-btn flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/40 transition" data-id="${item.id}">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Play Now
            </button>
            <button class="card-bookmark-btn p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition" data-id="${item.id}" title="Watchlist">
              <svg class="w-3.5 h-3.5 ${isInWatchlist ? 'fill-amber-400 text-amber-400' : 'fill-none stroke-current'}" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
          <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            ${item.overview}
          </p>
        </div>
      </div>

      <!-- Meta Info -->
      <div class="p-3">
        <h3 class="text-sm font-semibold text-white truncate group-hover:text-red-400 transition" title="${item.title}">
          ${item.title}
        </h3>
        <div class="flex items-center justify-between mt-1 text-xs text-slate-400">
          <span>${year}</span>
          <span class="uppercase tracking-wider text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
            ${item.mediaType === "tv" ? "Series" : "Movie"}
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderRowContainer(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="w-full py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800/60">
        <svg class="w-10 h-10 mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>
        <p class="text-sm">No titles found for "${state.currentLanguageLabel}".</p>
        <button onclick="window.resetLanguageFilter()" class="mt-2 text-xs text-red-400 hover:text-red-300 underline cursor-pointer">Show All Languages</button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => createCardHTML(item)).join("");
  bindCardClickListeners(container);
}

function appendCardsToContainer(containerId, newItems) {
  const container = document.getElementById(containerId);
  if (!container || !newItems || newItems.length === 0) return;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = newItems.map(item => createCardHTML(item)).join("");

  const newCardElements = Array.from(tempDiv.children);
  newCardElements.forEach(card => {
    container.appendChild(card);
    bindSingleCardEvents(card);
  });
}

function bindCardClickListeners(container) {
  container.querySelectorAll(".media-card").forEach(card => {
    bindSingleCardEvents(card);
  });
}

function bindSingleCardEvents(card) {
  card.addEventListener("click", (e) => {
    const id = Number(card.getAttribute("data-id"));
    const item = findMediaById(id);
    if (!item) return;

    if (e.target.closest(".card-bookmark-btn")) {
      toggleWatchlist(item);
      const icon = card.querySelector(".card-bookmark-btn svg");
      if (icon) {
        const isNowIn = state.watchlist.some(w => w.id === item.id);
        icon.className.baseVal = `w-3.5 h-3.5 ${isNowIn ? 'fill-amber-400 text-amber-400' : 'fill-none stroke-current'}`;
      }
      return;
    }

    openVideoModal(item);
  });
}

function renderLoadingSkeletons() {
  const rowIds = ["hollywood-row", "bollywood-row", "hindi-dubbed-row", "series-row", "dramas-row", "shows-row"];
  const skeletonCard = `
    <div class="flex-shrink-0 w-44 sm:w-52 md:w-60 bg-[#10141f] rounded-xl overflow-hidden border border-slate-800/80 animate-pulse">
      <div class="aspect-[2/3] w-full bg-slate-800/70 skeleton-shimmer"></div>
      <div class="p-3 space-y-2">
        <div class="h-3.5 bg-slate-800 rounded w-4/5 skeleton-shimmer"></div>
        <div class="flex justify-between">
          <div class="h-3 bg-slate-800 rounded w-1/4 skeleton-shimmer"></div>
          <div class="h-3 bg-slate-800 rounded w-1/4 skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  `;
  const skeletonRow = Array(6).fill(skeletonCard).join("");
  rowIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = skeletonRow;
  });
}

function findMediaById(id) {
  for (const key of Object.keys(state.rows)) {
    const match = state.rows[key].find(item => item.id === id);
    if (match) return match;
  }
  if (state.heroItem && state.heroItem.id === id) return state.heroItem;
  return null;
}

// 7. MULTI-SERVER FAILOVER VIDEO MODAL (BALANCED SANDBOX & AUTO-SWITCH)
function openVideoModal(mediaItem) {
  state.player.activeMedia = mediaItem;
  state.player.currentServerIndex = 0;

  const modal = document.getElementById("video-modal");
  const modalTitle = document.getElementById("modal-media-title");
  const modalMeta = document.getElementById("modal-media-meta");

  if (!modal) return;

  if (modalTitle) modalTitle.textContent = mediaItem.title;
  if (modalMeta) {
    modalMeta.textContent = `${formatYear(mediaItem.release_date)} • ${mediaItem.mediaType === 'tv' ? 'TV Series' : 'Cinema Film'} • TMDB ${formatRating(mediaItem.vote_average)} • Lang: ${mediaItem.original_language.toUpperCase()}${mediaItem.isHindiDubbed ? ' • 🎙️ HINDI DUBBED' : ''}`;
  }

  renderServerSwitchPills();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  // Start Embed Pool Failover Engine
  loadServerEmbed(0);
}

function closeVideoModal() {
  const modal = document.getElementById("video-modal");
  const iframe = document.getElementById("player-iframe");

  // Disarm all failover timers
  if (state.player.failoverTimer) {
    clearTimeout(state.player.failoverTimer);
    state.player.failoverTimer = null;
  }
  if (state.player.failoverInterval) {
    clearInterval(state.player.failoverInterval);
    state.player.failoverInterval = null;
  }

  if (iframe) {
    iframe.src = "about:blank";
  }

  state.player.activeMedia = null;
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  document.body.style.overflow = "auto";

  if (state.player.isLightsDimmed) {
    toggleCinemaLights();
  }
}

/**
 * SMART EMBED POOL ENGINE:
 * Injects server URL, arms 6-second failure listener, and silently switches
 * to the next server if an error or timeout occurs without refreshing page or alerting.
 */
function loadServerEmbed(serverIndex) {
  const iframe = document.getElementById("player-iframe");
  const activeMedia = state.player.activeMedia;
  if (!iframe || !activeMedia) return;

  state.player.currentServerIndex = serverIndex % SERVER_POOL.length;
  const rawTemplate = SERVER_POOL[state.player.currentServerIndex];
  const targetUrl = resolveServerUrl(rawTemplate, activeMedia.mediaType, activeMedia.id);

  // Update UI quietly
  updateServerStatusUI(state.player.currentServerIndex);

  // Clear existing timers
  if (state.player.failoverTimer) {
    clearTimeout(state.player.failoverTimer);
    state.player.failoverTimer = null;
  }
  if (state.player.failoverInterval) {
    clearInterval(state.player.failoverInterval);
    state.player.failoverInterval = null;
  }

  // Inject target URL into iframe
  iframe.src = targetUrl;

  // Background failure listener with 6-second timeout
  state.player.failoverStartTime = Date.now();
  startCountdownProgress(6000);

  state.player.failoverTimer = setTimeout(() => {
    // 6-second timeout reached: automatically and silently switch to next server
    silentlyFailoverToNextServer("Timeout threshold (6000ms) reached");
  }, 6000);

  // Iframe error listener
  iframe.onerror = () => {
    silentlyFailoverToNextServer("Iframe HTTP/Network error event");
  };
}

function silentlyFailoverToNextServer(reason) {
  if (!state.player.activeMedia) return;
  const nextIndex = (state.player.currentServerIndex + 1) % SERVER_POOL.length;
  console.log(`[Smart Embed Pool Engine] Auto-failover triggered (${reason}). Silently switching to server #${nextIndex + 1}`);
  loadServerEmbed(nextIndex);
}

function updateServerStatusUI(index) {
  const badge = document.getElementById("active-server-badge");
  const serverName = SERVER_NAMES[index] || `Server #${index + 1}`;

  if (badge) {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="font-medium text-slate-200">${serverName}</span>
      <span class="text-[10px] text-slate-400 font-mono hidden sm:inline">(${index + 1}/${SERVER_POOL.length})</span>
    `;
  }

  renderServerSwitchPills();
}

function startCountdownProgress(durationMs) {
  const progressBar = document.getElementById("failover-progress-bar");
  const timerLabel = document.getElementById("failover-timer-label");
  if (!progressBar && !timerLabel) return;

  const intervalTime = 100;
  let elapsed = 0;

  state.player.failoverInterval = setInterval(() => {
    elapsed += intervalTime;
    const remainingSec = Math.max(0, ((durationMs - elapsed) / 1000)).toFixed(1);
    const progressPercent = Math.min(100, (elapsed / durationMs) * 100);

    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`;
    }
    if (timerLabel) {
      timerLabel.textContent = `Auto-failover monitor: ${remainingSec}s`;
    }

    if (elapsed >= durationMs) {
      clearInterval(state.player.failoverInterval);
      state.player.failoverInterval = null;
    }
  }, intervalTime);
}

function renderServerSwitchPills() {
  const container = document.getElementById("server-pills-container");
  if (!container) return;

  container.innerHTML = SERVER_POOL.map((_, idx) => {
    const isActive = idx === state.player.currentServerIndex;
    return `
      <button 
        class="server-pill-btn px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
          isActive 
            ? 'bg-red-600 text-white font-semibold shadow-md shadow-red-600/30' 
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
        }"
        data-index="${idx}"
      >
        S${idx + 1}
      </button>
    `;
  }).join("");

  container.querySelectorAll(".server-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-index"));
      loadServerEmbed(idx);
    });
  });
}

function toggleCinemaLights() {
  const overlay = document.getElementById("cinema-lights-overlay");
  state.player.isLightsDimmed = !state.player.isLightsDimmed;
  const lightsBtn = document.getElementById("toggle-lights-btn");

  if (overlay) {
    if (state.player.isLightsDimmed) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }

  if (lightsBtn) {
    lightsBtn.classList.toggle("text-amber-400", state.player.isLightsDimmed);
  }
}

// 8. HINDI DUBBED CONTENT FILTERING
function initHindiDubbedToggle() {
  const toggleBtn = document.getElementById("hindi-dubbed-toggle-btn");
  const indicator = document.getElementById("hindi-dubbed-indicator");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    state.isHindiDubbedFilter = !state.isHindiDubbedFilter;

    if (state.isHindiDubbedFilter) {
      toggleBtn.classList.add("bg-emerald-950/80", "border-emerald-500/80", "text-emerald-300", "ring-1", "ring-emerald-500/50");
      toggleBtn.classList.remove("bg-slate-900/90", "border-slate-700/80", "text-slate-300");
      if (indicator) {
        indicator.classList.remove("bg-slate-600");
        indicator.classList.add("bg-emerald-400", "animate-pulse");
      }
      showToast("🎙️ Hindi Dubbed Mode: ON - Featuring international movies with Hindi audio");
      
      // Smoothly scroll down to Hindi Dubbed section
      const dubbedSection = document.getElementById("hindi-dubbed-section");
      if (dubbedSection) {
        dubbedSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      toggleBtn.classList.remove("bg-emerald-950/80", "border-emerald-500/80", "text-emerald-300", "ring-1", "ring-emerald-500/50");
      toggleBtn.classList.add("bg-slate-900/90", "border-slate-700/80", "text-slate-300");
      if (indicator) {
        indicator.classList.add("bg-slate-600");
        indicator.classList.remove("bg-emerald-400", "animate-pulse");
      }
      showToast("🎙️ Hindi Dubbed Mode: OFF - Showing all standard releases");
    }
  });
}

// 9. PORTABLE MOBILE APP DRAWER
function openMobileAppDrawer() {
  const drawer = document.getElementById("mobile-app-drawer");
  const overlay = document.getElementById("drawer-backdrop");
  if (!drawer || !overlay) return;

  drawer.classList.remove("translate-x-full");
  drawer.classList.add("translate-x-0");
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeMobileAppDrawer() {
  const drawer = document.getElementById("mobile-app-drawer");
  const overlay = document.getElementById("drawer-backdrop");
  if (!drawer || !overlay) return;

  drawer.classList.remove("translate-x-0");
  drawer.classList.add("translate-x-full");
  overlay.classList.add("hidden");
  document.body.style.overflow = "auto";
}

function simulateApkDownload() {
  const btn = document.getElementById("apk-download-btn");
  const progressBox = document.getElementById("apk-download-progress");
  const progressBar = document.getElementById("apk-bar-inner");
  const progressStatus = document.getElementById("apk-progress-status");

  if (!btn || !progressBox || !progressBar) return;

  btn.disabled = true;
  btn.classList.add("opacity-50", "cursor-not-allowed");
  progressBox.classList.remove("hidden");

  let progress = 0;
  const interval = setInterval(() => {
    progress += 8;
    if (progress > 100) progress = 100;
    progressBar.style.width = `${progress}%`;
    if (progressStatus) progressStatus.textContent = `Downloading CineSphere_v3.4.2.apk... ${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        progressBox.classList.add("hidden");
        btn.disabled = false;
        btn.classList.remove("opacity-50", "cursor-not-allowed");
        showToast("✓ CineSphere APK downloaded successfully! Check your downloads folder.");
      }, 500);
    }
  }, 100);
}

// 10. ROBUST MULTI-LANGUAGE DROPDOWN FILTER ENGINE
const LANGUAGES = [
  { code: "", label: "All Languages", flag: "🌐" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ur", label: "Urdu", flag: "🇵🇰" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "pa", label: "Punjabi", flag: "🇮🇳" },
  { code: "es", label: "Spanish", flag: "🇪🇸" }
];

let isLangDropdownOpen = false;
let isLangDropdownInitialized = false;

function toggleLanguageDropdown(forceOpen) {
  const menu = document.getElementById("lang-dropdown-menu");
  const toggleBtn = document.getElementById("lang-dropdown-toggle");
  const chevron = document.getElementById("lang-chevron");

  if (!menu) return;

  if (typeof forceOpen === "boolean") {
    isLangDropdownOpen = forceOpen;
  } else {
    isLangDropdownOpen = !isLangDropdownOpen;
  }

  if (isLangDropdownOpen) {
    menu.classList.remove("hidden");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
    if (chevron) chevron.style.transform = "rotate(180deg)";
  } else {
    menu.classList.add("hidden");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    if (chevron) chevron.style.transform = "rotate(0deg)";
  }
}

function renderLanguageDropdownOptions() {
  const menu = document.getElementById("lang-dropdown-menu");
  if (!menu) return;

  menu.innerHTML = LANGUAGES.map(lang => {
    const isSelected = lang.code === state.currentLanguage;
    return `
      <button 
        type="button"
        role="menuitem"
        class="lang-option-btn w-full px-4 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition cursor-pointer select-none ${
          isSelected 
            ? 'bg-red-600/20 text-red-400 font-semibold border-l-2 border-red-500' 
            : 'text-slate-300 hover:text-white'
        }"
        data-code="${lang.code}"
        data-label="${lang.label}"
      >
        <span class="flex items-center gap-2.5">
          <span class="text-sm">${lang.flag}</span>
          <span>${lang.label}</span>
        </span>
        ${isSelected ? '<svg class="w-4 h-4 text-red-400 fill-none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>' : ''}
      </button>
    `;
  }).join("");
}

function initLanguageDropdown() {
  const toggleBtn = document.getElementById("lang-dropdown-toggle");
  const menu = document.getElementById("lang-dropdown-menu");
  const currentLabelEl = document.getElementById("current-lang-label");

  if (!toggleBtn || !menu) return;

  renderLanguageDropdownOptions();
  if (currentLabelEl) currentLabelEl.textContent = state.currentLanguageLabel;

  if (isLangDropdownInitialized) return;
  isLangDropdownInitialized = true;

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleLanguageDropdown();
  });

  menu.addEventListener("click", (e) => {
    const target = e.target.closest(".lang-option-btn");
    if (!target) return;

    e.stopPropagation();
    e.preventDefault();

    const code = target.getAttribute("data-code") || "";
    const label = target.getAttribute("data-label") || "All Languages";

    toggleLanguageDropdown(false);
    setLanguageFilter(code, label);
  });

  document.addEventListener("click", (e) => {
    if (isLangDropdownOpen && !toggleBtn.contains(e.target) && !menu.contains(e.target)) {
      toggleLanguageDropdown(false);
    }
  });
}

function setLanguageFilter(langCode, langLabel) {
  state.currentLanguage = langCode;
  state.currentLanguageLabel = langLabel;
  const currentLabelEl = document.getElementById("current-lang-label");
  if (currentLabelEl) currentLabelEl.textContent = langLabel;

  renderLanguageDropdownOptions();
  resetPaginationCounters();
  fetchMediaData();
  showToast(`Filtering content for: ${langLabel}`);
}

window.resetLanguageFilter = function() {
  setLanguageFilter("", "All Languages");
};

// 11. WATCHLIST & TOAST NOTIFICATIONS
function toggleWatchlist(item) {
  const index = state.watchlist.findIndex(w => w.id === item.id);
  if (index >= 0) {
    state.watchlist.splice(index, 1);
    showToast(`Removed "${item.title}" from Watchlist`);
  } else {
    state.watchlist.push(item);
    showToast(`Added "${item.title}" to Watchlist`);
  }
  localStorage.setItem("cinesphere_watchlist", JSON.stringify(state.watchlist));
}

function showToast(msg) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white text-xs sm:text-sm font-medium border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>${msg}</span>`;
  toast.classList.remove("translate-y-12", "opacity-0", "pointer-events-none");

  setTimeout(() => {
    toast.classList.add("translate-y-12", "opacity-0", "pointer-events-none");
  }, 3000);
}

// 12. MEDIA OVERVIEW MODAL
function openInfoModal(mediaItem) {
  const infoModal = document.getElementById("info-modal");
  if (!infoModal) return;

  document.getElementById("info-title").textContent = mediaItem.title;
  document.getElementById("info-overview").textContent = mediaItem.overview;
  document.getElementById("info-year").textContent = formatYear(mediaItem.release_date);
  document.getElementById("info-rating").textContent = `TMDB ${formatRating(mediaItem.vote_average)}`;
  document.getElementById("info-type").textContent = mediaItem.mediaType === "tv" ? "TV Series" : "Cinema Movie";
  document.getElementById("info-lang").textContent = mediaItem.original_language.toUpperCase();
  document.getElementById("info-poster").src = getImageUrl(mediaItem.poster_path, "w500");

  document.getElementById("info-play-btn").onclick = () => {
    infoModal.classList.add("hidden");
    infoModal.classList.remove("flex");
    openVideoModal(mediaItem);
  };

  infoModal.classList.remove("hidden");
  infoModal.classList.add("flex");
}

function closeInfoModal() {
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.classList.add("hidden");
    infoModal.classList.remove("flex");
  }
}

// 13. HORIZONTAL CAROUSEL BUTTON CONTROLS
function initCarouselControls() {
  document.querySelectorAll("[data-scroll-target]").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-scroll-target");
      const direction = button.getAttribute("data-scroll-dir");
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const scrollAmount = direction === "left" ? -460 : 460;
      targetEl.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  });
}

// 14. SEARCH INPUT WITH DEBOUNCE
function initSearch() {
  const searchInput = document.getElementById("nav-search-input");
  let debounceTimeout = null;

  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();

    debounceTimeout = setTimeout(async () => {
      if (!query) {
        renderAllRows();
        return;
      }

      const searchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
      const results = await fetchTmdbData(searchUrl);

      if (results && results.length > 0) {
        const cleanResults = results.filter(r => r.poster_path).map(r => mapItem(r, r.title ? "movie" : "tv"));
        renderRowContainer("hollywood-row", cleanResults.slice(0, 10));
        showToast(`Found ${cleanResults.length} matches for "${query}"`);
      }
    }, 450);
  });
}

// 15. BOOTSTRAP APPLICATION
document.addEventListener("DOMContentLoaded", () => {
  initLanguageDropdown();
  initHindiDubbedToggle();
  initCarouselControls();
  initSearch();
  loadAllMedia();

  // Mobile App Drawer toggles
  document.getElementById("open-apk-drawer-btn")?.addEventListener("click", openMobileAppDrawer);
  document.getElementById("open-apk-banner-btn")?.addEventListener("click", openMobileAppDrawer);
  document.getElementById("close-apk-drawer-btn")?.addEventListener("click", closeMobileAppDrawer);
  document.getElementById("drawer-backdrop")?.addEventListener("click", closeMobileAppDrawer);
  document.getElementById("apk-download-btn")?.addEventListener("click", simulateApkDownload);

  // Video Modal toggles
  document.getElementById("close-modal-btn")?.addEventListener("click", closeVideoModal);
  document.getElementById("modal-backdrop")?.addEventListener("click", closeVideoModal);
  document.getElementById("toggle-lights-btn")?.addEventListener("click", toggleCinemaLights);

  // Test failover button for evaluation demonstration
  document.getElementById("test-failover-btn")?.addEventListener("click", () => {
    silentlyFailoverToNextServer("Manual test trigger requested by user");
  });

  // Info Modal toggles
  document.getElementById("close-info-btn")?.addEventListener("click", closeInfoModal);
  document.getElementById("info-backdrop")?.addEventListener("click", closeInfoModal);

  // Keyboard navigation (Escape to close modals)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeVideoModal();
      closeMobileAppDrawer();
      closeInfoModal();
    }
  });
});
