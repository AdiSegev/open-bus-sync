// ===============================
// Open Bus → Supabase Daily Sync (Simple Version)
// ===============================
// מחיקה יומית + טעינה מחדש
// ללא date, ללא deduplication

const { createClient } = require('@supabase/supabase-js');

// ===============================
// הגדרות
// ===============================

const CONFIG = {
  API_BASE: 'https://open-bus-stride-api.hasadna.org.il',
  API_BATCH_SIZE: 5000,
  BATCH_SIZE: 1000,
  DELAY_BETWEEN_BATCHES: 100,
  MAX_RIDES_SAMPLE: 10000
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ===============================
// פונקציות עזר
// ===============================

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}:`, error.message || error);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// ===============================
// טעינה מ-API
// ===============================

async function loadAllStopsFromAPI(date) {
  log('📥 טוען תחנות מ-Open Bus API...');
  
  const stops = [];
  let offset = 0;
  const MAX_RETRIES = 5;
  
  while (true) {
    let retries = 0;
    let batch = null;
    
    while (retries < MAX_RETRIES) {
      try {
        const url = new URL(`${CONFIG.API_BASE}/gtfs_stops/list`);
        url.searchParams.set('date_from', date);
        url.searchParams.set('date_to', date);
        url.searchParams.set('limit', CONFIG.API_BATCH_SIZE);
        url.searchParams.set('offset', offset);
        url.searchParams.set('get_count', 'false');
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        batch = await response.json();
        break;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(5000 * Math.pow(2, retries - 1), 30000);
        
        if (retries >= MAX_RETRIES) {
          logError(`שגיאה בטעינת תחנות אחרי ${MAX_RETRIES} ניסיונות`, error);
          log('⚠️  ממשיך לשלב הבא...');
          return stops;
        }
        
        log(`⚠️  ניסיון ${retries}/${MAX_RETRIES} נכשל, מחכה ${waitTime/1000}s...`);
        await sleep(waitTime);
      }
    }
    
    if (!batch || batch.length === 0) break;
    
    stops.push(...batch);
    log(`   נטענו ${stops.length.toLocaleString()} תחנות...`);
    
    if (batch.length < CONFIG.API_BATCH_SIZE) break;
    
    offset += CONFIG.API_BATCH_SIZE;
    await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
  }
  
  log(`✅ נטענו ${stops.length.toLocaleString()} תחנות`);
  return stops;
}

async function loadAllRoutesFromAPI(date) {
  log('📥 טוען קווים מ-Open Bus API...');
  
  const routes = [];
  let offset = 0;
  const MAX_RETRIES = 5;
  
  while (true) {
    let retries = 0;
    let batch = null;
    
    while (retries < MAX_RETRIES) {
      try {
        const url = new URL(`${CONFIG.API_BASE}/gtfs_routes/list`);
        url.searchParams.set('date_from', date);
        url.searchParams.set('date_to', date);
        url.searchParams.set('limit', CONFIG.API_BATCH_SIZE);
        url.searchParams.set('offset', offset);
        url.searchParams.set('get_count', 'false');
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        batch = await response.json();
        break;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(5000 * Math.pow(2, retries - 1), 30000);
        
        if (retries >= MAX_RETRIES) {
          logError(`שגיאה בטעינת קווים אחרי ${MAX_RETRIES} ניסיונות`, error);
          log('⚠️  ממשיך לשלב הבא...');
          return routes;
        }
        
        log(`⚠️  ניסיון ${retries}/${MAX_RETRIES} נכשל, מחכה ${waitTime/1000}s...`);
        await sleep(waitTime);
      }
    }
    
    if (!batch || batch.length === 0) break;
    
    routes.push(...batch);
    log(`   נטענו ${routes.length.toLocaleString()} קווים...`);
    
    if (batch.length < CONFIG.API_BATCH_SIZE) break;
    
    offset += CONFIG.API_BATCH_SIZE;
    await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
  }
  
  log(`✅ נטענו ${routes.length.toLocaleString()} קווים`);
  return routes;
}

// ===============================
// שמירה ב-Supabase
// ===============================

async function syncStopsToSupabase(stops) {
  log('💾 מסנכרן תחנות ל-Supabase...');
  
  const stopsData = stops.map(stop => ({
    id: stop.id,
    code: stop.code,
    name: stop.name,
    city: stop.city || 'לא ידוע',
    lat: stop.lat,
    lon: stop.lon
  }));
  
  let inserted = 0;
  for (let i = 0; i < stopsData.length; i += CONFIG.BATCH_SIZE) {
    const batch = stopsData.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('stops')
      .insert(batch);
    
    if (error) {
      logError(`שגיאה בהכנסת תחנות batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${stopsData.length.toLocaleString()} תחנות`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון ${stopsData.length.toLocaleString()} תחנות`);
}

async function syncRoutesToSupabase(routes) {
  log('💾 מסנכרן קווים ל-Supabase...');
  
  const routesData = routes.map(route => ({
    id: route.id,
    line_ref: route.line_ref,
    operator_ref: route.operator_ref,
    route_short_name: route.route_short_name,
    route_long_name: route.route_long_name,
    route_direction: route.route_direction,
    agency_name: route.agency_name,
    route_type: route.route_type
  }));
  
  let inserted = 0;
  for (let i = 0; i < routesData.length; i += CONFIG.BATCH_SIZE) {
    const batch = routesData.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('routes')
      .insert(batch);
    
    if (error) {
      logError(`שגיאה בהכנסת קווים batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}`, error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${routesData.length.toLocaleString()} קווים`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון ${routesData.length.toLocaleString()} קווים`);
}

// ===============================
// בניית city_relevant_stops
// ===============================

function isStopRelevantToCity(stop, city) {
  if (!stop.name || !city) return { relevant: false };
  
  const stopName = stop.name.trim();
  const cityName = city.trim();
  
  // התאמה מדויקת
  if (stop.city === city) {
    return {
      relevant: true,
      type: 'exact',
      confidence: 1.0
    };
  }
  
  // התאמה בשם התחנה
  if (stopName.includes(cityName)) {
    return {
      relevant: true,
      type: 'name_match',
      confidence: 0.8
    };
  }
  
  return { relevant: false };
}

async function buildCityRelevantStops() {
  log('🔨 בונה טבלת city_relevant_stops...');
  
  // טען תחנות מה-DB
  const { data: stops, error: loadError } = await supabase
    .from('stops')
    .select('id, name, city');
  
  if (loadError) {
    logError('שגיאה בטעינת תחנות', loadError);
    return;
  }
  
  if (!stops || stops.length === 0) {
    log('⚠️  אין תחנות');
    return;
  }
  
  log(`   נטענו ${stops.length.toLocaleString()} תחנות`);
  
  const cities = [...new Set(stops.map(s => s.city).filter(Boolean))];
  log(`   מצאתי ${cities.length} ערים`);
  
  const relations = [];
  
  for (const city of cities) {
    for (const stop of stops) {
      const relevance = isStopRelevantToCity(stop, city);
      
      if (relevance.relevant) {
        relations.push({
          city: city,
          stop_id: stop.id,
          relevance_type: relevance.type,
          confidence: relevance.confidence
        });
      }
    }
  }
  
  log(`✅ נוצרו ${relations.length.toLocaleString()} קשרים`);
  
  // שמור
  log('💾 שומר קשרים...');
  let inserted = 0;
  
  for (let i = 0; i < relations.length; i += CONFIG.BATCH_SIZE) {
    const batch = relations.slice(i, i + CONFIG.BATCH_SIZE);
    
    const { error } = await supabase
      .from('city_relevant_stops')
      .insert(batch);
    
    if (error) {
      logError('שגיאה בהכנסת קשרים', error);
      throw error;
    }
    
    inserted += batch.length;
    log(`   הוכנסו ${inserted.toLocaleString()} / ${relations.length.toLocaleString()}`);
    
    await sleep(50);
  }
  
  log(`✅ הושלם סנכרון city_relevant_stops`);
}

// ===============================
// סטטיסטיקות
// ===============================

async function showStats() {
  log('📊 סטטיסטיקות:');
  
  const tables = ['stops', 'routes', 'city_relevant_stops'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      log(`   ${table}: ${(count || 0).toLocaleString()}`);
    }
  }
}

// ===============================
// מחיקת טבלאות
// ===============================

async function truncateAllTables() {
  log('🗑️  מנקה טבלאות ישנות...');
  
  const tables = ['city_relevant_stops', 'stops', 'routes'];
  
  for (const table of tables) {
    const { error } = await supabase.rpc('truncate_table', { 
      table_name: table 
    });
    
    if (error) {
      // אם RPC לא קיים, נסה DELETE
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // מחק הכל
      
      if (deleteError) {
        logError(`שגיאה במחיקת ${table}`, deleteError);
      }
    }
    
    log(`   נוקה ${table}`);
  }
  
  log('✅ הטבלאות נוקו');
}

// ===============================
// MAIN
// ===============================

async function main() {
  const startTime = Date.now();
  
  log('╔══════════════════════════════════════════════════════════╗');
  log('║  Open Bus → Supabase - Daily Sync (Simple)              ║');
  log('╚══════════════════════════════════════════════════════════╝\n');
  
  const date = getCurrentDate();
  log(`📅 תאריך: ${date}\n`);
  
  try {
    // שלב 1: מחיקת נתונים ישנים
    await truncateAllTables();
    log('');
    
    // שלב 2: תחנות
    const stops = await loadAllStopsFromAPI(date);
    if (stops.length > 0) {
      await syncStopsToSupabase(stops);
    }
    log('');
    
    // שלב 3: קווים
    const routes = await loadAllRoutesFromAPI(date);
    if (routes.length > 0) {
      await syncRoutesToSupabase(routes);
    }
    log('');
    
    // שלב 4: city_relevant_stops
    if (stops.length > 0) {
      await buildCityRelevantStops();
    }
    log('');
    
    // שלב 5: סטטיסטיקות
    await showStats();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n✅ סנכרון יומי הושלם! (${duration} שניות)`);
    
    process.exit(0);
    
  } catch (error) {
    logError('שגיאה קריטית', error);
    console.error(error);
    process.exit(1);
  }
}

main();
